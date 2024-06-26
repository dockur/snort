import { throwIfOffline } from "@snort/shared";

import {
  InvoiceRequest,
  LNWallet,
  prToWalletInvoice,
  Sats,
  WalletError,
  WalletErrorCode,
  WalletEvents,
  WalletInfo,
  WalletInvoice,
  WalletInvoiceState,
} from ".";
import EventEmitter from "eventemitter3";

const defaultHeaders = {
  Accept: "application/json",
  "Content-Type": "application/json",
};

export default class LNDHubWallet extends EventEmitter<WalletEvents> implements LNWallet {
  type: "lndhub";
  url: URL;
  user: string;
  password: string;
  auth?: AuthResponse;

  constructor(url: string) {
    super();
    if (url.startsWith("lndhub://")) {
      const regex = /^lndhub:\/\/([\S-]+):([\S-]+)@(.*)$/i;
      const parsedUrl = url.match(regex);
      if (!parsedUrl || parsedUrl.length !== 4) {
        throw new Error("Invalid LNDHUB config");
      }
      this.url = new URL(parsedUrl[3]);
      this.user = parsedUrl[1];
      this.password = parsedUrl[2];
      this.type = "lndhub";
    } else {
      throw new Error("Invalid config");
    }
  }

  isReady(): boolean {
    return this.auth !== undefined;
  }

  canAutoLogin() {
    return true;
  }

  canGetInvoices() {
    return true;
  }

  canGetBalance() {
    return true;
  }

  canCreateInvoice() {
    return true;
  }

  canPayInvoice() {
    return true;
  }

  close(): Promise<boolean> {
    return Promise.resolve(true);
  }

  async getInfo() {
    await this.login();
    return await this.getJson<WalletInfo>("GET", "/getinfo");
  }

  async login() {
    if (this.auth) return true;

    const rsp = await this.getJson<AuthResponse>("POST", "/auth?type=auth", {
      login: this.user,
      password: this.password,
    });
    this.auth = rsp as AuthResponse;
    this.emit("change");
    return true;
  }

  async getBalance(): Promise<Sats> {
    await this.login();
    const rsp = await this.getJson<GetBalanceResponse>("GET", "/balance");
    const bal = Math.floor((rsp as GetBalanceResponse).BTC.AvailableBalance);
    return bal as Sats;
  }

  async createInvoice(req: InvoiceRequest) {
    await this.login();
    const rsp = await this.getJson<UserInvoicesResponse>("POST", "/addinvoice", {
      amt: req.amount,
      memo: req.memo,
    });

    const pRsp = rsp as UserInvoicesResponse;
    return {
      pr: pRsp.payment_request,
      memo: req.memo,
      amount: req.amount,
      paymentHash: pRsp.payment_hash,
      timestamp: pRsp.timestamp,
    } as WalletInvoice;
  }

  async payInvoice(pr: string) {
    await this.login();
    const rsp = await this.getJson<PayInvoiceResponse>("POST", "/payinvoice", {
      invoice: pr,
    });

    const pRsp = rsp as PayInvoiceResponse;
    return {
      pr: pr,
      paymentHash: pRsp.payment_hash,
      preimage: pRsp.payment_preimage,
      state: pRsp.payment_error
        ? WalletInvoiceState.Failed
        : pRsp.payment_preimage
          ? WalletInvoiceState.Paid
          : WalletInvoiceState.Pending,
    } as WalletInvoice;
  }

  async getInvoices(): Promise<WalletInvoice[]> {
    await this.login();
    const rsp = await this.getJson<UserInvoicesResponse[]>("GET", "/getuserinvoices");
    return (rsp as UserInvoicesResponse[])
      .sort((a, b) => (a.timestamp > b.timestamp ? -1 : 1))
      .slice(0, 50)
      .map(a => {
        const decodedInvoice = prToWalletInvoice(a.payment_request);
        if (!decodedInvoice) {
          throw new WalletError(WalletErrorCode.InvalidInvoice, "Failed to parse invoice");
        }
        return {
          ...decodedInvoice,
          state: a.ispaid ? WalletInvoiceState.Paid : decodedInvoice.state,
          paymentHash: a.payment_hash,
          memo: a.description,
        } as WalletInvoice;
      });
  }

  private async getJson<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
    throwIfOffline();
    const auth = `Bearer ${this.auth?.access_token}`;
    const url = `${this.url.pathname === "/" ? this.url.toString().slice(0, -1) : this.url.toString()}${path}`;
    const rsp = await fetch(url, {
      method: method,
      body: body ? JSON.stringify(body) : undefined,
      headers: {
        ...defaultHeaders,
        Authorization: auth,
      },
    });
    const json = await rsp.json();
    if ("code" in json && !rsp.ok) {
      const err = json as ErrorResponse;
      throw new WalletError(err.code, err.message);
    }
    return json as T;
  }
}

interface AuthResponse {
  refresh_token?: string;
  access_token?: string;
  token_type?: string;
}

interface GetBalanceResponse {
  BTC: {
    AvailableBalance: number;
  };
}

interface UserInvoicesResponse {
  amt: number;
  description: string;
  ispaid: boolean;
  type: string;
  timestamp: number;
  pay_req: string;
  payment_hash: string;
  payment_request: string;
  r_hash: string;
}

interface PayInvoiceResponse {
  payment_error?: string;
  payment_hash: string;
  payment_preimage: string;
  payment_route?: { total_amt: number; total_fees: number };
}

interface ErrorResponse {
  code: number;
  message: string;
}

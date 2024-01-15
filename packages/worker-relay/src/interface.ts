import debug from "debug";
import { NostrEvent, ReqCommand, WorkerMessage } from "./types";
import { v4 as uuid } from "uuid";

export class WorkerRelayInterface {
  #worker: Worker;
  #log = (msg: any) => console.debug(msg);
  #commandQueue: Map<string, (v: unknown) => void> = new Map();

  constructor(path: string) {
    this.#log(`Module path: ${path}`);
    this.#worker = new Worker(path, { type: "module" });
    this.#worker.onmessage = e => {
      const cmd = e.data as WorkerMessage<any>;
      if (cmd.cmd === "reply") {
        const q = this.#commandQueue.get(cmd.id);
        q?.(cmd);
        this.#commandQueue.delete(cmd.id);
      }
    };
  }

  async init() {
    return await this.#workerRpc<void, boolean>("init");
  }

  async open() {
    return await this.#workerRpc<void, boolean>("open");
  }

  async migrate() {
    return await this.#workerRpc<void, boolean>("migrate");
  }

  async event(ev: NostrEvent) {
    return await this.#workerRpc<NostrEvent, boolean>("event", ev);
  }

  async req(req: ReqCommand) {
    return await this.#workerRpc<ReqCommand, Array<NostrEvent>>("req", req);
  }

  #workerRpc<T, R>(cmd: string, args?: T, timeout = 5_000) {
    const id = uuid();
    const msg = {
      id,
      cmd,
      args,
    } as WorkerMessage<T>;
    this.#worker.postMessage(msg);
    return new Promise<R>((resolve, reject) => {
      let t: ReturnType<typeof setTimeout>;
      this.#commandQueue.set(id, v => {
        clearTimeout(t);
        const cmdReply = v as WorkerMessage<R>;
        resolve(cmdReply.args);
      });
      t = setTimeout(() => {
        reject("timeout");
      }, timeout);
    });
  }
}

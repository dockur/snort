import debug from "debug";
import { v4 as uuid } from "uuid";
import { appendDedupe, sanitizeRelayUrl, unixNowMs } from "@snort/shared";

import EventKind from "./event-kind";
import { SystemInterface } from "index";
import { ReqFilter, u256, HexKey } from "./nostr";
import { RelayCache, splitByWriteRelays, splitFlatByWriteRelays } from "./gossip-model";

/**
 * Which strategy is used when building REQ filters
 */
export enum RequestStrategy {
  /**
   * Use the users default relays to fetch events,
   * this is the fallback option when there is no better way to query a given filter set
   */
  DefaultRelays = 1,

  /**
   * Using a cached copy of the authors relay lists NIP-65, split a given set of request filters by pubkey
   */
  AuthorsRelays = 2,

  /**
   * Use pre-determined relays for query
   */
  ExplicitRelays = 3,
}

/**
 * A built REQ filter ready for sending to System
 */
export interface BuiltRawReqFilter {
  filters: Array<ReqFilter>;
  relay: string;
  strategy: RequestStrategy;
}

export interface RequestBuilderOptions {
  leaveOpen?: boolean;
  /**
   * Do not apply diff logic and always use full filters for query
   */
  skipDiff?: boolean;
}

/**
 * Nostr REQ builder
 */
export class RequestBuilder {
  id: string;
  instance: string;
  #builders: Array<RequestFilterBuilder>;
  #options?: RequestBuilderOptions;
  #log = debug("RequestBuilder");

  constructor(id: string) {
    this.instance = uuid();
    this.id = id;
    this.#builders = [];
  }

  get numFilters() {
    return this.#builders.length;
  }

  get options() {
    return this.#options;
  }

  /**
   * Add another request builders filters to this one
   */
  add(other: RequestBuilder) {
    this.#builders.push(...other.#builders);
  }

  withFilter() {
    const ret = new RequestFilterBuilder();
    this.#builders.push(ret);
    return ret;
  }

  withOptions(opt: RequestBuilderOptions) {
    this.#options = {
      ...this.#options,
      ...opt,
    };
    return this;
  }

  buildRaw(): Array<ReqFilter> {
    return this.#builders.map(f => f.filter);
  }

  build(system: SystemInterface): Array<BuiltRawReqFilter> {
    const expanded = this.#builders.flatMap(a => a.build(system.RelayCache, this.id));
    return this.#groupByRelay(system, expanded);
  }

  /**
   * Detects a change in request from a previous set of filters
   */
  buildDiff(system: SystemInterface, prev: Array<ReqFilter>): Array<BuiltRawReqFilter> {
    const start = unixNowMs();

    const diff = system.QueryOptimizer.getDiff(prev, this.buildRaw());
    const ts = unixNowMs() - start;
    this.#log("buildDiff %s %d ms", this.id, ts);
    if (diff.length > 0) {
      return splitFlatByWriteRelays(system.RelayCache, diff).map(a => {
        return {
          strategy: RequestStrategy.AuthorsRelays,
          filters: system.QueryOptimizer.flatMerge(a.filters),
          relay: a.relay,
        };
      });
    } else {
      this.#log(`Wasted ${ts} ms detecting no changes!`);
    }
    return [];
  }

  /**
   * Merge a set of expanded filters into the smallest number of subscriptions by merging similar requests
   * @param expanded
   * @returns
   */
  #groupByRelay(system: SystemInterface, expanded: Array<BuiltRawReqFilter>) {
    const relayMerged = expanded.reduce((acc, v) => {
      const existing = acc.get(v.relay);
      if (existing) {
        existing.push(v);
      } else {
        acc.set(v.relay, [v]);
      }
      return acc;
    }, new Map<string, Array<BuiltRawReqFilter>>());

    const filtersSquashed = [...relayMerged.values()].map(a => {
      return {
        filters: system.QueryOptimizer.compress(a.flatMap(b => b.filters)),
        relay: a[0].relay,
        strategy: a[0].strategy,
      } as BuiltRawReqFilter;
    });

    return filtersSquashed;
  }
}

/**
 * Builder class for a single request filter
 */
export class RequestFilterBuilder {
  #filter: ReqFilter = {};
  #relays = new Set<string>();

  get filter() {
    return { ...this.#filter };
  }

  /**
   * Use a specific relay for this request filter
   */
  relay(u: string) {
    const uClean = sanitizeRelayUrl(u);
    if (uClean) {
      this.#relays.add(uClean);
    }
    return this;
  }

  ids(ids: Array<u256>) {
    this.#filter.ids = appendDedupe(this.#filter.ids, ids);
    return this;
  }

  authors(authors?: Array<HexKey>) {
    if (!authors) return this;
    this.#filter.authors = appendDedupe(this.#filter.authors, authors);
    return this;
  }

  kinds(kinds?: Array<EventKind>) {
    if (!kinds) return this;
    this.#filter.kinds = appendDedupe(this.#filter.kinds, kinds);
    return this;
  }

  since(since?: number) {
    if (!since) return this;
    this.#filter.since = since;
    return this;
  }

  until(until?: number) {
    if (!until) return this;
    this.#filter.until = until;
    return this;
  }

  limit(limit?: number) {
    if (!limit) return this;
    this.#filter.limit = limit;
    return this;
  }

  tag(key: "e" | "p" | "d" | "t" | "r" | "a" | "g", value?: Array<string>) {
    if (!value) return this;
    this.#filter[`#${key}`] = appendDedupe(this.#filter[`#${key}`], value);
    return this;
  }

  search(keyword?: string) {
    if (!keyword) return this;
    this.#filter.search = keyword;
    return this;
  }

  /**
   * Build/expand this filter into a set of relay specific queries
   */
  build(relays: RelayCache, id: string): Array<BuiltRawReqFilter> {
    // use the explicit relay list first
    if (this.#relays.size > 0) {
      return [...this.#relays].map(r => {
        return {
          filters: [this.#filter],
          relay: r,
          strategy: RequestStrategy.ExplicitRelays,
        };
      });
    }

    // If any authors are set use the gossip model to fetch data for each author
    if (this.#filter.authors) {
      const split = splitByWriteRelays(relays, this.#filter);
      return split.map(a => {
        return {
          filters: [a.filter],
          relay: a.relay,
          strategy: RequestStrategy.AuthorsRelays,
        };
      });
    }

    return [
      {
        filters: [this.filter],
        relay: "",
        strategy: RequestStrategy.DefaultRelays,
      },
    ];
  }
}

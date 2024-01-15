import sqlite3InitModule, { Database, Sqlite3Static } from "@sqlite.org/sqlite-wasm";
import debug from "debug";
import { NostrEvent, ReqFilter } from "types";

export class WorkerRelay {
  #sqlite?: Sqlite3Static;
  #log = (msg: string) => console.debug(msg);
  #db?: Database;

  /**
   * Initialize the SQLite driver
   */
  async init() {
    this.#sqlite = await sqlite3InitModule();
    this.#log(`Got SQLite version: ${this.#sqlite.version.libVersion}`);
  }

  /**
   * Open the database from its path
   */
  async open(path: string) {
    if (!this.#sqlite) throw new Error("Must call init first");

    if ("opfs" in this.#sqlite) {
      this.#db = new this.#sqlite.oo1.OpfsDb(path, "cw");
      this.#log(`Opened ${this.#db.filename}`);
    } else {
      throw new Error("OPFS not supported!");
    }
  }

  /**
   * Do database migration
   */
  migrate() {
    if (!this.#db) throw new Error("DB must be open");

    this.#db.exec(
      'CREATE TABLE IF NOT EXISTS "__migration" (version INTEGER,migrated NUMERIC, CONSTRAINT "__migration_PK" PRIMARY KEY (version))',
    );
    const res = this.#db.exec("select max(version) from __migration", {
      returnValue: "resultRows",
    });

    const version = (res[0][0] as number | undefined) ?? 0;
    this.#log(`Starting migration from: v${version}`);
    if (version < 1) {
      this.#migrate_v1();
      this.#log("Migrated to v1");
    }
  }

  /**
   * Insert an event to the database
   */
  event(ev: NostrEvent) {
    let eventInserted = false;
    this.#db?.transaction(db => {
      const legacyReplacable = [0, 3, 41];
      if (legacyReplacable.includes(ev.kind) || (ev.kind >= 10_000 && ev.kind < 20_000)) {
        db.exec("delete from events where kind = ? and pubkey = ?", {
          bind: [ev.kind, ev.pubkey],
        });
        this.#log(`Deleted old kind=${ev.kind}, author=${ev.pubkey} (rows=${db.changes()})`);
      }
      if (ev.kind >= 30_000 && ev.kind < 40_000) {
        const dTag = ev.tags.find(a => a[0] === "d")![1];
        db.exec(
          "delete from events where id in (select id from events, tags where events.id = tags.event_id and tags.key = ? and tags.value = ?)",
          {
            bind: ["d", dTag],
          },
        );
        this.#log(`Deleted old versions of: d=${dTag}, kind=${ev.kind}, author=${ev.pubkey} (rows=${db.changes()})`);
      }
      db.exec("insert or ignore into events(id, pubkey, created, kind, json) values(?,?,?,?,?)", {
        bind: [ev.id, ev.pubkey, ev.created_at, ev.kind, JSON.stringify(ev)],
      });
      eventInserted = (this.#db?.changes() as number) > 0;
      if (eventInserted) {
        for (const t of ev.tags.filter(a => a[0].length === 1)) {
          db.exec("insert into tags(event_id, key, value) values(?, ?, ?)", {
            bind: [ev.id, t[0], t[1]],
          });
        }
      }
    });
    if (eventInserted) {
      this.#log(`Inserted: kind=${ev.kind},authors=${ev.pubkey},id=${ev.id}`);
    }
    return eventInserted;
  }

  /**
   * Query relay by nostr filter
   */
  req(req: ReqFilter) {
    const conditions: Array<string> = [];
    const params: Array<any> = [];

    const repeatParams = (n: number) => {
      const ret = [];
      for (let x = 0; x < n; x++) {
        ret.push("?");
      }
      return ret.join(", ");
    };

    let sql = `select json from events`;
    const tags = Object.entries(req).filter(([k]) => k.startsWith("#"));
    for (const [key, values] of tags) {
      const vArray = values as Array<string>;
      sql += ` inner join tags on events.id = tags.event_id and tags.key = ? and tags.value in (${repeatParams(
        vArray.length,
      )})`;
      params.push(key);
      params.push(...vArray);
    }
    if (req.ids) {
      conditions.push(`id in (${repeatParams(req.ids.length)})`);
      params.push(...req.ids);
    }
    if (req.authors) {
      conditions.push(`pubkey in (${repeatParams(req.authors.length)})`);
      params.push(...req.authors);
    }
    if (req.kinds) {
      conditions.push(`kind in (${repeatParams(req.kinds.length)})`);
      params.push(...req.kinds);
    }
    if (req.since) {
      conditions.push("created >= ?");
      params.push(req.since);
    }
    if (req.until) {
      conditions.push("created < ?");
      params.push(req.until);
    }
    if (conditions.length > 0) {
      sql += ` where ${conditions.join(" and ")}`;
    }
    if (req.limit) {
      sql += ` order by created desc limit ${req.limit}`;
    }

    this.#log(`Made query ${sql} from ${JSON.stringify(req)}`);
    const rows = this.#db?.exec(sql, {
      bind: params,
      returnValue: "resultRows",
    });
    return rows?.map(a => JSON.parse(a[0] as string) as NostrEvent) ?? [];
  }

  #migrate_v1() {
    this.#db?.transaction(db => {
      db.exec(
        "CREATE TABLE events (\
        id TEXT(64) PRIMARY KEY, \
        pubkey TEXT(64), \
        created INTEGER, \
        kind INTEGER, \
        json TEXT \
      )",
      );
      db.exec(
        "CREATE TABLE tags (\
        event_id TEXT(64), \
        key TEXT, \
        value TEXT, \
        CONSTRAINT tags_FK FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE \
        )",
      );
      db.exec("CREATE INDEX tags_key_IDX ON tags (key,value)");
      db.exec("insert into __migration values(1, ?)", {
        bind: [new Date().getTime() / 1000],
      });
    });
  }
}

/* eslint-disable no-debugger */
import { TaggedNostrEvent } from "@snort/system";
import { createContext } from "react";

interface ThreadContext {
  current: string;
  root?: TaggedNostrEvent;
  chains: Map<string, Array<TaggedNostrEvent>>;
  data: Array<TaggedNostrEvent>;
  reactions: Array<TaggedNostrEvent>;
  setCurrent: (i: string) => void;
}

export const ThreadContext = createContext({} as ThreadContext);

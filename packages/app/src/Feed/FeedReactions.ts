import { RequestBuilder, EventKind, NoteCollection } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import useLogin from "Hooks/useLogin";
import { useMemo } from "react";

export function useReactions(subId: string, ids: Array<string>, others?: (rb: RequestBuilder) => void) {
  const { preferences: pref } = useLogin();

  const sub = useMemo(() => {
    const rb = new RequestBuilder(subId);
    if (ids.length > 0) {
      rb.withFilter()
        .kinds(
          pref.enableReactions
            ? [EventKind.Reaction, EventKind.Repost, EventKind.ZapReceipt]
            : [EventKind.ZapReceipt, EventKind.Repost]
        )
        .tag("e", ids);
    }
    others?.(rb);
    return rb.numFilters > 0 ? rb : null;
  }, [ids]);

  return useRequestBuilder(NoteCollection, sub);
}

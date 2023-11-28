import { NostrEvent, OkResponse, SystemInterface } from "@snort/system";
import { removeUndefined } from "@snort/shared";

export async function sendEventToRelays(
  system: SystemInterface,
  ev: NostrEvent,
  customRelays?: Array<string>,
  setResults?: (x: Array<OkResponse>) => void,
) {
  console.log("sendEventToRelays", ev, customRelays);
  if (customRelays) {
    return removeUndefined(
      await Promise.all(
        customRelays.map(async r => {
          try {
            return await system.WriteOnceToRelay(r, ev);
          } catch (e) {
            console.error(e);
          }
        }),
      ),
    );
  } else {
    const responses: OkResponse[] = await system.BroadcastEvent(ev);
    setResults?.(responses);
    return responses;
  }
}

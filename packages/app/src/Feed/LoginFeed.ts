import { EventKind, NostrLink, parseRelayTags, RequestBuilder, TaggedNostrEvent } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import { useEffect, useMemo } from "react";

import { Nip28ChatSystem } from "@/chat/nip28";
import useEventPublisher from "@/Hooks/useEventPublisher";
import useLogin from "@/Hooks/useLogin";
import { bech32ToHex, getNewest, getNewestEventTagsByKey, unwrap } from "@/Utils";
import { SnortPubKey } from "@/Utils/Const";
import {
  addSubscription,
  LoginStore,
  setBlocked,
  setBookmarked,
  setMuted,
  setPinned,
  setRelays,
  setTags,
  updateSession,
} from "@/Utils/Login";
import { SubscriptionEvent } from "@/Utils/Subscription";
/**
 * Managed loading data for the current logged in user
 */
export default function useLoginFeed() {
  const login = useLogin();
  const { publicKey: pubKey, contacts } = login;
  const { publisher, system } = useEventPublisher();

  useEffect(() => {
    if (login.appData.json) {
      system.checkSigs = login.appData.json.preferences.checkSigs;

      if (publisher) {
        login.appData.sync(publisher.signer, system);
      }
    }
  }, [login, publisher]);

  const subLogin = useMemo(() => {
    if (!login || !pubKey) return null;

    const b = new RequestBuilder(`login:${pubKey.slice(0, 12)}`);
    b.withOptions({
      leaveOpen: true,
    });
    b.withFilter()
      .authors([pubKey])
      .kinds([
        EventKind.ContactList,
        EventKind.Relays,
        EventKind.MuteList,
        EventKind.PinList,
        EventKind.BookmarksList,
        EventKind.InterestsList,
        EventKind.PublicChatsList,
        EventKind.DirectMessage,
      ]);
    if (CONFIG.features.subscriptions && !login.readonly) {
      b.withFilter()
        .relay("wss://relay.snort.social/")
        .kinds([EventKind.SnortSubscriptions])
        .authors([bech32ToHex(SnortPubKey)])
        .tag("p", [pubKey])
        .limit(10);
    }

    return b;
  }, [login]);

  const loginFeed = useRequestBuilder(subLogin);

  // update relays and follow lists
  useEffect(() => {
    if (loginFeed) {
      const contactList = getNewest(loginFeed.filter(a => a.kind === EventKind.ContactList));
      if (contactList) {
        updateSession(login.id, s => {
          s.contacts = contactList.tags;
        });
      }

      const relays = getNewest(loginFeed.filter(a => a.kind === EventKind.Relays));
      if (relays) {
        const parsedRelays = parseRelayTags(relays.tags.filter(a => a[0] === "r")).map(a => [a.url, a.settings]);
        setRelays(login, Object.fromEntries(parsedRelays), relays.created_at * 1000);
      }

      if (publisher) {
        const subs = loginFeed.filter(
          a => a.kind === EventKind.SnortSubscriptions && a.pubkey === bech32ToHex(SnortPubKey),
        );
        Promise.all(
          subs.map(async a => {
            const dx = await publisher.decryptDm(a);
            if (dx) {
              const ex = JSON.parse(dx);
              return {
                id: a.id,
                ...ex,
              } as SubscriptionEvent;
            }
          }),
        ).then(a => addSubscription(login, ...a.filter(a => a !== undefined).map(unwrap)));
      }
    }
  }, [loginFeed, publisher]);

  async function handleMutedFeed(mutedFeed: TaggedNostrEvent[]) {
    const latest = getNewest(mutedFeed);
    if (!latest) return;

    const muted = NostrLink.fromTags(latest.tags);
    setMuted(
      login,
      muted.map(a => a.id),
      latest.created_at * 1000,
    );

    if (latest?.content && publisher && pubKey) {
      try {
        const privMutes = await publisher.nip4Decrypt(latest.content, pubKey);
        const blocked = JSON.parse(privMutes) as Array<Array<string>>;
        const keys = blocked.filter(a => a[0] === "p").map(a => a[1]);
        setBlocked(login, keys, latest.created_at * 1000);
      } catch (error) {
        console.debug("Failed to parse mute list", error, latest);
      }
    }
  }

  function handlePinnedFeed(pinnedFeed: TaggedNostrEvent[]) {
    const newest = getNewestEventTagsByKey(pinnedFeed, "e");
    if (newest) {
      setPinned(login, newest.keys, newest.createdAt * 1000);
    }
  }

  function handleTagFeed(tagFeed: TaggedNostrEvent[]) {
    const newest = getNewestEventTagsByKey(tagFeed, "t");
    if (newest) {
      setTags(login, newest.keys, newest.createdAt * 1000);
    }
  }

  function handleBookmarkFeed(bookmarkFeed: TaggedNostrEvent[]) {
    const newest = getNewestEventTagsByKey(bookmarkFeed, "e");
    if (newest) {
      setBookmarked(login, newest.keys, newest.createdAt * 1000);
    }
  }

  function handlePublicChatsListFeed(bookmarkFeed: TaggedNostrEvent[]) {
    const newest = getNewestEventTagsByKey(bookmarkFeed, "e");
    if (newest) {
      LoginStore.updateSession({
        ...login,
        extraChats: newest.keys.map(Nip28ChatSystem.chatId),
      });
    }
  }

  useEffect(() => {
    if (loginFeed) {
      const mutedFeed = loginFeed.filter(a => a.kind === EventKind.MuteList);
      handleMutedFeed(mutedFeed);

      const pinnedFeed = loginFeed.filter(a => a.kind === EventKind.PinList);
      handlePinnedFeed(pinnedFeed);

      const tagsFeed = loginFeed.filter(a => a.kind === EventKind.InterestsList);
      handleTagFeed(tagsFeed);

      const bookmarkFeed = loginFeed.filter(a => a.kind === EventKind.BookmarksList);
      handleBookmarkFeed(bookmarkFeed);

      const publicChatsFeed = loginFeed.filter(a => a.kind === EventKind.PublicChatsList);
      handlePublicChatsListFeed(publicChatsFeed);
    }
  }, [loginFeed]);

  useEffect(() => {
    const pTags = contacts.filter(a => a[0] === "p").map(a => a[1]);
    system.profileLoader.TrackKeys(pTags); // always track follows profiles
  }, [contacts]);
}

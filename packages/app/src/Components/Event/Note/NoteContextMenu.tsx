import { EventKind, NostrEvent, NostrLink } from "@snort/system";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useEffect, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { NoteContextMenuProps, NoteTranslation } from "@/Components/Event/Note/types";
import Icon from "@/Components/Icons/Icon";
import messages from "@/Components/messages";
import SnortApi from "@/External/SnortApi";
import useEventPublisher from "@/Hooks/useEventPublisher";
import useLogin from "@/Hooks/useLogin";
import useModeration from "@/Hooks/useModeration";
import usePreferences from "@/Hooks/usePreferences";
import { getCurrentSubscription, SubscriptionType } from "@/Utils/Subscription";

import { ReBroadcaster } from "../../ReBroadcaster";

export function NoteContextMenu({ ev, ...props }: NoteContextMenuProps) {
  const { formatMessage } = useIntl();
  const login = useLogin();
  const autoTranslate = usePreferences(s => s.autoTranslate);
  const { mute } = useModeration();
  const { publisher, system } = useEventPublisher();
  const [showBroadcast, setShowBroadcast] = useState(false);
  const lang = window.navigator.language;
  const langNames = new Intl.DisplayNames([...window.navigator.languages], {
    type: "language",
  });
  const isMine = ev.pubkey === login.publicKey;
  const link = NostrLink.fromEvent(ev);

  async function deleteEvent() {
    if (window.confirm(formatMessage(messages.ConfirmDeletion, { id: ev.id.substring(0, 8) })) && publisher) {
      const evDelete = await publisher.delete(ev.id);
      system.BroadcastEvent(evDelete);
    }
  }

  async function share() {
    const link = NostrLink.fromEvent(ev).encode(CONFIG.eventLinkPrefix);
    const url = `${window.location.protocol}//${window.location.host}/${link}`;
    if ("share" in window.navigator) {
      await window.navigator.share({
        title: "Snort",
        url: url,
      });
    } else {
      await navigator.clipboard.writeText(url);
    }
  }

  async function translate() {
    if (!props.onTranslated) return;
    const api = new SnortApi();
    const targetLang = lang.split("-")[0].toUpperCase();
    const result = await api.translate({
      text: [ev.content],
      target_lang: targetLang,
    });

    if (
      "translations" in result &&
      result.translations.length > 0 &&
      targetLang != result.translations[0].detected_source_language
    ) {
      props.onTranslated({
        text: result.translations[0].text,
        fromLanguage: langNames.of(result.translations[0].detected_source_language),
        confidence: 1,
      } as NoteTranslation);
    } else {
      props.onTranslated({
        text: "",
        fromLanguage: "",
        confidence: 0,
        skipped: true,
      });
    }
  }

  useEffect(() => {
    const sub = getCurrentSubscription(login.subscriptions);
    if (sub?.type === SubscriptionType.Premium && (autoTranslate ?? true)) {
      translate();
    }
  }, []);

  async function copyId() {
    const link = NostrLink.fromEvent(ev).encode(CONFIG.eventLinkPrefix);
    await navigator.clipboard.writeText(link);
  }

  async function pin(ev: NostrEvent) {
    await login.state.addToList(EventKind.PinList, NostrLink.fromEvent(ev), true);
  }

  async function bookmark(ev: NostrEvent) {
    await login.state.addToList(EventKind.BookmarksList, NostrLink.fromEvent(ev), true);
  }

  async function copyEvent() {
    await navigator.clipboard.writeText(JSON.stringify(ev, undefined, "  "));
  }

  const handleReBroadcastButtonClick = () => {
    setShowBroadcast(true);
  };

  const itemClassName =
    "grid grid-cols-[2rem_auto] gap-2 px-6 py-2 text-base font-semibold bg-layer-2 light:bg-white hover:bg-layer-3 light:hover:bg-neutral-200 cursor-pointer outline-none";

  function menuItems() {
    return (
      <>
        <DropdownMenu.Item
          className={itemClassName}
          onClick={e => {
            e.stopPropagation();
            props.setShowReactions(true);
          }}>
          <Icon name="heart" />
          <FormattedMessage {...messages.Reactions} />
        </DropdownMenu.Item>
        <DropdownMenu.Item
          className={itemClassName}
          onClick={e => {
            e.stopPropagation();
            share();
          }}>
          <Icon name="share" />
          <FormattedMessage {...messages.Share} />
        </DropdownMenu.Item>
        {!login.state.isOnList(EventKind.PinList, link) && !login.readonly && (
          <DropdownMenu.Item
            className={itemClassName}
            onClick={e => {
              e.stopPropagation();
              pin(ev);
            }}>
            <Icon name="pin" />
            <FormattedMessage {...messages.Pin} />
          </DropdownMenu.Item>
        )}
        {!login.state.isOnList(EventKind.BookmarksList, link) && !login.readonly && (
          <DropdownMenu.Item
            className={itemClassName}
            onClick={e => {
              e.stopPropagation();
              bookmark(ev);
            }}>
            <Icon name="bookmark" />
            <FormattedMessage {...messages.Bookmark} />
          </DropdownMenu.Item>
        )}
        <DropdownMenu.Item
          className={itemClassName}
          onClick={e => {
            e.stopPropagation();
            copyId();
          }}>
          <Icon name="copy" />
          <FormattedMessage {...messages.CopyID} />
        </DropdownMenu.Item>
        {!login.readonly && (
          <DropdownMenu.Item
            className={itemClassName}
            onClick={e => {
              e.stopPropagation();
              mute(ev.pubkey);
            }}>
            <Icon name="mute" />
            <FormattedMessage {...messages.Mute} />
          </DropdownMenu.Item>
        )}
        <DropdownMenu.Item
          className={itemClassName}
          onClick={e => {
            e.stopPropagation();
            handleReBroadcastButtonClick();
          }}>
          <Icon name="relay" />
          <FormattedMessage defaultMessage="Broadcast Event" />
        </DropdownMenu.Item>
        <DropdownMenu.Item
          className={itemClassName}
          onClick={e => {
            e.stopPropagation();
            translate();
          }}>
          <Icon name="translate" />
          <FormattedMessage {...messages.TranslateTo} values={{ lang: langNames.of(lang.split("-")[0]) }} />
        </DropdownMenu.Item>
        <DropdownMenu.Item
          className={itemClassName}
          onClick={e => {
            e.stopPropagation();
            copyEvent();
          }}>
          <Icon name="json" />
          <FormattedMessage {...messages.CopyJSON} />
        </DropdownMenu.Item>
        {isMine && !login.readonly && (
          <DropdownMenu.Item
            className={itemClassName}
            onClick={e => {
              e.stopPropagation();
              deleteEvent();
            }}>
            <Icon name="trash" className="text-error" />
            <FormattedMessage {...messages.Delete} />
          </DropdownMenu.Item>
        )}
      </>
    );
  }

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <span className="cursor-pointer text-neutral-500">
            <Icon name="dots" size={15} />
          </span>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content className="bg-layer-2 rounded-2xl overflow-hidden z-[9999] min-w-48" sideOffset={5}>
            {menuItems()}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      {showBroadcast && <ReBroadcaster ev={ev} onClose={() => setShowBroadcast(false)} />}
    </>
  );
}

import "./Note.css";
import React from "react";
import { EventKind, TaggedNostrEvent } from "@snort/system";
import { NostrFileElement } from "Element/Event/NostrFileHeader";
import ZapstrEmbed from "Element/Embed/ZapstrEmbed";
import PubkeyList from "Element/Embed/PubkeyList";
import { LiveEvent } from "Element/LiveEvent";
import { ZapGoal } from "Element/Event/ZapGoal";
import NoteReaction from "Element/Event/NoteReaction";
import ProfilePreview from "Element/User/ProfilePreview";
import { NoteInner } from "./NoteInner";
import { LongFormText } from "./LongFormText";

export interface NoteProps {
  data: TaggedNostrEvent;
  className?: string;
  related: readonly TaggedNostrEvent[];
  highlight?: boolean;
  ignoreModeration?: boolean;
  onClick?: (e: TaggedNostrEvent) => void;
  depth?: number;
  searchedValue?: string;
  options?: {
    showHeader?: boolean;
    showContextMenu?: boolean;
    showTime?: boolean;
    showPinned?: boolean;
    showBookmarked?: boolean;
    showFooter?: boolean;
    showReactionsLink?: boolean;
    showMedia?: boolean;
    canUnpin?: boolean;
    canUnbookmark?: boolean;
    canClick?: boolean;
    showMediaSpotlight?: boolean;
    longFormPreview?: boolean;
  };
}

export default function Note(props: NoteProps) {
  const { data: ev, className } = props;
  if (ev.kind === EventKind.Repost) {
    return <NoteReaction data={ev} key={ev.id} root={undefined} depth={(props.depth ?? 0) + 1} />;
  }
  if (ev.kind === EventKind.FileHeader) {
    return <NostrFileElement ev={ev} />;
  }
  if (ev.kind === EventKind.ZapstrTrack) {
    return <ZapstrEmbed ev={ev} />;
  }
  if (ev.kind === EventKind.PubkeyLists) {
    return <PubkeyList ev={ev} className={className} />;
  }
  if (ev.kind === EventKind.LiveEvent) {
    return <LiveEvent ev={ev} />;
  }
  if (ev.kind === EventKind.SetMetadata) {
    return <ProfilePreview actions={<></>} pubkey={ev.pubkey} className="card" />;
  }
  if (ev.kind === (9041 as EventKind)) {
    return <ZapGoal ev={ev} />;
  }
  if (ev.kind === EventKind.LongFormTextNote) {
    return <LongFormText ev={ev} related={props.related} isPreview={props.options?.longFormPreview ?? false} />;
  }

  return <NoteInner {...props} />;
}

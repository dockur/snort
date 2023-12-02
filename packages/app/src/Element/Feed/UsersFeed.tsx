import { useCallback, useMemo } from "react";
import { TaggedNostrEvent } from "@snort/system";

import useTimelineFeed, { TimelineFeed } from "@/Feed/TimelineFeed";
import FollowListBase from "@/Element/User/FollowListBase";
import PageSpinner from "@/Element/PageSpinner";
import useModeration from "@/Hooks/useModeration";

export default function UsersFeed({ keyword, sortPopular = true }: { keyword: string; sortPopular?: boolean }) {
  const feed: TimelineFeed = useTimelineFeed(
    {
      type: "profile_keyword",
      items: [keyword + (sortPopular ? " sort:popular" : "")],
      discriminator: keyword,
    },
    { method: "LIMIT_UNTIL" },
  );

  const { muted, isEventMuted } = useModeration();
  const filterPosts = useCallback(
    (nts: readonly TaggedNostrEvent[]) => {
      return nts.filter(a => !isEventMuted(a));
    },
    [muted],
  );
  const usersFeed = useMemo(() => filterPosts(feed.main ?? []).map(p => p.pubkey), [feed, filterPosts]);

  if (!usersFeed) return <PageSpinner />;

  return <FollowListBase pubkeys={usersFeed} showAbout={true} />;
}

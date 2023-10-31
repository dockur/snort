import { useEffect, useState } from "react";
import { NostrEvent, NostrLink, TaggedNostrEvent } from "@snort/system";

import PageSpinner from "Element/PageSpinner";
import Note from "Element/Event/Note";
import NostrBandApi from "External/NostrBand";
import { useReactions } from "Feed/Reactions";
import { ErrorOrOffline } from "Element/ErrorOrOffline";

export default function TrendingNotes() {
  const [posts, setPosts] = useState<Array<NostrEvent>>();
  const [error, setError] = useState<Error>();
  const related = useReactions("trending", posts?.map(a => NostrLink.fromEvent(a)) ?? []);

  async function loadTrendingNotes() {
    const api = new NostrBandApi();
    const trending = await api.trendingNotes();
    setPosts(trending.notes.map(a => a.event));
  }

  useEffect(() => {
    loadTrendingNotes().catch(e => {
      if (e instanceof Error) {
        setError(e);
      }
    });
  }, []);

  if (error) return <ErrorOrOffline error={error} onRetry={loadTrendingNotes} className="p" />;
  if (!posts) return <PageSpinner />;

  return (
    <>
      {posts.map(e => (
        <Note key={e.id} data={e as TaggedNostrEvent} related={related?.data ?? []} depth={0} />
      ))}
    </>
  );
}

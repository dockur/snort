import { unixNow } from "@snort/shared";
import { NostrLink } from "@snort/system";
import { SnortContext } from "@snort/system-react";
import { lazy, useContext, useEffect, useMemo, useState } from "react";
import { FormattedMessage } from "react-intl";
import { Link, Outlet, RouteObject, useParams } from "react-router-dom";

import Timeline from "@/Components/Feed/Timeline";
import TimelineFollows from "@/Components/Feed/TimelineFollows";
import SuggestedProfiles from "@/Components/SuggestedProfiles";
import { TaskList } from "@/Components/Tasks/TaskList";
import TrendingHashtags from "@/Components/Trending/TrendingHashtags";
import TrendingNotes from "@/Components/Trending/TrendingPosts";
import { TimelineSubject } from "@/Feed/TimelineFeed";
import useLogin from "@/Hooks/useLogin";
import { DeckContext } from "@/Pages/DeckLayout";
import Discover from "@/Pages/Discover";
import HashTagsPage from "@/Pages/HashTagsPage";
import { debounce, getCurrentRefCode, getRelayName, sha256 } from "@/Utils";

import { TopicsPage } from "./TopicsPage";
const InviteModal = lazy(() => import("@/Components/Invite"));

import useHistoryState from "@/Hooks/useHistoryState";

import messages from "./messages";

interface RelayOption {
  url: string;
  paid: boolean;
}

export default function RootPage() {
  const code = getCurrentRefCode();
  return (
    <>
      <div className="main-content">
        <Outlet />
      </div>
      {code && <InviteModal />}
    </>
  );
}

const FollowsHint = () => {
  const { publicKey: pubKey, follows } = useLogin();
  if (follows.item?.length === 0 && pubKey) {
    return (
      <FormattedMessage
        {...messages.NoFollows}
        values={{
          newUsersPage: (
            <Link to={"/discover"}>
              <FormattedMessage {...messages.NewUsers} />
            </Link>
          ),
        }}
      />
    );
  }
  return null;
};

export const GlobalTab = () => {
  const { relays } = useLogin();
  const [relay, setRelay] = useHistoryState<RelayOption>(undefined, "global-relay");
  const [allRelays, setAllRelays] = useHistoryState<RelayOption[]>(undefined, "global-relay-options");
  const [now] = useState(unixNow());
  const system = useContext(SnortContext);

  function globalRelaySelector() {
    if (!allRelays || allRelays.length === 0) return null;

    const paidRelays = allRelays.filter(a => a.paid);
    const publicRelays = allRelays.filter(a => !a.paid);
    return (
      <div className="flex items-center g8 justify-end nowrap">
        <h3>
          <FormattedMessage
            defaultMessage="Relay"
            id="KHK8B9"
            description="Label for reading global feed from specific relays"
          />
        </h3>
        <select
          className="f-ellipsis"
          onChange={e => setRelay(allRelays.find(a => a.url === e.target.value))}
          value={relay?.url}>
          {paidRelays.length > 0 && (
            <optgroup label="Paid Relays">
              {paidRelays.map(a => (
                <option key={a.url} value={a.url}>
                  {getRelayName(a.url)}
                </option>
              ))}
            </optgroup>
          )}
          <optgroup label="Public Relays">
            {publicRelays.map(a => (
              <option key={a.url} value={a.url}>
                {getRelayName(a.url)}
              </option>
            ))}
          </optgroup>
        </select>
      </div>
    );
  }

  useEffect(() => {
    return debounce(500, () => {
      const ret: RelayOption[] = [];
      system.Sockets.forEach(v => {
        if (v.connected) {
          ret.push({
            url: v.address,
            paid: v.info?.limitation?.payment_required ?? false,
          });
        }
      });
      ret.sort(a => (a.paid ? -1 : 1));

      if (ret.length > 0 && !relay) {
        setRelay(ret[0]);
      }
      setAllRelays(ret);
    });
  }, [relays, relay]);

  return (
    <>
      {globalRelaySelector()}
      {relay && (
        <Timeline
          subject={{
            type: "global",
            items: [],
            relay: [relay.url],
            discriminator: `all-${sha256(relay.url)}`,
          }}
          postsOnly={false}
          method={"TIME_RANGE"}
          window={600}
          now={now}
        />
      )}
    </>
  );
};

export const FollowedByFriendsTab = () => {
  const { publicKey } = useLogin();
  const subject: TimelineSubject = {
    type: "global",
    items: [],
    discriminator: `followed-by-friends-${publicKey}`,
    streams: true,
  };

  return <Timeline followDistance={2} subject={subject} postsOnly={true} method={"TIME_RANGE"} />;
};

export const NotesTab = () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const deckContext = useContext(DeckContext);

  const noteOnClick = useMemo(() => {
    if (deckContext) {
      return ev => {
        deckContext.setThread(NostrLink.fromEvent(ev));
      };
    }
    return undefined;
  }, [deckContext]);

  return (
    <>
      <FollowsHint />
      <TaskList />
      <TimelineFollows postsOnly={true} noteOnClick={noteOnClick} />
    </>
  );
};

export const ConversationsTab = () => {
  return <TimelineFollows postsOnly={false} />;
};

export const TagsTab = (params: { tag?: string }) => {
  const { tag } = useParams();
  const t = params.tag ?? tag ?? "";
  const subject: TimelineSubject = {
    type: "hashtag",
    items: [t],
    discriminator: `tags-${t}`,
    streams: true,
  };

  return <Timeline subject={subject} postsOnly={false} method={"TIME_RANGE"} />;
};

const DefaultTab = () => {
  const { preferences, publicKey } = useLogin(s => ({
    preferences: s.appData.item.preferences,
    publicKey: s.publicKey,
  }));
  const tab = publicKey ? preferences.defaultRootTab ?? `notes` : `trending/notes`;
  const elm = RootTabRoutes.find(a => a.path === tab)?.element;
  return elm;
};

export const RootTabRoutes = [
  {
    path: "",
    element: <DefaultTab />,
  },
  {
    path: "global",
    element: <GlobalTab />,
  },
  {
    path: "notes",
    element: <NotesTab />,
  },
  {
    path: "followed-by-friends",
    element: <FollowedByFriendsTab />,
  },
  {
    path: "conversations",
    element: <ConversationsTab />,
  },
  {
    path: "discover",
    element: <Discover />,
  },
  {
    path: "tag/:tag",
    element: <TagsTab />,
  },
  {
    path: "trending/notes",
    element: <TrendingNotes />,
  },
  {
    path: "trending/hashtags",
    element: <TrendingHashtags />,
  },
  {
    path: "suggested",
    element: (
      <div className="p">
        <SuggestedProfiles />
      </div>
    ),
  },
  {
    path: "t/:tag",
    element: <HashTagsPage />,
  },
  {
    path: "topics",
    element: <TopicsPage />,
  },
];

export const RootRoutes = [
  {
    path: "/",
    element: <RootPage />,
    children: RootTabRoutes,
  },
] as RouteObject[];

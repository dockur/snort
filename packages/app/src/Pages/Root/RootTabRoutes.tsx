import TrendingHashtags from "@/Components/Trending/TrendingHashtags";
import TrendingNotes from "@/Components/Trending/TrendingPosts";
import Discover from "@/Pages/Discover";
import HashTagsPage from "@/Pages/HashTagsPage";
import { ConversationsTab } from "@/Pages/Root/ConversationsTab";
import { DefaultTab } from "@/Pages/Root/DefaultTab";
import { FollowedByFriendsTab } from "@/Pages/Root/FollowedByFriendsTab";
import FollowSetsPage from "@/Pages/Root/FollowSets";
import { ForYouTab } from "@/Pages/Root/ForYouTab";
import MediaPosts from "@/Pages/Root/Media";
import { NotesTab } from "@/Pages/Root/NotesTab";
import { TagsTab } from "@/Pages/Root/TagsTab";
import { TopicsPage } from "@/Pages/TopicsPage";

export type RootTabRoutePath =
  | ""
  | "for-you"
  | "following"
  | "followed-by-friends"
  | "conversations"
  | "discover"
  | "tag/:tag"
  | "trending/notes"
  | "trending/hashtags"
  | "suggested"
  | "t/:tag"
  | "topics"
  | "media"
  | "follow-sets";

export type RootTabRoute = {
  path: RootTabRoutePath;
  element: JSX.Element;
};

export const RootTabRoutes: RootTabRoute[] = [
  {
    path: "",
    element: <DefaultTab />,
  },
  {
    path: "for-you",
    element: <ForYouTab />,
  },
  {
    path: "following",
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
    path: "t/:tag",
    element: <HashTagsPage />,
  },
  {
    path: "topics",
    element: <TopicsPage />,
  },
  {
    path: "media",
    element: <MediaPosts />,
  },
  {
    path: "follow-sets",
    element: <FollowSetsPage />,
  },
];

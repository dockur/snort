import { EventKind } from "@snort/system";

import TimelineFollows from "@/Components/Feed/TimelineFollows";
import { Day } from "@/Utils/Const";

export default function MediaPosts() {
  return (
    <div className="p">
      <TimelineFollows
        id="media"
        postsOnly={true}
        kinds={[EventKind.Photo, EventKind.Video, EventKind.ShortVideo]}
        showDisplayAsSelector={true}
        firstChunkSize={Day}
        windowSize={Day}
      />
    </div>
  );
}

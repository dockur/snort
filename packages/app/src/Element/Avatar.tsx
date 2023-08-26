import "./Avatar.css";

import { CSSProperties, useEffect, useState } from "react";
import type { UserMetadata } from "@snort/system";

import useImgProxy from "Hooks/useImgProxy";
import { getDisplayName } from "Element/ProfileImage";
import { defaultAvatar } from "SnortUtils";

interface AvatarProps {
  pubkey: string;
  user?: UserMetadata;
  onClick?: () => void;
  size?: number;
  image?: string;
}
const Avatar = ({ pubkey, user, size, onClick, image }: AvatarProps) => {
  const [url, setUrl] = useState("");
  const { proxy } = useImgProxy();

  useEffect(() => {
    const url = image ?? user?.picture;
    if (url) {
      const proxyUrl = proxy(url, size ?? 120);
      setUrl(proxyUrl);
    } else {
      setUrl(defaultAvatar(pubkey));
    }
  }, [user, image]);

  const backgroundImage = `url(${url})`;
  const style = { "--img-url": backgroundImage } as CSSProperties;
  const domain = user?.nip05 && user.nip05.split("@")[1];
  return (
    <div
      onClick={onClick}
      style={style}
      className="avatar"
      data-domain={domain?.toLowerCase()}
      title={getDisplayName(user, "")}></div>
  );
};

export default Avatar;

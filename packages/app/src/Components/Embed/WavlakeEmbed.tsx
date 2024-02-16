const WavlakeEmbed = ({ link }: { link: string }) => {
  const convertedUrl = link.replace(/(?:player\.|www\.)?wavlake\.com/, "embed.wavlake.com");

  return (
    <>
      <iframe
        // eslint-disable-next-line react/no-unknown-property
        credentialless=""
        style={{ borderRadius: 12 }}
        src={convertedUrl}
        width="100%"
        height="380"
        frameBorder="0"
        loading="lazy"
      />
      <a href={link} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="ext">
        {link}
      </a>
    </>
  );
};

export default WavlakeEmbed;

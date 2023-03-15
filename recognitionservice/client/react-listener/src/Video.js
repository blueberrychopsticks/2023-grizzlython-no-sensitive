import YouTube from "react-youtube";
import QRCode from "qrcode.react";

// const opts = {
//   // height: "390",
//   // width: "640",
//   playerVars: {
//     // autoplay: 1,
//   },
// };

export const Video = ({ videoId }) => {
  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const size = 100;
  const bgColor = "#ffffff";

  return (
    <div>
      <QRCode value={youtubeUrl} size={size} bgColor={bgColor} />
    </div>
  );
};

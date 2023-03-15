import React, { useEffect, useState } from "react";
import "./App.css";
import { useRecognitionService } from "./use-recognition-service";
import { useCryptoStuff } from "./use-crypto-stuff";
import { WalletWrapper } from "./cryptocurrency/solana/WalletProvider";
import { Buffer } from "buffer";
import { usePriorPurchasersOfPOLForThisVideo } from "./centralized/db";
import { useVideoStatsPda } from "./cryptocurrency/solana/use-mint";

// @ts-ignore
window.Buffer = Buffer;

const polPlaylistUrl =
  "https://www.youtube.com/playlist?list=PL3z1TiLmRFczem24vHPT58yf0EHHtn0H9";

function useIsSafari() {
  const [isSafari, setIsSafari] = useState(false);

  useEffect(() => {
    const isSafariBrowser = /^((?!chrome|android).)*safari/i.test(
      navigator.userAgent
    );
    setIsSafari(isSafariBrowser);
  }, []);

  return isSafari;
}

function App() {
  const isSafari = useIsSafari();
  const { subtitle, deeplink, activateMicrophone, range, listening } =
    useRecognitionService();
  const {
    mintAProofOfListeningNft,
    countdown,
    userCanMint,
    words,
    listeningVideoStartTime,
    listeningVideoCurrentTime,
    minimumListeningDurationSecondsToAllowMint,
    imageUrl,
    jsonMetadata,
  } = useCryptoStuff({
    text: subtitle,
    subStart: range.start,
    subEnd: range.end,
    youtubeDeeplink: deeplink,
  });

  // If the deeplink is not undefined, then we can use it to get the videoId
  // otherwise, set the videoId to undefined
  const url = deeplink ? new URL(deeplink) : undefined;
  const videoId = url?.searchParams.get("v") || "";

  const { previousNumberPurchases, priceToMintClip } =
    useVideoStatsPda(videoId);

  const {
    // totalMintsForThisVideo,
    // costToMintTheNextClipFromThisVideoFormatted,
    weNeedToPayThesePeopleDividendsSoPassTheseAccountsToMintNft,
  } = usePriorPurchasersOfPOLForThisVideo(
    videoId,
    listeningVideoStartTime,
    listeningVideoCurrentTime
  );

  const formatSecondsToTimestamp = (seconds: number) => {
    const hh = Math.floor(seconds / 3600);
    const mm = Math.floor((seconds % 3600) / 60);
    const ss = Math.floor((seconds % 3600) % 60);
    // truncate seconds to 2 digits
    const s = ss < 10 ? `0${ss}` : ss;
    // truncate minutes to 2 digits
    const m = mm < 10 ? `0${mm}` : mm;
    // truncate hours to 2 digits
    const h = hh < 10 ? `0${hh}` : hh;
    // hide hours if 0
    return hh === 0 ? `${m}:${s}` : `${h}:${m}:${s}`;
  };
  if (isSafari) {
    return <h1>Use Chrome or Firefox</h1>;
  }

  return (
    <div className="App">
      <h1>Proof of Listening Demo</h1>
      {imageUrl && <img src={imageUrl} alt="NFT" style={{ width: "50%" }} />}

      {videoId && (
        <>
          <h1>Total Mints for this Video: {previousNumberPurchases}</h1>
          <h1>Next Mint will cost: {priceToMintClip?.sol} SOL</h1>
          <MintButton
            formattedCost={`${priceToMintClip?.sol} SOL`}
            weNeedToPayThesePeopleDividendsSoPassTheseAccountsToMintNft={
              weNeedToPayThesePeopleDividendsSoPassTheseAccountsToMintNft
            }
            userCanMint={userCanMint}
            countdown={countdown}
            mintAProofOfListeningNft={mintAProofOfListeningNft}
          />
        </>
      )}

      <h2>
        {words.length === 0 &&
          "Subtitles will appear here if you've followed the directions and you're on your way to a mint"}
        {words.length > 0 &&
          `You've listened to (from ${formatSecondsToTimestamp(
            listeningVideoStartTime
          )} to ${formatSecondsToTimestamp(listeningVideoCurrentTime)}):`}
      </h2>
      <div>{words.join(" ")}</div>
      <Instructions
        {...{
          activateMicrophone,
          listening,
          minimumListeningDurationSecondsToAllowMint,
        }}
      />
    </div>
  );
}

// const listening = true;
// @ts-ignore
const Instructions = ({
  activateMicrophone,
  listening,
  minimumListeningDurationSecondsToAllowMint,
}: // listening
{
  activateMicrophone: () => void;
  listening: boolean;
  minimumListeningDurationSecondsToAllowMint: number;
}) => {
  return (
    <ol>
      <li>
        <button
          onClick={() => {
            if (!listening) {
              activateMicrophone();
            } else {
              // Open polPlaylistUrl in a new window
              window.open(polPlaylistUrl, "_blank");
            }
          }}
        >
          {!listening
            ? "Click here to ⚠️🎤GIVE MICROPHONE PERMISSION ⚠️🎤 to start earning\n Proof of Listening NFTs"
            : "Listening... (click here to open playlist in new tab)"}
        </button>
      </li>
      <li>Give the browser permission to use your microphone</li>
      <li>
        Listen to any video from this playlist for a few seconds{" "}
        <a href={polPlaylistUrl}>
          GRIZZLYTHON - LoL - Proof of Listening Playlist
        </a>
      </li>
      <li>
        Listen for at least {minimumListeningDurationSecondsToAllowMint} seconds
        to any portion of the clip to unlock your minting ability
      </li>
      <li>
        Mint your NFT and you will earn dividends for every time someone mints a
        Proof of Listening NFT for the same video from within the same duration
        that your NFT was minted
      </li>
      <li>Share clip with friends</li>
      <li>Profit</li>
    </ol>
  );
};

const WrappedApp = () => {
  return (
    <WalletWrapper>
      <App />
    </WalletWrapper>
  );
};

const MintButton = ({
  // @ts-ignore
  formattedCost,
  // @ts-ignore
  weNeedToPayThesePeopleDividendsSoPassTheseAccountsToMintNft,
  // @ts-ignore
  userCanMint,
  // @ts-ignore
  countdown,
  // @ts-ignore
  mintAProofOfListeningNft,
}) => {
  return (
    <div>
      <button
        disabled={!userCanMint}
        onClick={() => {
          mintAProofOfListeningNft(
            weNeedToPayThesePeopleDividendsSoPassTheseAccountsToMintNft
          );
        }}
      >
        {!userCanMint &&
          `Mint after listening for ${countdown} more second${
            countdown === 1 ? "" : "s"
          }`}
        {userCanMint && `Mint IT for ${formattedCost}!`}
      </button>
    </div>
  );
};

export default WrappedApp;

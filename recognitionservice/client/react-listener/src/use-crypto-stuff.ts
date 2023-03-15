import { useStopwatch } from "react-timer-hook";
import { useEffect, useState } from "react";
import { useHasNotChanged } from "./use-has-not-changed";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { mintNft } from "./cryptocurrency/solana/use-mint";

const minimumListeningDurationSecondsToAllowMint = 10;
/**
 * How long the user can listen without the subtitle changing before we assume
 * they are no longer listening and/or the content is no longer playing.
 */
const maximumNoRecognitionSeconds = 3;

type UseCryptoStuff = (subtitle: {
  text: string;
  subStart: number;
  subEnd: number;
  youtubeDeeplink: string;
}) => {
  countdown: number;
  userCanMint: boolean;
  words: string[];
  mintAProofOfListeningNft: (dividendAccounts: string[]) => void;
  listeningVideoStartTime: number;
  listeningVideoCurrentTime: number;
  minimumListeningDurationSecondsToAllowMint: number;
  txId: string;
  imageUrl: string;
  jsonMetadata: string;
};

export const useCryptoStuff: UseCryptoStuff = (subtitle) => {
  const anchorWallet = useAnchorWallet();

  const { text, subStart, subEnd, youtubeDeeplink } = subtitle;

  const [words, setWords] = useState([] as string[]);
  const [txId, setTxId] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [jsonMetadata, setJsonMetadata] = useState("");

  const [listeningVideoStartTime, setListeningVideoStartTime] = useState(0);
  const [listeningVideoCurrentTime, setListeningVideoCurrentTime] = useState(0);

  const { seconds, isRunning, start, pause, reset } = useStopwatch({
    autoStart: false,
  });

  const { connection } = useConnection();

  const skipIfTrue = !isRunning || words.length === 0;

  useHasNotChanged(
    text,
    maximumNoRecognitionSeconds,
    () => {
      // alert(
      //   `No new content has been recognized for ${maximumNoRecognitionSeconds} seconds. Pausing timer.`
      // );
      pause();
    },
    skipIfTrue
  );

  useEffect(() => {
    if (!text) return;
    // If there were no words and these are the first listened words, start the timer
    if (words.length === 0) {
      start();
      setListeningVideoStartTime(Math.round(subStart));
    }
  }, [words.length, text, subStart]);

  // If the user seeks to before the current listening start time,
  // reset the timer
  // change start time to the new start time
  useEffect(() => {
    if (!text) return;
    if (subEnd < listeningVideoStartTime) {
      setWords([]);
      reset();
      start();
      setListeningVideoStartTime(Math.round(subStart));
      setListeningVideoCurrentTime(Math.round(subEnd));
    }
  }, [text, subStart, subEnd, listeningVideoStartTime]);

  // If the user seeks to after the current listening end time,
  // reset the timer
  // change end time to the new end time
  // Use the timer to check if the user has actually seeked in the video
  // or if there was perhaps 3 seconds of silence where we couldn't
  // detect a new subtitle
  const allowableSilentTimeSeconds = 3;
  useEffect(() => {
    if (
      listeningVideoCurrentTime >
        listeningVideoStartTime + seconds + allowableSilentTimeSeconds ||
      listeningVideoCurrentTime < listeningVideoStartTime
    ) {
      setWords([]);
      reset();
      start();
      setListeningVideoStartTime(Math.round(subStart));
      setListeningVideoCurrentTime(Math.round(subEnd));
    }
  }, [
    seconds,
    listeningVideoStartTime,
    listeningVideoCurrentTime,
    subEnd,
    subStart,
  ]);

  useEffect(() => {
    if (!text) return;

    const wordsFromNewText = text.split(" ");
    // append the new words to the already listened words
    setWords((prevWords) => {
      return [...prevWords, ...wordsFromNewText];
    });
    setListeningVideoCurrentTime(subEnd);
  }, [text, subEnd]);

  const countdownSeconds = Math.max(
    minimumListeningDurationSecondsToAllowMint - seconds,
    0
  );
  const userCanMint = countdownSeconds === 0;

  const mintAProofOfListeningNft = (dividendAccounts: string[]) => {
    pause();
    console.log("Attempting to Mint NFT");
    mintNft(
      connection,
      anchorWallet!,
      youtubeDeeplink,
      listeningVideoStartTime,
      listeningVideoCurrentTime,
      dividendAccounts
    )
      .then((res) => {
        console.log("Minted NFT", res);
        setTxId(res.txId);
        setImageUrl(res.imageUrl);
        setJsonMetadata(res.jsonMetadataUrl);

        // Reset the timer so that the user can begin the minting process
        // for new clips.
        setWords([]);
        reset();
        pause();
      })
      .catch((err) => {
        console.log("Error minting NFT", err);
      });
  };

  return {
    mintAProofOfListeningNft,
    countdown: countdownSeconds,
    userCanMint,
    words,
    listeningVideoStartTime,
    listeningVideoCurrentTime,
    minimumListeningDurationSecondsToAllowMint,
    txId,
    imageUrl,
    jsonMetadata,
  };
};

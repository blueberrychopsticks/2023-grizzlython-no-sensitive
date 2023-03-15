/**
 * This file relies on centralized proprietary technologies to serve as a stopgap
 * for the hackathon.
 *
 * I believe this functionality is possible to do on Solana, but I'll need to fill my knowledge
 * gaps to do so.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebaseConfig";
import { useCollectionData } from "react-firebase-hooks/firestore";

interface MyObject {
  /* Primary Key */ txId: string;
  videoId: string;
  minterPublicKey: string;
  previousPurchases: number;
  solCost: number;

  startTimeSeconds: number;
  endTimeSeconds: number;
  dividendAccounts: string[];
}

// function to save an object to the collection with an optional document key
export async function saveNftPurchaseToDb(documentKey: string, data: MyObject) {
  console.log("Saving to db", documentKey, data);
  const docRef = await setDoc(doc(db, "mintedClips", documentKey), data);
  // Increment the count of total minted clips for the entire platform in a metadata collection
  await updateDoc(doc(db, "metadata", "mintedClips"), {
    count: increment(1),
  });

  console.log(`Document written ${documentKey}`, docRef);
}

export async function fetchTotalNumberMintedClips(): Promise<number> {
  const docRef = doc(db, "metadata", "mintedClips");
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    console.log("Document data:", docSnap.data());
    return docSnap.data().count;
  } else {
    console.log("No such document!");
    return 0;
  }
}

// function to retrieve objects with start and end times within a specified range, with a maximum number of results
export async function getObjectsInRange(
  videoId: string,
  startTimestamp: number,
  endTimestamp: number,
  limitTo: number = 10 // default to 10 results if limit is not specified
): Promise<MyObject[]> {
  const startTime = Timestamp.fromMillis(startTimestamp * 1000);
  const endTime = Timestamp.fromMillis(endTimestamp * 1000);

  const q = query(
    collection(db, "mintedClips"),
    where("videoId", "==", videoId),
    where("startTimeSeconds", ">=", startTime),
    where("endTimeSeconds", "<=", endTime),
    limit(limitTo)
  );

  const querySnapshot = await getDocs(q);

  const matchingObjects: MyObject[] = [];
  querySnapshot.forEach((doc) => {
    matchingObjects.push(doc.data() as MyObject);
  });

  return matchingObjects;
}

const limitTo /* This is a strange limit, but is imposed by the fact that you can't interact with more than
this number of accounts in a single transaction on solana as of March 11. This will change when
address tables come into play*/ = 32;
export const usePriorPurchasersOfPOLForThisVideo = (
  videoId: string | undefined | null,
  listeningStartTime: number,
  listeningCurrentTime: number
) => {
  videoId = videoId ? videoId : "0";
  listeningStartTime = listeningStartTime ? listeningStartTime : 0;
  listeningCurrentTime = listeningCurrentTime ? listeningCurrentTime : 0;

  // videoId = "GmpRyXVTGbk";
  // listeningStartTime = 331;
  // listeningCurrentTime = 342;

  const q = query(
    collection(db, "mintedClips"),
    where("videoId", "==", videoId)

    // where("startTimeSeconds", ">=", listeningStartTime),
    /**
     * Uncaught FirebaseError: Invalid query. All where filters with an inequality
     * (<, <=, !=, not-in, >, or >=) must be on the same field. But you have
     * inequality filters on 'startTimeSeconds' and 'endTimeSeconds'
     * 🙄
     */
    // where("endTimeSeconds", "<=", listeningCurrentTime),
    // limit(limitTo)
  );
  const [mintedNftsUnfilteredForTimestamps, loading, error] = useCollectionData(
    q,
    {
      snapshotListenOptions: { includeMetadataChanges: true },
    }
  );
  const totalMintsForThisVideo = mintedNftsUnfilteredForTimestamps?.length || 0;
  const costToMintTheNextClipFromThisVideo = 0.01 * 2 ** totalMintsForThisVideo;
  const costToMintTheNextClipFromThisVideoFormatted = `${costToMintTheNextClipFromThisVideo.toFixed(
    2
  )}SOL`;
  const weNeedToPayThesePeopleDividendsSoPassTheseAccountsToMintNft =
    mintedNftsUnfilteredForTimestamps
      ?.filter(
        (nft) =>
          nft.startTimeSeconds <= listeningStartTime &&
          nft.endTimeSeconds >= listeningCurrentTime
      )
      .map((nftPurchase) => nftPurchase.minterPublicKey) || [];

  if (
    listeningCurrentTime === 0 &&
    listeningStartTime === 0 &&
    videoId === "0"
  ) {
    return {
      value: [],
      loading: false,
      error: null,
      totalMintsForThisVideo: 0,
      costToMintTheNextClipFromThisVideoFormatted: "",
      weNeedToPayThesePeopleDividendsSoPassTheseAccountsToMintNft: [],
    };
  }

  return {
    value: weNeedToPayThesePeopleDividendsSoPassTheseAccountsToMintNft,
    loading,
    error,
    totalMintsForThisVideo,
    costToMintTheNextClipFromThisVideoFormatted,
    weNeedToPayThesePeopleDividendsSoPassTheseAccountsToMintNft,
  };
};

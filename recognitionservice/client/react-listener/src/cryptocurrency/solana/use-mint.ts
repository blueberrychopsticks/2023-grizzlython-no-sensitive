// import * as anchor from "@project-serum/anchor";
// import { Program, Wallet } from "@project-serum/anchor";
import {
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  getAssociatedTokenAddress,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
} from "@solana/web3.js";
import { AnchorProvider, Idl, Program } from "@coral-xyz/anchor";
import {
  AnchorWallet,
  useAnchorWallet,
  useConnection,
} from "@solana/wallet-adapter-react";
import {
  fetchTotalNumberMintedClips,
  saveNftPurchaseToDb,
} from "../../centralized/db";
import { IDL, MetaplexAnchorNft } from "./idls/metaplex-anchor-nft";
import { useEffect, useState } from "react";

const MintNftAnchorProgramId = "Fa6gZQAMkyvekgiTVivnAiTKXKvAuhHzeb5SZ2puMerz";

export const useVideoStatsPda = (
  videoId?: string
  // TODO if time - we're going to only increment price for clips when a user mints that minuted section
  // listeningStartTime: string,
  // listeningCurrentTime: string
) => {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  const [previousNumberPurchases, setPreviousNumberPurchases] = useState(0);

  const [priceToMintClip, setLamportsPriceToMintClip] = useState<
    { lamports: number; sol: number } | undefined
  >(undefined);
  useEffect(() => {
    console.log("previousNumberPurchases", previousNumberPurchases);
    const basePriceLamports = 10_000_000;
    const priceMultiplier = 2 ** previousNumberPurchases;
    const price = basePriceLamports * priceMultiplier;
    if (typeof price != "number") return;
    setLamportsPriceToMintClip({
      lamports: price,
      sol: price / LAMPORTS_PER_SOL,
    });
  }, [previousNumberPurchases]);

  useEffect(() => {
    if (!wallet) return;
    if (!videoId) return;

    const provider = new AnchorProvider(connection, wallet, {
      preflightCommitment: "processed",
    });

    const program: Program<MetaplexAnchorNft> = new Program(
      IDL,
      MintNftAnchorProgramId,
      provider
    );

    const [sourceVideoStatsAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("video_stats_v4"), Buffer.from(videoId)],
      program.programId
    );

    console.log({ sourceVideoStatsAddress });
    program.account.sourceVideoStats
      .fetch(sourceVideoStatsAddress)
      .catch((e) => {
        // account doesn't exist because user is first to mint from it
        setPreviousNumberPurchases(0);
      })
      .then((videoStatsAccount) => {
        setPreviousNumberPurchases(
          // @ts-ignore yeah it does
          videoStatsAccount.previousNumberClipPurchases
        );
      });

    const subscriptionId = connection.onAccountChange(
      new PublicKey(sourceVideoStatsAddress),
      async (_, __) => {
        const videoStatsAccount = await program.account.sourceVideoStats.fetch(
          sourceVideoStatsAddress
        );
        console.log({ videoStatsAccount });
        console.log(
          "--------------------",
          videoStatsAccount.previousNumberClipPurchases
        );
        // @ts-ignore yeah it does
        setPreviousNumberPurchases(
          videoStatsAccount.previousNumberClipPurchases
        );

        return () => {
          connection.removeAccountChangeListener(subscriptionId);
        };
      }
    );
  }, [connection, wallet, videoId]);

  return { previousNumberPurchases, priceToMintClip };
};

export const mintNft = async (
  connection: Connection,
  wallet: AnchorWallet,
  videoUrlWithParamsString: string,
  listeningStartTime: number,
  listeningEndTime: number,
  dividendAccounts: string[]
): Promise<{
  txId: string;
  solExplorer: string;
  imageUrl: string;
  jsonMetadataUrl: string;
}> => {
  console.log(videoUrlWithParamsString);

  const currentNftIndex = await fetchTotalNumberMintedClips();

  const videoUrlWithPotentiallyAdditionalParams = new URL(
    videoUrlWithParamsString
  );
  const videoId =
    videoUrlWithPotentiallyAdditionalParams.searchParams.get("v")!;
  const videoUrlNormalized = `https://www.youtube.com/watch?v=${videoId}`;

  const provider = new AnchorProvider(connection, wallet, {
    preflightCommitment: "processed",
  });
  const publickey = provider.publicKey!;

  if (!publickey) {
    console.log("Wallet not connected");
    throw new Error("Wallet not connected, can't mint yet");
  }

  const program: Program<MetaplexAnchorNft> = new Program(
    IDL,
    MintNftAnchorProgramId,
    provider
  );

  const [sourceVideoStatsAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from("video_stats_v4"), Buffer.from(videoId)],
    program.programId
  );
  console.log(
    `Attempting to fetch the PDA for video stats: ${sourceVideoStatsAddress.toBase58()}`
  );

  // Try catch becuase if the user is the first to mint a Proof of Listening from
  // this video, the PDA will not exist yet and anchor will create it during the transaction.
  let videoStatsAccount;
  try {
    videoStatsAccount = await program.account.sourceVideoStats.fetch(
      sourceVideoStatsAddress
    );
    console.log({ videoStatsAccount });
  } catch (error) {
    console.log("PDA does not exist yet, will be created during Anchor tx...");

    videoStatsAccount = {
      previousNumberClipPurchases: 0,
    };
  }

  const previousPurchases = videoStatsAccount.previousNumberClipPurchases;
  const baseLamportsPrice = 10_000_000;
  const mintCostLamports = baseLamportsPrice * 2 ** previousPurchases;
  const solCost = mintCostLamports / LAMPORTS_PER_SOL;

  console.log({
    videoUrlNormalized,
    currentNftIndex,
    solCost,
    mintedAt: new Date().toISOString(),
    listeningStartTime,
    listeningEndTime,
  });

  const { url: jsonMetadataUrl, image_url: imageUrl } =
    await generateNftMetadataJsonUrl(
      videoUrlNormalized,
      currentNftIndex,
      solCost,
      new Date().toISOString(),
      listeningStartTime,
      listeningEndTime
    );

  const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
    "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
  );
  const lamports: number =
    await program.provider.connection.getMinimumBalanceForRentExemption(
      MINT_SIZE
    );
  const getMetadata = (mint: PublicKey): PublicKey => {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    )[0];
  };

  const getMasterEdition = (mint: PublicKey): PublicKey => {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
        Buffer.from("edition"),
      ],
      TOKEN_METADATA_PROGRAM_ID
    )[0];
  };

  /*TODO: See what this SHOULd be*/ const mintKey: Keypair = Keypair.generate();
  const NftTokenAccount = await getAssociatedTokenAddress(
    mintKey.publicKey,
    provider.publicKey!
  );
  console.log("NFT Account: ", NftTokenAccount.toBase58());

  const mint_tx = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: provider.publicKey,
      newAccountPubkey: mintKey.publicKey,
      space: MINT_SIZE,
      programId: TOKEN_PROGRAM_ID,
      lamports,
    }),
    createInitializeMintInstruction(
      mintKey.publicKey,
      0,
      wallet.publicKey,
      wallet.publicKey
    ),
    createAssociatedTokenAccountInstruction(
      wallet.publicKey,
      NftTokenAccount,
      wallet.publicKey,
      mintKey.publicKey
    )
  );

  // @ts-ignore
  const res = await program.provider.sendAndConfirm(mint_tx, [mintKey]);

  const metadataAddress = await getMetadata(mintKey.publicKey);
  const masterEdition = await getMasterEdition(mintKey.publicKey);

  // pad the index to 4 digits
  const paddedIndex = currentNftIndex.toString().padStart(4, "0");
  const nftName = /* TODO: generate from server*/ `PoL ${paddedIndex}`;

  const txId = await program.methods
    .mintNft(videoId, mintKey.publicKey, jsonMetadataUrl, nftName)
    .accounts({
      treasury: new PublicKey("9P5ZvpucqtaMqGD9LrwmxqZJvELKrehApri4GCCYt6f7"),
      sourceVideoStatsAccount: sourceVideoStatsAddress,

      payer: wallet.publicKey,
      mintAuthority: wallet.publicKey,
      mint: mintKey.publicKey,

      tokenAccount: NftTokenAccount,
      metadata: metadataAddress,
      masterEdition: masterEdition,

      rent: SYSVAR_RENT_PUBKEY,
      tokenProgram: TOKEN_PROGRAM_ID,
      tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  const solExplorer = `https://explorer.solana.com/tx/${txId}?cluster=devnet`;
  console.log("Your transaction\t", solExplorer);

  console.log("[CENTRALIZED] Saving purchase to Firestore");
  const minterPublicKey = publickey.toBase58();
  await saveNftPurchaseToDb(txId, {
    txId,
    videoId,
    minterPublicKey,
    previousPurchases,
    solCost,
    dividendAccounts,

    startTimeSeconds: listeningStartTime,
    endTimeSeconds: Math.floor(listeningEndTime),
  });

  return {
    txId,
    solExplorer,
    imageUrl,
    jsonMetadataUrl,
  };
};

const generateNftMetadataJsonUrl = async (
  videoUrl: string,
  currentNftIndex: number,
  solSpent: number,
  mintedAt: string,
  listeningStartTime: number,
  listeningEndTime: number
) => {
  const apiUrl = "https://makedeimage.ngrok.io/generate_metadata";
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      video_url: videoUrl,
      current_nft_index: currentNftIndex,
      sol_spent: solSpent,
      minted_at: mintedAt,

      listen_start: listeningStartTime,
      listen_end: listeningEndTime,
    }),
  };

  try {
    const response = await fetch(apiUrl, options);
    const data = await response.json();
    console.log(data);
    return data;
  } catch (error) {
    console.error(error);
  }
};

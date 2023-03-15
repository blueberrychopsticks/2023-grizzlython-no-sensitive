import { MetaplexAnchorNft } from "../target/types/metaplex_anchor_nft";

import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  MINT_SIZE,
} from "@solana/spl-token";

import {
  AnchorProvider,
  Program,
  setProvider,
  Wallet,
  web3,
  workspace,
} from "@coral-xyz/anchor";
import {
  buildCreateAccountsForMintTransaction,
  getMasterEdition,
  getMetadata,
  TOKEN_METADATA_PROGRAM_ID,
} from "./nft-creation-utils";
import { expect } from "chai";

const TEST_VIDEO_ID = "VIDEO-ID-FOR-TESTING-ONLY";

describe("metaplex-anchor-nft", () => {
  // Configure the client to use the local cluster.
  const provider = AnchorProvider.env();
  const wallet = provider.wallet as Wallet;
  setProvider(provider);
  const program = workspace.MetaplexAnchorNft as Program<MetaplexAnchorNft>;
  console.log(program.programId.toString());
  console.log(program.provider.connection.rpcEndpoint);
  console.log(provider.connection.rpcEndpoint);

  function expectBalance(actual, expected, message, slack = 20000) {
    expect(actual, message).within(expected - slack, expected + slack);
  }

  it("Is initialized!", async () => {
    const [sourceVideoStatsAddress] = await web3.PublicKey.findProgramAddress(
      [Buffer.from("video_stats_v4"), Buffer.from(TEST_VIDEO_ID)],
      program.programId
    );
    // console.log(
    //   `Attempting to fetch the PDA for video stats: ${sourceVideoStatsAddress.toBase58()}`
    // );

    try {
      const videoStatsAccount = await program.account.sourceVideoStats.fetch(
        sourceVideoStatsAddress
      );
      // console.log({ videoStatsAccount });
    } catch (err) {
      console.log(
        "error when fetching PDA (will occur when video is minted from the first time)"
      );
    }

    const lamports: number =
      await program.provider.connection.getMinimumBalanceForRentExemption(
        MINT_SIZE
      );

    const mintKey: web3.Keypair = web3.Keypair.generate();
    const NftTokenAccount = await getAssociatedTokenAddress(
      mintKey.publicKey,
      wallet.publicKey
    );
    // console.log("NFT Account: ", NftTokenAccount.toBase58());
    const createAccountsForMintTransaction: web3.Transaction =
      buildCreateAccountsForMintTransaction(
        wallet,
        mintKey,
        lamports,
        NftTokenAccount
      );

    const createAccountsForMintResponse = await program.provider.sendAndConfirm(
      createAccountsForMintTransaction,
      [mintKey]
    );
    console.log(
      await program.provider.connection.getParsedAccountInfo(mintKey.publicKey)
    );

    console.log("Account: ", createAccountsForMintResponse);
    console.log("Mint key: ", mintKey.publicKey.toString());
    console.log("User: ", wallet.publicKey.toString());

    const metadataAddress = await getMetadata(mintKey.publicKey);
    const masterEdition = await getMasterEdition(mintKey.publicKey);

    const performMintSmartContractCallSignature = await program.methods
      .mintNft(
        TEST_VIDEO_ID,
        mintKey.publicKey,
        "https://gist.githubusercontent.com/blueberrychopsticks/998888b7ff6bd112f34e6b1b76989a81/raw/5b259aa83579363abdc30a93766b05ed0dfd5ab4/foo.json",
        "PoL 0002"
      )
      .accounts({
        treasury: new web3.PublicKey(
          "9P5ZvpucqtaMqGD9LrwmxqZJvELKrehApri4GCCYt6f7"
        ),
        sourceVideoStatsAccount: sourceVideoStatsAddress,

        payer: wallet.publicKey,
        mintAuthority: wallet.publicKey,
        mint: mintKey.publicKey,

        tokenAccount: NftTokenAccount,
        metadata: metadataAddress,
        masterEdition: masterEdition,

        rent: web3.SYSVAR_RENT_PUBKEY,
        tokenProgram: TOKEN_PROGRAM_ID,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        systemProgram: web3.SystemProgram.programId,
      })
      .rpc();
    console.log(
      "Your transaction signature",
      performMintSmartContractCallSignature
    );

    const videoStatsAccount = await program.account.sourceVideoStats.fetch(
      sourceVideoStatsAddress
    );
    console.log({ videoStatsAccount });
  });
});

import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { PublicKeyOrStr } from "./types";

export const useMakeTransactions = (
  connection: Connection,
  signer?: Keypair
) => {
  const publicKey = signer?.publicKey;
  const precondtionsGuard = () => {
    if (!signer) {
      throw new Error("Keypair is required");
    }
  };
  const requestAirdrop = async () => {
    precondtionsGuard();

    const sol = 1;
    const lamports = sol * LAMPORTS_PER_SOL;
    const tx = await connection
      .requestAirdrop(publicKey!, lamports)
      .catch((err: string) => {
        // if (err.includes("429")) {
        //   console.error("Slow down! Too many requests");
        // }
      });
    console.log({ tx });
  };

  const sendSol = async ({
    lamports,
    toPubkey,
  }: {
    lamports: number;
    toPubkey: PublicKeyOrStr;
  }) => {
    precondtionsGuard();
    toPubkey =
      toPubkey instanceof PublicKey ? toPubkey : new PublicKey(toPubkey);
    console.log(`Sending ${lamports} lamports to ${toPubkey}`);

    const transferTransaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: publicKey!,
        toPubkey,
        lamports,
      })
    );

    try {
      const tx = await sendAndConfirmTransaction(
        connection,
        transferTransaction,
        [signer!]
      );

      const explorerUrl = ` https://explorer.solana.com/tx/${tx}`;
      console.log(`${lamports / LAMPORTS_PER_SOL} SOL sent: ${explorerUrl}`);
    } catch (err) {
      // ignore error that happens when I send tx in mainnet
      // console.error(err);
    }
  };

  return { requestAirdrop, sendSol };
};

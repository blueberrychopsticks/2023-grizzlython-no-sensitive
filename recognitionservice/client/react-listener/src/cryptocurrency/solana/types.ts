import { PublicKey } from "@solana/web3.js";

export type JsonifiedKeypair = {
  _keypair: {
    publicKey: Record<string, number>;
    secretKey: Record<string, number>;
  };
};

export type PublicKeyOrStr = PublicKey | string;

export type Cluster = "devnet" | "testnet" | "mainnet-beta";

import { expect } from "chai";
import { AnchorProvider, Idl, Program, Wallet, web3 } from "@coral-xyz/anchor";

export class SolanaTestUtils<ProgramIdl extends Idl> {
  provider: AnchorProvider;
  program: Program<ProgramIdl>;
  users: AnchorUser[] = [];
  constructor(provider) {
    this.provider = provider;
  }

  getBalance = async (pubkey: web3.PublicKey): Promise<number> => {
    let account = await this.provider.connection.getAccountInfo(pubkey);
    return account?.lamports ?? 0;
  };

  expectBalance = (
    actual: number,
    expected: number,
    message?: string,
    slack = 20000
  ) => {
    expect(actual, message).within(expected - slack, expected + slack);
  };

  createUser = async (airdropBalance = 2): Promise<AnchorUser> => {
    const airdropBalanceLamports = airdropBalance * web3.LAMPORTS_PER_SOL;
    let user = web3.Keypair.generate();
    console.log(this.provider.connection?.requestAirdrop);
    let sig = await this.provider.connection.requestAirdrop(
      user.publicKey,
      airdropBalanceLamports
    );
    await this.provider.connection.confirmTransaction(sig);

    let wallet = new Wallet(user);
    let userProvider = new AnchorProvider(
      this.provider.connection,
      wallet,
      this.provider.opts
    );

    const newUser = {
      key: user,
      wallet,
      provider: userProvider,
    };
    this.users.push(newUser);
    return newUser;
  };

  createUsers = (numUsers: number): Promise<Array<AnchorUser>> => {
    let promises = [];
    for (let i = 0; i < numUsers; i++) {
      promises.push(this.createUser());
    }

    return Promise.all(promises);
  };

  programForUser = (user: AnchorUser) => {
    return new anchor.Program(
      this.program.idl,
      this.program.programId,
      user.provider
    );
  };
}

export type AnchorUser = {
  key: web3.Keypair;
  wallet: Wallet;
  provider: AnchorProvider;
};

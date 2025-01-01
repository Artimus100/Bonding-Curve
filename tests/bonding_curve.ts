import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { BondingCurve } from "../target/types/bonding_curve";
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL, Keypair } from "@solana/web3.js";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"
import { KeypairSigner, createSignerFromKeypair, generateSigner, keypairIdentity, percentAmount } from '@metaplex-foundation/umi';

import { 
  TOKEN_PROGRAM_ID, 
  MINT_SIZE,
  createInitializeMintInstruction,
  getMinimumBalanceForRentExemptMint,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction
} from "@solana/spl-token";
import { assert, expect } from "chai";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";


// Configure the client to use the local cluster.
const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);
const program = anchor.workspace.BondingCurve as Program<BondingCurve>;



describe('Bonding Curve', () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.BondingCurve as Program<BondingCurve>;

  let bondingCurveAccount: anchor.web3.Keypair;
  const basePrice = new anchor.BN(1000000); // 1 SOL

  beforeEach(async () => {
    bondingCurveAccount = anchor.web3.Keypair.generate();
  });

  it('initializes bonding curve', async () => {
    await program.methods
      .initialize(basePrice)
      .accounts({
        bondingCurve: bondingCurveAccount.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([bondingCurveAccount])
      .rpc();

    const account = await program.account.bondingCurve.fetch(
      bondingCurveAccount.publicKey
    );
    expect(account.tokenSupply.toString()).to.equal('0');
    expect(account.basePrice.toString()).to.equal(basePrice.toString());
  });

  it('buys tokens correctly', async () => {
    // Initialize first
    await program.methods
      .initialize(basePrice)
      .accounts({
        bondingCurve: bondingCurveAccount.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([bondingCurveAccount])
      .rpc();

    // Buy tokens
    const amount = new anchor.BN(5);
    await program.methods
      .buy(amount)
      .accounts({
        bondingCurve: bondingCurveAccount.publicKey,
        user: provider.wallet.publicKey,
      })
      .rpc();

    const account = await program.account.bondingCurve.fetch(
      bondingCurveAccount.publicKey
    );
    expect(account.tokenSupply.toString()).to.equal('5');
  });

  it('sells tokens correctly', async () => {
    // Initialize and buy tokens first
    await program.methods
      .initialize(basePrice)
      .accounts({
        bondingCurve: bondingCurveAccount.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([bondingCurveAccount])
      .rpc();

    const buyAmount = new anchor.BN(10);
    await program.methods
      .buy(buyAmount)
      .accounts({
        bondingCurve: bondingCurveAccount.publicKey,
        user: provider.wallet.publicKey,
      })
      .rpc();

    // Sell tokens
    const sellAmount = new anchor.BN(3);
    await program.methods
      .sell(sellAmount)
      .accounts({
        bondingCurve: bondingCurveAccount.publicKey,
        user: provider.wallet.publicKey,
      })
      .rpc();

    const account = await program.account.bondingCurve.fetch(
      bondingCurveAccount.publicKey
    );
    expect(account.tokenSupply.toString()).to.equal('7');
  });

  it('fails when selling more tokens than owned', async () => {
    await program.methods
      .initialize(basePrice)
      .accounts({
        bondingCurve: bondingCurveAccount.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([bondingCurveAccount])
      .rpc();

    const sellAmount = new anchor.BN(1);
    try {
      await program.methods
        .sell(sellAmount)
        .accounts({
          bondingCurve: bondingCurveAccount.publicKey,
          user: provider.wallet.publicKey,
        })
        .rpc();
      expect.fail('Should have thrown error');
    } catch (error) {
      const errorMsg = 'Insufficient token supply to complete the sale.';
      expect(error.toString()).to.include(errorMsg);
    }
  });
});
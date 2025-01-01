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
import { assert } from "chai";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";


// Configure the client to use the local cluster.
const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);
const program = anchor.workspace.BondingCurve as Program<BondingCurve>;


describe("bonding_curve", () => {

  const payer = provider.wallet as NodeWallet;

  let bondingCurveAccount: Keypair;
  let userTokenAccount: PublicKey;
  let basePrice = new anchor.BN(LAMPORTS_PER_SOL); // 1 SOL base price
  const umi = createUmi(provider.connection);
  let mintKeypair: KeypairSigner;
  const creatorWallet = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(payer.payer.secretKey));

  const creator = createSignerFromKeypair(umi, creatorWallet);

  before(async () => {
    // Generate necessary keypairs
    bondingCurveAccount = anchor.web3.Keypair.generate();
    mintKeypair = generateSigner(umi);

    // Get minimum lamports for mint
    const mintRent = await getMinimumBalanceForRentExemptMint(provider.connection);
    
    // Create mint account transaction
    const createMintTx = new anchor.web3.Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: provider.wallet.publicKey,
        newAccountPubkey: mintKeypair.publicKey as unknown as PublicKey,
        space: MINT_SIZE,
        lamports: mintRent,
        programId: TOKEN_PROGRAM_ID,
      }),
      createInitializeMintInstruction(
        mintKeypair.publicKey as unknown as PublicKey,
        9,
        provider.wallet.publicKey,
        provider.wallet.publicKey,
      )
    );

    // Send transaction to create mint account
    await provider.sendAndConfirm(createMintTx, [mintKeypair as unknown as anchor.web3.Keypair]);

    // Get associated token account for user
    userTokenAccount = await getAssociatedTokenAddress(
      mintKeypair.publicKey as unknown as PublicKey,
      provider.wallet.publicKey
    );

    // Create associated token account if it doesn't exist
    try {
      const createAtaTx = new anchor.web3.Transaction().add(
        createAssociatedTokenAccountInstruction(
          provider.wallet.publicKey,
          userTokenAccount,
          provider.wallet.publicKey,
          mintKeypair.publicKey as unknown as PublicKey
        )
      );
      await provider.sendAndConfirm(createAtaTx, []);
    } catch (e) {
      // Account might already exist, which is fine
      console.log("ATA might already exist:", e);
    }
  });

  describe("initialize", () => {
    it("successfully initializes the bonding curve", async () => {
      await program.methods
        .initialize(basePrice)
        .accounts({
          bondingCurve: bondingCurveAccount.publicKey,
          tokenMint: mintKeypair.publicKey,
          authority: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([bondingCurveAccount])
        .rpc();

      const account = await program.account.bondingCurve.fetch(bondingCurveAccount.publicKey);
      assert.ok(account.basePrice.eq(basePrice));
      assert.ok(account.tokenSupply.eq(new anchor.BN(0)));
    });

    it("fails to initialize with zero base price", async () => {
      const newBondingCurveKeypair = anchor.web3.Keypair.generate();
      
      try {
        await program.methods
          .initialize(new anchor.BN(0))
          .accounts({
            bondingCurve: newBondingCurveKeypair.publicKey,
            tokenMint: mintKeypair.publicKey,
            authority: provider.wallet.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([newBondingCurveKeypair])
          .rpc();
        assert.fail("Should have failed with zero base price");
      } catch (err) {
        assert.ok(err.toString().includes("InvalidBasePrice"));
      }
    });
    it("fails to initialize twice with same account", async () => {
      try {
        await program.methods
          .initialize(basePrice)
          .accounts({
            bondingCurve: bondingCurveAccount.publicKey,
            tokenMint:mintKeypair.publicKey,
            authority: provider.wallet.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        assert.fail("Should have failed with duplicate initialization");
      } catch (err) {
        assert.ok(err.toString().includes("AccountAlreadyInitialized"));
      }
    });
  });

    // ... rest of the test cases remain the same but use mintKeypair.publicKey instead of tokenMint
    // and bondingCurveAccount.publicKey instead of bondingCurveAccount
  });

  describe("buy", () => {
    const umi = createUmi(provider.connection);

    let bondingCurveAccount: Keypair;
    let mintKeypair = generateSigner(umi);
    before(async () => {
      bondingCurveAccount = anchor.web3.Keypair.generate();
      // Initialize bonding curve account here if needed

      // Get associated token account for user
      const userTokenAccount = await getAssociatedTokenAddress(
        mintKeypair.publicKey as unknown as PublicKey,
        provider.wallet.publicKey
      );

      // Create associated token account if it doesn't exist
      try {
        const createAtaTx = new anchor.web3.Transaction().add(
          createAssociatedTokenAccountInstruction(
            provider.wallet.publicKey,
            userTokenAccount,
            provider.wallet.publicKey,
            mintKeypair.publicKey as unknown as PublicKey
          )
        );
        await provider.sendAndConfirm(createAtaTx, []);
      } catch (e) {
        // Account might already exist, which is fine
        console.log("ATA might already exist:", e);
      }
    });
    it("successfully buys tokens with correct price calculation", async () => {
      const buyAmount = new anchor.BN(10 * LAMPORTS_PER_SOL);
      const beforeBalance = await provider.connection.getBalance(provider.wallet.publicKey);
      
      const tx = await program.methods.buy(buyAmount)
        .accounts({
          bondingCurve: bondingCurveAccount.publicKey,
          tokenMint: mintKeypair.publicKey,
          userTokenAccount,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      const afterBalance = await provider.connection.getBalance(provider.wallet.publicKey);
      const account = await program.account.bondingCurve.fetch(bondingCurveAccount.publicKey);
      
      assert.ok(account.tokenSupply.eq(buyAmount));
      const expectedCost = calculateBondingCurvePrice(buyAmount, basePrice);
      assert.approximately(
        beforeBalance - afterBalance,
        expectedCost.toNumber(),
        LAMPORTS_PER_SOL / 100
      );
    });

    // ... remaining test cases follow the same pattern of using 
    // bondingCurveAccount.publicKey and mintKeypair.publicKey
  });

  // ... sell tests follow the same pattern

function calculateBondingCurvePrice(amount: anchor.BN, basePrice: anchor.BN): anchor.BN {
  return amount.mul(basePrice);
}

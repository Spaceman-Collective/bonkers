// Every X interval make a roll

import * as anchor from "@coral-xyz/anchor";
import { readFileSync } from "fs";
import { serializeUint64, ByteifyEndianess } from "byteify";
import dotenv from "dotenv";
dotenv.config();
import { Bonkers } from "../target/types/bonkers";
const bonkersIDL = require("../target/idl/bonkers.json");
const BONKERS_KEY = new anchor.web3.PublicKey(
  "DYjXGPz5HGneqvA7jsgRVKTTaeoarCPNCH6pr9Lu2L3F"
);
const CONNECTION = new anchor.web3.Connection(
  process.env.RPC_DEVNET,
  "confirmed"
);

// 1. Load Admin Key
const ADMIN_KEY = anchor.web3.Keypair.fromSecretKey(
  Buffer.from(
    JSON.parse(
      readFileSync(
        "../keypairs/BnKRsvhxmjnvpt7kGFLgBUgRT7NL2hJQzmvxSut4Lg5s.json"
      ).toString()
    )
  )
);

// 2. Load Bonkers Program
const BONKERS_PROGRAM: anchor.Program<Bonkers> = new anchor.Program(
  bonkersIDL,
  BONKERS_KEY,
  { connection: CONNECTION }
);

const gameId = new anchor.BN(5);

main();
async function main() {
  // Fetch current slot
  // Fetch game settings last roll
  let gameSettingsPDA = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("settings"),
      Uint8Array.from(
        serializeUint64(BigInt(gameId.toString()), {
          endianess: ByteifyEndianess.BIG_ENDIAN,
        })
      ),
    ],
    BONKERS_KEY
  )[0];

  let rollSTG1PDA = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("game_rolls_stg1"),
      Uint8Array.from(
        serializeUint64(BigInt(gameId.toString()), {
          endianess: ByteifyEndianess.BIG_ENDIAN,
        })
      ),
    ],
    BONKERS_KEY
  )[0];

  let rollSTG2PDA = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("game_rolls_stg2"),
      Uint8Array.from(
        serializeUint64(BigInt(gameId.toString()), {
          endianess: ByteifyEndianess.BIG_ENDIAN,
        })
      ),
    ],
    BONKERS_KEY
  )[0];

  let gameSettings = await BONKERS_PROGRAM.account.gameSettings.fetch(
    gameSettingsPDA
  );

  // Check if game has started
  let currentSlot = await CONNECTION.getSlot();
  if (currentSlot < gameSettings.stage1Start.toNumber()) {
    // sleep til game start
    await timeout(
      gameSettings.stage1Start.toNumber() -
        currentSlot +
        gameSettings.rollInterval.toNumber() +
        2
    );
  } else {
    while (currentSlot < gameSettings.stage1End.toNumber()) {
      // stage 1
      await timeout(
        (currentSlot % gameSettings.stage1Start.toNumber()) -
          gameSettings.rollInterval.toNumber()
      );

      // Make roll tx
      const ix = await BONKERS_PROGRAM.methods
        .stage1Roll()
        .accounts({
          payer: ADMIN_KEY.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
          gameSettings: gameSettingsPDA,
          gameRolls: rollSTG1PDA,
        })
        .signers([ADMIN_KEY])
        .instruction();

      const { blockhash } = await CONNECTION.getLatestBlockhash();
      const txMsg = new anchor.web3.TransactionMessage({
        payerKey: ADMIN_KEY.publicKey,
        recentBlockhash: blockhash,
        instructions: [ix],
      }).compileToLegacyMessage();
      const tx = new anchor.web3.VersionedTransaction(txMsg);
      tx.sign([ADMIN_KEY]);
      await CONNECTION.sendRawTransaction(tx.serialize(), { maxRetries: 30 });
      console.log(`Made a roll at slot: ${currentSlot}`);
      currentSlot = await CONNECTION.getSlot();
    }

    try {
      // stage 2
      while (true) {
        await timeout(
          (currentSlot % gameSettings.stage1End.toNumber()) -
            gameSettings.rollInterval.toNumber()
        );

        // Make roll tx
        const ix = await BONKERS_PROGRAM.methods
          .stage2Roll()
          .accounts({
            payer: ADMIN_KEY.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
            gameSettings: gameSettingsPDA,
            gameRolls: rollSTG2PDA,
          })
          .signers([ADMIN_KEY])
          .instruction();

        const { blockhash } = await CONNECTION.getLatestBlockhash();
        const txMsg = new anchor.web3.TransactionMessage({
          payerKey: ADMIN_KEY.publicKey,
          recentBlockhash: blockhash,
          instructions: [ix],
        }).compileToLegacyMessage();
        const tx = new anchor.web3.VersionedTransaction(txMsg);
        tx.sign([ADMIN_KEY]);
        await CONNECTION.sendRawTransaction(tx.serialize(), {
          maxRetries: 30,
        });
        console.log(`Made a roll at slot: ${currentSlot}`);
        currentSlot = await CONNECTION.getSlot();
      }
    } catch (e) {
      console.log("Stage 2 rolls failed.");
    }
  }
  console.log("Roller ended!");
}

/**
 *
 * @param slots Number of slots to sleep
 * @returns
 */
function timeout(slots: number) {
  let ms = slots * 500;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

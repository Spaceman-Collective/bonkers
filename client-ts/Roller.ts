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

const gameId = new anchor.BN(6);

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

main();

async function main() {
  let gameSettings = await BONKERS_PROGRAM.account.gameSettings.fetch(
    gameSettingsPDA
  );

  // Check if game has started
  let currentSlot = await CONNECTION.getSlot();
  if (currentSlot < gameSettings.stage1Start.toNumber()) {
    // sleep til game start
    console.log(
      `Sleeping ${
        (gameSettings.stage1Start.toNumber() - currentSlot) * 500
      } ms til start of game!`
    );
    await timeout(gameSettings.stage1Start.toNumber() - currentSlot);
  }

  console.log("Starting roller....");
  while (true) {
    try {
      // If last_rolled + interval < slot, roll either stage 1 or 2
      // else sleep for (last_rolled+interval) - currentSlot
      if (
        gameSettings.lastRolled.toNumber() +
          gameSettings.rollInterval.toNumber() <
        currentSlot
      ) {
        if (currentSlot < gameSettings.stage1End.toNumber()) {
          // stage 1
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
          try {
            await CONNECTION.sendRawTransaction(tx.serialize());
          } catch (e) {
            if (e.toString().includes("0x1772")) {
              console.log("Timeout...");
            } else {
              console.error(e);
            }
          }
          console.log(`Made a stage 1 roll at slot: ${currentSlot}`);
        } else {
          // stage 2
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
            maxRetries: 3,
          });
          console.log(`Made a stage 2 roll at slot: ${currentSlot}`);
        }
      }

      console.log("Roller sleeping til next timeout...");
      gameSettings = await BONKERS_PROGRAM.account.gameSettings.fetch(
        gameSettingsPDA
      );
      currentSlot = await CONNECTION.getSlot();
      await timeout(
        gameSettings.lastRolled.toNumber() +
          gameSettings.rollInterval.toNumber() -
          currentSlot
      );
    } catch (e) {
      console.error("Roller Error: ", e);
    }
  }
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

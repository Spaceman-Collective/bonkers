// In charge of cranking deliquent sleighs

import * as anchor from "@coral-xyz/anchor";
import { readFileSync } from "fs";
import * as spl from "@solana/spl-token";
import { serializeUint64, ByteifyEndianess } from "byteify";
import { encode, decode } from "bs58";
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
const gameId = new anchor.BN(process.env.GAME_ID!);
const rollSTG1PDA = anchor.web3.PublicKey.findProgramAddressSync(
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

const rollSTG2PDA = anchor.web3.PublicKey.findProgramAddressSync(
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

const gameSettingsPDA = anchor.web3.PublicKey.findProgramAddressSync(
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

main();
async function main() {
  let gameSettings = await BONKERS_PROGRAM.account.gameSettings.fetch(
    gameSettingsPDA
  );
  console.log("Game Settings: ", gameSettings);
  let gameIdBuffer = gameId.toArrayLike(Buffer, "le", 8);
  while (
    gameSettings.sleighsBuilt.toNumber() == 0 ||
    gameSettings.sleighsBuilt.toNumber() !=
      gameSettings.sleighsRetired.toNumber()
  ) {
    // Fetch all sleighs by gameId
    let sleighs = await BONKERS_PROGRAM.account.sleigh.all([
      {
        memcmp: {
          offset: 49,
          bytes: encode(gameIdBuffer),
        },
      },
    ]);
    console.log("Sleighs found: ", sleighs.length);

    let currentSlot = await CONNECTION.getSlot();

    // stage 1
    if (
      currentSlot < gameSettings.stage1End.toNumber() &&
      currentSlot > gameSettings.stage1Start.toNumber()
    ) {
      let roll1Acc = await BONKERS_PROGRAM.account.gameRolls.fetch(rollSTG1PDA);
      Promise.all(
        sleighs.map(async (sleigh) => {
          if (
            roll1Acc.rolls.length > sleigh.account.lastClaimedRoll.toNumber()
          ) {
            for (
              let i = 0;
              i <
              roll1Acc.rolls.length -
                sleigh.account.lastClaimedRoll.toNumber() -
                1;
              i++
            ) {
              // Crank this sleigh
              const ix = await BONKERS_PROGRAM.methods
                .claimLevels()
                .accounts({
                  gameSettings: gameSettingsPDA,
                  gameRolls: rollSTG1PDA,
                  sleigh: sleigh.publicKey,
                })
                .instruction();
              const { blockhash } = await CONNECTION.getLatestBlockhash();
              const txMsg = new anchor.web3.TransactionMessage({
                payerKey: ADMIN_KEY.publicKey,
                recentBlockhash: blockhash,
                instructions: [ix],
              }).compileToLegacyMessage();
              const tx = new anchor.web3.VersionedTransaction(txMsg);
              tx.sign([ADMIN_KEY]);
              const sig = await CONNECTION.sendRawTransaction(tx.serialize(), {
                maxRetries: 3,
              });
              await CONNECTION.confirmTransaction(sig);
              console.log(
                `Cranked ${sleigh.account.sleighId.toString()} in Stage 1`
              );
            }
          }
        })
      );
    } else if (currentSlot > gameSettings.stage1End.toNumber()) {
      // stage 2
      let roll2Acc = await BONKERS_PROGRAM.account.gameRolls.fetch(rollSTG2PDA);
      Promise.all(
        sleighs.map(async (sleigh) => {
          if (sleigh.account.builtIndex.eq(new anchor.BN(0))) {
            console.log(
              `Sleigh ${sleigh.account.sleighId.toString()} is not built.`
            );
            return;
          }

          if (sleigh.account.broken) {
            console.log(
              `Sleigh ${sleigh.account.sleighId.toString()} is broken.`
            );
            return;
          }

          if (roll2Acc.rolls.length == 0) {
            console.log("No rolls to process.");
            return;
          }

          if (
            sleigh.account.lastDeliveryRoll.eq(
              new anchor.BN("18446744073709552000")
            ) ||
            sleigh.account.lastDeliveryRoll.lt(
              new anchor.BN(roll2Acc.rolls.length + 2)
            )
          ) {
            // Crank this sleigh
            const propulsionATA = spl.getAssociatedTokenAddressSync(
              gameSettings.propulsionPartsMint,
              sleigh.account.owner
            );
            const landingGearATA = spl.getAssociatedTokenAddressSync(
              gameSettings.landingGearPartsMint,
              sleigh.account.owner
            );
            const navigationATA = spl.getAssociatedTokenAddressSync(
              gameSettings.navigationPartsMint,
              sleigh.account.owner
            );
            const presentsBagATA = spl.getAssociatedTokenAddressSync(
              gameSettings.presentsBagPartsMint,
              sleigh.account.owner
            );

            const ix = await BONKERS_PROGRAM.methods
              .delivery()
              .accounts({
                gameSettings: gameSettingsPDA,
                gameRolls: rollSTG2PDA,
                sleigh: sleigh.publicKey,
                propulsionMint: gameSettings.propulsionPartsMint,
                landingGearMint: gameSettings.landingGearPartsMint,
                navigationMint: gameSettings.navigationPartsMint,
                presentsBagMint: gameSettings.presentsBagPartsMint,
                sleighLandingGearPartsAta: landingGearATA,
                sleighNavigationPartsAta: navigationATA,
                sleighPresentsBagPartsAta: presentsBagATA,
                sleighPropulsionPartsAta: propulsionATA,
                tokenProgram: spl.TOKEN_PROGRAM_ID,
              })
              .instruction();
            const { blockhash } = await CONNECTION.getLatestBlockhash();
            const txMsg = new anchor.web3.TransactionMessage({
              payerKey: ADMIN_KEY.publicKey,
              recentBlockhash: blockhash,
              instructions: [ix],
            }).compileToLegacyMessage();
            const tx = new anchor.web3.VersionedTransaction(txMsg);
            tx.sign([ADMIN_KEY]);
            const sig = await CONNECTION.sendRawTransaction(tx.serialize(), {
              maxRetries: 3,
            });
            await CONNECTION.confirmTransaction(sig);
            console.log(
              `Cranked ${sleigh.account.sleighId.toString()} in Stage 2`
            );
          }
        })
      );
    } else {
      // game not started yet
      await timeout(
        gameSettings.stage1Start.toNumber() -
          currentSlot +
          gameSettings.rollInterval.toNumber()
      );
    }
    console.log("Sleeping for interval and checking sleighs again...");
    // sleep for interval and check sleighs again
    gameSettings = await BONKERS_PROGRAM.account.gameSettings.fetch(
      gameSettingsPDA
    );
    currentSlot = await CONNECTION.getSlot();
    await timeout(gameSettings.rollInterval.toNumber());
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

import * as anchor from "@coral-xyz/anchor";
import { readFileSync } from "fs";
import * as spl from "@solana/spl-token";
import { serializeUint64, ByteifyEndianess } from "byteify";
import { ShadowFile, ShdwDrive } from "@shadow-drive/sdk";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

import { Bonkers } from "../target/types/bonkers";
const bonkersIDL = require("../target/idl/bonkers.json");
const BONKERS_KEY = new anchor.web3.PublicKey(
  "DYjXGPz5HGneqvA7jsgRVKTTaeoarCPNCH6pr9Lu2L3F"
);
const CONNECTION = new anchor.web3.Connection(
  process.env.RPC_DEVNET as string, //"http://127.0.0.1:8899",
  "confirmed"
);
const SHDW_BUCKET = "HpE3jeKxwbkH23Vy7F4q37ta2FrjJw5WnpRgKgDyBK6m";

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

/*
mintSPLTo(
  new anchor.web3.PublicKey("Gx1V34ivZZ1Fq7Rm9ZmogBdDgYZieYKjJU1icSupFuCT"),
  new anchor.web3.PublicKey("6TK6Ti87CFdYHeXjYvXxn6bFxWGyBqW7QuuLFiGwztoj"),
  BigInt(100000000000)
);
*/

debug();

async function debug() {
  const gameId = new anchor.BN(process.env.GAME_ID!);
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
  console.log(gameSettingsPDA.toString());
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
  const gameSettings = await BONKERS_PROGRAM.account.gameSettings.fetch(
    gameSettingsPDA
  );
  console.log("Game Settings: ", gameSettings);
  console.log(`Start: ${gameSettings.stage1Start.toString()}`);
  console.log(`Stage 1 End: ${gameSettings.stage1End.toString()}`);

  const currentSlot = await CONNECTION.getSlot();
  console.log("Current Slot: ", currentSlot);
  console.log(
    "Minutes left til Stage 1 End: ",
    (gameSettings.stage1End.toNumber() - currentSlot) / 120
  );

  console.log(
    "Number of Rolls that should've happened in stage 1: ",
    (currentSlot - gameSettings.stage1Start.toNumber()) /
      gameSettings.rollInterval.toNumber()
  );
  const rolls1 = await BONKERS_PROGRAM.account.gameRolls.fetch(rollSTG1PDA);
  console.log("STG 1 rolls: ", rolls1.rolls.length);
  console.log(rolls1.rolls);

  console.log(
    "Number of Rolls that should've happened in stage 2: ",
    (currentSlot - gameSettings.stage1End.toNumber()) /
      gameSettings.rollInterval.toNumber()
  );
  const rolls2 = await BONKERS_PROGRAM.account.gameRolls.fetch(rollSTG2PDA);
  console.log("STG 2 rolls: ", rolls2.rolls.length);
  console.log(rolls2.rolls);
}

import * as anchor from "@coral-xyz/anchor";
import { readFileSync } from "fs";
import * as spl from "@solana/spl-token";
import { serializeUint64, ByteifyEndianess } from "byteify";

import { Bonkers } from "../target/types/bonkers";
const bonkersIDL = require("../target/idl/bonkers.json");
const BONKERS_KEY = new anchor.web3.PublicKey(
  "DYjXGPz5HGneqvA7jsgRVKTTaeoarCPNCH6pr9Lu2L3F"
);
const CONNECTION = new anchor.web3.Connection(
  "http://127.0.0.1:8899",
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

main();

async function debug() {
  const gameId = new anchor.BN(1);
  console.log(
    Uint8Array.from(
      serializeUint64(BigInt(gameId.toString()), {
        endianess: ByteifyEndianess.BIG_ENDIAN,
      })
    )
  );
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

  console.log(gameSettingsPDA.toString());

  // Correct: 3gS2X2TWj3wJxTJu4svq9mc9fWwyFufzTNvsFqdXaS5W
}

async function main() {
  const gameId = new anchor.BN(1);

  // Assume Bonkers program is deployed to local validator with ADMIN key
  // Create Bonk Token
  const coinMint = await create_bonk_mint();
  // Create Parts Tokens and assign Mint auth to Game Settings
  const partsMints = await mint_parts_tokens(gameId);
  // Initalize Bonkers Game
  await init_bonkers_game(gameId, coinMint, partsMints);
}

async function create_bonk_mint() {
  const mintAddr = await spl.createMint(
    CONNECTION,
    ADMIN_KEY,
    ADMIN_KEY.publicKey,
    ADMIN_KEY.publicKey,
    5
  );

  const admin_ata = await spl.getOrCreateAssociatedTokenAccount(
    CONNECTION,
    ADMIN_KEY,
    mintAddr,
    ADMIN_KEY.publicKey
  );

  await spl.mintTo(
    CONNECTION,
    ADMIN_KEY,
    mintAddr,
    admin_ata.address,
    ADMIN_KEY,
    100000000
  );

  console.log("Mint Created: ", mintAddr.toString());
  console.log("Admin ATA: ", admin_ata.address.toString());
  return mintAddr;
}

async function mint_parts_tokens(gameId: anchor.BN) {
  // Mint Authority is the GameSettings PDA
  const mintAuthority = anchor.web3.PublicKey.findProgramAddressSync(
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

  const propulsionMint = await spl.createMint(
    CONNECTION,
    ADMIN_KEY,
    mintAuthority,
    mintAuthority, //freeze authority
    0
  );
  console.log("Propulsion Mint: ", propulsionMint.toString());

  const landingGearMint = await spl.createMint(
    CONNECTION,
    ADMIN_KEY,
    mintAuthority,
    mintAuthority, //freeze authority
    0
  );
  console.log("Landing Gear Mint: ", landingGearMint.toString());

  const navigationMint = await spl.createMint(
    CONNECTION,
    ADMIN_KEY,
    mintAuthority,
    mintAuthority, //freeze authority
    0
  );
  console.log("Navigation Mint: ", navigationMint.toString());

  const presentsBagMint = await spl.createMint(
    CONNECTION,
    ADMIN_KEY,
    mintAuthority,
    mintAuthority, //freeze authority
    0
  );
  console.log("Presents Bag Mint: ", presentsBagMint.toString());

  return { propulsionMint, landingGearMint, navigationMint, presentsBagMint };
}

async function init_bonkers_game(
  gameId: anchor.BN,
  coinMint: anchor.web3.PublicKey,
  partsMints: {
    propulsionMint: anchor.web3.PublicKey;
    landingGearMint: anchor.web3.PublicKey;
    navigationMint: anchor.web3.PublicKey;
    presentsBagMint: anchor.web3.PublicKey;
  }
) {
  let gameSettings = {
    gameId: gameId,
    highestCurrentStake: new anchor.BN(0),
    stage1Start: new anchor.BN(266031423), // ~ 12 PM Sunday 17th
    stage1End: new anchor.BN(266031423 + 172800), //~ends in 24 hours after start
    lastRolled: new anchor.BN(0),
    rollInterval: new anchor.BN(1800), // ~15m in Slots
    coinMint: coinMint,
    coinDecimals: 5,
    sleighsBuilt: new anchor.BN(0),
    sleighsRetired: new anchor.BN(0),
    mintCostMultiplier: new anchor.BN(0),
    propulsionPartsMint: partsMints.propulsionMint,
    landingGearPartsMint: partsMints.landingGearMint,
    navigationPartsMint: partsMints.navigationMint,
    presentsBagPartsMint: partsMints.presentsBagMint,
    prizePool: new anchor.BN(0),
  };

  console.log("Game Settings: ", JSON.stringify(gameSettings, null, 2));
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

  const ix = await BONKERS_PROGRAM.methods
    .initBonkers(gameSettings)
    .accounts({
      admin: ADMIN_KEY.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
      gameSettings: gameSettingsPDA,
      gameRollsStg1: rollSTG1PDA,
      gameRollsStg2: rollSTG2PDA,
    })
    .signers([])
    .instruction();

  const { blockhash } = await CONNECTION.getLatestBlockhash();
  const txMsg = new anchor.web3.TransactionMessage({
    payerKey: ADMIN_KEY.publicKey,
    recentBlockhash: blockhash,
    instructions: [ix],
  }).compileToLegacyMessage();
  const tx = new anchor.web3.VersionedTransaction(txMsg);
  tx.sign([ADMIN_KEY]);
  await CONNECTION.sendRawTransaction(tx.serialize());
}

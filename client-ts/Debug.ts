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

const addresses = [
  "CXK5oS64p31YGg9wzLMzgN1i6TinRnDRmTLp5q96PH6N",
  "9wNpLXvBUZTyWnTpqMLHFtaCAQbTsUe8iM7GVqZrbRMR",
  "49mVKz5BUUtRsPRv55UMrapwehEYQmTMagZBLmbFAf5M",
  "EiHghhjAswPGXRpwxquVCWbG5rwnXDCTTkithBdK3knp",
  "ANLEir1PVpWqWYcr8r2iBup7uPGgcS6oreLLaqS5otM1",
  "66Aom3TUqQXvhoXtiHSmMXHfVT8zEg3z2dmTtFQRD1Xr",
  "3WNeU2PqNmn16ZhRb9VR1hgni53NEPF8LM8HJ2F6Nts9",
  "7RrStXW4rtPvywrzZH9To2cEGu96h1e9sMwZ3XyU2yao",
  "9N5cqQBpVzKF1Dqwu42YByLRC3Ck2BmjrwE2RxDsBw5M",
  "GsuyNHX76ZGXwisQ2qSyP6nNUgx2DxNtCQXESVswzC6F",
  "3irh8T6rYc8yrwn5YVd3vKYTLaXHsLFJah9zp8GJT7gB",
];

const forceRetireIDs = [];

//mintToList([]);
//debug();
//forceRetire(forceRetireIDs);

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

async function mintToList(addresses: string[]) {
  for (let address of addresses) {
    mintSPLTo(
      new anchor.web3.PublicKey("Gx1V34ivZZ1Fq7Rm9ZmogBdDgYZieYKjJU1icSupFuCT"),
      new anchor.web3.PublicKey(address),
      BigInt(10_000_000_000_00000) //mints 1B to given address
    );
  }
}

async function mintSPLTo(
  mint: anchor.web3.PublicKey,
  recepient: anchor.web3.PublicKey,
  amount: bigint
) {
  const recepientATA = await spl.getOrCreateAssociatedTokenAccount(
    CONNECTION,
    ADMIN_KEY,
    mint,
    recepient
  );

  await spl.mintTo(
    CONNECTION,
    ADMIN_KEY,
    mint,
    recepientATA.address,
    ADMIN_KEY,
    amount
  );

  console.log(
    `Minted ${amount.toString()} of ${mint.toString()} to ${recepient.toString()}`
  );
}

async function forceRetire(sleighIds: string[]) {
  for (let sleighId of sleighIds) {
    const sleighPDA = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("sleigh"),
        Uint8Array.from(
          serializeUint64(BigInt(process.env.GAME_ID), {
            endianess: ByteifyEndianess.BIG_ENDIAN,
          })
        ),
        Uint8Array.from(
          serializeUint64(BigInt(sleighId), {
            endianess: ByteifyEndianess.BIG_ENDIAN,
          })
        ),
      ],
      BONKERS_KEY
    )[0];
    const sleigh = await BONKERS_PROGRAM.account.sleigh.fetch(sleighPDA);
    const gameSettingsPDA = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("settings"),
        Uint8Array.from(
          serializeUint64(BigInt(process.env.GAME_ID), {
            endianess: ByteifyEndianess.BIG_ENDIAN,
          })
        ),
      ],
      BONKERS_KEY
    )[0];
    const gameSettings = await BONKERS_PROGRAM.account.gameSettings.fetch(
      gameSettingsPDA
    );

    const gameSettingsATA = spl.getAssociatedTokenAddressSync(
      gameSettings.coinMint,
      gameSettingsPDA,
      true
    );
    const sleighOwnerATA = spl.getAssociatedTokenAddressSync(
      gameSettings.coinMint,
      sleigh.owner
    );

    const ix = await BONKERS_PROGRAM.methods
      .forceRetire()
      .accounts({
        admin: ADMIN_KEY.publicKey,
        sleigh: sleighPDA,
        sleighOwner: sleigh.owner,
        systemProgram: anchor.web3.SystemProgram.programId,
        gameSettings: gameSettingsPDA,
        gameTokenAta: gameSettingsATA,
        sleighOwnerAta: sleighOwnerATA,
        coinMint: gameSettings.coinMint,
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
    await CONNECTION.sendRawTransaction(tx.serialize());
    console.log(`Retired Sleigh: ${sleighId}`);
  }
}

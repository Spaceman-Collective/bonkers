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

//main();

/*
mintSPLTo(
  new anchor.web3.PublicKey("Gx1V34ivZZ1Fq7Rm9ZmogBdDgYZieYKjJU1icSupFuCT"),
  new anchor.web3.PublicKey("3qwLncThxr13nFMeEANUV8ZR1V6ndQo3F7ky36LwDXhf"),
  BigInt(100000000000)
);
*/

(async () => {
  const gameId = new anchor.BN(5);
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
    "Number of Rolls that should've happened: ",
    (currentSlot - gameSettings.stage1Start.toNumber()) /
      gameSettings.rollInterval.toNumber()
  );
  console.log(await BONKERS_PROGRAM.account.gameRolls.fetch(rollSTG1PDA));
  console.log(await BONKERS_PROGRAM.account.gameRolls.fetch(rollSTG2PDA));
})();

async function main() {
  const gameId = new anchor.BN(5);

  // Assume Bonkers program is deployed to local validator with ADMIN key
  // Create Bonk Token
  const coinMint = await create_bonk_mint(gameId);
  // Create Parts Tokens and assign Mint auth to Game Settings
  //await uploadPartsTokensMetadataForGameID(gameId);
  //const partsMints = await mint_parts_tokens(gameId);
  const partsMints = await mint_parts_tokens_without_metadata(gameId);

  // Initalize Bonkers Game
  await init_bonkers_game(gameId, coinMint, partsMints);
}

async function create_bonk_mint(gameId: anchor.BN) {
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

  const gameATA = await spl.getOrCreateAssociatedTokenAccount(
    CONNECTION,
    ADMIN_KEY,
    mintAddr,
    gameSettingsPDA,
    true
  );

  console.log("Mint Created: ", mintAddr.toString());
  console.log("Admin ATA: ", admin_ata.address.toString());
  console.log("Game ATA", gameATA.toString());
  return mintAddr;
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

async function mint_parts_tokens_without_metadata(gameId: anchor.BN) {
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
  const slot = await CONNECTION.getSlot();
  const SLOTS_PER_MINUTE = 120;
  const INTERVAL_IN_MINUTES = 3;

  let gameSettings = {
    gameId: gameId,
    highestCurrentStake: new anchor.BN(0),
    stage1Start: new anchor.BN(slot),
    stage1End: new anchor.BN(slot + 60 * SLOTS_PER_MINUTE),
    lastRolled: new anchor.BN(0),
    rollInterval: new anchor.BN(INTERVAL_IN_MINUTES * SLOTS_PER_MINUTE),
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
  await CONNECTION.sendRawTransaction(tx.serialize());
}

async function uploadPartsTokensMetadataForGameID(gameId: anchor.BN) {
  const propulsionMetadata = {
    name: `Propulsion Parts - ${gameId.toString()}`,
    symbol: "BNKRS",
    description: `Sleigh parts given as a reward for completing deliveries in game ${gameId.toString()} of It's Bonkers!`,
    image:
      "https://shdw-drive.genesysgo.net/HpE3jeKxwbkH23Vy7F4q37ta2FrjJw5WnpRgKgDyBK6m/propulsion.png",
    external_url: "https://itsbonkers.xyz",
    seller_fee_basis_points: 0,
    attributes: [
      {
        trait_type: "Game ID",
        value: gameId.toString(),
      },
    ],
    properties: {
      files: [
        {
          id: "item",
          uri: "https://shdw-drive.genesysgo.net/HpE3jeKxwbkH23Vy7F4q37ta2FrjJw5WnpRgKgDyBK6m/propulsion.png",
          type: "image/png",
        },
      ],
      category: "image",
      collection: {
        name: "BNKRS",
        family: "BNKRS",
      },
      creators: [
        {
          address: ADMIN_KEY.publicKey.toString(),
          share: 100,
        },
      ],
    },
  };

  const landingGearMetadata = {
    name: `Landing Gear Parts - ${gameId.toString()}`,
    symbol: "BNKRS",
    description: `Sleigh parts given as a reward for completing deliveries in game ${gameId.toString()} of It's Bonkers!`,
    image:
      "https://shdw-drive.genesysgo.net/HpE3jeKxwbkH23Vy7F4q37ta2FrjJw5WnpRgKgDyBK6m/landing_gear.png",
    external_url: "https://itsbonkers.xyz",
    seller_fee_basis_points: 0,
    attributes: [
      {
        trait_type: "Game ID",
        value: gameId.toString(),
      },
    ],
    properties: {
      files: [
        {
          id: "item",
          uri: "https://shdw-drive.genesysgo.net/HpE3jeKxwbkH23Vy7F4q37ta2FrjJw5WnpRgKgDyBK6m/landing_gear.png",
          type: "image/png",
        },
      ],
      category: "image",
      collection: {
        name: "BNKRS",
        family: "BNKRS",
      },
      creators: [
        {
          address: ADMIN_KEY.publicKey.toString(),
          share: 100,
        },
      ],
    },
  };

  const navigationMetadata = {
    name: `Navigation Parts - ${gameId.toString()}`,
    symbol: "BNKRS",
    description: `Sleigh parts given as a reward for completing deliveries in game ${gameId.toString()} of It's Bonkers!`,
    image:
      "https://shdw-drive.genesysgo.net/HpE3jeKxwbkH23Vy7F4q37ta2FrjJw5WnpRgKgDyBK6m/navigation.png",
    external_url: "https://itsbonkers.xyz",
    seller_fee_basis_points: 0,
    attributes: [
      {
        trait_type: "Game ID",
        value: gameId.toString(),
      },
    ],
    properties: {
      files: [
        {
          id: "item",
          uri: "https://shdw-drive.genesysgo.net/HpE3jeKxwbkH23Vy7F4q37ta2FrjJw5WnpRgKgDyBK6m/navigation.png",
          type: "image/png",
        },
      ],
      category: "image",
      collection: {
        name: "BNKRS",
        family: "BNKRS",
      },
      creators: [
        {
          address: ADMIN_KEY.publicKey.toString(),
          share: 100,
        },
      ],
    },
  };

  const presentsBagMetadata = {
    name: `Presents Bag Parts - ${gameId.toString()}`,
    symbol: "BNKRS",
    description: `Sleigh parts given as a reward for completing deliveries in game ${gameId.toString()} of It's Bonkers!`,
    image:
      "https://shdw-drive.genesysgo.net/HpE3jeKxwbkH23Vy7F4q37ta2FrjJw5WnpRgKgDyBK6m/presents_bag.png",
    external_url: "https://itsbonkers.xyz",
    seller_fee_basis_points: 0,
    attributes: [
      {
        trait_type: "Game ID",
        value: gameId.toString(),
      },
    ],
    properties: {
      files: [
        {
          id: "item",
          uri: "https://shdw-drive.genesysgo.net/HpE3jeKxwbkH23Vy7F4q37ta2FrjJw5WnpRgKgDyBK6m/presents_bag.png",
          type: "image/png",
        },
      ],
      category: "image",
      collection: {
        name: "BNKRS",
        family: "BNKRS",
      },
      creators: [
        {
          address: ADMIN_KEY.publicKey.toString(),
          share: 100,
        },
      ],
    },
  };

  let KEY: any = ADMIN_KEY;
  KEY.payer = ADMIN_KEY;
  const drive = await new ShdwDrive(CONNECTION, KEY).init();
  const storageAccount = new anchor.web3.PublicKey(SHDW_BUCKET);

  const propulsionFile: ShadowFile = {
    file: Buffer.from(JSON.stringify(propulsionMetadata, null, 2)),
    name: `propulsion-${gameId.toString()}.json`,
  };
  const navigationFile: ShadowFile = {
    file: Buffer.from(JSON.stringify(navigationMetadata, null, 2)),
    name: `navigation-${gameId.toString()}.json`,
  };
  const presentsBagFile: ShadowFile = {
    file: Buffer.from(JSON.stringify(presentsBagMetadata, null, 2)),
    name: `presents_bag-${gameId.toString()}.json`,
  };
  const landingGearFile: ShadowFile = {
    file: Buffer.from(JSON.stringify(landingGearMetadata, null, 2)),
    name: `landing_gear-${gameId.toString()}.json`,
  };

  const response = await drive.uploadMultipleFiles(storageAccount, [
    propulsionFile,
    navigationFile,
    presentsBagFile,
    landingGearFile,
  ]);

  console.log("File upload response: ", response);
  return response;
}

async function mint_parts_tokens(gameId: anchor.BN): Promise<{
  propulsionMint: anchor.web3.PublicKey;
  landingGearMint: anchor.web3.PublicKey;
  navigationMint: anchor.web3.PublicKey;
  presentsBagMint: anchor.web3.PublicKey;
}> {
  let mintAuthorityPDA = anchor.web3.PublicKey.findProgramAddressSync(
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

  let resources = ["propulsion", "presents_bag", "navigation", "landing_gear"];
  let resourceMints: {
    [resource: string]: string; //resouce => mint
  } = {};
  for (let resource of resources) {
    console.log(`Minting Resource ${resource}`);
    const response: any = await (
      await fetch("https://api.shyft.to/sol/v1/token/create_from_metadata", {
        method: "post",
        headers: {
          "x-api-key": process.env.SHYFT_KEY!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          network: "devnet",
          wallet: mintAuthorityPDA.toString(),
          fee_payer: ADMIN_KEY.publicKey.toString(),
          metadata_uri: `https://shdw-drive.genesysgo.net/HpE3jeKxwbkH23Vy7F4q37ta2FrjJw5WnpRgKgDyBK6m/${resource}-${gameId.toString()}.json`,
          decimals: 0,
        }),
        redirect: "follow",
      })
    ).json();

    if (!response.success) {
      console.error("Trouble minting resource: ", resource);
      console.error(response);
    } else {
      const tx = anchor.web3.Transaction.from(
        Buffer.from(response.result.encoded_transaction, "base64")
      );
      tx.partialSign(ADMIN_KEY);
      const sig = await CONNECTION.sendRawTransaction(tx.serialize());
      console.log(`${resource} Mint tx: ${sig}`);
      resourceMints[resource] = response.result.mint;
    }
  }
  console.log("Resource Mints: ", resourceMints);
  return {
    propulsionMint: new anchor.web3.PublicKey(resourceMints["propulsion"]),
    landingGearMint: new anchor.web3.PublicKey(resourceMints["landing_gear"]),
    navigationMint: new anchor.web3.PublicKey(resourceMints["navigation"]),
    presentsBagMint: new anchor.web3.PublicKey(resourceMints["presents_bag"]),
  };
}

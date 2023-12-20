import * as anchor from "@coral-xyz/anchor";
import * as spl from "@solana/spl-token";
import { Bonkers } from "../target/types/bonkers";
import { randomBytes } from "crypto";
import { ByteifyEndianess, serializeUint64 } from "byteify";
import { encode } from "bs58";

const bonkersIDL = require("../target/idl/bonkers.json");
const BONKERS_KEY = new anchor.web3.PublicKey(
  "DYjXGPz5HGneqvA7jsgRVKTTaeoarCPNCH6pr9Lu2L3F"
);
const CONNECTION = new anchor.web3.Connection(
  process.env.RPC_DEVNET as string, //"http://127.0.0.1:8899",
  "confirmed"
);
const BONKERS_PROGRAM: anchor.Program<Bonkers> = new anchor.Program(
  bonkersIDL,
  BONKERS_KEY,
  { connection: CONNECTION }
);

// Create Sleigh
export async function createSleigh(
  gameId: anchor.BN,
  player: anchor.web3.Keypair,
  stakeAmount: anchor.BN
) {
  const sleighId = randomU64();

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

  const sleighPDA = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("sleigh"),
      Uint8Array.from(
        serializeUint64(BigInt(gameId.toString()), {
          endianess: ByteifyEndianess.BIG_ENDIAN,
        })
      ),
      Uint8Array.from(
        serializeUint64(sleighId, {
          endianess: ByteifyEndianess.BIG_ENDIAN,
        })
      ),
    ],
    BONKERS_KEY
  )[0];

  const gameSettings = await BONKERS_PROGRAM.account.gameSettings.fetch(
    gameSettingsPDA
  );

  const gameTokenATA = spl.getAssociatedTokenAddressSync(
    gameSettings.coinMint,
    gameSettingsPDA,
    true
  );

  const sleighTokenATA = spl.getAssociatedTokenAddressSync(
    gameSettings.coinMint,
    player.publicKey
  );

  const ix = await BONKERS_PROGRAM.methods
    .createSleigh(new anchor.BN(sleighId.toString()), stakeAmount)
    .accounts({
      sleighOwner: player.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
      gameSettings: gameSettingsPDA,
      gameRolls: rollSTG1PDA,
      sleigh: sleighPDA,
      gameTokenAta: gameTokenATA,
      sleighOwnerAta: sleighTokenATA,
      coinMint: gameSettings.coinMint,
      tokenProgram: spl.TOKEN_PROGRAM_ID,
    })
    .signers([player])
    .instruction();

  await signAndSendTx([ix], player);
}

// Sign Up (Create ATAs for given Game ID)
export async function signUp(gameId: anchor.BN, player: anchor.web3.Keypair) {
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

  const gameSettings = await BONKERS_PROGRAM.account.gameSettings.fetch(
    gameSettingsPDA
  );

  Promise.all([
    spl.getOrCreateAssociatedTokenAccount(
      CONNECTION,
      player,
      gameSettings.propulsionPartsMint,
      player.publicKey
    ),
    spl.getOrCreateAssociatedTokenAccount(
      CONNECTION,
      player,
      gameSettings.navigationPartsMint,
      player.publicKey
    ),
    spl.getOrCreateAssociatedTokenAccount(
      CONNECTION,
      player,
      gameSettings.landingGearPartsMint,
      player.publicKey
    ),
    spl.getOrCreateAssociatedTokenAccount(
      CONNECTION,
      player,
      gameSettings.presentsBagPartsMint,
      player.publicKey
    ),
  ]);
}

// Fetch Sleigh(s)
export async function getSleighs(
  gameId: anchor.BN,
  player: anchor.web3.Keypair
) {
  return await BONKERS_PROGRAM.account.sleigh.all([
    {
      memcmp: {
        offset: 8,
        bytes: player.publicKey.toBase58(),
      },
    },
    {
      memcmp: {
        offset: 8 + 32 + 8 + 1,
        bytes: encode(gameId.toArrayLike(Buffer, "le", 8)),
      },
    },
  ]);
}

// Claim Levels
export async function claimNextLevel(
  gameId: anchor.BN,
  player: anchor.web3.Keypair,
  sleighId: anchor.BN
) {
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

  const sleighPDA = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("sleigh"),
      Uint8Array.from(
        serializeUint64(BigInt(gameId.toString()), {
          endianess: ByteifyEndianess.BIG_ENDIAN,
        })
      ),
      Uint8Array.from(
        serializeUint64(BigInt(sleighId.toString()), {
          endianess: ByteifyEndianess.BIG_ENDIAN,
        })
      ),
    ],
    BONKERS_KEY
  )[0];

  const ix = await BONKERS_PROGRAM.methods
    .claimLevels()
    .accounts({
      gameSettings: gameSettingsPDA,
      gameRolls: rollSTG1PDA,
      sleigh: sleighPDA,
    })
    .signers([])
    .instruction();

  await signAndSendTx([ix], player);
}

// Delivery
export async function delivery(
  gameId: anchor.BN,
  player: anchor.web3.Keypair,
  sleighId: anchor.BN
) {
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
  const gameSettings = await BONKERS_PROGRAM.account.gameSettings.fetch(
    gameSettingsPDA
  );

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

  const sleighPDA = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("sleigh"),
      Uint8Array.from(
        serializeUint64(BigInt(gameId.toString()), {
          endianess: ByteifyEndianess.BIG_ENDIAN,
        })
      ),
      Uint8Array.from(
        serializeUint64(BigInt(sleighId.toString()), {
          endianess: ByteifyEndianess.BIG_ENDIAN,
        })
      ),
    ],
    BONKERS_KEY
  )[0];

  const propulsionATA = spl.getAssociatedTokenAddressSync(
    gameSettings.propulsionPartsMint,
    player.publicKey
  );
  const landingGearATA = spl.getAssociatedTokenAddressSync(
    gameSettings.landingGearPartsMint,
    player.publicKey
  );
  const navigationATA = spl.getAssociatedTokenAddressSync(
    gameSettings.navigationPartsMint,
    player.publicKey
  );
  const presentsBagATA = spl.getAssociatedTokenAddressSync(
    gameSettings.presentsBagPartsMint,
    player.publicKey
  );

  const ix = await BONKERS_PROGRAM.methods
    .delivery()
    .accounts({
      gameSettings: gameSettingsPDA,
      gameRolls: rollSTG2PDA,
      sleigh: sleighPDA,
      sleighLandingGearPartsAta: landingGearATA,
      sleighNavigationPartsAta: navigationATA,
      sleighPresentsBagPartsAta: presentsBagATA,
      sleighPropulsionPartsAta: propulsionATA,
      navigationMint: gameSettings.navigationPartsMint,
      landingGearMint: gameSettings.landingGearPartsMint,
      presentsBagMint: gameSettings.presentsBagPartsMint,
      propulsionMint: gameSettings.propulsionPartsMint,
      tokenProgram: spl.TOKEN_PROGRAM_ID,
    })
    .signers([])
    .instruction();

  await signAndSendTx([ix], player);
}

// Repair
export async function repair(
  gameId: anchor.BN,
  player: anchor.web3.Keypair,
  sleighId: anchor.BN,
  propulsionRepair: number,
  landingGearRepair: number,
  navigationRepair: number,
  presentsBagRepair: number
) {
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
  const gameSettings = await BONKERS_PROGRAM.account.gameSettings.fetch(
    gameSettingsPDA
  );
  const sleighPDA = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("sleigh"),
      Uint8Array.from(
        serializeUint64(BigInt(gameId.toString()), {
          endianess: ByteifyEndianess.BIG_ENDIAN,
        })
      ),
      Uint8Array.from(
        serializeUint64(BigInt(sleighId.toString()), {
          endianess: ByteifyEndianess.BIG_ENDIAN,
        })
      ),
    ],
    BONKERS_KEY
  )[0];

  const propulsionATA = spl.getAssociatedTokenAddressSync(
    gameSettings.propulsionPartsMint,
    player.publicKey
  );
  const landingGearATA = spl.getAssociatedTokenAddressSync(
    gameSettings.landingGearPartsMint,
    player.publicKey
  );
  const navigationATA = spl.getAssociatedTokenAddressSync(
    gameSettings.navigationPartsMint,
    player.publicKey
  );
  const presentsBagATA = spl.getAssociatedTokenAddressSync(
    gameSettings.presentsBagPartsMint,
    player.publicKey
  );

  const ix = await BONKERS_PROGRAM.methods
    .repair(
      propulsionRepair,
      landingGearRepair,
      navigationRepair,
      presentsBagRepair
    )
    .accounts({
      sleighOwner: player.publicKey,
      gameSettings: gameSettingsPDA,
      sleigh: sleighPDA,
      sleighLandingGearPartsAta: landingGearATA,
      sleighNavigationPartsAta: navigationATA,
      sleighPresentsBagPartsAta: presentsBagATA,
      sleighPropulsionPartsAta: propulsionATA,
      navigationMint: gameSettings.navigationPartsMint,
      propulsionMint: gameSettings.propulsionPartsMint,
      landingGearMint: gameSettings.landingGearPartsMint,
      presentsBagMint: gameSettings.presentsBagPartsMint,
      tokenProgram: spl.TOKEN_PROGRAM_ID,
    })
    .signers([player])
    .instruction();

  await signAndSendTx([ix], player);
}

// Retire
export async function retire(
  gameId: anchor.BN,
  player: anchor.web3.Keypair,
  sleighId: anchor.BN
) {
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
  const gameSettings = await BONKERS_PROGRAM.account.gameSettings.fetch(
    gameSettingsPDA
  );
  const sleighPDA = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("sleigh"),
      Uint8Array.from(
        serializeUint64(BigInt(gameId.toString()), {
          endianess: ByteifyEndianess.BIG_ENDIAN,
        })
      ),
      Uint8Array.from(
        serializeUint64(BigInt(sleighId.toString()), {
          endianess: ByteifyEndianess.BIG_ENDIAN,
        })
      ),
    ],
    BONKERS_KEY
  )[0];

  const ix = await BONKERS_PROGRAM.methods
    .retire()
    .accounts({
      sleighOwner: player.publicKey,
      sleigh: sleighPDA,
      gameSettings: gameSettingsPDA,
      systemProgram: anchor.web3.SystemProgram.programId,
      gameTokenAta: gameSettings.coinMint,
      tokenProgram: spl.TOKEN_PROGRAM_ID,
    })
    .signers([player])
    .instruction();

  await signAndSendTx([ix], player);
}

// Get Balances
export async function getBalances(
  gameId: anchor.BN,
  player: anchor.web3.Keypair
) {
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
  const gameSettings = await BONKERS_PROGRAM.account.gameSettings.fetch(
    gameSettingsPDA
  );

  const gameTokenBalance = (
    await spl.getAccount(
      CONNECTION,
      spl.getAssociatedTokenAddressSync(gameSettings.coinMint, player.publicKey)
    )
  ).amount;

  const propulsionPartsBalance = (
    await spl.getAccount(
      CONNECTION,
      spl.getAssociatedTokenAddressSync(
        gameSettings.propulsionPartsMint,
        player.publicKey
      )
    )
  ).amount;

  const navigationPartsBalance = (
    await spl.getAccount(
      CONNECTION,
      spl.getAssociatedTokenAddressSync(
        gameSettings.navigationPartsMint,
        player.publicKey
      )
    )
  ).amount;

  const landingGearPartsBalance = (
    await spl.getAccount(
      CONNECTION,
      spl.getAssociatedTokenAddressSync(
        gameSettings.landingGearPartsMint,
        player.publicKey
      )
    )
  ).amount;

  const presentsBagPartsBalance = (
    await spl.getAccount(
      CONNECTION,
      spl.getAssociatedTokenAddressSync(
        gameSettings.presentsBagPartsMint,
        player.publicKey
      )
    )
  ).amount;

  return {
    gameTokenBalance,
    propulsionPartsBalance,
    navigationPartsBalance,
    landingGearPartsBalance,
    presentsBagPartsBalance,
  };
}

//////// UTIL Functions
const randomU64 = (): bigint => {
  return BigInt(`0x${randomBytes(8).toString("hex")}`);
};

async function signAndSendTx(
  ixs: anchor.web3.TransactionInstruction[],
  payer: anchor.web3.Keypair
) {
  const { blockhash } = await CONNECTION.getLatestBlockhash();
  const txMsg = new anchor.web3.TransactionMessage({
    payerKey: payer.publicKey,
    recentBlockhash: blockhash,
    instructions: ixs,
  }).compileToLegacyMessage();
  const tx = new anchor.web3.VersionedTransaction(txMsg);
  tx.sign([payer]);
  await CONNECTION.sendRawTransaction(tx.serialize());
}

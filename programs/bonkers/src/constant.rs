use anchor_lang::prelude::*;

pub const PREFIX_GAME_SETTINGS: &[u8; 8] = b"settings";
pub const PREFIX_GAME_ROLL_STG1: &[u8; 15] = b"game_rolls_stg1";
pub const PREFIX_GAME_ROLL_STG2: &[u8; 15] = b"game_rolls_stg2";
pub const PREFIX_SLEIGH: &[u8; 6] = b"sleigh";

pub const ADMIN_ADDRESS: Pubkey = Pubkey::new_from_array([
    160, 48, 215, 228, 143, 160, 237, 120, 100, 83, 166, 6, 110, 2, 184, 113, 107, 65, 5, 174, 28,
    55, 52, 5, 114, 178, 231, 179, 54, 62, 53, 30,
]); // BnKRsvhxmjnvpt7kGFLgBUgRT7NL2hJQzmvxSut4Lg5s

pub const BASE_RESOURCE_DRIP: u64 = 50;
pub const SHDW_BASE_URL: &str =
    "https://shdw-drive.genesysgo.net/HpE3jeKxwbkH23Vy7F4q37ta2FrjJw5WnpRgKgDyBK6m";

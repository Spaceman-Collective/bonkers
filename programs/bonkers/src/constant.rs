use anchor_lang::prelude::*;

pub const PREFIX_GAME_SETTINGS: &[u8; 8] = b"settings";
pub const PREFIX_GAME_ROLLS: &[u8; 10] = b"game_rolls";
pub const PREFIX_SLEIGH: &[u8; 6] = b"sleigh";

pub const ADMIN_ADDRESS: Pubkey = Pubkey::new_from_array([
    160, 48, 215, 228, 143, 160, 237, 120, 100, 83, 166, 6, 110, 2, 184, 113, 107, 65, 5, 174, 28,
    55, 52, 5, 114, 178, 231, 179, 54, 62, 53, 30,
]); // BnKRsvhxmjnvpt7kGFLgBUgRT7NL2hJQzmvxSut4Lg5s

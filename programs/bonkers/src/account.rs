use anchor_lang::prelude::*;

pub trait MaxSize {
    fn get_max_size() -> usize;
}

#[account]
pub struct GameSettings {
    pub game_id: u64,                    // random id for the game
    pub total_stake: u64,                // Used in Stage 1 to determine roll max
    pub stage1_start: u64,               // Slot number when stage 1 starts
    pub stage1_end: u64,                 // Slot Number when no more stake is allowed to be put in.
    pub last_rolled: u64,                // last time a roll was preformed
    pub roll_interval: u64, // last_rolled + roll_interval is when next roll should take place
    pub coin_mint: Pubkey,  // the coin (Bonk on mainnet) which is used to do all transactions
    pub coin_decimals: u8,  // number of decimals the coin has
    pub sleighs_staked: u64, // total sleighs staked
    pub sleighs_built: u64, // total number of sleighs built
    pub sleighs_retired: u64, // total number of sleighs retired. game is over when this equals built
    pub mint_cost_multiplier: u64, // sleighs_built*mint_cost_multiplier = cost for next stake
    pub propulsion_parts_mint: Pubkey, // The mint address for this resource instance for this game
    pub landing_gear_parts_mint: Pubkey, // The mint address for this resource instance for this game
    pub navigation_parts_mint: Pubkey, // The mint address for this resource instance for this game
    pub presents_bag_parts_mint: Pubkey, // The mint address for this resource instance for this game
    pub prize_pool: u64,
}

impl MaxSize for GameSettings {
    fn get_max_size() -> usize {
        return 8 + 8 + 8 + 8 + 8 + 8 + 8 + 32 + 1 + 8 + 8 + 8 + 32 + 32 + 32 + 32 + 8;
    }
}

#[account]
pub struct GameRolls {
    pub rolls: Vec<u64>,
}

// returns min count, but will be expanded as each roll is added
impl MaxSize for GameRolls {
    fn get_max_size() -> usize {
        return 4 + 8;
    }
}

#[account]
pub struct Sleigh {
    pub owner: Pubkey,
    pub sleigh_id: u64,
    pub level: u8,
    pub game_id: u64,            // used to search for game accounts by server
    pub built_index: u64,        // set to 0 if unconfirmed so far, first sleigh is index 1
    pub mint_cost: u64, // mint cost paid to build the sleigh // 0 to start as it'll be unconfirmed
    pub stake_amt: u64, // includes mint amt because at start mint amount is not deducted. when returning spoils, use (stake-mint) * 70% + spoils
    pub broken: bool, // if broken, cannot produce any more resources, and can only be scuttled (or rez'd at 70% stake)
    pub staked_after_roll: u64, // the idx of the roll that this was built *after* so they can't claim previous rolls
    pub last_claimed_roll: u64, // up to the last largest idx that was claimed
    pub last_delivery_roll: u64, // stage 2 rolls

    // Parts
    pub propulsion_hp: u8,
    pub landing_gear_hp: u8,
    pub navigation_hp: u8,
    pub presents_bag_hp: u8,
}

impl MaxSize for Sleigh {
    fn get_max_size() -> usize {
        return 32 + 8 + 1 + 8 + 8 + 8 + 8 + 1 + 8 + 8 + 8 + 4;
    }
}

use anchor_lang::prelude::*;
use anchor_lang::solana_program::hash::*;
use anchor_spl::token::{transfer_checked, TransferChecked};
use std::collections::HashSet;

declare_id!("DYjXGPz5HGneqvA7jsgRVKTTaeoarCPNCH6pr9Lu2L3F");

pub mod account;
pub mod constant;
pub mod context;
pub mod error;

use crate::account::*;
//use crate::constant::*;
use crate::context::*;
use crate::error::*;

#[program]
pub mod bonkers {
    use super::*;

    /**
     * Creates the Roll account for the game
     * Creates Setting account for the game
     *  Set the start time for stage 1 and roll interval and end time for stage 1
     * ~~ (Done with init script)~~ Create the Bonk ATA for the GameSettings PDA
     */
    pub fn init_bonkers(ctx: Context<InitBonkers>, init: GameSettings) -> Result<()> {
        ctx.accounts.game_settings.game_id = init.game_id;
        ctx.accounts.game_settings.highest_current_stake = 0;
        ctx.accounts.game_settings.stage1_start = init.stage1_start;
        ctx.accounts.game_settings.stage1_end = init.stage1_end;
        ctx.accounts.game_settings.last_rolled = init.stage1_start;
        ctx.accounts.game_settings.roll_interval = init.roll_interval;
        ctx.accounts.game_settings.coin_mint = init.coin_mint;
        ctx.accounts.game_settings.coin_decimals = init.coin_decimals;
        ctx.accounts.game_settings.sleighs_built = 0;
        ctx.accounts.game_settings.total_spoils = 0;
        ctx.accounts.game_settings.mint_cost_multiplier = init.mint_cost_multiplier;
        Ok(())
    }

    /**
     * Anyone can call this function if enough time has passed since the last call
     * maxes out at 1250 rolls
     */
    pub fn stage1_roll(ctx: Context<Stage1Roll>) -> Result<()> {
        let game_settings = &ctx.accounts.game_settings;
        let slot = Clock::get().unwrap().slot;

        // Check if game has started
        if game_settings.stage1_start > slot {
            return err!(BonkersError::GameNotStarted);
        }
        // Check Stage 1 has ended
        if game_settings.stage1_end < slot {
            return err!(BonkersError::Stage1Ended);
        }
        // Check if enough slots have elapsed since last roll
        if game_settings.last_rolled + game_settings.roll_interval > slot {
            return err!(BonkersError::RollTimerCooldown);
        }

        // Roll a number based on highest stake + 1
        let random_number = get_random_u64(game_settings.highest_current_stake + 1);

        // Store to rolls
        ctx.accounts.game_rolls.rolls.push(random_number);

        // Update last rolled
        ctx.accounts.game_settings.last_rolled = slot;
        Ok(())
    }

    /**
     * Create a stake account that's an unconfirmed sleigh
     * Transfers bonk to the Bonk ATA for the GameSettingsPDA
     * Tracks the Roll Index at which it was created, cannot claim any levels from before that index
     * CHECK; stake_amt < current min mint price, if so just throw error
     * CANNOT BE WITHDRAWN UNTIL STAGE 2
     */
    pub fn create_sleigh(
        ctx: Context<CreateSleigh>,
        _sleigh_id: u64,
        stake_amt: u64,
    ) -> Result<()> {
        let game_settings = &mut ctx.accounts.game_settings;

        // CHECK; stake_amt < current min mint price, if so just throw error
        let current_mint_cost = game_settings.sleighs_built * game_settings.mint_cost_multiplier;
        if stake_amt < current_mint_cost {
            return err!(BonkersError::StakeAmtBelowCurrentMintCost);
        }

        // Transfer Stake to Game Settings ATA
        transfer_checked(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    from: ctx.accounts.sleigh_owner_ata.to_account_info(),
                    to: ctx.accounts.game_token_ata.to_account_info(),
                    authority: ctx.accounts.sleigh_owner.to_account_info(),
                    mint: ctx.accounts.coin_mint.to_account_info(),
                },
            ),
            stake_amt,
            game_settings.coin_decimals,
        )?;

        // Update Game Settings PDA with highest current stake if applicable
        if stake_amt > game_settings.highest_current_stake {
            game_settings.highest_current_stake = stake_amt
        }

        // Create Sleigh account
        let sleigh = &mut ctx.accounts.sleigh;
        sleigh.owner = ctx.accounts.sleigh_owner.key();
        sleigh.level = 0; // set to 1 after being built
        sleigh.game_id = game_settings.game_id;
        sleigh.built_index = 0; // 0 for unconfirmed sleighs, # for built ones
        sleigh.mint_cost = 0; //0 until minted
        sleigh.stake_amt = stake_amt;
        sleigh.broken = false; //only changed after stage 2 malfunctions
        sleigh.staked_after_roll = ctx.accounts.game_rolls.rolls.len() as u64 - 1;

        // Parts (not applicable til stage 2)
        sleigh.propulsion_status = true;
        sleigh.propulsion_repaired = 0;
        sleigh.landing_gear_status = true;
        sleigh.landing_gear_repaired = 0;
        sleigh.navigation_status = true;
        sleigh.navigation_repaired = 0;
        sleigh.presents_bag_status = true;
        sleigh.presents_bag_repaired = 0;

        Ok(())
    }

    /**
     * Pass in Roll Indexes since last claim (do the calculations off chain) that earn levels
     * Can only be called by stake account otherwise someone could skip claims
     * Can no longer claim levels if game is on stage 2
     * If they have claims, but their stake amount is less than current mint cost (sleighs built + multiplier), they have to wait and recover the account in stage 2
     * Basically they're SOL for not confirming sooner
     * CHECK: How many levels you can claim per transaction due to compute limit
     */
    pub fn claim_levels(ctx: Context<ClaimLevels>, roll_idxs: Vec<u64>) -> Result<()> {
        // Check if Stage 1 is still going on
        let clock = Clock::get().unwrap();
        let slot = clock.slot;
        let game_settings = &mut ctx.accounts.game_settings;
        if game_settings.stage1_end > slot {
            return err!(BonkersError::Stage1Ended);
        }

        let sleigh = &mut ctx.accounts.sleigh;
        let mut heighest_claim_checked = sleigh.last_checked_roll;
        let mut checked_idxs: HashSet<u64> = HashSet::new();
        for idx in roll_idxs {
            // Check that the roll is past last_checked_roll and staked_after_roll
            if idx < sleigh.staked_after_roll || idx < sleigh.last_checked_roll {
                return err!(BonkersError::InvalidRollForClaim);
            }

            // Check to make sure idx wasn't passed in twice
            if checked_idxs.contains(&idx) {
                return err!(BonkersError::InvalidRollForClaim);
            }
            checked_idxs.insert(idx);

            // Check that the roll is bellow the stake amt
            // If idx is passed that can't be fetched (as if the idx is greater than current rolls, we just treat it as u64::MAX so we can compute all other rolls)
            let roll = ctx
                .accounts
                .game_rolls
                .rolls
                .get(idx as usize)
                .unwrap_or_else(|| return &u64::MAX);

            if sleigh.stake_amt > *roll {
                // Either move to lvl 1 and mint
                // Or upgrade level
                if sleigh.level == 0 {
                    let current_mint_cost = game_settings
                        .sleighs_built
                        .checked_mul(game_settings.mint_cost_multiplier)
                        .unwrap_or(u64::MAX);

                    if sleigh.stake_amt < current_mint_cost {
                        return err!(BonkersError::StakeAmtBelowCurrentMintCost);
                    } else {
                        sleigh.level = 1;
                        sleigh.mint_cost = current_mint_cost;
                        sleigh.built_index = game_settings.sleighs_built + 1;
                        game_settings.sleighs_built += 1;
                    }
                } else {
                    // If it's already level 256 (unlikely) then it can't go any higher
                    sleigh.level = sleigh.level.checked_add(1).unwrap_or(sleigh.level);
                }
            }

            /*
             * This protects against people sending in idxes to check out of order
             * ie, if they send 10, 3, 5
             */
            if idx > heighest_claim_checked {
                heighest_claim_checked = idx
            }
        }
        sleigh.last_checked_roll = heighest_claim_checked;

        Ok(())
    }

    // stage2_roll
}

pub fn get_random_u64(max: u64) -> u64 {
    let clock = Clock::get().unwrap();
    let slice = &hash(&clock.slot.to_be_bytes()).to_bytes()[0..8];
    let num: u64 = u64::from_be_bytes(slice.try_into().unwrap());
    let target = num / (u64::MAX / max);
    return target;
}

/*
   Stake
       -> (needs SPL token) Create Stake Account by depositing an amount of BONK
       -> Create Roll Account
       -> Add Roll (Roll max is highest stake + 1)
       -> Claim points by passing in roll indexes (Track claimed indexes by tracking highest claimed index)
*/

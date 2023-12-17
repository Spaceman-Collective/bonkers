use anchor_lang::prelude::*;
use anchor_lang::solana_program::hash::*;
use anchor_spl::token::{mint_to, transfer_checked, MintTo, TransferChecked};
use std::collections::HashSet;

declare_id!("DYjXGPz5HGneqvA7jsgRVKTTaeoarCPNCH6pr9Lu2L3F");

pub mod account;
pub mod constant;
pub mod context;
pub mod error;

use crate::account::*;
use crate::constant::*;
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
     * ~~ (Done with init script)~~ Create Resource SPL Tokens with Metadata and ascribe mint authority to Game Settings PDA
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
        ctx.accounts.game_settings.propulsion_parts_mint = init.propulsion_parts_mint;
        ctx.accounts.game_settings.landing_gear_parts_mint = init.landing_gear_parts_mint;
        ctx.accounts.game_settings.navigation_parts_mint = init.navigation_parts_mint;
        ctx.accounts.game_settings.presents_bag_parts_mint = init.presents_bag_parts_mint;

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

        // Roll a number based on highest stake
        let random_number = get_random_u64(2 * game_settings.highest_current_stake);

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
        //starts at the roll it was staked after but theoretically should be after its *built*
        sleigh.last_checked_roll = ctx.accounts.game_rolls.rolls.len() as u64 - 1;
        sleigh.last_delivery_roll = 0; // every stage 2 roll needs to be processed so we start at idx 0

        // Parts (not applicable til stage 2)
        sleigh.propulsion_hp = u8::MAX;
        sleigh.landing_gear_hp = u8::MAX;
        sleigh.navigation_hp = u8::MAX;
        sleigh.presents_bag_hp = u8::MAX;
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

    /**
     * Can be called by anyone if stage 1 has ended and stage 2 has started.
     */
    pub fn stage2_roll(ctx: Context<Stage2Roll>) -> Result<()> {
        let game_settings = &ctx.accounts.game_settings;
        let slot = Clock::get().unwrap().slot;

        // Check Stage 1 has ended
        if game_settings.stage1_end > slot {
            return err!(BonkersError::Stage1NotOver);
        }

        // Check if enough slots have elapsed since last roll
        if game_settings.last_rolled + game_settings.roll_interval > slot {
            return err!(BonkersError::RollTimerCooldown);
        }

        // Roll a number (it's used in different ways when processing for delivery)
        let random_number = get_random_u64(u64::MAX);

        // Store to rolls
        ctx.accounts.game_rolls.rolls.push(random_number);

        // Update last rolled
        ctx.accounts.game_settings.last_rolled = slot;
        Ok(())
    }

    /**
     * Can be called by anyone once stage 2 has started for any any sleigh
     * Processes the next available roll for each sleigh, can process only one at a time
     * In that roll, it'll figure out what resource to mint for the user
     * and what malfunctions to apply due to the delivery.
     */
    pub fn delivery(ctx: Context<Delivery>) -> Result<()> {
        let game_settings = &ctx.accounts.game_settings;
        let slot = Clock::get().unwrap().slot;
        let sleigh = &mut ctx.accounts.sleigh;

        // Check Stage 1 has ended
        if game_settings.stage1_end > slot {
            return err!(BonkersError::Stage1NotOver);
        }

        // Check to make sure the sleigh isn't broken
        if sleigh.broken {
            return err!(BonkersError::SleighBroken);
        }

        // Get the next Roll to process
        let roll_idx = sleigh.last_delivery_roll + 1;
        let roll = ctx
            .accounts
            .game_rolls
            .rolls
            .get(roll_idx as usize)
            .unwrap();

        // Confirm Malfunction
        // Check if the Sleigh was damaged
        // range of selection starts at 1% and grows by 1% every roll interval
        let range_of_selection =
            ((1 + sleigh.last_delivery_roll) / 100) * game_settings.sleighs_built;

        // Check which parts were damaged
        // this picks a random number between 0 and total number of slieghs
        // then wraps around the range selection if the range its greater than sleighs built
        // ie 100 sleighs built, number chosen is 90, and range is 20, the selection would be
        // 90-100 && 0-10
        let start_range = roll % game_settings.sleighs_built;
        let mut end_range = start_range + range_of_selection;
        let mut overflow_range: u64 = 0;
        if end_range > game_settings.sleighs_built {
            overflow_range = end_range - game_settings.sleighs_built;
            end_range = game_settings.sleighs_built;
        }

        if (sleigh.built_index >= start_range && sleigh.built_index <= end_range)
            || (sleigh.built_index > 0 && sleigh.built_index <= overflow_range)
        {
            // Sleigh had a malfunction, let's figure out how much damage each part took
            // we use first 4 bytes (u8) of the roll to determine 4 points of damage
            // we also divide each of these values by half so we aren't doing massive amounts of damage each roll
            let propulsion_dmg = roll.to_be_bytes()[0] / 2;
            let landing_gear_dmg = roll.to_be_bytes()[1] / 2;
            let navigation_dmg = roll.to_be_bytes()[2] / 2;
            let presents_bag_dmg = roll.to_be_bytes()[3] / 2;

            if propulsion_dmg > 1 {
                if sleigh.propulsion_hp == 0 {
                    // if hp was already 0 and it takes damage, then sleigh is broken
                    sleigh.broken = true;
                    return Ok(());
                } else {
                    // sleigh takes damage
                    if propulsion_dmg > sleigh.propulsion_hp {
                        sleigh.propulsion_hp = 0;
                    } else {
                        sleigh.propulsion_hp -= propulsion_dmg;
                    }
                }
            }

            if landing_gear_dmg > 1 {
                if sleigh.landing_gear_hp == 0 {
                    // if hp was already 0 and it takes damage, then sleigh is broken
                    sleigh.broken = true;
                    return Ok(());
                } else {
                    // sleigh takes damage
                    if landing_gear_dmg > sleigh.landing_gear_hp {
                        sleigh.landing_gear_hp = 0;
                    } else {
                        sleigh.landing_gear_hp -= landing_gear_dmg;
                    }
                }
            }

            if navigation_dmg > 1 {
                if sleigh.navigation_hp == 0 {
                    // if hp was already 0 and it takes damage, then sleigh is broken
                    sleigh.broken = true;
                    return Ok(());
                } else {
                    // sleigh takes damage
                    if navigation_dmg > sleigh.navigation_hp {
                        sleigh.navigation_hp = 0;
                    } else {
                        sleigh.navigation_hp -= navigation_dmg;
                    }
                }
            }

            if presents_bag_dmg > 1 {
                if sleigh.presents_bag_hp == 0 {
                    // if hp was already 0 and it takes damage, then sleigh is broken
                    sleigh.broken = true;
                    return Ok(());
                } else {
                    // sleigh takes damage
                    if presents_bag_dmg > sleigh.presents_bag_hp {
                        sleigh.presents_bag_hp = 0;
                    } else {
                        sleigh.presents_bag_hp -= presents_bag_dmg;
                    }
                }
            }
        }

        // Mint Resources
        // Figure out which of the four resources they get this roll
        let resource_roll: u32 = (roll & 0xFFFFFFFF) as u32;
        let resource_selected = resource_roll % 4; // will give 0,1,2,3 as a result
        let resource_collection_amount = BASE_RESOURCE_DRIP
            * ((sleigh.level as u64 * BASE_RESOURCE_DRIP) / (2_u64.pow(sleigh.level as u32)));

        let game_id = game_settings.game_id.to_be_bytes();

        let game_setting_seeds: &[&[u8]] = &[
            PREFIX_GAME_SETTINGS,
            game_id.as_ref(),
            &[ctx.bumps.game_settings],
        ];
        let signer_seeds = &[game_setting_seeds];

        match resource_selected {
            0 => {
                // propulsion parts
                mint_to(
                    CpiContext::new_with_signer(
                        ctx.accounts.token_program.to_account_info(),
                        MintTo {
                            mint: ctx.accounts.propulsion_mint.to_account_info(),
                            to: ctx.accounts.sleigh_propulsion_parts_ata.to_account_info(),
                            authority: ctx.accounts.game_settings.to_account_info(),
                        },
                        signer_seeds,
                    ),
                    resource_collection_amount,
                )?;
            }
            1 => {
                // landing_gear parts
                mint_to(
                    CpiContext::new_with_signer(
                        ctx.accounts.token_program.to_account_info(),
                        MintTo {
                            mint: ctx.accounts.landing_gear_mint.to_account_info(),
                            to: ctx.accounts.sleigh_landing_gear_parts_ata.to_account_info(),
                            authority: ctx.accounts.game_settings.to_account_info(),
                        },
                        signer_seeds,
                    ),
                    resource_collection_amount,
                )?;
            }
            2 => {
                // navigation parts
                mint_to(
                    CpiContext::new_with_signer(
                        ctx.accounts.token_program.to_account_info(),
                        MintTo {
                            mint: ctx.accounts.navigation_mint.to_account_info(),
                            to: ctx.accounts.sleigh_navigation_parts_ata.to_account_info(),
                            authority: ctx.accounts.game_settings.to_account_info(),
                        },
                        signer_seeds,
                    ),
                    resource_collection_amount,
                )?;
            }
            3 => {
                // presents_bag parts
                mint_to(
                    CpiContext::new_with_signer(
                        ctx.accounts.token_program.to_account_info(),
                        MintTo {
                            mint: ctx.accounts.presents_bag_mint.to_account_info(),
                            to: ctx.accounts.sleigh_presents_bag_parts_ata.to_account_info(),
                            authority: ctx.accounts.game_settings.to_account_info(),
                        },
                        signer_seeds,
                    ),
                    resource_collection_amount,
                )?;
            }
            _ => {
                // should never happen
            }
        }

        Ok(())
    }

    pub fn repair(ctx: Context<Repair>) -> Result<()> {
        Ok(())
    }

    pub fn retire(ctx: Context<Retire>) -> Result<()> {
        Ok(())
    }

    pub fn elvish_coffee(ctx: Context<AdminWithdraw>) -> Result<()> {
        Ok(())
    }
}

pub fn get_random_u64(max: u64) -> u64 {
    let clock = Clock::get().unwrap();
    let slice = &hash(&clock.slot.to_be_bytes()).to_bytes()[0..8];
    let num: u64 = u64::from_be_bytes(slice.try_into().unwrap());
    let target = num / (u64::MAX / max);
    return target;
}

/*
   Stg 1
       -> (needs SPL token) Create Stake Account by depositing an amount of BONK
       -> Create Roll Account
       -> Add Roll (Roll max is highest stake + 1)
       -> Claim points by passing in roll indexes (Track claimed indexes by tracking highest claimed index)

    Stg 2
       -> /roll
        -> similar to stg1, increments every interval
       -> /delivery
        -> mints resources AND uncovers the malfunction for your sleigh (if any)
      -> /retire
        -> scuttles the sleigh
      -> /repair
        -> spends resources to fix the sleigh
        -> Scale with timestep (costs hp+rolls processed to fix each part)
*/

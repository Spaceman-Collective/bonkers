use anchor_lang::prelude::*;
use anchor_lang::solana_program::hash::*;
use anchor_spl::token::{burn, mint_to, transfer_checked, Burn, MintTo, TransferChecked};
use mpl_token_metadata::instructions::{
    CreateMetadataAccountV3Cpi, CreateMetadataAccountV3CpiAccounts,
    CreateMetadataAccountV3InstructionArgs,
};
use mpl_token_metadata::types::DataV2;

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
        ctx.accounts.game_settings.total_stake = 0;
        ctx.accounts.game_settings.stage1_start = init.stage1_start;
        ctx.accounts.game_settings.stage1_end = init.stage1_end;
        ctx.accounts.game_settings.last_rolled = init.stage1_start;
        ctx.accounts.game_settings.roll_interval = init.roll_interval;
        ctx.accounts.game_settings.coin_mint = init.coin_mint;
        ctx.accounts.game_settings.coin_decimals = init.coin_decimals;
        ctx.accounts.game_settings.sleighs_built = 0;
        ctx.accounts.game_settings.sleighs_retired = 0;
        ctx.accounts.game_settings.sleighs_staked = 0;
        ctx.accounts.game_settings.mint_cost_multiplier = init.mint_cost_multiplier;
        ctx.accounts.game_settings.propulsion_parts_mint = init.propulsion_parts_mint;
        ctx.accounts.game_settings.landing_gear_parts_mint = init.landing_gear_parts_mint;
        ctx.accounts.game_settings.navigation_parts_mint = init.navigation_parts_mint;
        ctx.accounts.game_settings.presents_bag_parts_mint = init.presents_bag_parts_mint;
        ctx.accounts.game_settings.prize_pool = 0;
        ctx.accounts.game_settings.stg1_roll_multiplier = init.stg1_roll_multiplier;
        ctx.accounts.game_settings.stg1_sleigh_idx_boost = init.stg1_sleigh_idx_boost;

        let game_id_bytes = init.game_id.to_be_bytes();
        let game_setting_seeds: &[&[u8]] = &[
            PREFIX_GAME_SETTINGS,
            game_id_bytes.as_ref(),
            &[ctx.bumps.game_settings],
        ];
        let signers_seeds = &[game_setting_seeds];

        CreateMetadataAccountV3Cpi::new(
            &ctx.accounts.mpl_program.to_account_info(),
            CreateMetadataAccountV3CpiAccounts {
                payer: &ctx.accounts.admin.to_account_info(),
                metadata: &ctx.accounts.propulsion_metadata.to_account_info(),
                mint: &ctx.accounts.propulsion_mint.to_account_info(),
                mint_authority: &ctx.accounts.game_settings.to_account_info(),
                update_authority: (&ctx.accounts.game_settings.to_account_info(), false),
                system_program: &ctx.accounts.system_program.to_account_info(),
                rent: Some(&ctx.accounts.rent_account.to_account_info()),
            },
            CreateMetadataAccountV3InstructionArgs {
                data: DataV2 {
                    name: format!("({}) Propulsion Parts", init.game_id.to_string()),
                    symbol: "BNKRS".to_string(),
                    seller_fee_basis_points: 0,
                    creators: None,
                    uri: format!(
                        "{}/propulsion-{}.json",
                        SHDW_BASE_URL,
                        init.game_id.to_string()
                    ),
                    collection: None,
                    uses: None,
                },
                is_mutable: false,
                collection_details: None,
            },
        )
        .invoke_signed(signers_seeds)?;

        CreateMetadataAccountV3Cpi::new(
            &ctx.accounts.mpl_program.to_account_info(),
            CreateMetadataAccountV3CpiAccounts {
                payer: &ctx.accounts.admin.to_account_info(),
                metadata: &ctx.accounts.landing_gear_metadata.to_account_info(),
                mint: &ctx.accounts.landing_gear_mint.to_account_info(),
                mint_authority: &ctx.accounts.game_settings.to_account_info(),
                update_authority: (&ctx.accounts.game_settings.to_account_info(), false),
                system_program: &ctx.accounts.system_program.to_account_info(),
                rent: Some(&ctx.accounts.rent_account.to_account_info()),
            },
            CreateMetadataAccountV3InstructionArgs {
                data: DataV2 {
                    name: format!("({}) Landing Gear Parts", init.game_id.to_string()),
                    symbol: "BNKRS".to_string(),
                    seller_fee_basis_points: 0,
                    creators: None,
                    uri: format!(
                        "{}/landing_gear-{}.json",
                        SHDW_BASE_URL,
                        init.game_id.to_string()
                    ),
                    collection: None,
                    uses: None,
                },
                is_mutable: false,
                collection_details: None,
            },
        )
        .invoke_signed(signers_seeds)?;

        CreateMetadataAccountV3Cpi::new(
            &ctx.accounts.mpl_program.to_account_info(),
            CreateMetadataAccountV3CpiAccounts {
                payer: &ctx.accounts.admin.to_account_info(),
                metadata: &ctx.accounts.navigation_metadata.to_account_info(),
                mint: &ctx.accounts.navigation_mint.to_account_info(),
                mint_authority: &ctx.accounts.game_settings.to_account_info(),
                update_authority: (&ctx.accounts.game_settings.to_account_info(), false),
                system_program: &ctx.accounts.system_program.to_account_info(),
                rent: Some(&ctx.accounts.rent_account.to_account_info()),
            },
            CreateMetadataAccountV3InstructionArgs {
                data: DataV2 {
                    name: format!("({}) Navigation Parts", init.game_id.to_string()),
                    symbol: "BNKRS".to_string(),
                    seller_fee_basis_points: 0,
                    creators: None,
                    uri: format!(
                        "{}/navigation-{}.json",
                        SHDW_BASE_URL,
                        init.game_id.to_string()
                    ),
                    collection: None,
                    uses: None,
                },
                is_mutable: false,
                collection_details: None,
            },
        )
        .invoke_signed(signers_seeds)?;

        CreateMetadataAccountV3Cpi::new(
            &ctx.accounts.mpl_program.to_account_info(),
            CreateMetadataAccountV3CpiAccounts {
                payer: &ctx.accounts.admin.to_account_info(),
                metadata: &ctx.accounts.presents_bag_metadata.to_account_info(),
                mint: &ctx.accounts.presents_bag_mint.to_account_info(),
                mint_authority: &ctx.accounts.game_settings.to_account_info(),
                update_authority: (&ctx.accounts.game_settings.to_account_info(), false),
                system_program: &ctx.accounts.system_program.to_account_info(),
                rent: Some(&ctx.accounts.rent_account.to_account_info()),
            },
            CreateMetadataAccountV3InstructionArgs {
                data: DataV2 {
                    name: format!("({}) Presents Bag Parts", init.game_id.to_string()),
                    symbol: "BNKRS".to_string(),
                    seller_fee_basis_points: 0,
                    creators: None,
                    uri: format!(
                        "{}/presents_bag-{}.json",
                        SHDW_BASE_URL,
                        init.game_id.to_string()
                    ),
                    collection: None,
                    uses: None,
                },
                is_mutable: false,
                collection_details: None,
            },
        )
        .invoke_signed(signers_seeds)?;

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
        if slot > game_settings.stage1_end {
            return err!(BonkersError::Stage1Ended);
        }
        // Check if enough slots have elapsed since last roll
        if game_settings.last_rolled + game_settings.roll_interval > slot {
            return err!(BonkersError::RollTimerCooldown);
        }

        // Roll a number based on highest stake
        let random_number;
        if game_settings.sleighs_staked == 0 {
            random_number = 1;
        } else {
            /*
            random_number = get_random_u64(
                (game_settings.stg1_roll_multiplier * game_settings.total_stake)
                    / game_settings.sleighs_staked,
            );
            */
            random_number = get_random_u64(
                (game_settings.stg1_roll_multiplier * game_settings.total_stake)
                    / game_settings.sleighs_staked,
            );
        }

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
    pub fn create_sleigh(ctx: Context<CreateSleigh>, sleigh_id: u64, stake_amt: u64) -> Result<()> {
        let game_settings = &mut ctx.accounts.game_settings;

        // Check Stage 1 has not ended
        let clock = Clock::get().unwrap();
        let slot = clock.slot;
        if slot > game_settings.stage1_end {
            return err!(BonkersError::Stage1Ended);
        }

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

        // Update Game Settings PDA with total current stake if applicable
        game_settings.sleighs_staked += 1;
        game_settings.total_stake += stake_amt;

        // Create Sleigh account
        let sleigh = &mut ctx.accounts.sleigh;
        sleigh.owner = ctx.accounts.sleigh_owner.key();
        sleigh.sleigh_id = sleigh_id;
        sleigh.level = 0; // set to 1 after being built
        sleigh.game_id = game_settings.game_id;
        sleigh.built_index = 0; // 0 for unconfirmed sleighs, # for built ones
        sleigh.mint_cost = 0; //0 until minted
        sleigh.stake_amt = stake_amt;
        sleigh.broken = false; //only changed after stage 2 malfunctions
        sleigh.staked_after_roll = ctx.accounts.game_rolls.rolls.len() as u64 - 1;
        //starts at the roll it was staked after but theoretically should be after its *built*
        sleigh.last_claimed_roll = ctx.accounts.game_rolls.rolls.len() as u64 - 1;
        sleigh.last_delivery_roll = u64::MAX; // every stage 2 roll needs to be processed so we start at idx 0

        // Parts (not applicable til stage 2)
        sleigh.propulsion_hp = u8::MAX;
        sleigh.landing_gear_hp = u8::MAX;
        sleigh.navigation_hp = u8::MAX;
        sleigh.presents_bag_hp = u8::MAX;
        Ok(())
    }

    /**
     * Can be called by anyone for any sleigh permissionlesly as it's a gain only for the sleigh
     * Can no longer claim levels if game is on stage 2
     * Processes the next available roll for the sleigh. Can be stuff multiple ones in the same ix
     * If they have claims, but their stake amount is less than current mint cost (sleighs built + multiplier)
     * they have to wait and recover the account in stage 2
     * Basically they're SOL for not confirming sooner
     */
    pub fn claim_levels(ctx: Context<ClaimLevels>) -> Result<()> {
        // Check if Stage 1 is still going on
        let clock = Clock::get().unwrap();
        let slot = clock.slot;
        let game_settings = &mut ctx.accounts.game_settings;
        if slot > game_settings.stage1_end {
            return err!(BonkersError::Stage1Ended);
        }

        let sleigh = &mut ctx.accounts.sleigh;
        let roll = ctx
            .accounts
            .game_rolls
            .rolls
            .get(sleigh.last_claimed_roll as usize + 1)
            .unwrap();

        let avg_stake = game_settings.total_stake / game_settings.sleighs_staked;

        // Sleigh roll is sleigh_stake + (sleigh.built_index*avg_stake/idx_boost)
        // This boost is 0 for getting built, but then gives a nice boost for rolls after that to get levels
        if (sleigh.stake_amt
            + ((sleigh.built_index * avg_stake) / game_settings.stg1_sleigh_idx_boost))
            > *roll
        {
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
                // Can't go higher than level 10
                sleigh.level = sleigh.level.checked_add(1).unwrap_or(sleigh.level);
                if sleigh.level > 10 {
                    sleigh.level = 10;
                }
            }
        }

        sleigh.last_claimed_roll += 1;
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

        if sleigh.built_index == 0 {
            return err!(BonkersError::SleighNotBuilt);
        }

        // Get the next Roll to process
        let roll_idx: u64;
        // prevents us from skipping roll 0
        if sleigh.last_delivery_roll >= u32::MAX as u64 {
            roll_idx = 0;
            sleigh.last_delivery_roll = 0;
        } else {
            roll_idx = sleigh.last_delivery_roll + 1;
            sleigh.last_delivery_roll += 1;
        }
        let roll = ctx
            .accounts
            .game_rolls
            .rolls
            .get(roll_idx as usize)
            .unwrap();

        // Confirm Malfunction
        // Check if the Sleigh was damaged
        let range_of_selection =
            (sleigh.last_delivery_roll.wrapping_add(1)) * game_settings.sleighs_built;

        // Check which parts were damaged
        // this picks a random number between 0 and total number of slieghs
        // then wraps around the range selection if the range its greater than sleighs built
        // ie 100 sleighs built, number chosen is 90, and range is 20, the selection would be
        // 90-100 && 0-10
        let start_range = get_random_u64(game_settings.sleighs_built);
        let mut end_range = start_range + range_of_selection;
        let mut overflow_range: u64 = 0;
        if end_range > game_settings.sleighs_built {
            overflow_range = end_range - game_settings.sleighs_built;
            if overflow_range > game_settings.sleighs_built {
                overflow_range = game_settings.sleighs_built;
            }
            end_range = game_settings.sleighs_built;
        }

        if (sleigh.built_index >= start_range && sleigh.built_index <= end_range)
            || (sleigh.built_index > 0 && sleigh.built_index <= overflow_range)
        {
            // Sleigh had a malfunction, let's figure out how much damage each part took
            // we use first 4 bytes (u8) of the roll to determine 4 points of damage
            // we also divide each of these values by half so we aren't doing massive amounts of damage each roll
            let dmg_roll = get_u64_from_two_u64(*roll, sleigh.sleigh_id);

            let propulsion_dmg = dmg_roll.to_be_bytes()[0] / 2;
            let landing_gear_dmg = dmg_roll.to_be_bytes()[1] / 2;
            let navigation_dmg = dmg_roll.to_be_bytes()[2] / 2;
            let presents_bag_dmg = dmg_roll.to_be_bytes()[3] / 2;

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
        let resource_selected = roll % 4; // will give 0,1,2,3 as a result
        let mut resource_collection_amount = BASE_RESOURCE_DRIP;
        let max_range;
        if sleigh.level > 10 {
            max_range = 10;
        } else {
            max_range = sleigh.level;
        }
        for i in 0..max_range {
            resource_collection_amount +=
                BASE_RESOURCE_DRIP * ((i as u64 * BASE_RESOURCE_DRIP) / (2_u64.pow(i as u32)));
        }

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

    /**
     * Repair takes in the amount of points you want to repair any
     * part and burns the amount of resources from the ATA for it
     */
    pub fn repair(
        ctx: Context<Repair>,
        repair_propulsion_hp: u8,
        repair_landing_gear_hp: u8,
        repair_navigation_hp: u8,
        repair_presents_bag_hp: u8,
    ) -> Result<()> {
        let sleigh = &mut ctx.accounts.sleigh;

        // Check the Sleigh is not broken
        if sleigh.broken {
            return err!(BonkersError::SleighBroken);
        }

        //Repair cost is hp*intervals*2
        // check if repair amount is greater than damage
        let propulsion_dmg = u8::MAX - sleigh.propulsion_hp;
        let mut propulsion_repair = repair_propulsion_hp;
        if propulsion_repair > propulsion_dmg {
            propulsion_repair = propulsion_dmg;
        }
        let propulsion_repair_cost = propulsion_repair as u64 * (sleigh.last_delivery_roll + 1) * 2;
        burn(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Burn {
                    mint: ctx.accounts.propulsion_mint.to_account_info(),
                    from: ctx.accounts.sleigh_propulsion_parts_ata.to_account_info(),
                    authority: ctx.accounts.sleigh_owner.to_account_info(),
                },
            ),
            propulsion_repair_cost,
        )?;
        sleigh.propulsion_hp += propulsion_repair;

        let landing_gear_dmg = u8::MAX - sleigh.landing_gear_hp;
        let mut landing_gear_repair = repair_landing_gear_hp;
        if landing_gear_repair > landing_gear_dmg {
            landing_gear_repair = landing_gear_dmg;
        }
        let landing_gear_repair_cost =
            landing_gear_repair as u64 * (sleigh.last_delivery_roll + 1) * 2;
        burn(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Burn {
                    mint: ctx.accounts.landing_gear_mint.to_account_info(),
                    from: ctx.accounts.sleigh_landing_gear_parts_ata.to_account_info(),
                    authority: ctx.accounts.sleigh_owner.to_account_info(),
                },
            ),
            landing_gear_repair_cost,
        )?;
        sleigh.landing_gear_hp += landing_gear_repair;

        let navigation_dmg = u8::MAX - sleigh.navigation_hp;
        let mut navigation_repair = repair_navigation_hp;
        if navigation_repair > navigation_dmg {
            navigation_repair = navigation_dmg;
        }
        let navigation_repair_cost = navigation_repair as u64 * (sleigh.last_delivery_roll + 1) * 2;
        burn(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Burn {
                    mint: ctx.accounts.navigation_mint.to_account_info(),
                    from: ctx.accounts.sleigh_navigation_parts_ata.to_account_info(),
                    authority: ctx.accounts.sleigh_owner.to_account_info(),
                },
            ),
            navigation_repair_cost,
        )?;
        sleigh.navigation_hp += navigation_repair;

        let presents_bag_dmg = u8::MAX - sleigh.presents_bag_hp;
        let mut presents_bag_repair = repair_presents_bag_hp;
        if presents_bag_repair > presents_bag_dmg {
            presents_bag_repair = presents_bag_dmg;
        }
        let presents_bag_repair_cost =
            presents_bag_repair as u64 * (sleigh.last_delivery_roll + 1) * 2;
        burn(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Burn {
                    mint: ctx.accounts.presents_bag_mint.to_account_info(),
                    from: ctx.accounts.sleigh_presents_bag_parts_ata.to_account_info(),
                    authority: ctx.accounts.sleigh_owner.to_account_info(),
                },
            ),
            presents_bag_repair_cost,
        )?;
        sleigh.presents_bag_hp += presents_bag_repair;

        Ok(())
    }

    /**
     * Can be called by sleigh owner at any time to scuttle the sleigh and return bonk to the owner
     * If the sleigh was never built (built_index=0), then returns full bonk amount
     * Otherwise returns 70*(stake-mintcost) + spoils + prize pool if last sleigh
     * CHECK to see if anchor closes the account before or after the code in this function executes,
     * otherwise close the account manually
     */
    pub fn retire(ctx: Context<Retire>) -> Result<()> {
        let game_settings = &mut ctx.accounts.game_settings;
        let slot = Clock::get().unwrap().slot;
        let sleigh = &mut ctx.accounts.sleigh;

        // Check Stage 1 has ended
        if game_settings.stage1_end > slot {
            return err!(BonkersError::Stage1NotOver);
        }

        let game_id = game_settings.game_id.to_be_bytes();
        let game_setting_seeds: &[&[u8]] = &[
            PREFIX_GAME_SETTINGS,
            game_id.as_ref(),
            &[ctx.bumps.game_settings],
        ];
        let signer_seeds = &[game_setting_seeds];

        if sleigh.built_index == 0 {
            // return full bonk
            transfer_checked(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    TransferChecked {
                        from: ctx.accounts.game_token_ata.to_account_info(),
                        to: ctx.accounts.sleigh_owner_ata.to_account_info(),
                        authority: game_settings.to_account_info(),
                        mint: ctx.accounts.coin_mint.to_account_info(),
                    },
                    signer_seeds,
                ),
                sleigh.stake_amt,
                game_settings.coin_decimals,
            )?;
        } else {
            // return 70%(stake-mintcost) + spoils + prize pool
            let base_return = ((sleigh.stake_amt - sleigh.mint_cost) * 70) / 100_u64;
            let spoils = (game_settings.sleighs_built - sleigh.built_index)
                * game_settings.mint_cost_multiplier;
            let mut prize_pool: u64 = 0;
            if game_settings.sleighs_retired + 1 == game_settings.sleighs_built {
                msg!(
                    "Last sleigh in game! Awarding Prize Pool {:#}",
                    game_settings.prize_pool
                );
                // if this is the last sleigh, then give it the prize pool
                prize_pool = game_settings.prize_pool
            } else {
                // if not the last sleigh, add 20% of it's stake amount to prize pool
                game_settings.prize_pool += ((sleigh.stake_amt - sleigh.mint_cost) * 20) / 100_u64
            }

            let returned_coin = base_return + spoils + prize_pool;
            msg!(
                "Returning {:#} base, {:#} spoils, and {:#} prize pool",
                base_return,
                spoils,
                prize_pool
            );
            transfer_checked(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    TransferChecked {
                        from: ctx.accounts.game_token_ata.to_account_info(),
                        to: ctx.accounts.sleigh_owner_ata.to_account_info(),
                        authority: game_settings.to_account_info(),
                        mint: ctx.accounts.coin_mint.to_account_info(),
                    },
                    signer_seeds,
                ),
                returned_coin,
                game_settings.coin_decimals,
            )?;
        }
        sleigh.close(ctx.accounts.sleigh_owner.to_account_info())?;
        game_settings.sleighs_retired += 1;
        Ok(())
    }

    /**
     * Admins can force retire a sleigh if it's broken, so players can't grief the prize pot
     * Can ONLY do it if the sleigh is BROKEN
     */
    pub fn force_retire(ctx: Context<ForceRetire>) -> Result<()> {
        let game_settings = &mut ctx.accounts.game_settings;
        let slot = Clock::get().unwrap().slot;
        let sleigh = &mut ctx.accounts.sleigh;

        // Check Stage 1 has ended
        if game_settings.stage1_end > slot {
            return err!(BonkersError::Stage1NotOver);
        }

        let game_id = game_settings.game_id.to_be_bytes();
        let game_setting_seeds: &[&[u8]] = &[
            PREFIX_GAME_SETTINGS,
            game_id.as_ref(),
            &[ctx.bumps.game_settings],
        ];
        let signer_seeds = &[game_setting_seeds];

        if sleigh.built_index == 0 {
            // return full bonk
            transfer_checked(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    TransferChecked {
                        from: ctx.accounts.game_token_ata.to_account_info(),
                        to: ctx.accounts.sleigh_owner_ata.to_account_info(),
                        authority: game_settings.to_account_info(),
                        mint: ctx.accounts.coin_mint.to_account_info(),
                    },
                    signer_seeds,
                ),
                sleigh.stake_amt,
                game_settings.coin_decimals,
            )?;
        } else if sleigh.broken {
            // return 70%(stake-mintcost) + spoils + prize pool
            let base_return = ((sleigh.stake_amt - sleigh.mint_cost) * 70) / 100_u64;
            let spoils = (game_settings.sleighs_built - sleigh.built_index)
                * game_settings.mint_cost_multiplier;
            let mut prize_pool: u64 = 0;
            if game_settings.sleighs_retired + 1 == game_settings.sleighs_built {
                msg!(
                    "Last sleigh in game! Awarding Prize Pool {:#}",
                    game_settings.prize_pool
                );
                // if this is the last sleigh, then give it the prize pool
                prize_pool = game_settings.prize_pool
            } else {
                // if not the last sleigh, add 20% of it's stake amount to prize pool
                game_settings.prize_pool += ((sleigh.stake_amt - sleigh.mint_cost) * 20) / 100_u64
            }

            let returned_coin = base_return + spoils + prize_pool;
            msg!(
                "Returning {:#} base, {:#} spoils, and {:#} prize pool",
                base_return,
                spoils,
                prize_pool
            );
            transfer_checked(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    TransferChecked {
                        from: ctx.accounts.game_token_ata.to_account_info(),
                        to: ctx.accounts.sleigh_owner_ata.to_account_info(),
                        authority: game_settings.to_account_info(),
                        mint: ctx.accounts.coin_mint.to_account_info(),
                    },
                    signer_seeds,
                ),
                returned_coin,
                game_settings.coin_decimals,
            )?;
        } else {
            return err!(BonkersError::SleighNotBroken);
        }
        sleigh.close(ctx.accounts.sleigh_owner.to_account_info())?;
        game_settings.sleighs_retired += 1;
        Ok(())
    }

    /**
     * Admin can only withdraw from the wallet when the game is OVER
     */
    pub fn elvish_coffee(ctx: Context<AdminWithdraw>, amt: u64) -> Result<()> {
        let game_settings = &mut ctx.accounts.game_settings;

        if game_settings.sleighs_built != game_settings.sleighs_retired {
            return err!(BonkersError::GameNotOver);
        }

        let game_id = game_settings.game_id.to_be_bytes();
        let game_setting_seeds: &[&[u8]] = &[
            PREFIX_GAME_SETTINGS,
            game_id.as_ref(),
            &[ctx.bumps.game_settings],
        ];
        let signer_seeds = &[game_setting_seeds];

        transfer_checked(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    from: ctx.accounts.game_token_ata.to_account_info(),
                    to: ctx.accounts.admin_ata.to_account_info(),
                    authority: game_settings.to_account_info(),
                    mint: ctx.accounts.coin_mint.to_account_info(),
                },
                signer_seeds,
            ),
            amt,
            game_settings.coin_decimals,
        )?;

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

pub fn get_u64_from_two_u64(first: u64, second: u64) -> u64 {
    let slice = &hash(
        [first.to_be_bytes(), second.to_be_bytes()]
            .concat()
            .as_slice(),
    )
    .to_bytes()[0..8];
    return u64::from_be_bytes(slice.try_into().unwrap());
}

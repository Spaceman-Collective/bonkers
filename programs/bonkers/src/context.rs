use anchor_lang::prelude::*;
use anchor_spl::associated_token::get_associated_token_address;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::account::*;
use crate::constant::*;

#[derive(Accounts)]
#[instruction(init: GameSettings)]
pub struct InitBonkers<'info> {
    #[account(
        mut,
        address = ADMIN_ADDRESS
    )]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,

    #[account(
        init,
        seeds=[
            PREFIX_GAME_SETTINGS,
            init.game_id.to_be_bytes().as_ref(),
        ],
        payer=admin,
        bump,
        space=8+GameSettings::get_max_size(),
    )]
    pub game_settings: Account<'info, GameSettings>,

    #[account(
        init,
        seeds=[
            PREFIX_GAME_ROLL_STG1,
            init.game_id.to_be_bytes().as_ref()
        ],
        payer=admin,
        space=8+GameRolls::get_max_size(),
        bump,
    )]
    pub game_rolls_stg1: Account<'info, GameRolls>,

    #[account(
        init,
        seeds=[
            PREFIX_GAME_ROLL_STG2,
            init.game_id.to_be_bytes().as_ref()
        ],
        payer=admin,
        space=8+GameRolls::get_max_size(),
        bump,
    )]
    pub game_rolls_stg2: Account<'info, GameRolls>,
}

#[derive(Accounts)]
pub struct Stage1Roll<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,

    #[account(mut)]
    pub game_settings: Account<'info, GameSettings>,

    #[account(
        mut,
        seeds=[
            PREFIX_GAME_ROLL_STG1,
            game_settings.game_id.to_be_bytes().as_ref()
        ],
        bump,
        realloc = game_rolls.to_account_info().data_len() + 8,
        realloc::payer = payer,
        realloc::zero = false
    )]
    pub game_rolls: Account<'info, GameRolls>,
}

#[derive(Accounts)]
pub struct Stage2Roll<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,

    #[account(mut)]
    pub game_settings: Account<'info, GameSettings>,

    #[account(
        mut,
        seeds=[
            PREFIX_GAME_ROLL_STG2,
            game_settings.game_id.to_be_bytes().as_ref()
        ],
        bump,
        realloc = game_rolls.to_account_info().data_len() + 8,
        realloc::payer = payer,
        realloc::zero = false
    )]
    pub game_rolls: Account<'info, GameRolls>,
}

#[derive(Accounts)]
#[instruction(_sleigh_id:u64, stake_amt:u64)]
pub struct CreateSleigh<'info> {
    #[account(mut)]
    pub sleigh_owner: Signer<'info>,
    pub system_program: Program<'info, System>,

    #[account(mut)]
    pub game_settings: Account<'info, GameSettings>,
    #[account(
        seeds=[
            PREFIX_GAME_ROLL_STG1,
            game_settings.game_id.to_be_bytes().as_ref(),
        ],
        bump,
    )]
    pub game_rolls: Account<'info, GameRolls>,

    #[account(
        init,
        seeds=[
            PREFIX_SLEIGH,
            game_settings.game_id.to_be_bytes().as_ref(),
            _sleigh_id.to_be_bytes().as_ref()
        ],
        payer=sleigh_owner,
        space=8+Sleigh::get_max_size(),
        bump,
    )]
    pub sleigh: Account<'info, Sleigh>,

    // Token Transfer Account
    #[account(
        mut,
        address = get_associated_token_address(&game_settings.key(), &game_settings.coin_mint.key())
    )]
    pub game_token_ata: Account<'info, TokenAccount>,
    #[account(
        mut,
        address = get_associated_token_address(&sleigh_owner.key(), &game_settings.coin_mint.key())
    )]
    pub sleigh_owner_ata: Account<'info, TokenAccount>,
    #[account(
        address = game_settings.coin_mint.key()
    )]
    pub coin_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ClaimLevels<'info> {
    pub sleigh_owner: Signer<'info>,

    #[account(mut)]
    pub game_settings: Account<'info, GameSettings>,
    #[account(
        seeds=[
            PREFIX_GAME_ROLL_STG1,
            game_settings.game_id.to_be_bytes().as_ref(),
        ],
        bump,
    )]
    pub game_rolls: Account<'info, GameRolls>,

    #[account(
        mut,
        constraint = (sleigh.game_id == game_settings.game_id) && (sleigh.owner == sleigh_owner.key())
    )]
    pub sleigh: Account<'info, Sleigh>,
}

#[derive(Accounts)]
pub struct Delivery<'info> {
    #[account(
        mut,
        seeds=[
            PREFIX_GAME_SETTINGS,
            game_settings.game_id.to_be_bytes().as_ref(),
        ],
        bump, // Just need the bump here so we can use it in the fn for minting resources
    )]
    pub game_settings: Account<'info, GameSettings>,
    #[account(
        seeds=[
            PREFIX_GAME_ROLL_STG2,
            game_settings.game_id.to_be_bytes().as_ref(),
        ],
        bump,
    )]
    pub game_rolls: Account<'info, GameRolls>,

    #[account(
        mut,
        constraint = (sleigh.game_id == game_settings.game_id) 
    )]
    pub sleigh: Account<'info, Sleigh>,
    
    //Resources
    // Requires mint authority of the resource(s) (can be Game Settings)
    // Requires ATA of the sleigh_owner for each resource (check owner, and mint)
    #[account(
        mut,
        owner = sleigh.owner,
        constraint = sleigh_propulsion_parts_ata.mint == game_settings.propulsion_parts_mint
    )]
    pub sleigh_propulsion_parts_ata: Account<'info, TokenAccount>,

    #[account(
        mut,
        owner = sleigh.owner,
        constraint = sleigh_landing_gear_parts_ata.mint == game_settings.landing_gear_parts_mint
    )]
    pub sleigh_landing_gear_parts_ata: Account<'info, TokenAccount>,
    #[account(
        mut,
        owner = sleigh.owner,
        constraint = sleigh_navigation_parts_ata.mint == game_settings.navigation_parts_mint
    )]
    pub sleigh_navigation_parts_ata: Account<'info, TokenAccount>,
    #[account(
        mut,
        owner = sleigh.owner,
        constraint = sleigh_presents_bag_parts_ata.mint == game_settings.presents_bag_parts_mint
    )]
    pub sleigh_presents_bag_parts_ata: Account<'info, TokenAccount>,

    #[account(
        address = game_settings.propulsion_parts_mint
    )]
    pub propulsion_mint: Account<'info, Mint>,
    #[account(
        address = game_settings.landing_gear_parts_mint
    )]
    pub landing_gear_mint: Account<'info, Mint>,
    #[account(
        address = game_settings.navigation_parts_mint
    )]
    pub navigation_mint: Account<'info, Mint>,
    #[account(
        address = game_settings.presents_bag_parts_mint
    )]
    pub presents_bag_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
}


#[derive(Accounts)]
pub struct Repair<'info>{
    #[account(
        address = sleigh.owner
    )]
    pub sleigh_owner: Signer<'info>,
    
    #[account(
        seeds=[
            PREFIX_GAME_SETTINGS,
            game_settings.game_id.to_be_bytes().as_ref(),
        ],
        bump, // Just need the bump here so we can use it in the fn for minting resources
    )]
    pub game_settings: Account<'info, GameSettings>,
    #[account(
        mut,
        constraint = (sleigh.game_id == game_settings.game_id) 
    )]
    pub sleigh: Account<'info, Sleigh>,
    
    #[account(
        mut,
        owner = sleigh.owner,
        constraint = sleigh_propulsion_parts_ata.mint == game_settings.propulsion_parts_mint
    )]
    pub sleigh_propulsion_parts_ata: Account<'info, TokenAccount>,

    #[account(
        mut,
        owner = sleigh.owner,
        constraint = sleigh_landing_gear_parts_ata.mint == game_settings.landing_gear_parts_mint
    )]
    pub sleigh_landing_gear_parts_ata: Account<'info, TokenAccount>,
    #[account(
        mut,
        owner = sleigh.owner,
        constraint = sleigh_navigation_parts_ata.mint == game_settings.navigation_parts_mint
    )]
    pub sleigh_navigation_parts_ata: Account<'info, TokenAccount>,
    #[account(
        mut,
        owner = sleigh.owner,
        constraint = sleigh_presents_bag_parts_ata.mint == game_settings.presents_bag_parts_mint
    )]
    pub sleigh_presents_bag_parts_ata: Account<'info, TokenAccount>,

    #[account(
        address = game_settings.propulsion_parts_mint
    )]
    pub propulsion_mint: Account<'info, Mint>,
    #[account(
        address = game_settings.landing_gear_parts_mint
    )]
    pub landing_gear_mint: Account<'info, Mint>,
    #[account(
        address = game_settings.navigation_parts_mint
    )]
    pub navigation_mint: Account<'info, Mint>,
    #[account(
        address = game_settings.presents_bag_parts_mint
    )]
    pub presents_bag_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Retire<'info>{
    #[account(
        mut,
        address = sleigh.owner
    )]
    pub sleigh_owner: Signer<'info>,
    pub system_program: Program<'info, System>,
    #[account(
        mut,
        close = sleigh_owner,
    )]
    pub sleigh: Account<'info, Sleigh>,
    #[account(
        mut,
        seeds=[
            PREFIX_GAME_SETTINGS,
            game_settings.game_id.to_be_bytes().as_ref(),
        ],
        bump, // Just need the bump here so we can use it in the fn for minting resources
    )]
    pub game_settings: Account<'info, GameSettings>,

    // Token Transfer Account
    #[account(
        mut,
        address = get_associated_token_address(&game_settings.key(), &game_settings.coin_mint.key())
    )]
    pub game_token_ata: Account<'info, TokenAccount>,
    #[account(
        mut,
        address = get_associated_token_address(&sleigh_owner.key(), &game_settings.coin_mint.key())
    )]
    pub sleigh_owner_ata: Account<'info, TokenAccount>,
    #[account(
        address = game_settings.coin_mint.key()
    )]
    pub coin_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct AdminWithdraw<'info>{
    #[account(
        mut,
        address = ADMIN_ADDRESS
    )]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,

    #[account(
        mut,
        seeds=[
            PREFIX_GAME_SETTINGS,
            game_settings.game_id.to_be_bytes().as_ref(),
        ],
        bump, // Just need the bump here so we can use it in the fn for minting resources
    )]
    pub game_settings: Account<'info, GameSettings>,

    // Token Transfer Account
    #[account(
        mut,
        address = get_associated_token_address(&game_settings.key(), &game_settings.coin_mint.key())
    )]
    pub game_token_ata: Account<'info, TokenAccount>,
    #[account(
        mut,
        address = get_associated_token_address(&admin.key(), &game_settings.coin_mint.key())
    )]
    pub admin_ata: Account<'info, TokenAccount>,
    #[account(
        address = game_settings.coin_mint.key()
    )]
    pub coin_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
}
use anchor_lang::prelude::*;

#[error_code]
pub enum BonkersError {
    #[msg("")]
    GameNotStarted, // 6000

    #[msg("")]
    Stage1Ended, // 6001

    #[msg("")]
    RollTimerCooldown, // 6002

    #[msg("")]
    StakeAmtBelowCurrentMintCost, // 6003

    #[msg("")]
    InvalidRollForClaim, // 6004
}

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

    #[msg("")]
    Stage1NotOver, // 6005

    #[msg("")]
    SleighBroken, // 6006

    #[msg("")]
    GameNotOver, // 6007

    #[msg("")]
    SleighNotBuilt, // 6008

    #[msg("")]
    SleighNotBroken, // 6009
}

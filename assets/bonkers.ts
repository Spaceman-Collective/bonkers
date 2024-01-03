export type Bonkers = {
  "version": "0.1.0",
  "name": "bonkers",
  "instructions": [
    {
      "name": "initBonkers",
      "docs": [
        "* Creates the Roll account for the game\n     * Creates Setting account for the game\n     *  Set the start time for stage 1 and roll interval and end time for stage 1\n     * ~~ (Done with init script)~~ Create the Bonk ATA for the GameSettings PDA\n     * ~~ (Done with init script)~~ Create Resource SPL Tokens with Metadata and ascribe mint authority to Game Settings PDA"
      ],
      "accounts": [
        {
          "name": "admin",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "gameSettings",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "gameRollsStg1",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "gameRollsStg2",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "mplProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "propulsionMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "landingGearMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "navigationMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "presentsBagMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "propulsionMetadata",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "landingGearMetadata",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "navigationMetadata",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "presentsBagMetadata",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "rentAccount",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "init",
          "type": {
            "defined": "GameSettings"
          }
        }
      ]
    },
    {
      "name": "stage1Roll",
      "docs": [
        "* Anyone can call this function if enough time has passed since the last call\n     * maxes out at 1250 rolls"
      ],
      "accounts": [
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "gameSettings",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "gameRolls",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "createSleigh",
      "docs": [
        "* Create a stake account that's an unconfirmed sleigh\n     * Transfers bonk to the Bonk ATA for the GameSettingsPDA\n     * Tracks the Roll Index at which it was created, cannot claim any levels from before that index\n     * CHECK; stake_amt < current min mint price, if so just throw error\n     * CANNOT BE WITHDRAWN UNTIL STAGE 2"
      ],
      "accounts": [
        {
          "name": "sleighOwner",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "gameSettings",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "gameRolls",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "sleigh",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "gameTokenAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "sleighOwnerAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "coinMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "sleighId",
          "type": "u64"
        },
        {
          "name": "stakeAmt",
          "type": "u64"
        }
      ]
    },
    {
      "name": "claimLevels",
      "docs": [
        "* Can be called by anyone for any sleigh permissionlesly as it's a gain only for the sleigh\n     * Can no longer claim levels if game is on stage 2\n     * Processes the next available roll for the sleigh. Can be stuff multiple ones in the same ix\n     * If they have claims, but their stake amount is less than current mint cost (sleighs built + multiplier)\n     * they have to wait and recover the account in stage 2\n     * Basically they're SOL for not confirming sooner"
      ],
      "accounts": [
        {
          "name": "gameSettings",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "gameRolls",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "sleigh",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "stage2Roll",
      "docs": [
        "* Can be called by anyone if stage 1 has ended and stage 2 has started."
      ],
      "accounts": [
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "gameSettings",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "gameRolls",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "delivery",
      "docs": [
        "* Can be called by anyone once stage 2 has started for any any sleigh\n     * Processes the next available roll for each sleigh, can process only one at a time\n     * In that roll, it'll figure out what resource to mint for the user\n     * and what malfunctions to apply due to the delivery."
      ],
      "accounts": [
        {
          "name": "gameSettings",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "gameRolls",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "sleigh",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "sleighPropulsionPartsAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "sleighLandingGearPartsAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "sleighNavigationPartsAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "sleighPresentsBagPartsAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "propulsionMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "landingGearMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "navigationMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "presentsBagMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "repair",
      "docs": [
        "* Repair takes in the amount of points you want to repair any\n     * part and burns the amount of resources from the ATA for it"
      ],
      "accounts": [
        {
          "name": "sleighOwner",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "gameSettings",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "sleigh",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "sleighPropulsionPartsAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "sleighLandingGearPartsAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "sleighNavigationPartsAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "sleighPresentsBagPartsAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "propulsionMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "landingGearMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "navigationMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "presentsBagMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "repairPropulsionHp",
          "type": "u8"
        },
        {
          "name": "repairLandingGearHp",
          "type": "u8"
        },
        {
          "name": "repairNavigationHp",
          "type": "u8"
        },
        {
          "name": "repairPresentsBagHp",
          "type": "u8"
        }
      ]
    },
    {
      "name": "retire",
      "docs": [
        "* Can be called by sleigh owner at any time to scuttle the sleigh and return bonk to the owner\n     * If the sleigh was never built (built_index=0), then returns full bonk amount\n     * Otherwise returns 70*(stake-mintcost) + spoils + prize pool if last sleigh\n     * CHECK to see if anchor closes the account before or after the code in this function executes,\n     * otherwise close the account manually"
      ],
      "accounts": [
        {
          "name": "sleighOwner",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "sleigh",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "gameSettings",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "gameTokenAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "sleighOwnerAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "coinMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "forceRetire",
      "docs": [
        "* Admins can force retire a sleigh if it's broken, so players can't grief the prize pot\n     * Can ONLY do it if the sleigh is BROKEN"
      ],
      "accounts": [
        {
          "name": "admin",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "sleighOwner",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "sleigh",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "gameSettings",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "gameTokenAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "sleighOwnerAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "coinMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "elvishCoffee",
      "docs": [
        "* Admin can only withdraw from the wallet when the game is OVER"
      ],
      "accounts": [
        {
          "name": "admin",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "gameSettings",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "gameTokenAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "adminAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "coinMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "amt",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "gameSettings",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "gameId",
            "type": "u64"
          },
          {
            "name": "totalStake",
            "type": "u64"
          },
          {
            "name": "stage1Start",
            "type": "u64"
          },
          {
            "name": "stage1End",
            "type": "u64"
          },
          {
            "name": "lastRolled",
            "type": "u64"
          },
          {
            "name": "rollInterval",
            "type": "u64"
          },
          {
            "name": "coinMint",
            "type": "publicKey"
          },
          {
            "name": "coinDecimals",
            "type": "u8"
          },
          {
            "name": "sleighsStaked",
            "type": "u64"
          },
          {
            "name": "sleighsBuilt",
            "type": "u64"
          },
          {
            "name": "sleighsRetired",
            "type": "u64"
          },
          {
            "name": "mintCostMultiplier",
            "type": "u64"
          },
          {
            "name": "propulsionPartsMint",
            "type": "publicKey"
          },
          {
            "name": "landingGearPartsMint",
            "type": "publicKey"
          },
          {
            "name": "navigationPartsMint",
            "type": "publicKey"
          },
          {
            "name": "presentsBagPartsMint",
            "type": "publicKey"
          },
          {
            "name": "prizePool",
            "type": "u64"
          },
          {
            "name": "stg1RollMultiplier",
            "type": "u64"
          },
          {
            "name": "stg1SleighIdxBoost",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "gameRolls",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "rolls",
            "type": {
              "vec": "u64"
            }
          }
        ]
      }
    },
    {
      "name": "sleigh",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "publicKey"
          },
          {
            "name": "sleighId",
            "type": "u64"
          },
          {
            "name": "level",
            "type": "u8"
          },
          {
            "name": "gameId",
            "type": "u64"
          },
          {
            "name": "builtIndex",
            "type": "u64"
          },
          {
            "name": "mintCost",
            "type": "u64"
          },
          {
            "name": "stakeAmt",
            "type": "u64"
          },
          {
            "name": "broken",
            "type": "bool"
          },
          {
            "name": "stakedAfterRoll",
            "type": "u64"
          },
          {
            "name": "lastClaimedRoll",
            "type": "u64"
          },
          {
            "name": "lastDeliveryRoll",
            "type": "u64"
          },
          {
            "name": "propulsionHp",
            "type": "u8"
          },
          {
            "name": "landingGearHp",
            "type": "u8"
          },
          {
            "name": "navigationHp",
            "type": "u8"
          },
          {
            "name": "presentsBagHp",
            "type": "u8"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "GameNotStarted",
      "msg": ""
    },
    {
      "code": 6001,
      "name": "Stage1Ended",
      "msg": ""
    },
    {
      "code": 6002,
      "name": "RollTimerCooldown",
      "msg": ""
    },
    {
      "code": 6003,
      "name": "StakeAmtBelowCurrentMintCost",
      "msg": ""
    },
    {
      "code": 6004,
      "name": "InvalidRollForClaim",
      "msg": ""
    },
    {
      "code": 6005,
      "name": "Stage1NotOver",
      "msg": ""
    },
    {
      "code": 6006,
      "name": "SleighBroken",
      "msg": ""
    },
    {
      "code": 6007,
      "name": "GameNotOver",
      "msg": ""
    },
    {
      "code": 6008,
      "name": "SleighNotBuilt",
      "msg": ""
    },
    {
      "code": 6009,
      "name": "SleighNotBroken",
      "msg": ""
    }
  ]
};

export const IDL: Bonkers = {
  "version": "0.1.0",
  "name": "bonkers",
  "instructions": [
    {
      "name": "initBonkers",
      "docs": [
        "* Creates the Roll account for the game\n     * Creates Setting account for the game\n     *  Set the start time for stage 1 and roll interval and end time for stage 1\n     * ~~ (Done with init script)~~ Create the Bonk ATA for the GameSettings PDA\n     * ~~ (Done with init script)~~ Create Resource SPL Tokens with Metadata and ascribe mint authority to Game Settings PDA"
      ],
      "accounts": [
        {
          "name": "admin",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "gameSettings",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "gameRollsStg1",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "gameRollsStg2",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "mplProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "propulsionMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "landingGearMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "navigationMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "presentsBagMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "propulsionMetadata",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "landingGearMetadata",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "navigationMetadata",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "presentsBagMetadata",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "rentAccount",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "init",
          "type": {
            "defined": "GameSettings"
          }
        }
      ]
    },
    {
      "name": "stage1Roll",
      "docs": [
        "* Anyone can call this function if enough time has passed since the last call\n     * maxes out at 1250 rolls"
      ],
      "accounts": [
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "gameSettings",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "gameRolls",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "createSleigh",
      "docs": [
        "* Create a stake account that's an unconfirmed sleigh\n     * Transfers bonk to the Bonk ATA for the GameSettingsPDA\n     * Tracks the Roll Index at which it was created, cannot claim any levels from before that index\n     * CHECK; stake_amt < current min mint price, if so just throw error\n     * CANNOT BE WITHDRAWN UNTIL STAGE 2"
      ],
      "accounts": [
        {
          "name": "sleighOwner",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "gameSettings",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "gameRolls",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "sleigh",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "gameTokenAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "sleighOwnerAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "coinMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "sleighId",
          "type": "u64"
        },
        {
          "name": "stakeAmt",
          "type": "u64"
        }
      ]
    },
    {
      "name": "claimLevels",
      "docs": [
        "* Can be called by anyone for any sleigh permissionlesly as it's a gain only for the sleigh\n     * Can no longer claim levels if game is on stage 2\n     * Processes the next available roll for the sleigh. Can be stuff multiple ones in the same ix\n     * If they have claims, but their stake amount is less than current mint cost (sleighs built + multiplier)\n     * they have to wait and recover the account in stage 2\n     * Basically they're SOL for not confirming sooner"
      ],
      "accounts": [
        {
          "name": "gameSettings",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "gameRolls",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "sleigh",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "stage2Roll",
      "docs": [
        "* Can be called by anyone if stage 1 has ended and stage 2 has started."
      ],
      "accounts": [
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "gameSettings",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "gameRolls",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "delivery",
      "docs": [
        "* Can be called by anyone once stage 2 has started for any any sleigh\n     * Processes the next available roll for each sleigh, can process only one at a time\n     * In that roll, it'll figure out what resource to mint for the user\n     * and what malfunctions to apply due to the delivery."
      ],
      "accounts": [
        {
          "name": "gameSettings",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "gameRolls",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "sleigh",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "sleighPropulsionPartsAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "sleighLandingGearPartsAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "sleighNavigationPartsAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "sleighPresentsBagPartsAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "propulsionMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "landingGearMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "navigationMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "presentsBagMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "repair",
      "docs": [
        "* Repair takes in the amount of points you want to repair any\n     * part and burns the amount of resources from the ATA for it"
      ],
      "accounts": [
        {
          "name": "sleighOwner",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "gameSettings",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "sleigh",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "sleighPropulsionPartsAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "sleighLandingGearPartsAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "sleighNavigationPartsAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "sleighPresentsBagPartsAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "propulsionMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "landingGearMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "navigationMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "presentsBagMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "repairPropulsionHp",
          "type": "u8"
        },
        {
          "name": "repairLandingGearHp",
          "type": "u8"
        },
        {
          "name": "repairNavigationHp",
          "type": "u8"
        },
        {
          "name": "repairPresentsBagHp",
          "type": "u8"
        }
      ]
    },
    {
      "name": "retire",
      "docs": [
        "* Can be called by sleigh owner at any time to scuttle the sleigh and return bonk to the owner\n     * If the sleigh was never built (built_index=0), then returns full bonk amount\n     * Otherwise returns 70*(stake-mintcost) + spoils + prize pool if last sleigh\n     * CHECK to see if anchor closes the account before or after the code in this function executes,\n     * otherwise close the account manually"
      ],
      "accounts": [
        {
          "name": "sleighOwner",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "sleigh",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "gameSettings",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "gameTokenAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "sleighOwnerAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "coinMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "forceRetire",
      "docs": [
        "* Admins can force retire a sleigh if it's broken, so players can't grief the prize pot\n     * Can ONLY do it if the sleigh is BROKEN"
      ],
      "accounts": [
        {
          "name": "admin",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "sleighOwner",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "sleigh",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "gameSettings",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "gameTokenAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "sleighOwnerAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "coinMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "elvishCoffee",
      "docs": [
        "* Admin can only withdraw from the wallet when the game is OVER"
      ],
      "accounts": [
        {
          "name": "admin",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "gameSettings",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "gameTokenAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "adminAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "coinMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "amt",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "gameSettings",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "gameId",
            "type": "u64"
          },
          {
            "name": "totalStake",
            "type": "u64"
          },
          {
            "name": "stage1Start",
            "type": "u64"
          },
          {
            "name": "stage1End",
            "type": "u64"
          },
          {
            "name": "lastRolled",
            "type": "u64"
          },
          {
            "name": "rollInterval",
            "type": "u64"
          },
          {
            "name": "coinMint",
            "type": "publicKey"
          },
          {
            "name": "coinDecimals",
            "type": "u8"
          },
          {
            "name": "sleighsStaked",
            "type": "u64"
          },
          {
            "name": "sleighsBuilt",
            "type": "u64"
          },
          {
            "name": "sleighsRetired",
            "type": "u64"
          },
          {
            "name": "mintCostMultiplier",
            "type": "u64"
          },
          {
            "name": "propulsionPartsMint",
            "type": "publicKey"
          },
          {
            "name": "landingGearPartsMint",
            "type": "publicKey"
          },
          {
            "name": "navigationPartsMint",
            "type": "publicKey"
          },
          {
            "name": "presentsBagPartsMint",
            "type": "publicKey"
          },
          {
            "name": "prizePool",
            "type": "u64"
          },
          {
            "name": "stg1RollMultiplier",
            "type": "u64"
          },
          {
            "name": "stg1SleighIdxBoost",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "gameRolls",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "rolls",
            "type": {
              "vec": "u64"
            }
          }
        ]
      }
    },
    {
      "name": "sleigh",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "publicKey"
          },
          {
            "name": "sleighId",
            "type": "u64"
          },
          {
            "name": "level",
            "type": "u8"
          },
          {
            "name": "gameId",
            "type": "u64"
          },
          {
            "name": "builtIndex",
            "type": "u64"
          },
          {
            "name": "mintCost",
            "type": "u64"
          },
          {
            "name": "stakeAmt",
            "type": "u64"
          },
          {
            "name": "broken",
            "type": "bool"
          },
          {
            "name": "stakedAfterRoll",
            "type": "u64"
          },
          {
            "name": "lastClaimedRoll",
            "type": "u64"
          },
          {
            "name": "lastDeliveryRoll",
            "type": "u64"
          },
          {
            "name": "propulsionHp",
            "type": "u8"
          },
          {
            "name": "landingGearHp",
            "type": "u8"
          },
          {
            "name": "navigationHp",
            "type": "u8"
          },
          {
            "name": "presentsBagHp",
            "type": "u8"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "GameNotStarted",
      "msg": ""
    },
    {
      "code": 6001,
      "name": "Stage1Ended",
      "msg": ""
    },
    {
      "code": 6002,
      "name": "RollTimerCooldown",
      "msg": ""
    },
    {
      "code": 6003,
      "name": "StakeAmtBelowCurrentMintCost",
      "msg": ""
    },
    {
      "code": 6004,
      "name": "InvalidRollForClaim",
      "msg": ""
    },
    {
      "code": 6005,
      "name": "Stage1NotOver",
      "msg": ""
    },
    {
      "code": 6006,
      "name": "SleighBroken",
      "msg": ""
    },
    {
      "code": 6007,
      "name": "GameNotOver",
      "msg": ""
    },
    {
      "code": 6008,
      "name": "SleighNotBuilt",
      "msg": ""
    },
    {
      "code": 6009,
      "name": "SleighNotBroken",
      "msg": ""
    }
  ]
};

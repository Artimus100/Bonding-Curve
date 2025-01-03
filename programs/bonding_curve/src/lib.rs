pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;

declare_id!("5pd2gAjURqrfAwsPmyfZEqv8eRyFsh1cq7UBimyhku1c");

#[program]
pub mod bonding_curve {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, base_price: u64) -> Result<()> {
        instructions::initialize(ctx, base_price)
    }

    pub fn buy(ctx: Context<Buy>, amount: u64) -> Result<()> {
        instructions::buy(ctx, amount)
    }

    pub fn sell(ctx: Context<Sell>, amount: u64) -> Result<()> {
        instructions::sell(ctx, amount)
    }
}


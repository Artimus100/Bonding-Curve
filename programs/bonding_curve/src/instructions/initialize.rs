use anchor_lang::prelude::*;
use crate::state::BondingCurve;

pub fn initialize(ctx: Context<Initialize>, base_price: u64) -> Result<()> {
    let bonding_curve = &mut ctx.accounts.bonding_curve;

    bonding_curve.token_supply = 0; // Initial supply is zero
    bonding_curve.base_price = base_price; // Set the base price for the bonding curve

    msg!("Bonding curve initialized with base price: {}", base_price);
    Ok(())
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = user, space = 8 + BondingCurve::LEN)]
    pub bonding_curve: Account<'info, BondingCurve>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

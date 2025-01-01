use anchor_lang::prelude::*;
use crate::state::BondingCurve;
use crate::error::CurveError;
pub fn sell(ctx: Context<Sell>, amount: u64) -> Result<()> {
    let bonding_curve = &mut ctx.accounts.bonding_curve;

    require!(amount <= bonding_curve.token_supply, CurveError::InsufficientSupply);

    let price = bonding_curve.price_for_sell(amount);
    bonding_curve.token_supply -= amount;

    msg!("Selling {} tokens at price {}", amount, price);
    Ok(())
}

#[derive(Accounts)]
pub struct Sell<'info> {
    #[account(mut)]
    pub bonding_curve: Account<'info, BondingCurve>,
    #[account(mut)]
    pub user: Signer<'info>,
}


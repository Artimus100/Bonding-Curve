use anchor_lang::prelude::*;
use crate::state::BondingCurve;

pub fn buy(ctx: Context<Buy>, amount: u64) -> Result<()> {
    let bonding_curve = &mut ctx.accounts.bonding_curve;

    let price = bonding_curve.price_for_buy(amount);
    bonding_curve.token_supply += amount;

    msg!("Buying {} tokens at price {}", amount, price);
    Ok(())
}

#[derive(Accounts)]
pub struct Buy<'info> {
    #[account(mut)]
    pub bonding_curve: Account<'info, BondingCurve>,
    #[account(mut)]
    pub user: Signer<'info>,
}

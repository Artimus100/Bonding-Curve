use anchor_lang::prelude::*;

#[account]
pub struct BondingCurve {
    pub token_supply: u64, // Current token supply
    pub base_price: u64,   // Base price for the curve
}

impl BondingCurve {
    pub const LEN: usize = 8 + 8; // Space for token_supply and base_price

    pub fn price_for_buy(&self, amount: u64) -> u64 {
        // Example: Linear curve
        self.base_price + (self.token_supply + amount) * 10 / 1_000
    }

    pub fn price_for_sell(&self, amount: u64) -> u64 {
        // Example: Linear curve
        self.base_price + (self.token_supply - amount) * 10 / 1_000
    }
}

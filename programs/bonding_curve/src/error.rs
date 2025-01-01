use anchor_lang::prelude::*;

#[error_code]
pub enum CurveError {
    #[msg("Insufficient token supply to complete the sale.")]
    InsufficientSupply,
}


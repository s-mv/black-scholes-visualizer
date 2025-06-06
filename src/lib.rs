mod utils;

use std::f64::consts::PI;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct BlackScholes {
    spot_price: f64,         // S - spot price
    strike_price: f64,       // K - strike price
    time_to_expiry: f64,     // T - time to expiry in whatever unit
    risk_free_rate: f64,     // r - interest rate
    standard_deviation: f64, // sigma - Volatility/std.dev. of the underlying asset
}

#[wasm_bindgen]
#[derive(Debug, Clone, Copy)]
pub enum OptionType {
    Call,
    Put,
}

#[wasm_bindgen]
#[derive(Debug)]
pub struct Greeks {
    pub delta: f64, // price sensitivity to underlying price
    pub gamma: f64, // delta sensitivity to underlying price
    pub theta: f64, // price sensitivity to time decay
    pub vega: f64,  // price sensitivity to volatility
    pub rho: f64,   // price sensitivity to interest rate
}

#[wasm_bindgen]
impl BlackScholes {
    #[wasm_bindgen(constructor)]
    pub fn new(
        spot_price: f64,
        strike_price: f64,
        time_to_expiry: f64,
        risk_free_rate: f64,
        standard_deviation: f64,
    ) -> BlackScholes {
        BlackScholes {
            spot_price,
            strike_price,
            time_to_expiry,
            risk_free_rate,
            standard_deviation,
        }
    }

    #[wasm_bindgen(setter)]
    pub fn set_spot_price(&mut self, value: f64) {
        self.spot_price = value;
    }

    #[wasm_bindgen(setter)]
    pub fn set_strike_price(&mut self, value: f64) {
        self.strike_price = value;
    }

    #[wasm_bindgen(setter)]
    pub fn set_time_to_expiry(&mut self, value: f64) {
        self.time_to_expiry = value;
    }

    #[wasm_bindgen(setter)]
    pub fn set_risk_free_rate(&mut self, value: f64) {
        self.risk_free_rate = value;
    }

    #[wasm_bindgen(setter)]
    pub fn set_standard_deviation(&mut self, value: f64) {
        self.standard_deviation = value;
    }

    #[wasm_bindgen]
    pub fn d1(&self) -> f64 {
        let numerator = (self.spot_price / self.strike_price).ln()
            + (self.risk_free_rate + 0.5 * self.standard_deviation.powi(2)) * self.time_to_expiry;
        let denominator = self.standard_deviation * self.time_to_expiry.sqrt();
        numerator / denominator
    }

    #[wasm_bindgen]
    pub fn d2(&self) -> f64 {
        self.d1() - self.standard_deviation * self.time_to_expiry.sqrt()
    }

    #[wasm_bindgen]
    pub fn norm_cdf(x: f64) -> f64 {
        0.5 * (1.0 + erf(x / 2.0_f64.sqrt()))
    }

    #[wasm_bindgen]
    pub fn norm_pdf(x: f64) -> f64 {
        (-0.5 * x.powi(2)).exp() / (2.0 * PI).sqrt()
    }

    #[wasm_bindgen]
    pub fn price(&self, option_type: OptionType) -> f64 {
        let d1 = self.d1();
        let d2 = self.d2();
        let discount_factor = (-self.risk_free_rate * self.time_to_expiry).exp();

        match option_type {
            OptionType::Call => {
                self.spot_price * Self::norm_cdf(d1)
                    - self.strike_price * discount_factor * Self::norm_cdf(d2)
            }
            OptionType::Put => {
                self.strike_price * discount_factor * Self::norm_cdf(-d2)
                    - self.spot_price * Self::norm_cdf(-d1)
            }
        }
    }

    #[wasm_bindgen]
    pub fn greeks(&self, option_type: OptionType) -> Greeks {
        let d1 = self.d1();
        let d2 = self.d2();
        let discount_factor = (-self.risk_free_rate * self.time_to_expiry).exp();
        let sqrt_t = self.time_to_expiry.sqrt();

        let delta = match option_type {
            OptionType::Call => Self::norm_cdf(d1),
            OptionType::Put => Self::norm_cdf(d1) - 1.0,
        };

        let gamma = Self::norm_pdf(d1) / (self.spot_price * self.standard_deviation * sqrt_t);

        let theta = match option_type {
            OptionType::Call => {
                -self.spot_price * Self::norm_pdf(d1) * self.standard_deviation / (2.0 * sqrt_t)
                    - self.risk_free_rate * self.strike_price * discount_factor * Self::norm_cdf(d2)
            }
            OptionType::Put => {
                -self.spot_price * Self::norm_pdf(d1) * self.standard_deviation / (2.0 * sqrt_t)
                    + self.risk_free_rate
                        * self.strike_price
                        * discount_factor
                        * Self::norm_cdf(-d2)
            }
        } / 365.0;

        let vega = self.spot_price * Self::norm_pdf(d1) * sqrt_t / 100.0;

        let rho = match option_type {
            OptionType::Call => {
                self.strike_price * self.time_to_expiry * discount_factor * Self::norm_cdf(d2)
                    / 100.0
            }
            OptionType::Put => {
                -self.strike_price * self.time_to_expiry * discount_factor * Self::norm_cdf(-d2)
                    / 100.0
            }
        };

        Greeks {
            delta,
            gamma,
            theta,
            vega,
            rho,
        }
    }

    #[wasm_bindgen]
    pub fn implied_volatility(
        &mut self,
        market_price: f64,
        option_type: OptionType,
        max_iterations: usize,
        tolerance: f64,
    ) -> Result<f64, String> {
        let mut vol = 0.2;

        for _ in 0..max_iterations {
            self.standard_deviation = vol;
            let price = self.price(option_type);
            let vega = self.greeks(option_type).vega * 100.0;

            if (price - market_price).abs() < tolerance {
                return Ok(vol);
            }

            if vega.abs() < 1e-10 {
                return Err("Vega too small, cannot converge!".to_string());
            }

            vol = vol - (price - market_price) / vega;

            if vol <= 0.0 {
                vol = 0.001;
            }
        }

        Err("Failed to converge...".to_string())
    }
}

#[wasm_bindgen]
// error function, Abramowitz and Stegun formula
// I wanted to use statrs, a possible TODO actually
pub fn erf(x: f64) -> f64 {
    let a1 = 0.254829592;
    let a2 = -0.284496736;
    let a3 = 1.421413741;
    let a4 = -1.453152027;
    let a5 = 1.061405429;
    let p = 0.3275911;

    let sign = if x < 0.0 { -1.0 } else { 1.0 };
    let x = x.abs();

    let t = 1.0 / (1.0 + p * x);
    let y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * (-x * x).exp();

    sign * y
}

#[wasm_bindgen]
pub fn calculate_option_price(
    spot_price: f64,
    strike_price: f64,
    time_to_expiry: f64,
    risk_free_rate: f64,
    volatility: f64,
    option_type: OptionType,
) -> f64 {
    let bs = BlackScholes::new(
        spot_price,
        strike_price,
        time_to_expiry,
        risk_free_rate,
        volatility,
    );
    bs.price(option_type)
}

#[wasm_bindgen]
pub fn calculate_greeks(
    spot_price: f64,
    strike_price: f64,
    time_to_expiry: f64,
    risk_free_rate: f64,
    volatility: f64,
    option_type: OptionType,
) -> Greeks {
    let bs = BlackScholes::new(
        spot_price,
        strike_price,
        time_to_expiry,
        risk_free_rate,
        volatility,
    );
    bs.greeks(option_type)
}

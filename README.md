# A demonstration of the Black-Scholes Model in Rust (shipped to WASM)

[this link doesn't work yet](https://example.com)

This project demonstrates a pricing engine for European call/put options using
an application of the Black-Scholes (or Black-Scholes-Merton) equation.

## Word of Caution
The Black-Scholes model is derived from an equation that was meant to model
**Brownian motion**. This is a fundamentally flawed approach to work with
stocks; it simply approximates the market well in many cases.

It is a gross simplification that just works well long-term if you're
lucky and invest smartly. **This repository must not be used to generate**
**actual investment advice.** It's more of an educational tool.


## The Black-Scholes Model
[Wikipedia](https://en.wikipedia.org/wiki/Black%E2%80%93Scholes_model) might
be better at explaining this than me.

But in short, the Black-Scholes model is a solution that can be applied to
options trading (specifically, options that have to be held for a certain
amount of time — basically, European options trading). 

$$C = S_t \Phi(d_1) - Ke^{-rt} \Phi(d_2)$$  
$$\Phi(x) = \int_{-\infty}^x \frac{1}{\sqrt{2\pi}} e^{\frac{-s^2}{2}} \, ds$$

$$
d_1 = \frac{\ln\left(\frac{S_t}{K}\right) +
\left(r+ \frac{\sigma^2}{2}\right)t}{\sigma \sqrt{t}}
$$

$$d_2 = d_1 - \sigma \sqrt{t}$$  
$$\frac{dS_t}{S_t} = \mu \, dt + \sigma \, dW_t$$

Where:

- $C$ → price of the call option  
- $S_t$ → current (spot) price of the asset  
- $K$ → strike price of the option  
- $r$ → risk-free interest rate  
- $t$ → time to maturity (in years)  
- $\sigma$ → standard deviation (i.e. volatility) of the asset’s returns  
- $\Phi(x)$ → standard normal cumulative distribution function

The terms $d_1$ and $d_2$ are defined as:

$$
d_1 = \frac{\ln\left(\frac{S_t}{K}\right) +
\left(r + \frac{\sigma^2}{2}\right)t}{\sigma \sqrt{t}}, \quad
d_2 = d_1 - \sigma \sqrt{t}
$$

The underlying asset is modeled as:

$$\frac{dS_t}{S_t} = \mu \, dt + \sigma \, dW_t$$

## That was crazy, right? Here's a simpler version for better understanding.

### 1. What's an option?

Basically, imagine that you expect a share will skyrocket in price soon.
So you buy the *right* to buy it later at the current price.

### 2. What's a "European" option? Are there other options?

Yes, there are other options. A European option can only be sold at the time
you've specified to hold it for. American options can be sold any time before
that too.

### 3. If this model's so great, why isn't everyone rich?

The Black-Scholes model makes some assumptions that require a person to be very
prudent while using it. It's not a money-printing machine but rather a fair
approximation of a stable (non-volatile) market.

Here are some assumptions made by the model:
1. Stocks can move randomly but can't jump — they follow a *log-normal* path.
2. It assumes that the market performs Brownian motion: random movement.
3. You can't just make a profit by holding money.

### 4. So what does this model do?

It employs a formula that calculates the expected value of the option, telling
how much it's likely worth based on:
1. How far the current price is from the strike price.
2. How long you’re holding it.
3. How volatile (uncertain) the asset is.
4. How much interest money earns in a safe place.

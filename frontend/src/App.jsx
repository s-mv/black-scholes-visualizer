import { useState, useEffect } from 'preact/hooks'
import { OptionType, calculate_option_price, calculate_greeks } from './pkg/black_scholes'
import { ThreeScene } from './components/ThreeScene'
import Chart2D from './components/Chart2D';
import './index.css';
import { GreekAnnotations } from './components/GreekAnnotations';
import { StockPriceChart } from './components/StockPriceChart';
import Papa from 'papaparse';

const data = Papa.parse(
  await fetch("./data/IBM.csv").then(res => res.text()),
  { header: true, dynamicTyping: true, }
);

const generateGreekData = (greek, optionType) => {
  const strikes = Array.from(
    { length: 50 },
    (_, i) => 50 + i * 2
  );

  return strikes.map(strike => ({
    x: strike,
    y: calculate_greeks(100, strike, 1, 0.05, 0.2, optionType)[greek]
  }));
};

export const App = () => {
  const [params, setParams] = useState({
    minStrike: 80,
    maxStrike: 120,
    strikeStep: 5,
    minVol: 0.1,
    maxVol: 0.5,
    volStep: 0.05,
    spot: 100.0,
    time: 1.0,
    rate: 0.05
  })
  const [activeTab, setActiveTab] = useState('prices')
  const [heatmapData, setHeatmapData] = useState(null)
  const [purchaseDate, setPurchaseDate] = useState(new Date(new Date().setFullYear(new Date().getFullYear() - 2)))
  const [stockData] = useState(data)

  const generateHeatmap = () => {
    const strikes = Array.from(
      { length: Math.floor((params.maxStrike - params.minStrike) / params.strikeStep) + 1 },
      (_, i) => params.minStrike + i * params.strikeStep
    )
    const volatilities = Array.from(
      { length: Math.floor((params.maxVol - params.minVol) / params.volStep) + 1 },
      (_, i) => params.minVol + i * params.volStep
    )

    const getData = (optionType) => {
      return {
        prices: volatilities.map(vol =>
          strikes.map(strike =>
            calculate_option_price(params.spot, strike, params.time, params.rate, vol, optionType).toFixed(2)
          )
        ),
        greeks: volatilities.map(vol =>
          strikes.map(strike => {
            const greeks = calculate_greeks(params.spot, strike, params.time, params.rate, vol, optionType)
            return {
              delta: greeks.delta.toFixed(3),
              gamma: greeks.gamma.toFixed(3),
              theta: greeks.theta.toFixed(3),
              vega: greeks.vega.toFixed(3),
              rho: greeks.rho.toFixed(3)
            }
          })
        )
      }
    }

    setHeatmapData({
      strikes,
      volatilities,
      puts: getData(OptionType.Put),
      calls: getData(OptionType.Call)
    })
  }

  useEffect(() => {
    generateHeatmap()
  }, [params])

  const getColor = (value, isPrice = true) => {
    const val = parseFloat(value)
    const maxValue = isPrice ? 40 : 1
    const intensity = Math.floor(Math.abs(val) / maxValue * 255)

    if (val >= 0) {
      return `bg-[rgb(${255 - intensity},255,${255 - intensity})]`
    } else {
      return `bg-[rgb(255,${255 - intensity},${255 - intensity})]`
    }
  }

  const tabs = ['prices', 'delta', 'gamma', 'theta', 'vega', 'rho']

  const getCurrentValues = () => {
    const callPrice = calculate_option_price(
      params.spot, params.spot, params.time, params.rate, params.minVol, OptionType.Call
    ).toFixed(4);
    const putPrice = calculate_option_price(
      params.spot, params.spot, params.time, params.rate, params.minVol, OptionType.Put
    ).toFixed(4);
    const greeks = calculate_greeks(
      params.spot, params.spot, params.time, params.rate, params.minVol, OptionType.Call
    );
    return { callPrice, putPrice, greeks };
  };

  return (
    <div class="min-h-screen flex bg-[#0d1117] text-gray-100">
      <div class="w-64 fixed top-0 bottom-0 flex-none px-4 py-6 overflow-y-auto border-r bg-[#161b22] border-gray-700">
        <h2 class="px-2 text-sm font-semibold mb-4 text-gray-600 dark:text-gray-400">Parameters</h2>

        <div class="space-y-4">
          <div class="github-card p-3">
            <label class="block text-xs font-medium mb-2">Strike Price Range</label>
            <input
              type="range"
              min="50"
              max="300"
              step="1"
              value={params.spot}
              onChange={(e) => setParams({ ...params, spot: Number(e.target.value) })}
              class="w-full github-input"
            />
            <div class="flex justify-between text-xs mt-1">
              <span>50</span>
              <span>{params.spot}</span>
              <span>300</span>
            </div>
          </div>

          <div class="github-card p-3">
            <label class="block text-xs font-medium mb-2">Volatility</label>
            <input
              type="range"
              min="0.1"
              max="0.5"
              step="0.01"
              value={params.minVol}
              onChange={(e) => setParams({ ...params, minVol: Number(e.target.value) })}
              class="w-full github-input"
            />
            <div class="flex justify-between text-xs mt-1">
              <span>10%</span>
              <span>{(params.minVol * 100).toFixed(0)}%</span>
              <span>50%</span>
            </div>
          </div>

          <div class="github-card p-3">
            <label class="block text-xs font-medium mb-2">Time to Expiry (Years)</label>
            <input
              type="range"
              min="0.25"
              max="10"
              step="0.25"
              value={params.time}
              onChange={(e) => setParams({ ...params, time: Number(e.target.value) })}
              class="w-full github-input"
            />
            <div class="flex justify-between text-xs mt-1">
              <span>0.25</span>
              <span>{params.time.toFixed(2)}</span>
              <span>10.0</span>
            </div>
          </div>
        </div>

        <div class="mt-6">
          <h2 class="px-2 text-sm font-semibold mb-2 text-gray-600 dark:text-gray-400">Current Values</h2>
          <div class="github-card p-3 space-y-2 text-xs">
            <div class="grid grid-cols-2 gap-2">
              <div class="font-medium">Call Price:</div>
              <div class="text-right">{getCurrentValues().callPrice}</div>
              <div class="font-medium">Put Price:</div>
              <div class="text-right">{getCurrentValues().putPrice}</div>
            </div>
            <div class="border-t border-gray-200 dark:border-gray-700 my-2"></div>
            <div class="grid grid-cols-2 gap-2">
              <div class="font-medium">Delta:</div>
              <div class="text-right">{getCurrentValues().greeks.delta.toFixed(4)}</div>
              <div class="font-medium">Gamma:</div>
              <div class="text-right">{getCurrentValues().greeks.gamma.toFixed(4)}</div>
              <div class="font-medium">Theta:</div>
              <div class="text-right">{getCurrentValues().greeks.theta.toFixed(4)}</div>
              <div class="font-medium">Vega:</div>
              <div class="text-right">{getCurrentValues().greeks.vega.toFixed(4)}</div>
              <div class="font-medium">Rho:</div>
              <div class="text-right">{getCurrentValues().greeks.rho.toFixed(4)}</div>
            </div>
          </div>
        </div>

        <nav class="mt-6">
          <h2 class="px-2 text-sm font-semibold mb-2 text-gray-600 dark:text-gray-400">Views</h2>
          <div class="space-y-1">
            {tabs.map(tab => (
              <button
                onClick={() => setActiveTab(tab)}
                class={`w-full px-2 py-1.5 text-sm rounded-md text-left transition-colors ${activeTab === tab
                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 font-medium'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </nav>
      </div>
      <div class="flex-1 min-w-0 px-6 py-4 ml-64">
        <header class="mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
          <h1 class="text-2xl font-semibold">Black-Scholes Option Visualizer</h1>
        </header>

        {heatmapData && (
          <>
            <div class="mb-6">
              <div class="github-card p-4">
                <h3 class="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">How to read the 3D surface:</h3>
                <ul class="list-disc list-inside space-y-1 text-sm">
                  <li>X-axis: Strike Price (horizontal)</li>
                  <li>Y-axis: Option Value/Greek (height)</li>
                  <li>Z-axis: Volatility (depth)</li>
                  <li>Colors: Green = higher values, Red = lower values</li>
                  <li>Use mouse to rotate, scroll to zoom, right-click to pan</li>
                </ul>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-6 mb-8">
              <div class="github-card p-4">
                <h2 class="text-base font-semibold mb-2">Put Options</h2>
                <div class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Visualization of put option {activeTab === 'prices' ? 'prices' : activeTab} across different strikes and volatilities
                </div>
                <div class="aspect-[4/3] w-full">
                  <ThreeScene
                    data={heatmapData.puts[activeTab === 'prices' ? 'prices' : 'greeks'].map(row =>
                      row.map(value => activeTab === 'prices' ? value : value[activeTab])
                    )}
                    strikes={heatmapData.strikes}
                    volatilities={heatmapData.volatilities}
                    colorType={activeTab}
                  />
                </div>
              </div>
              <div class="github-card p-4">
                <h2 class="text-base font-semibold mb-2">Call Options</h2>
                <div class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Visualization of call option {activeTab === 'prices' ? 'prices' : activeTab} across different strikes and volatilities
                </div>
                <div class="aspect-[4/3] w-full">
                  <ThreeScene
                    data={heatmapData.calls[activeTab === 'prices' ? 'prices' : 'greeks'].map(row =>
                      row.map(value => activeTab === 'prices' ? value : value[activeTab])
                    )}
                    strikes={heatmapData.strikes}
                    volatilities={heatmapData.volatilities}
                    colorType={activeTab}
                  />
                </div>
              </div>
            </div>
          </>
        )}

        <section class="mb-8">
          <h2 class="text-base font-semibold mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
            Option Greeks Analysis
          </h2>

          <div class="github-card p-4 mb-6">
            <h3 class="text-sm font-medium mb-2">Current Parameters</h3>
            <div class="grid grid-cols-4 gap-4 text-sm">
              <div>
                <span class="font-medium">Stock Price:</span> ${params.spot}
              </div>
              <div>
                <span class="font-medium">Time to Expiry:</span> {params.time} years
              </div>
              <div>
                <span class="font-medium">Risk-free Rate:</span> {(params.rate * 100).toFixed(1)}%
              </div>
              <div>
                <span class="font-medium">Volatility:</span> {(params.minVol * 100).toFixed(1)}%
              </div>
            </div>
          </div>

          <div class="flex justify-center space-x-8 mb-6">
            <div class="flex items-center">
              <div class="w-4 h-4 rounded bg-[#e91e63] mr-2"></div>
              <span class="text-sm">Put Option</span>
            </div>
            <div class="flex items-center">
              <div class="w-4 h-4 rounded bg-[#2196f3] mr-2"></div>
              <span class="text-sm">Call Option</span>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-6">
            {['delta', 'gamma', 'theta', 'vega'].map((greek) => (
              <div class="github-card p-4">
                <div class="grid grid-cols-2 gap-6">
                  <div>
                    <h3 class="text-xl font-semibold mb-4">Put Option</h3>
                    <Chart2D
                      data={generateGreekData(greek, OptionType.Put)}
                      title={greek.charAt(0).toUpperCase() + greek.slice(1)}
                      xLabel="Strike Price"
                      yLabel={greek.charAt(0).toUpperCase() + greek.slice(1)}
                      width={300}
                      height={200}
                      color="#e91e63"
                      spot={params.spot}
                      annotations={{
                        lines: [
                          { x: params.spot, color: 'rgba(255, 255, 255, 0.5)', width: 1 },
                          ...(GreekAnnotations[greek].lines || [])
                        ],
                        items: GreekAnnotations[greek].items || []
                      }}
                    />
                  </div>
                  <div>
                    <h3 class="text-xl font-semibold mb-4">Call Option</h3>
                    <Chart2D
                      data={generateGreekData(greek, OptionType.Call)}
                      title={greek.charAt(0).toUpperCase() + greek.slice(1)}
                      xLabel="Strike Price"
                      yLabel={greek.charAt(0).toUpperCase() + greek.slice(1)}
                      width={300}
                      height={200}
                      color="#2196f3"
                      spot={params.spot}
                      annotations={{
                        lines: [
                          { x: params.spot, color: 'rgba(255, 255, 255, 0.5)', width: 1 },
                          ...(GreekAnnotations[greek].lines || [])
                        ],
                        items: GreekAnnotations[greek].items || []
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section class="mb-8">
          <h2 class="text-base font-semibold mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
            Historical Price Analysis & Break-Even Points
          </h2>
          <div class="p-4 mb-6">
            <p class="text-sm mb-4">
              This chart displays IBM's historical stock price data with option break-even points overlaid. The break-even points show
              where the stock price needs to move for options to become profitable at expiration, accounting for the premium paid.
              The vertical lines indicate the option purchase date and expiration date, helping visualize the time window for the trade.
            </p>
            <ul class="list-disc list-inside space-y-1 text-sm">
              <li>Green line: Call option break-even price (Strike + Premium)</li>
              <li>Red line: Put option break-even price (Strike - Premium)</li>
              <li>Blue line: Strike price</li>
            </ul>
          </div>
          <div class="mb-8">
            {(() => {
              const callPrice = calculate_option_price(
                params.spot,
                params.spot,
                params.time,
                params.rate,
                params.minVol,
                OptionType.Call
              );
              const putPrice = calculate_option_price(
                params.spot,
                params.spot,
                params.time,
                params.rate,
                params.minVol,
                OptionType.Put
              );

              const expiryDate = new Date('2025-02-28');
              const purchaseDate = new Date(expiryDate);
              purchaseDate.setFullYear(purchaseDate.getFullYear() - params.time);

              return (
                <StockPriceChart
                  data={stockData}
                  strikePrice={params.spot}
                  callBreakeven={params.spot + callPrice}
                  putBreakeven={params.spot - putPrice}
                  purchaseDate={purchaseDate}
                  expirationDate={expiryDate}
                />
              );
            })()}
          </div>
        </section>

        <footer class="mt-12 pt-8 pb-8 border-t border-gray-700">
          <div class="flex justify-between items-center text-base text-gray-400">
            <p class="text-lg">
              An interactive Black-Scholes option pricing model visualizer.
              <br />
              Built with Preact, Three.js, and Chart.js.
            </p>
            <div class="space-x-6">
              <a href="https://github.com/s-mv/black-scholes-visualizer" target="_blank" rel="noopener"
                class="github-button text-base">GitHub</a>
              <a href="https://linkedin.com/in/shreerang-vaidya" target="_blank" rel="noopener"
                class="github-button text-base">LinkedIn</a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}

export default App;

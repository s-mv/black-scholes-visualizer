import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUpload, faSyncAlt, faMoon, faSun } from '@fortawesome/free-solid-svg-icons';
import Papa from 'papaparse';
import { Chart as ChartJS, LineElement, PointElement, LinearScale, Title, Tooltip, Legend, CategoryScale, TimeScale, TimeSeriesScale } from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
import { ThreeScene } from './ThreeScene';
import { Chart2D } from './Chart2D';
import { CandlestickController, CandlestickElement } from 'chartjs-chart-financial';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  zoomPlugin,
  TimeSeriesScale,
  CandlestickController,
  CandlestickElement
);

export const App = () => {
  const [wasmLoaded, setWasmLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [csvFile, setCsvFile] = useState(null);

  const [params, setParams] = useState({
    spotPrice: 100,
    strikePrice: 105,
    timeToExpiry: 0.25,
    riskFreeRate: 0.05,
    volatility: 0.2
  });

  const [vizSettings, setVizSettings] = useState({
    gridSize: 50
  });

  const paramLabels = {
    spotPrice: 'Spot Price',
    strikePrice: 'Strike Price',
    timeToExpiry: 'Time to Expiry',
    riskFreeRate: 'Risk-Free Rate',
    volatility: 'Volatility'
  };

  const paramRanges = {
    spotPrice: { min: Math.min(...data.map(d => d.price)) * 0.9, max: Math.max(...data.map(d => d.price)) * 1.1, step: 1 },
    strikePrice: { min: Math.min(...data.map(d => d.price)) * 0.9, max: Math.max(...data.map(d => d.price)) * 1.1, step: 1 },
    timeToExpiry: { min: 0.01, max: 10, step: 0.01 },
    riskFreeRate: { min: 0, max: 0.2, step: 0.001 },
    volatility: { min: 0.01, max: 1, step: 0.01 }
  };

  const [theme, setTheme] = useState('dark');

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  useEffect(() => {
    setWasmLoaded(true);
    generateRandomData();
  }, []);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setCsvFile(file);
    setLoading(true);

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        const processedData = results.data.map(row => ({
          time: row.time || 0,
          price: row.price || 0
        })).filter(point => !isNaN(point.price) && !isNaN(point.time));

        setData(processedData);
        setLoading(false);
      },
      error: (error) => {
        setLoading(false);
      }
    });
  };

  const generateRandomData = () => {
    setLoading(true);

    const randomPoints = [];
    const intervalMinutes = 5;
    const totalIntervals = (5 * 24 * 60) / intervalMinutes;
    const initialPrice = params.spotPrice;
    const drift = params.riskFreeRate;
    const volatility = params.volatility;
    const dt = intervalMinutes / (60 * 24);

    let currentPrice = initialPrice;

    for (let i = 0; i < totalIntervals; i++) {
      const randomShock = Math.random() * 2 - 1;
      const priceChange = drift * currentPrice * dt + volatility * currentPrice * Math.sqrt(dt) * randomShock;
      const open = currentPrice;
      const close = currentPrice + priceChange;
      const high = Math.max(open, close, open + Math.random() * volatility * currentPrice);
      const low = Math.min(open, close, open - Math.random() * volatility * currentPrice);
      const volume = Math.floor(Math.random() * 1000) + 100; // Random volume between 100 and 1100

      randomPoints.push({
        timestamp: new Date(Date.now() - i * intervalMinutes * 60 * 1000),
        open,
        high,
        low,
        close,
        volume,
      });

      currentPrice = close;
    }

    setData(randomPoints.reverse()); // Reverse to have chronological order
    setLoading(false);
  };

  if (!wasmLoaded) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading Black-Scholes WASM module...</div>
      </div>
    );
  }

  return (
    <div className={`${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'} min-h-screen`}>
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6 text-center">Black-Scholes Options Visualizer</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-4 overflow-y-auto h-[calc(100vh-100px)] p-2 border rounded">
            <div className={`border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'} rounded p-3`}>
              <h3 className="text-lg font-semibold mb-3 flex items-center">
                <FontAwesomeIcon icon={faUpload} className="mr-2" />
                Data Source
              </h3>
              <label className="block">
                <span className="text-sm">Upload CSV File</span>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className={`mt-1 block w-full text-sm ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-900'} border rounded`}
                />
              </label>
              <button
                onClick={generateRandomData}
                disabled={loading}
                className={`mt-3 w-full px-4 py-2 rounded ${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-200 hover:bg-gray-300'} flex items-center justify-center`}
              >
                <FontAwesomeIcon icon={faSyncAlt} className="mr-2" />
                Generate Random Data
              </button>
            </div>

            <div className={`border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'} rounded p-3`}>
              <h3 className="text-lg font-semibold mb-3">Parameters</h3>
              {Object.entries(params).map(([key, value]) => (
                <label key={key} className="block mb-4">
                  <span className="text-sm">{paramLabels[key]}</span>
                  <input
                    type="range"
                    value={value}
                    onChange={(e) => setParams((prev) => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))}
                    min={paramRanges[key].min}
                    max={paramRanges[key].max}
                    step={paramRanges[key].step}
                    className="mt-1 block w-full"
                  />
                  <span className="text-xs">{value}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className={`border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'} rounded p-3 h-[400px] relative`}>
              <ThreeScene params={params} data={data} vizSettings={vizSettings} loading={loading} setLoading={setLoading} theme={theme} />
              {loading && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded">
                  <div className="text-white text-xl">Generating surface...</div>
                </div>
              )}
            </div>

            <div className={`border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'} rounded p-3 h-[300px]`}>
              <h3 className="text-lg font-semibold mb-3">Price Over Time</h3>
              {data.length > 0 ? (
                <div className="w-full h-full">
                  <Chart2D data={data} theme={theme} />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <p className="text-sm">No data available to display.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={toggleTheme}
        className={`fixed bottom-4 right-4 p-3 rounded-full shadow-lg ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-900'}`}
      >
        <FontAwesomeIcon icon={theme === 'dark' ? faSun : faMoon} />
      </button>
    </div>
  );
};

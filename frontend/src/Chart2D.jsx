import React, { useMemo, useRef, useState } from 'react';
import { Chart, Line } from 'react-chartjs-2';
import { Chart as ChartJS, LineElement, PointElement, LinearScale, Title, Tooltip, Legend, CategoryScale, TimeSeriesScale } from 'chart.js';
import { CandlestickController, CandlestickElement } from 'chartjs-chart-financial';
import zoomPlugin from 'chartjs-plugin-zoom';
import { faLineChart, faCakeCandles } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import 'chartjs-adapter-date-fns';

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

export const Chart2D = ({ data, theme }) => {
  const chartRef = useRef(null);
  const [showCandlestick, setShowCandlestick] = useState(false);

  const toggleChartType = () => {
    setShowCandlestick((prev) => !prev);
  };

  const candlestickData = useMemo(() => data.map((point) => ({
    x: new Date(point.timestamp).getTime(), // Convert to timestamp
    o: point.open,
    h: point.high,
    l: point.low,
    c: point.close,
  })), [data]);

  const lineChartData = useMemo(() => data.map((point) => ({
    x: new Date(point.timestamp).getTime(), // Convert to timestamp
    y: point.close,
  })), [data]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        labels: {
          color: theme === 'dark' ? '#FFFFFF' : '#000000',
        },
      },
      tooltip: {
        enabled: true,
        backgroundColor: theme === 'dark' ? '#1F2937' : '#FFFFFF',
        titleColor: theme === 'dark' ? '#FFFFFF' : '#000000',
        bodyColor: theme === 'dark' ? '#FFFFFF' : '#000000',
        borderColor: theme === 'dark' ? '#374151' : '#E5E7EB',
        borderWidth: 1,
      },
      zoom: {
        limits: {
          x: {
            minRange: 24 * 60 * 60 * 1000, // one day in milliseconds
          },
        },
        pan: {
          enabled: true,
          mode: 'x',
        },
        zoom: {
          wheel: {
            enabled: true,
            speed: 0.1,
          },
          pinch: {
            enabled: true,
          },
          drag: {
            enabled: true,
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            borderColor: 'rgba(0, 0, 0, 0.4)',
            borderWidth: 1,
          },
          mode: 'x',
        },
      },
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'day',
          displayFormats: {
            day: 'MMM d',
          },
        },
        title: {
          display: true,
          text: 'Time',
          color: theme === 'dark' ? '#FFFFFF' : '#000000',
        },
        ticks: {
          color: theme === 'dark' ? '#FFFFFF' : '#000000',
          callback: function (value, index, values) {
            const date = new Date(data[index].timestamp);
            return index % ((5 * 24 * 60) / 5) === 0 ? date.toLocaleDateString() : '';
          },
        },
        grid: {
          color: theme === 'dark' ? '#374151' : '#E5E7EB',
        },
      },
      y: {
        title: {
          display: true,
          text: 'Price',
          color: theme === 'dark' ? '#FFFFFF' : '#000000',
        },
        ticks: {
          color: theme === 'dark' ? '#FFFFFF' : '#000000',
        },
        grid: {
          color: theme === 'dark' ? '#374151' : '#E5E7EB',
        },
      },
    },
  }), [theme]); // Only recreate when theme changes

  return (
    showCandlestick ? (
      <Chart
        ref={chartRef}
        type="candlestick"
        data={{
          datasets: [{
            label: 'Candlestick Data',
            data: candlestickData,
            borderColor: theme === 'dark' ? '#4F46E5' : '#3B82F6',
            color: {
              up: '#00ff00',
              down: '#ff0000',
              unchanged: '#999999',
            },
          }],
        }}
        options={options}
      />
    ) : (
      <Line
        ref={chartRef}
        data={{
          datasets: [{
            label: 'Close Price',
            data: lineChartData,
            borderColor: theme === 'dark' ? '#8f00ff' : '#ff4400',
            borderWidth: 1.5,
            pointRadius: 0,
            pointHoverRadius: 5,
            fill: true,
            tension: 0.35,
            spanGaps: true,
          }],
        }}
        options={options}
      />
    )
  );
};

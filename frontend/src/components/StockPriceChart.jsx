import { useEffect, useRef } from 'preact/hooks'
import Chart from 'chart.js/auto'
import annotationPlugin from 'chartjs-plugin-annotation'
import 'chartjs-adapter-date-fns'
import { format } from 'date-fns'

Chart.register(annotationPlugin)

export const StockPriceChart = ({ 
  data, 
  strikePrice, 
  callBreakeven,
  putBreakeven,
  purchaseDate,
  expirationDate 
}) => {
  const chartRef = useRef(null)
  const chartInstance = useRef(null)

  useEffect(() => {
    if (!data?.data || chartInstance.current) {
      chartInstance.current?.destroy()
    }

    const ctx = chartRef.current.getContext('2d')

    // Process CSV data
    const timeSeriesData = data.data.map(row => ({
      x: new Date(row.date),
      y: parseFloat(row.close)
    })).sort((a, b) => a.x - b.x)

    const volumeData = data.data.map(row => ({
      x: new Date(row.date),
      y: parseInt(row.volume)
    })).sort((a, b) => a.x - b.x)

    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        datasets: [{
          label: 'Stock Price',
          data: timeSeriesData,
          borderColor: '#2196f3',
          borderWidth: 1,
          pointRadius: 0,
          fill: false,
          yAxisID: 'y'
        },
        {
          label: 'Volume',
          data: volumeData,
          type: 'bar',
          backgroundColor: 'rgba(169, 169, 169, 0.3)',
          borderColor: 'rgba(169, 169, 169, 0.5)',
          yAxisID: 'y1'
        },
        // Add horizontal reference lines
        {
          label: 'Strike Price',
          data: timeSeriesData.map(point => ({ x: point.x, y: strikePrice })),
          borderColor: 'rgba(255, 99, 132, 0.8)',
          borderWidth: 1,
          borderDash: [10, 5],
          pointRadius: 0,
          yAxisID: 'y'
        },
        {
          label: 'Call Breakeven',
          data: timeSeriesData.map(point => ({ x: point.x, y: callBreakeven })),
          borderColor: 'rgba(75, 192, 192, 0.8)',
          borderWidth: 1,
          borderDash: [10, 5],
          pointRadius: 0,
          yAxisID: 'y'
        },
        {
          label: 'Put Breakeven',
          data: timeSeriesData.map(point => ({ x: point.x, y: putBreakeven })),
          borderColor: 'rgba(153, 102, 255, 0.8)',
          borderWidth: 1,
          borderDash: [10, 5],
          pointRadius: 0,
          yAxisID: 'y'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        scales: {
          x: {
            type: 'time',
            time: {
              unit: 'month',
              stepSize: 3,
              displayFormats: {
                month: 'MMM yyyy'
              }
            },
            ticks: {
              maxTicksLimit: 12,
              autoSkip: true
            }
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: 'Price ($)'
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: 'Volume'
            },
            grid: {
              drawOnChartArea: false
            }
          }
        },
        plugins: {
          tooltip: {
            callbacks: {
              title: (context) => {
                return format(new Date(context[0].parsed.x), 'MMM d, yyyy')
              },
              label: (context) => {
                const label = context.dataset.label;
                const value = context.parsed.y;
                return `${label}: ${label === 'Volume' ? value.toLocaleString() : value.toFixed(2)}`;
              }
            }
          },
          annotation: {
            common: {
              drawTime: 'afterDraw'
            },
            annotations: {
              purchaseDate: {
                type: 'line',
                scaleID: 'x',
                value: purchaseDate,
                borderColor: 'rgba(75, 192, 75, 0.8)',
                borderWidth: 2,
                borderDash: [20, 5],
                label: {
                  content: 'Purchase',
                  display: true,
                  position: 'start'
                }
              },
              expirationDate: {
                type: 'line',
                scaleID: 'x',
                value: expirationDate,
                borderColor: 'rgba(75, 192, 75, 0.8)',
                borderWidth: 2,
                borderDash: [20, 5],
                label: {
                  content: 'Expiry',
                  display: true,
                  position: 'start'
                }
              }
            }
          }
        }
      }
    })

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy()
      }
    }
  }, [data, strikePrice, callBreakeven, putBreakeven, purchaseDate, expirationDate])

  return (
    <div class="github-card p-4">
      <div style="height: 400px">
        <canvas ref={chartRef}></canvas>
      </div>
    </div>
  )
}

export default StockPriceChart;

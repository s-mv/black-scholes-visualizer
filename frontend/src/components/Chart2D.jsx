import { useEffect, useRef } from 'preact/hooks';
import Chart from 'chart.js/auto';

const Chart2D = ({ 
  data, 
  width = 500, 
  height = 300, 
  color = '#2196f3', 
  title = '', 
  xLabel = '', 
  yLabel = '',
  isDarkMode = false,
  annotations
}) => {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!data || data.length === 0) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext('2d');

    const annotationPlugin = {
      id: 'customAnnotation',
      afterDraw: (chart) => {
        const ctx = chart.ctx;
        const xAxis = chart.scales.x;
        const yAxis = chart.scales.y;
        
        // Draw annotation lines
        if (annotations?.lines) {
          annotations.lines.forEach(line => {
            ctx.beginPath();
            ctx.strokeStyle = line.color;
            ctx.lineWidth = line.width;
            
            if (line.x !== undefined) {
              const xPos = xAxis.getPixelForValue(line.x);
              ctx.moveTo(xPos, chart.chartArea.top);
              ctx.lineTo(xPos, chart.chartArea.bottom);
            } else if (line.y !== undefined) {
              const yPos = yAxis.getPixelForValue(line.y);
              ctx.moveTo(chart.chartArea.left, yPos);
              ctx.lineTo(chart.chartArea.right, yPos);
            }
            
            ctx.stroke();
          });
        }

        // Draw annotation text
        if (annotations?.items) {
          ctx.font = '12px Arial';
          ctx.fillStyle = 'rgba(102, 102, 102, 0.8)';
          ctx.textAlign = 'center';
          
          annotations.items.forEach(item => {
            const xPos = xAxis.getPixelForValue(item.x);
            let yPos = item.position === 'top' ? 
              chart.chartArea.top + 20 : 
              chart.chartArea.bottom - 20;
            
            ctx.fillText(item.text, xPos, yPos);
          });
        }
      }
    };

    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        datasets: [{
          label: title,
          data: data,
          borderColor: color,
          borderWidth: 2,
          fill: false,
          tension: 0.4,
          pointRadius: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: width / height,
        plugins: {
          title: {
            display: title !== '',
            text: title,
            color: '#F7FAFC'
          },
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            type: 'linear',
            title: {
              display: true,
              text: xLabel,
              color: '#F7FAFC'
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            ticks: {
              maxTicksLimit: 10,
              color: '#F7FAFC'
            }
          },
          y: {
            title: {
              display: true,
              text: yLabel,
              color: '#F7FAFC'
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            ticks: {
              maxTicksLimit: 8,
              color: '#F7FAFC'
            }
          }
        },
        animation: false
      },
      plugins: [annotationPlugin]
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [data, color, title, xLabel, yLabel, isDarkMode, annotations]);

  return (
    <div style={{ width: `${width}px`, height: `${height}px`, margin: '0 auto' }}>
      <canvas ref={canvasRef} />
    </div>
  );
};

export default Chart2D;

"use client";

import { useEffect, useRef, useState } from "react";

interface EquityCurveProps {
  data?: { date: string; value: number }[];
  height?: number;
}

export default function EquityCurve({ data, height = 120 }: EquityCurveProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Use state for mock data to avoid hydration mismatch (random values differ server vs client)
  const [mockData, setMockData] = useState<{ date: string; value: number }[] | null>(null);

  // Generate mock data only on client side
  useEffect(() => {
    if (!data) {
      setMockData(generateMockData());
    }
  }, [data]);

  const chartData = data || mockData;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !chartData) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);

    if (chartData.length < 2) return;

    // Calculate bounds
    const values = chartData.map((d) => d.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;
    const padding = 10;

    // Draw gradient fill
    const gradient = ctx.createLinearGradient(0, 0, 0, rect.height);
    const isPositive = chartData[chartData.length - 1].value >= chartData[0].value;
    
    if (isPositive) {
      gradient.addColorStop(0, "rgba(16, 185, 129, 0.3)");
      gradient.addColorStop(1, "rgba(16, 185, 129, 0)");
    } else {
      gradient.addColorStop(0, "rgba(239, 68, 68, 0.3)");
      gradient.addColorStop(1, "rgba(239, 68, 68, 0)");
    }

    // Create path
    ctx.beginPath();
    chartData.forEach((point, i) => {
      const x = (i / (chartData.length - 1)) * (rect.width - padding * 2) + padding;
      const y = rect.height - padding - ((point.value - minVal) / range) * (rect.height - padding * 2);
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    // Draw line
    ctx.strokeStyle = isPositive ? "#10B981" : "#EF4444";
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.stroke();

    // Fill area under curve
    ctx.lineTo(rect.width - padding, rect.height);
    ctx.lineTo(padding, rect.height);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw current value dot
    const lastPoint = chartData[chartData.length - 1];
    const lastX = rect.width - padding;
    const lastY = rect.height - padding - ((lastPoint.value - minVal) / range) * (rect.height - padding * 2);
    
    ctx.beginPath();
    ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
    ctx.fillStyle = isPositive ? "#10B981" : "#EF4444";
    ctx.fill();
    ctx.strokeStyle = "#0F172A";
    ctx.lineWidth = 2;
    ctx.stroke();

  }, [chartData]);

  const currentValue = chartData?.[chartData.length - 1]?.value || 0;
  const startValue = chartData?.[0]?.value || 0;
  const change = currentValue - startValue;
  const changePercent = startValue ? ((change / startValue) * 100).toFixed(1) : "0.0";

  // Show loading state until client-side data is ready
  if (!chartData) {
    return (
      <div className="equity-curve" style={{ background: "#1E293B", borderRadius: "16px", padding: "20px", border: "1px solid #334155", minHeight: `${height + 80}px` }}>
        <div style={{ color: "#64748B", fontSize: "12px" }}>Loading...</div>
      </div>
    );
  }

  return (
    <div className="equity-curve">
      <div className="equity-header">
        <div className="equity-title">EQUITY CURVE</div>
        <div className="equity-menu">⋯</div>
      </div>
      
      <div className="equity-value">
        <span className={`value ${change >= 0 ? "positive" : "negative"}`}>
          {change >= 0 ? "+" : ""}${Math.abs(change).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </span>
        <span className={`percent ${change >= 0 ? "positive" : "negative"}`}>
          {change >= 0 ? "+" : ""}{changePercent}%
        </span>
      </div>
      
      <div className="equity-period">Last 30 Days</div>
      
      <div className="chart-container">
        <canvas ref={canvasRef} style={{ width: "100%", height: `${height}px` }} />
        <div className="current-value-label">
          ${currentValue.toLocaleString()}
        </div>
      </div>

      <style jsx>{`
        .equity-curve {
          background: #1E293B;
          border-radius: 16px;
          padding: 20px;
          border: 1px solid #334155;
        }

        .equity-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .equity-title {
          font-size: 12px;
          font-weight: 600;
          color: #64748B;
          letter-spacing: 0.5px;
        }

        .equity-menu {
          color: #64748B;
          cursor: pointer;
          font-size: 18px;
        }

        .equity-value {
          display: flex;
          align-items: baseline;
          gap: 8px;
          margin-bottom: 4px;
        }

        .value {
          font-size: 28px;
          font-weight: 700;
          font-family: 'JetBrains Mono', monospace;
        }

        .percent {
          font-size: 14px;
          font-weight: 600;
        }

        .positive {
          color: #10B981;
        }

        .negative {
          color: #EF4444;
        }

        .equity-period {
          font-size: 12px;
          color: #64748B;
          margin-bottom: 16px;
        }

        .chart-container {
          position: relative;
        }

        .current-value-label {
          position: absolute;
          right: 0;
          top: 50%;
          transform: translateY(-50%);
          background: #334155;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-family: 'JetBrains Mono', monospace;
          color: #94A3B8;
        }
      `}</style>
    </div>
  );
}

function generateMockData() {
  const data = [];
  let value = 100000;
  const today = new Date();
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Random walk with slight upward bias
    const change = (Math.random() - 0.45) * 2000;
    value = Math.max(value + change, 80000);
    
    data.push({
      date: date.toISOString().split("T")[0],
      value: Math.round(value),
    });
  }
  
  return data;
}

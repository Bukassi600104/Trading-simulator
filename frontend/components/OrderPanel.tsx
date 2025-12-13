"use client";

import { API_BASE } from "@/lib/runtimeConfig";
import { useEffect, useState } from "react";

interface OrderPanelProps {
  symbol: string;
  currentPrice: number | null;
  onOrderSubmit?: (order: OrderData) => void;
}

interface OrderData {
  symbol: string;
  side: "BUY" | "SELL";
  qty: number;
  orderType: "MARKET" | "LIMIT" | "STOP";
  price?: number;
  stopPrice?: number;
  leverage: number;
}

const LEVERAGE_OPTIONS = [2, 5, 10, 15, 20, 25];

export default function OrderPanel({ symbol, currentPrice, onOrderSubmit }: OrderPanelProps) {
  const [marketType, setMarketType] = useState<"SPOT" | "FUTURES">("FUTURES");
  const [marginMode, setMarginMode] = useState<"CROSS" | "ISOLATED">("ISOLATED");
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT" | "STOP">("MARKET");
  const [qty, setQty] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [stopPrice, setStopPrice] = useState<string>("");
  const [leverage, setLeverage] = useState<number>(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Risk Calculator state
  const [showRiskCalculator, setShowRiskCalculator] = useState(false);
  const [entryPrice, setEntryPrice] = useState<string>("");
  const [stopLossPrice, setStopLossPrice] = useState<string>("");
  const [accountRisk, setAccountRisk] = useState<string>("1");
  const [accountBalance] = useState<number>(10000);
  const [calculatedQty, setCalculatedQty] = useState<string>("");

  // Auto-calculate position size based on risk
  useEffect(() => {
    if (entryPrice && stopLossPrice && accountRisk) {
      const entry = parseFloat(entryPrice);
      const stopLoss = parseFloat(stopLossPrice);
      const riskPercent = parseFloat(accountRisk) / 100;
      
      if (entry > 0 && stopLoss > 0 && riskPercent > 0) {
        const riskAmount = accountBalance * riskPercent;
        const priceDiff = Math.abs(entry - stopLoss);
        const positionSize = riskAmount / priceDiff;
        setCalculatedQty(positionSize.toFixed(4));
      }
    }
  }, [entryPrice, stopLossPrice, accountRisk, accountBalance]);

  const applyCalculatedQty = () => {
    if (calculatedQty) {
      setQty(calculatedQty);
      if (entryPrice && orderType === "LIMIT") {
        setPrice(entryPrice);
      }
      setShowRiskCalculator(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!qty || parseFloat(qty) <= 0) {
      setError("Please enter a valid quantity");
      return;
    }

    if (orderType === "LIMIT" && (!price || parseFloat(price) <= 0)) {
      setError("Please enter a valid limit price");
      return;
    }

    if (orderType === "STOP" && (!stopPrice || parseFloat(stopPrice) <= 0)) {
      setError("Please enter a valid stop price");
      return;
    }

    setLoading(true);

    try {
      const orderData: OrderData = {
        symbol,
        side,
        qty: parseFloat(qty),
        orderType,
        leverage,
        ...(orderType === "LIMIT" && { price: parseFloat(price) }),
        ...(orderType === "STOP" && { stopPrice: parseFloat(stopPrice) }),
      };

      const response = await fetch(`${API_BASE}/api/trading/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: orderData.symbol,
          side: orderData.side,
          qty: orderData.qty,
          order_type: orderData.orderType,
          price: orderData.price,
          stop_price: orderData.stopPrice,
          leverage: orderData.leverage,
        }),
      });
      

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || "Order failed");
      }

      setSuccess(`Order placed! ${side} ${qty} ${symbol}`);
      setQty("");
      setPrice("");
      setStopPrice("");
      onOrderSubmit?.(orderData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Order failed");
    } finally {
      setLoading(false);
    }
  };

  const estimatedValue = currentPrice && qty ? (parseFloat(qty) * currentPrice).toFixed(2) : "0.00";
  const margin = currentPrice && qty ? ((parseFloat(qty) * currentPrice) / leverage).toFixed(2) : "0.00";

  return (
    <div className="order-panel">
      {/* Header */}
      <div className="panel-header">
        <h3>Place Order</h3>
        <span className="symbol-tag">{symbol}</span>
      </div>

      {/* Market Type Toggle */}
      <div className="segment-control">
        <button
          className={`segment ${marketType === "SPOT" ? "active" : ""}`}
          onClick={() => setMarketType("SPOT")}
        >
          Spot
        </button>
        <button
          className={`segment ${marketType === "FUTURES" ? "active" : ""}`}
          onClick={() => setMarketType("FUTURES")}
        >
          Futures
        </button>
      </div>

      {/* Margin Mode (Futures only) */}
      {marketType === "FUTURES" && (
        <div className="margin-toggle">
          <button
            className={`margin-btn ${marginMode === "CROSS" ? "active" : ""}`}
            onClick={() => setMarginMode("CROSS")}
          >
            Cross
          </button>
          <button
            className={`margin-btn ${marginMode === "ISOLATED" ? "active" : ""}`}
            onClick={() => setMarginMode("ISOLATED")}
          >
            Isolated
          </button>
        </div>
      )}

      {/* Side Buttons */}
      <div className="side-buttons">
        <button
          className={`side-btn long ${side === "BUY" ? "active" : ""}`}
          onClick={() => setSide("BUY")}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
          {marketType === "FUTURES" ? "Long" : "Buy"}
        </button>
        <button
          className={`side-btn short ${side === "SELL" ? "active" : ""}`}
          onClick={() => setSide("SELL")}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
          {marketType === "FUTURES" ? "Short" : "Sell"}
        </button>
      </div>

      {/* Order Type Tabs */}
      <div className="order-tabs">
        <button
          className={`order-tab ${orderType === "MARKET" ? "active" : ""}`}
          onClick={() => setOrderType("MARKET")}
        >
          Market
        </button>
        <button
          className={`order-tab ${orderType === "LIMIT" ? "active" : ""}`}
          onClick={() => setOrderType("LIMIT")}
        >
          Limit
        </button>
        <button
          className={`order-tab ${orderType === "STOP" ? "active" : ""}`}
          onClick={() => setOrderType("STOP")}
        >
          Stop
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Leverage (Futures only) */}
        {marketType === "FUTURES" && (
          <div className="form-section">
            <label className="input-label">Leverage</label>
            <div className="leverage-grid">
              {LEVERAGE_OPTIONS.map((lev) => (
                <button
                  key={lev}
                  type="button"
                  className={`lev-chip ${leverage === lev ? "active" : ""}`}
                  onClick={() => setLeverage(lev)}
                >
                  {lev}×
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Risk Calculator */}
        <div className="risk-toggle">
          <button
            type="button"
            className={`risk-toggle-btn ${showRiskCalculator ? "active" : ""}`}
            onClick={() => setShowRiskCalculator(!showRiskCalculator)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Risk Calculator
            <svg className="chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        </div>

        {showRiskCalculator && (
          <div className="risk-calculator">
            <div className="calc-field">
              <label>Entry Price</label>
              <input
                type="number"
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                placeholder={currentPrice?.toString() || "0.00"}
                step="0.01"
              />
            </div>
            <div className="calc-field">
              <label>Stop Loss</label>
              <input
                type="number"
                value={stopLossPrice}
                onChange={(e) => setStopLossPrice(e.target.value)}
                placeholder="0.00"
                step="0.01"
              />
            </div>
            <div className="calc-field">
              <label>Risk %</label>
              <div className="input-with-unit">
                <input
                  type="number"
                  value={accountRisk}
                  onChange={(e) => setAccountRisk(e.target.value)}
                  placeholder="1"
                  step="0.5"
                  min="0.1"
                  max="10"
                />
                <span className="unit">%</span>
              </div>
            </div>
            
            <div className="calc-results">
              <div className="calc-result-row">
                <span>Risk Amount</span>
                <span className="mono">${(accountBalance * (parseFloat(accountRisk) || 0) / 100).toFixed(2)}</span>
              </div>
              <div className="calc-result-row highlight">
                <span>Position Size</span>
                <span className="mono">{calculatedQty || "0.0000"}</span>
              </div>
            </div>
            
            <button
              type="button"
              className="apply-btn"
              onClick={applyCalculatedQty}
              disabled={!calculatedQty}
            >
              Apply to Order
            </button>
          </div>
        )}

        {/* Limit Price Input */}
        {orderType === "LIMIT" && (
          <div className="form-section">
            <label className="input-label">Limit Price</label>
            <div className="input-with-unit">
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Enter price"
                step="0.01"
              />
              <span className="unit">USDT</span>
            </div>
          </div>
        )}

        {/* Stop Price Input */}
        {orderType === "STOP" && (
          <div className="form-section">
            <label className="input-label">Stop Price</label>
            <div className="input-with-unit">
              <input
                type="number"
                value={stopPrice}
                onChange={(e) => setStopPrice(e.target.value)}
                placeholder="Enter stop"
                step="0.01"
              />
              <span className="unit">USDT</span>
            </div>
          </div>
        )}

        {/* Market Price Display */}
        {orderType === "MARKET" && currentPrice && (
          <div className="market-price-display">
            <span className="label">Market Price</span>
            <span className="price">${currentPrice.toLocaleString()}</span>
          </div>
        )}

        {/* Quantity Input */}
        <div className="form-section">
          <label className="input-label">Quantity</label>
          <div className="input-with-unit">
            <input
              type="number"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="0.00"
              step="0.001"
              min="0"
            />
            <span className="unit">{symbol.split("-")[0]}</span>
          </div>
        </div>

        {/* Order Summary */}
        <div className="order-summary">
          <div className="summary-row">
            <span>Est. Value</span>
            <span className="mono">${estimatedValue}</span>
          </div>
          <div className="summary-row">
            <span>Margin Required</span>
            <span className="mono">${margin}</span>
          </div>
        </div>

        {/* Messages */}
        {error && <div className="message error">{error}</div>}
        {success && <div className="message success">{success}</div>}

        {/* Submit Button */}
        <button
          type="submit"
          className={`submit-btn ${side.toLowerCase()}`}
          disabled={loading}
        >
          {loading ? (
            <span className="loading-spinner" />
          ) : (
            <>
              {side === "BUY" ? "Buy / Long" : "Sell / Short"}
            </>
          )}
        </button>
      </form>

      <style jsx>{`
        .order-panel {
          padding: 20px;
        }

        /* Header */
        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .panel-header h3 {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
        }

        .symbol-tag {
          padding: 5px 10px;
          background: var(--mint-glow);
          color: var(--mint-400);
          border-radius: var(--radius-md);
          font-size: 12px;
          font-weight: 600;
        }

        /* Segment Control */
        .segment-control {
          display: flex;
          gap: 4px;
          padding: 4px;
          background: var(--depth);
          border-radius: var(--radius-md);
          margin-bottom: 12px;
        }

        .segment {
          flex: 1;
          padding: 9px;
          background: transparent;
          border: none;
          border-radius: var(--radius-sm);
          color: var(--text-muted);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .segment.active {
          background: var(--mint-500);
          color: var(--void);
        }

        /* Margin Toggle */
        .margin-toggle {
          display: flex;
          gap: 6px;
          margin-bottom: 14px;
        }

        .margin-btn {
          flex: 1;
          padding: 7px;
          background: var(--depth);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          color: var(--text-muted);
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .margin-btn.active {
          background: var(--surface);
          border-color: var(--border-default);
          color: var(--text-primary);
        }

        /* Side Buttons */
        .side-buttons {
          display: flex;
          gap: 10px;
          margin-bottom: 16px;
        }

        .side-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 14px;
          background: var(--depth);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          color: var(--text-muted);
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .side-btn.long.active {
          background: linear-gradient(135deg, var(--profit-500), var(--profit-600));
          border-color: var(--profit-500);
          color: white;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .side-btn.short.active {
          background: linear-gradient(135deg, var(--loss-500), var(--loss-600));
          border-color: var(--loss-500);
          color: white;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        }

        /* Order Tabs */
        .order-tabs {
          display: flex;
          gap: 4px;
          padding: 4px;
          background: var(--depth);
          border-radius: var(--radius-md);
          margin-bottom: 18px;
        }

        .order-tab {
          flex: 1;
          padding: 8px;
          background: transparent;
          border: none;
          border-radius: var(--radius-sm);
          color: var(--text-muted);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .order-tab.active {
          background: var(--surface);
          color: var(--text-primary);
        }

        /* Form Sections */
        .form-section {
          margin-bottom: 16px;
        }

        .input-label {
          display: block;
          font-size: 12px;
          font-weight: 500;
          color: var(--text-muted);
          margin-bottom: 8px;
        }

        .input-with-unit {
          position: relative;
        }

        .input-with-unit input {
          width: 100%;
          padding: 12px 14px;
          padding-right: 55px;
          background: var(--depth);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          color: var(--text-primary);
          font-family: var(--font-mono);
          font-size: 14px;
          transition: all var(--transition-fast);
        }

        .input-with-unit input:focus {
          outline: none;
          border-color: var(--mint-500);
          box-shadow: 0 0 0 3px var(--mint-glow);
        }

        .input-with-unit .unit {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-ghost);
          font-size: 12px;
          font-weight: 500;
        }

        /* Leverage Grid */
        .leverage-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 6px;
        }

        .lev-chip {
          padding: 9px 4px;
          background: var(--depth);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          color: var(--text-muted);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .lev-chip.active {
          background: var(--mint-500);
          border-color: var(--mint-500);
          color: var(--void);
        }

        /* Risk Toggle */
        .risk-toggle {
          margin-bottom: 14px;
        }

        .risk-toggle-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px;
          background: var(--depth);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          color: var(--text-muted);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .risk-toggle-btn:hover,
        .risk-toggle-btn.active {
          border-color: var(--mint-500);
          color: var(--mint-400);
        }

        .risk-toggle-btn .chevron {
          transition: transform var(--transition-fast);
        }

        .risk-toggle-btn.active .chevron {
          transform: rotate(180deg);
        }

        /* Risk Calculator */
        .risk-calculator {
          background: var(--depth);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 14px;
          margin-bottom: 16px;
        }

        .calc-field {
          margin-bottom: 12px;
        }

        .calc-field label {
          display: block;
          font-size: 11px;
          color: var(--text-ghost);
          margin-bottom: 6px;
        }

        .calc-field input {
          width: 100%;
          padding: 10px 12px;
          background: var(--surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          color: var(--text-primary);
          font-family: var(--font-mono);
          font-size: 13px;
        }

        .calc-field input:focus {
          outline: none;
          border-color: var(--mint-500);
        }

        .calc-results {
          background: var(--surface);
          border-radius: var(--radius-sm);
          padding: 10px 12px;
          margin-bottom: 12px;
        }

        .calc-result-row {
          display: flex;
          justify-content: space-between;
          padding: 5px 0;
          font-size: 12px;
        }

        .calc-result-row span:first-child {
          color: var(--text-ghost);
        }

        .calc-result-row.highlight span:last-child {
          color: var(--mint-400);
          font-weight: 600;
        }

        .apply-btn {
          width: 100%;
          padding: 10px;
          background: var(--mint-500);
          border: none;
          border-radius: var(--radius-sm);
          color: var(--void);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .apply-btn:hover:not(:disabled) {
          background: var(--mint-400);
        }

        .apply-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Market Price Display */
        .market-price-display {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 14px;
          background: var(--depth);
          border-radius: var(--radius-md);
          margin-bottom: 16px;
        }

        .market-price-display .label {
          font-size: 13px;
          color: var(--text-muted);
        }

        .market-price-display .price {
          font-family: var(--font-mono);
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
        }

        /* Order Summary */
        .order-summary {
          background: var(--depth);
          border-radius: var(--radius-md);
          padding: 12px 14px;
          margin-bottom: 16px;
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          font-size: 13px;
        }

        .summary-row span:first-child {
          color: var(--text-muted);
        }

        .mono {
          font-family: var(--font-mono);
          color: var(--text-primary);
        }

        /* Messages */
        .message {
          padding: 11px 14px;
          border-radius: var(--radius-md);
          margin-bottom: 14px;
          font-size: 13px;
          font-weight: 500;
        }

        .message.error {
          background: var(--loss-glow);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: var(--loss-400);
        }

        .message.success {
          background: var(--profit-glow);
          border: 1px solid rgba(0, 230, 160, 0.3);
          color: var(--mint-400);
        }

        /* Submit Button */
        .submit-btn {
          width: 100%;
          padding: 16px;
          border: none;
          border-radius: var(--radius-lg);
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: all var(--transition-fast);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }

        .submit-btn.buy {
          background: linear-gradient(135deg, var(--profit-500), var(--profit-600));
          color: white;
          box-shadow: 0 4px 16px rgba(16, 185, 129, 0.3);
        }

        .submit-btn.buy:hover:not(:disabled) {
          box-shadow: 0 6px 24px rgba(16, 185, 129, 0.4);
          transform: translateY(-1px);
        }

        .submit-btn.sell {
          background: linear-gradient(135deg, var(--loss-500), var(--loss-600));
          color: white;
          box-shadow: 0 4px 16px rgba(239, 68, 68, 0.3);
        }

        .submit-btn.sell:hover:not(:disabled) {
          box-shadow: 0 6px 24px rgba(239, 68, 68, 0.4);
          transform: translateY(-1px);
        }

        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .loading-spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

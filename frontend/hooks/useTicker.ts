import { WS_BASE } from '@/lib/runtimeConfig';
import { useEffect, useRef, useState } from 'react';

export interface TickerData {
  symbol: string;
  price: number;
  timestamp: number;
}

export function useTicker(symbol: string) {
  const [price, setPrice] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!symbol) return;

    // Convert BTC-USDT to BTCUSDT for Bybit/Backend
    const wsSymbol = symbol.replace('-', '');
    // Default to 1m interval for ticker updates
    const url = `${WS_BASE}/ws/ticker/${wsSymbol}?interval=1`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Data is likely a candle object: { open, high, low, close, ... }
        if (data.close) {
            setPrice(parseFloat(data.close));
        }
      } catch (e) {
        console.error('Ticker parse error', e);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [symbol]);

  return { price, isConnected };
}

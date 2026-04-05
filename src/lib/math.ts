/**
 * Mathematical utilities for stock market analysis
 */

export interface StockData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Simple Moving Average (SMA)
export function calculateSMA(data: number[], period: number): (number | null)[] {
  const sma: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      sma.push(null);
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
  }
  return sma;
}

// Exponential Moving Average (EMA)
export function calculateEMA(data: number[], period: number): (number | null)[] {
  const ema: (number | null)[] = [];
  const k = 2 / (period + 1);
  let prevEma: number | null = null;

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      ema.push(null);
    } else if (i === period - 1) {
      const sum = data.slice(0, period).reduce((a, b) => a + b, 0);
      prevEma = sum / period;
      ema.push(prevEma);
    } else {
      prevEma = data[i] * k + prevEma! * (1 - k);
      ema.push(prevEma);
    }
  }
  return ema;
}

// Standard Deviation (Volatility)
export function calculateVolatility(data: number[], period: number): (number | null)[] {
  const volatility: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      volatility.push(null);
    } else {
      const slice = data.slice(i - period + 1, i + 1);
      const mean = slice.reduce((a, b) => a + b, 0) / period;
      const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
      volatility.push(Math.sqrt(variance));
    }
  }
  return volatility;
}

// Relative Strength Index (RSI)
export function calculateRSI(data: number[], period: number = 14): (number | null)[] {
  const rsi: (number | null)[] = [];
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      rsi.push(null);
      if (i > 0) {
        const diff = data[i] - data[i - 1];
        if (diff >= 0) avgGain += diff;
        else avgLoss -= diff;
      }
      if (i === period - 1) {
        avgGain /= period;
        avgLoss /= period;
      }
      continue;
    }

    const diff = data[i] - data[i - 1];
    const currentGain = diff >= 0 ? diff : 0;
    const currentLoss = diff < 0 ? -diff : 0;

    avgGain = (avgGain * (period - 1) + currentGain) / period;
    avgLoss = (avgLoss * (period - 1) + currentLoss) / period;

    const rs = avgGain / (avgLoss || 1);
    rsi.push(100 - 100 / (1 + rs));
  }
  return rsi;
}

// Moving Average Convergence Divergence (MACD)
export function calculateMACD(data: number[]) {
  const ema12 = calculateEMA(data, 12);
  const ema26 = calculateEMA(data, 26);
  const macdLine: (number | null)[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (ema12[i] !== null && ema26[i] !== null) {
      macdLine.push(ema12[i]! - ema26[i]!);
    } else {
      macdLine.push(null);
    }
  }

  const validMacd = macdLine.filter(v => v !== null) as number[];
  const signalLineRaw = calculateEMA(validMacd, 9);
  const signalLine: (number | null)[] = Array(macdLine.length - validMacd.length).fill(null).concat(signalLineRaw);
  
  const histogram: (number | null)[] = macdLine.map((v, i) => {
    if (v !== null && signalLine[i] !== null) {
      return v - signalLine[i]!;
    }
    return null;
  });

  return { macdLine, signalLine, histogram };
}

// Metrics
export function calculateMSE(actual: number[], predicted: number[]): number {
  const n = actual.length;
  return actual.reduce((sum, val, i) => sum + Math.pow(val - predicted[i], 2), 0) / n;
}

export function calculateRMSE(actual: number[], predicted: number[]): number {
  return Math.sqrt(calculateMSE(actual, predicted));
}

export function calculateR2(actual: number[], predicted: number[]): number {
  const mean = actual.reduce((a, b) => a + b, 0) / actual.length;
  const ssRes = actual.reduce((sum, val, i) => sum + Math.pow(val - predicted[i], 2), 0);
  const ssTot = actual.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0);
  return 1 - (ssRes / ssTot);
}

import { PriceQuote } from './types';

/* ── Valoración por precio de referencia ─────────────────────────────────
   Cada fondo recuerda el precio con el que se valoró la última vez (refPrice)
   y de qué fuente salió (priceKey). Al pulsar ⟳ Precios:

       valor nuevo = valor actual × (precio nuevo ÷ precio de referencia)

   Así, pulsar dos veces seguidas no cambia nada (el precio es el mismo) y
   pulsar después de una semana recoge la semana entera. Antes se aplicaba
   el % de variación del día, que se acumulaba y perdía los días intermedios.

   Cuando el valor se fija desde fuera (a mano, o con una captura) la
   referencia se borra: la próxima pulsación la vuelve a fijar sin tocar
   el valor ("calibrar"). */

export const MAX_JUMP = 0.15;   // por encima de ±15 % se pide confirmación

export interface Priced {
  m: number;
  inv: number;
  r: number;
  lastPriceDate?: string;
  priceSource?: string;
  refPrice?: number;
  priceKey?: string;
}

export type QuoteOutcome = 'updated' | 'calibrated' | 'jump' | 'noprice';

const round2 = (n: number) => Math.round(n * 100) / 100;

export function applyQuote<T extends Priced>(
  fund: T, quote: PriceQuote | undefined, force = false,
): { fund: T; outcome: QuoteOutcome; jump?: number } {
  if (!quote || !quote.price || !quote.key) return { fund, outcome: 'noprice' };

  // Ojo: Firestore no admite campos undefined, por eso la fecha solo se pone si existe
  const stamp: Partial<Priced> = { refPrice: quote.price, priceKey: quote.key, priceSource: quote.source };
  if (quote.date) stamp.lastPriceDate = quote.date;

  // Sin referencia válida (primera vez, o cambió el ticker): fijarla sin tocar el valor
  if (!fund.refPrice || fund.priceKey !== quote.key) {
    return { fund: { ...fund, ...stamp }, outcome: 'calibrated' };
  }

  const ratio = quote.price / fund.refPrice;
  if (Math.abs(ratio - 1) > MAX_JUMP && !force) {
    return { fund, outcome: 'jump', jump: ratio - 1 };
  }

  const m = round2(fund.m * ratio);
  return {
    fund: { ...fund, ...stamp, m, r: fund.inv > 0 ? (m - fund.inv) / fund.inv * 100 : 0 },
    outcome: 'updated',
  };
}

/* El valor se ha fijado a mano: se borra la referencia (sin dejar campos undefined) */
export function markManual<T extends Priced>(fund: T, today: string): T {
  const copy = { ...fund, priceSource: 'manual', lastPriceDate: today };
  delete copy.refPrice;
  delete copy.priceKey;
  return copy;
}

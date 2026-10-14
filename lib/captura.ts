import { Fund, CaptureRow } from './types';
import { markManual } from './pricing';

/* ── Importador de capturas: piezas del navegador ─────────────────────────
   La lectura la hace /api/captura; aquí se preparan las imágenes y se
   aplican las filas que Tomás aprueba en la pantalla de revisión. */

export const NEW_FUND = '__new';   // destino "añadir como fondo nuevo"

/* Qué hacer con cada fila leída */
export interface CaptureDecision {
  include: boolean;
  target: string;          // id del fondo, '' = ignorar, NEW_FUND = alta nueva
  newIsin: string;         // solo para altas
  newType: Fund['type'];   // solo para altas
}

export interface PreparedImage {
  id: string;
  name: string;
  preview: string;   // data URL para la miniatura
  data: string;      // JPEG en base64, sin el prefijo data:
}

/* Reduce la imagen a 2000 px por el lado largo (nunca la amplía) y la pasa a
   JPEG: así varias capturas caben en una petición (Vercel corta en ~4,5 MB)
   y los números siguen siendo nítidos. */
const MAX_SIDE = 2000;
export async function prepareImage(file: File): Promise<PreparedImage> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';   // fondo para los PNG con transparencia
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  const url = canvas.toDataURL('image/jpeg', 0.88);
  return { id: crypto.randomUUID(), name: file.name || 'captura', preview: url, data: url.split(',')[1] };
}

/* Tipo de fondo sugerido para un alta, según la sección donde aparece */
export function typeFromSection(platform: string, section: string): Fund['type'] {
  const s = section.toLowerCase();
  if (s.includes('plan'))      return 'PP';
  if (s.includes('fija'))      return 'RF';
  if (s.includes('monetari'))  return 'MO';
  if (s.includes('etf') || platform === 'traderepublic') return 'ETF';
  return 'RV';
}

/* Aplica las filas aprobadas. El valor y el invertido salen de la captura; el
   fondo aprende en qué banco está y cómo lo llama ese banco, y se borra su
   precio de referencia (la próxima pulsación de ⟳ Precios lo vuelve a fijar). */
export function applyCapture(
  funds: Fund[], rows: CaptureRow[], decisions: CaptureDecision[], today: string,
): { funds: Fund[]; changed: number; added: number } {
  let next = [...funds];
  let changed = 0, added = 0;

  rows.forEach((row, i) => {
    const d = decisions[i];
    if (!d?.include || !d.target) return;

    const values = {
      m: row.value,
      inv: row.invested,
      r: row.invested > 0 ? (row.value - row.invested) / row.invested * 100 : 0,
      brokerName: row.name,
      ...(row.platform !== 'otra' ? { broker: row.platform } : {}),
    };
    const source = `captura:${row.platform}`;

    if (d.target === NEW_FUND) {
      next.push({
        id: `F_${Date.now()}_${i}`,
        isin: (d.newIsin || row.code || '').trim().toUpperCase(),
        short: row.name.replace(/…$/, '').trim(),
        type: d.newType,
        priceSource: source,
        lastPriceDate: today,
        ...values,
      });
      added++;
    } else {
      next = next.map(f => f.id === d.target ? { ...markManual(f, today, source), ...values } : f);
      changed++;
    }
  });

  return { funds: next, changed, added };
}

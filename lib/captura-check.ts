import { Broker, CaptureRow } from './types';

/* ── Comprobación de lo leído en las capturas (servidor) ──────────────────
   Las cifras de cada fila se comprueban entre sí: un dígito mal leído o un
   signo perdido no cuadra. Después se busca el fondo de la app que
   corresponde: código exacto > nombre aprendido en ese banco > propuesta de Claude. */

const TOL_EUR = 0.03;   // céntimos de redondeo del banco
const TOL_PCT = 0.06;   // el % viene redondeado a 1 o 2 decimales

export interface ModelRow {
  section: string; name: string; code: string | null;
  value: number; invested: number | null; gain: number; pct: number | null; matchId: string | null;
}
export interface ModelOutput {
  captures: { image: number; platform: Broker | 'otra'; rows: ModelRow[] }[];
}
export interface AppFund { id: string; short: string; isin: string; type: string; broker?: string; brokerName?: string }

const round2 = (n: number) => Math.round(n * 100) / 100;
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

export function checkCaptureRows(output: ModelOutput, funds: AppFund[]): CaptureRow[] {
  const byId = new Map(funds.map(f => [f.id, f]));
  const rows: CaptureRow[] = (output.captures ?? []).flatMap(cap => (cap.rows ?? []).map((r): CaptureRow => {
    const checks: string[] = [];
    const invested = r.invested ?? round2(r.value - r.gain);

    if (r.invested != null && Math.abs(r.invested + r.gain - r.value) > TOL_EUR) {
      checks.push(`invertido + ganancia (${round2(r.invested + r.gain)}) no da el valor (${r.value})`);
    }
    if (r.pct != null && invested > 0) {
      const calc = r.gain / invested * 100;
      if (Math.abs(calc - r.pct) > TOL_PCT) checks.push(`el % no cuadra: sale ${calc.toFixed(2)} % y la captura dice ${r.pct} %`);
    }
    if (!(r.value > 0)) checks.push('valor no válido');
    if (cap.platform === 'otra') checks.push('no reconozco el banco de esta captura');

    const code = r.code?.trim().toUpperCase() || null;
    let matchId: string | null = null, matchBy: CaptureRow['matchBy'] = null;
    const byCode = code ? funds.find(f => f.isin.toUpperCase() === code) : undefined;
    const byName = funds.find(f => f.brokerName && norm(f.brokerName) === norm(r.name) && (!f.broker || f.broker === cap.platform));
    // Una captura sin banco reconocido (p. ej. de la propia app) no se empareja
    // sola: así sus filas no chocan con las de las capturas buenas
    if (cap.platform === 'otra')               { /* lo asigna Tomás a mano si quiere */ }
    else if (byCode)                           { matchId = byCode.id;  matchBy = 'codigo'; }
    else if (byName)                           { matchId = byName.id;  matchBy = 'nombre'; }
    else if (r.matchId && byId.has(r.matchId)) { matchId = r.matchId; matchBy = 'ia'; }

    const target = matchId ? byId.get(matchId) : undefined;
    if (target?.broker && cap.platform !== 'otra' && target.broker !== cap.platform) {
      checks.push(`en la app "${target.short}" está en otro banco`);
    }

    return {
      image: cap.image, platform: cap.platform, section: r.section, name: r.name, code,
      value: r.value, invested, gain: r.gain, pct: r.pct, matchId, matchBy, checks,
    };
  }));

  // Dos filas no pueden actualizar el mismo fondo
  const seen = new Map<string, number>();
  rows.forEach(r => { if (r.matchId) seen.set(r.matchId, (seen.get(r.matchId) ?? 0) + 1); });
  rows.forEach(r => { if (r.matchId && (seen.get(r.matchId) ?? 0) > 1) r.checks.push('otra fila apunta al mismo fondo'); });
  return rows;
}

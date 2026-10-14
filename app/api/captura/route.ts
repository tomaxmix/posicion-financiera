import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { AppFund, checkCaptureRows, ModelOutput } from '@/lib/captura-check';

/* ── Lector de capturas de bancos ─────────────────────────────────────────
   Recibe capturas de MyInvestor, CaixaBank o Trade Republic y la lista de
   fondos de la app. Claude lee cada posición y propone con qué fondo se
   corresponde; aquí se comprueba que las cifras cuadran entre sí antes de
   devolverlas. No se guarda nada: eso lo decide Tomás en la pantalla de revisión. */

export const runtime = 'nodejs';
export const maxDuration = 120;   // leer varias capturas puede tardar

const MODEL = 'claude-sonnet-5-5';
const MAX_IMAGES = 6;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `Lees capturas de pantalla de posiciones de inversión de bancos españoles y devuelves sus cifras exactas.

Para cada captura:
1. Identifica la plataforma: "myinvestor", "caixabank", "traderepublic" u "otra".
2. Extrae una fila por cada posición individual (fondo, ETF, acción o plan de pensiones). No extraigas totales ni bloques resumen cuando haya filas individuales: en la pantalla de planes de MyInvestor el bloque grande de arriba es la suma de todos los planes; usa las filas de la lista.

Números:
- Los importes vienen en formato español (punto para miles, coma decimal: 43.964,93). Algunas plataformas escriben el % con punto decimal (CaixaBank: "3.11 %"). Devuelve números JSON normales (43964.93, 3.11).
- Signo: una posición en pérdidas se marca con signo menos, flecha ↓ o ▼, o color rojo. Aplica el signo a "gain" y a "pct" a la vez, aunque solo uno de los dos lleve el menos.
- Copia las cifras exactamente; no redondees ni recalcules.

Qué cifra es cada cosa:
- MyInvestor (fondos y planes): la cifra grande es el valor ("value"); debajo, la ganancia en € y el %. "invested" = null. En planes, el código junto al nombre (p. ej. N5459) va en "code".
- CaixaBank: "Saldo actual" = value; "Inversión" = invested; "Plusvalía" = gain y su %.
- Trade Republic: "Valor de mercado" = value; las dos últimas columnas "Ganancia" (€ y %) = gain y pct. No uses "No realizado" ni "Variación": son el movimiento del día. "invested" = null.

Campos:
- section: la sección o categoría visible encima de la fila ("Renta variable", "Renta fija", "Planes", "Mis fondos", "Cuenta de valores"…), o "" si no hay.
- name: el nombre tal como aparece, incluido el "…" si está cortado.
- code: ISIN o código visible junto a esa posición; null si no aparece.
- matchId: el "id" del fondo de la lista de la app que es esta misma posición, o null si no estás seguro. Compara nombre, código, banco y tipo; los nombres de la app son abreviados. Cada fondo de la lista corresponde como mucho a una fila.

Ignora los datos personales (nombres de titulares, números de cuenta o expediente): no los copies en ningún campo.`;

/* Esquema de la respuesta: Claude solo puede contestar con esta forma */
const nullable = (type: string) => ({ anyOf: [{ type }, { type: 'null' }] });
const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['captures'],
  properties: {
    captures: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['image', 'platform', 'rows'],
        properties: {
          image:    { type: 'integer' },
          platform: { type: 'string', enum: ['myinvestor', 'caixabank', 'traderepublic', 'otra'] },
          rows: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['section', 'name', 'code', 'value', 'invested', 'gain', 'pct', 'matchId'],
              properties: {
                section:  { type: 'string' },
                name:     { type: 'string' },
                code:     nullable('string'),
                value:    { type: 'number' },
                invested: nullable('number'),
                gain:     { type: 'number' },
                pct:      nullable('number'),
                matchId:  nullable('string'),
              },
            },
          },
        },
      },
    },
  },
};

export async function POST(req: NextRequest) {
  const { images, funds } = await req.json() as {
    images: { data: string; mediaType: 'image/jpeg' | 'image/png' | 'image/webp' }[];
    funds: AppFund[];
  };
  if (!images?.length)               return NextResponse.json({ error: 'No hay capturas' }, { status: 400 });
  if (images.length > MAX_IMAGES)    return NextResponse.json({ error: `Máximo ${MAX_IMAGES} capturas a la vez` }, { status: 400 });

  // Cada captura va numerada para que Claude diga de cuál sale cada fila
  const content: Anthropic.ContentBlockParam[] = images.flatMap((img, i) => [
    { type: 'text' as const, text: `Captura ${i + 1}:` },
    { type: 'image' as const, source: { type: 'base64' as const, media_type: img.mediaType, data: img.data } },
  ]);
  const fundList = funds.map(f => ({ id: f.id, nombre: f.short, isin: f.isin, tipo: f.type, banco: f.broker ?? null, nombreEnBanco: f.brokerName ?? null }));
  content.push({ type: 'text', text: `Fondos de la app:\n${JSON.stringify(fundList)}\n\nExtrae las posiciones de las ${images.length} capturas.` });

  let output: ModelOutput;
  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 16000,
      system: SYSTEM,
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA } },
      messages: [{ role: 'user', content }],
    });
    if (response.stop_reason === 'refusal') {
      return NextResponse.json({ error: 'Claude no ha querido procesar estas capturas. Prueba con otras o actualiza a mano.' }, { status: 422 });
    }
    if (response.stop_reason === 'max_tokens') {
      return NextResponse.json({ error: 'Demasiadas posiciones en una sola vez: sube menos capturas.' }, { status: 422 });
    }
    const text = response.content.find(b => b.type === 'text');
    output = JSON.parse(text && text.type === 'text' ? text.text : '{}');
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: 'Claude está saturado ahora mismo. Vuelve a probar en un minuto.' }, { status: 429 });
    }
    if (err instanceof Anthropic.APIError) {
      console.error('captura: error de la API', err.status, err.message);
      return NextResponse.json({ error: `Error de Claude (${err.status ?? 'red'}): ${err.message}` }, { status: 502 });
    }
    console.error('captura: respuesta ilegible', err);
    return NextResponse.json({ error: 'No se ha podido leer la respuesta de Claude.' }, { status: 502 });
  }

  const rows = checkCaptureRows(output, funds);
  return NextResponse.json({ rows });
}

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';

export interface MstarResult {
  id:            string;
  isin:          string;
  name:          string;
  type:          string;
  exchange:      string;
  currency:      string;
  stars:         number | null;
  category:      string;
  ter:           number | null;
  return1y:      number | null;
  return3y:      number | null;
  return5y:      number | null;
  analystRating: string | null;
  available_eu:  boolean;
  description:   string;
  morningstarUrl: string | null;
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const SYSTEM = `Eres un experto en fondos de inversión y ETFs. Cuando el usuario busque fondos, devuelves SIEMPRE un JSON válido con un array de hasta 10 resultados.

Formato estricto (sin texto extra, solo el JSON):
[
  {
    "id": "string único",
    "isin": "ISIN si lo conoces, si no ''",
    "name": "nombre completo del fondo",
    "type": "ETF | Fondo indexado | Fondo activo | Fondo mixto | Renta fija",
    "exchange": "bolsa principal donde cotiza (ej: LSE, XETRA, Euronext)",
    "currency": "EUR | USD | GBP",
    "stars": número del 1 al 5 según Morningstar o null si no lo sabes,
    "category": "categoría Morningstar en español (ej: RV Global, RF EUR, Mixto Moderado)",
    "ter": TER en % como número decimal (ej: 0.22) o null,
    "return1y": rentabilidad 1 año en % como número o null,
    "return3y": rentabilidad anualizada 3 años en % como número o null,
    "return5y": rentabilidad anualizada 5 años en % como número o null,
    "analystRating": "Gold | Silver | Bronze | Neutral | Negative | null",
    "available_eu": true si está disponible para inversores europeos,
    "description": "1-2 frases sobre qué es y por qué es relevante",
    "morningstarUrl": "URL directa a la ficha del fondo en morningstar.es — formato: https://www.morningstar.es/es/funds/snapshot/snapshot.aspx?id=SECID para fondos, o https://www.morningstar.es/es/etf/snapshot/snapshot.aspx?id=SECID para ETFs. Si no conoces el SecId exacto devuelve null"
  }
]

Usa tu conocimiento hasta tu fecha de corte. El TER y las características del fondo cambian poco. Para rentabilidades usa datos aproximados si no los sabes exactos, o null.
Incluye siempre el ISIN cuando lo conozcas con certeza. Prioriza fondos/ETFs disponibles en Europa.`;

/* ── Enriquecer con precio real de Yahoo Finance ── */
async function enrichWithPrice(results: MstarResult[]): Promise<MstarResult[]> {
  // Solo enriquecemos los que tienen ISIN conocido
  const withIsin = results.filter(r => r.isin && !r.isin.startsWith('DESCONOCIDO'));
  if (!withIsin.length) return results;

  await Promise.allSettled(withIsin.map(async r => {
    try {
      // Buscar símbolo de Yahoo Finance por ISIN
      const searchRes = await fetch(
        `https://query2.finance.yahoo.com/v1/finance/search?q=${r.isin}&quotesCount=1&newsCount=0`,
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      );
      const searchData = await searchRes.json();
      const symbol = searchData?.quotes?.[0]?.symbol;
      if (!symbol) return;

      // Obtener precio actual
      const chartRes = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1y&interval=1mo`,
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      );
      const chartData = await chartRes.json();
      const meta = chartData?.chart?.result?.[0]?.meta;
      if (meta?.regularMarketPrice) {
        // Calcular rentabilidad 1A si tenemos datos históricos
        const closes = chartData?.chart?.result?.[0]?.indicators?.quote?.[0]?.close;
        if (closes?.length >= 2 && r.return1y === null) {
          const first = closes.find((v: number) => v != null);
          const last  = meta.regularMarketPrice;
          if (first && last) r.return1y = parseFloat(((last - first) / first * 100).toFixed(1));
        }
      }
    } catch { /* silencioso */ }
  }));

  return results;
}

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();
    if (!query?.trim()) return NextResponse.json({ results: [] });

    const message = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system:     SYSTEM,
      messages:   [{ role: 'user', content: `Busca fondos/ETFs para: "${query}"` }],
    });

    const text = (message.content[0] as any).text?.trim() || '[]';

    // Extraer JSON del texto (puede venir con ```json ... ```)
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return NextResponse.json({ results: [] });

    let results: MstarResult[] = JSON.parse(jsonMatch[0]);

    // Enriquecer con precio real de Yahoo Finance
    results = await enrichWithPrice(results);

    return NextResponse.json({ results });
  } catch (err: any) {
    console.error('Morningstar route error:', err.message);
    return NextResponse.json({ error: err.message, results: [] }, { status: 500 });
  }
}

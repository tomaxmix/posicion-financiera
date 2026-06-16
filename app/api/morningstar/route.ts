import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export interface MstarResult {
  id:          string;
  isin:        string;
  name:        string;
  ticker:      string;
  type:        string;
  exchange:    string;
  currency:    string;
  stars:       number | null;
  category:    string;
  ter:         number | null;
  return1y:    number | null;
  return3y:    number | null;
  return5y:    number | null;
  analystRating: string | null;
}

const HEADERS = {
  'Accept':           'application/json, text/plain, */*',
  'Accept-Language':  'es-ES,es;q=0.9,en;q=0.8',
  'User-Agent':       'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Referer':          'https://www.morningstar.es/',
  'Origin':           'https://www.morningstar.es',
};

/* ── Búsqueda por texto ── */
async function searchSecurities(query: string): Promise<MstarResult[]> {
  // Morningstar Spain search — includes European & global funds/ETFs
  const universes = 'FOESP00000,FOEUR00000,ETXEU,ETEUR,FOUSA00000,E0WWE$$ALL';
  const url = `https://www.morningstar.es/es/util/SecuritySearch.aspx?q=${encodeURIComponent(query)}&limit=20&_=${Date.now()}`;

  const res = await fetch(url, { headers: HEADERS, next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`Morningstar search failed: ${res.status}`);

  const text = await res.text();
  // Response is JSONP-like or plain JSON array
  const json = JSON.parse(text.startsWith('[') ? text : text.replace(/^[^[]*/, '').replace(/[^\]]*$/, ''));

  return (json as any[]).slice(0, 15).map((item: any) => ({
    id:            item.id           || item.Id           || '',
    isin:          item.isin         || item.Isin         || '',
    name:          item.name         || item.Name         || item.SecurityName || '',
    ticker:        item.ticker       || item.Ticker       || '',
    type:          item.securityType || item.SecurityType || '',
    exchange:      item.exchange     || item.Exchange     || '',
    currency:      item.currency     || item.Currency     || 'EUR',
    stars:         null,
    category:      item.category     || item.Category     || '',
    ter:           null,
    return1y:      null,
    return3y:      null,
    return5y:      null,
    analystRating: null,
  }));
}

/* ── Detalle de un fondo por su ID Morningstar ── */
async function getFundDetail(secId: string): Promise<Partial<MstarResult>> {
  try {
    // Try the Morningstar quote API (used by their widgets)
    const url = `https://tools.morningstar.es/api/rest.svc/klr5zyak8x/security/screener?page=1&pageSize=1&sortField=LegalName&filters=SecId%3A${secId}&languageId=es-ES&currencyId=EUR&universeIds=FOESP00000|FOEUR00000|FOUSA00000&securityDataPoints=SecId|ISIN|LegalName|StarRatingM255|CategoryName|OngoingCharge|GBRReturnM12|GBRReturnM36|GBRReturnM60|AnalystRatingScale`;

    const res = await fetch(url, { headers: HEADERS, next: { revalidate: 3600 } });
    if (!res.ok) return {};

    const json = await res.json();
    const rows = json?.rows || [];
    if (!rows.length) return {};

    const r = rows[0];
    return {
      stars:         r.StarRatingM255 ? parseInt(r.StarRatingM255) : null,
      category:      r.CategoryName   || '',
      ter:           r.OngoingCharge  ? parseFloat(r.OngoingCharge) : null,
      return1y:      r.GBRReturnM12   ? parseFloat(r.GBRReturnM12)  : null,
      return3y:      r.GBRReturnM36   ? parseFloat(r.GBRReturnM36)  : null,
      return5y:      r.GBRReturnM60   ? parseFloat(r.GBRReturnM60)  : null,
      analystRating: r.AnalystRatingScale || null,
    };
  } catch {
    return {};
  }
}

/* ── Screener directo sin búsqueda previa ── */
async function screener(query: string): Promise<MstarResult[]> {
  const url = `https://tools.morningstar.es/api/rest.svc/klr5zyak8x/security/screener?page=1&pageSize=20&sortField=LegalName&filters=LegalName%3A${encodeURIComponent(query)}&languageId=es-ES&currencyId=EUR&universeIds=FOESP00000|FOEUR00000|ETXEU|FOUSA00000&securityDataPoints=SecId|ISIN|LegalName|StarRatingM255|CategoryName|OngoingCharge|GBRReturnM12|GBRReturnM36|GBRReturnM60|AnalystRatingScale|ExchangeId|CurrencyId`;

  const res = await fetch(url, { headers: HEADERS, next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`Screener failed: ${res.status}`);

  const json = await res.json();
  const rows = json?.rows || [];

  return rows.map((r: any) => ({
    id:            r.SecId            || '',
    isin:          r.ISIN             || '',
    name:          r.LegalName        || '',
    ticker:        '',
    type:          '',
    exchange:      r.ExchangeId       || '',
    currency:      r.CurrencyId       || 'EUR',
    stars:         r.StarRatingM255   ? parseInt(r.StarRatingM255)   : null,
    category:      r.CategoryName     || '',
    ter:           r.OngoingCharge    ? parseFloat(r.OngoingCharge)  : null,
    return1y:      r.GBRReturnM12     ? parseFloat(r.GBRReturnM12)   : null,
    return3y:      r.GBRReturnM36     ? parseFloat(r.GBRReturnM36)   : null,
    return5y:      r.GBRReturnM60     ? parseFloat(r.GBRReturnM60)   : null,
    analystRating: r.AnalystRatingScale || null,
  }));
}

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();
    if (!query?.trim()) return NextResponse.json({ results: [] });

    // Try screener first (returns rich data in one call), fall back to search
    let results: MstarResult[] = [];
    try {
      results = await screener(query);
    } catch {
      results = await searchSecurities(query);
    }

    return NextResponse.json({ results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, results: [] }, { status: 500 });
  }
}

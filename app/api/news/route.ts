import { NextResponse } from 'next/server';

/* ── Fuentes RSS financieras (sin API key, acceso libre) ── */
const RSS_SOURCES = [
  // Internacionales EN
  { url: 'https://feeds.bloomberg.com/markets/news.rss',                          name: 'Bloomberg' },
  { url: 'https://feeds.reuters.com/reuters/businessNews',                        name: 'Reuters' },
  { url: 'https://www.ft.com/rss/home/uk',                                        name: 'Financial Times' },
  { url: 'https://www.investing.com/rss/news.rss',                                name: 'Investing.com' },
  { url: 'https://feeds.marketwatch.com/marketwatch/topstories',                  name: 'MarketWatch' },
  // España ES
  { url: 'https://e00-expansion.uecdn.es/rss/mercados.xml',                       name: 'Expansión' },
  { url: 'https://feeds.elpais.com/mrss-s/pages/ep/site/cincodias.elpais.com/portada', name: 'Cinco Días' },
  { url: 'https://www.eleconomista.es/rss/rss-mercados-financieros.php',           name: 'El Economista' },
  { url: 'https://www.finanzas.com/feed/',                                         name: 'Finanzas.com' },
  // Fondos y gestión
  { url: 'https://www.fundssociety.com/feed',                                      name: 'Funds Society' },
  { url: 'https://www.rankia.com/blog/ranking-fondos-inversion/feed',              name: 'Rankia' },
];

/* Keywords del portfolio de Tomás */
const KEYWORDS = [
  // Tipos de activo
  'fondo inversión', 'fondos de inversión', 'renta fija', 'renta variable',
  'mercados emergentes', 'emerging markets', 'monetario', 'plan pensiones',
  'ETF', 'bolsa', 'mercados',
  // Gestoras y fondos específicos
  'neuberger berman', 'vanguard', 'fidelity', 'janus henderson',
  'allianz', 'robeco', 'dnca', 'morningstar',
  // Índices y mercados
  'eurostoxx', 'msci world', 'msci', 'stoxx',
  'grifols', 'ibex', 'nasdaq', 'sp500', 's&p',
  // Macro relevante
  'fed', 'bce', 'banco central', 'tipos de interés', 'interest rates',
  'inflación', 'inflation', 'recesión', 'recession',
  'energía renovable', 'infraestructura', 'healthcare', 'salud',
  // Geografías de la cartera
  'europa', 'europe', 'asia', 'china', 'india', 'latinoamérica',
];

interface NewsItem {
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
  relevance: number;
}

/* ── Parsea un feed RSS y extrae artículos ── */
async function parseFeed(source: { url: string; name: string }): Promise<NewsItem[]> {
  try {
    const res = await fetch(source.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; financial-dashboard/1.0)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
      next: { revalidate: 1800 }, // cache 30 min
      signal: AbortSignal.timeout(5000), // timeout 5s por fuente
    });

    if (!res.ok) return [];
    const xml = await res.text();

    // Parser XML ligero (sin dependencias externas)
    const items: NewsItem[] = [];
    const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
      const block = match[1];

      const title       = extractTag(block, 'title');
      const link        = extractTag(block, 'link') || extractTag(block, 'guid');
      const description = stripHtml(extractTag(block, 'description') || extractTag(block, 'content:encoded') || '');
      const pubDate     = extractTag(block, 'pubDate') || extractTag(block, 'dc:date') || new Date().toISOString();

      if (!title || !link) continue;

      const text      = (title + ' ' + description).toLowerCase();
      const relevance = KEYWORDS.filter(kw => text.includes(kw.toLowerCase())).length;

      items.push({
        title:       cleanText(title),
        description: description.slice(0, 200) + (description.length > 200 ? '…' : ''),
        url:         link.trim(),
        source:      source.name,
        publishedAt: parseDate(pubDate),
        relevance,
      });
    }

    return items;
  } catch {
    return [];
  }
}

function extractTag(xml: string, tag: string): string {
  // Maneja tanto <tag>...</tag> como CDATA
  const re = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, 'i');
  return (re.exec(xml)?.[1] || '').trim();
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function cleanText(text: string): string {
  return text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').trim();
}

function parseDate(dateStr: string): string {
  try { return new Date(dateStr).toISOString(); }
  catch { return new Date().toISOString(); }
}

/* ── Handler GET ── */
export async function GET() {
  try {
    // Fetch todas las fuentes en paralelo
    const allArticles = (await Promise.all(RSS_SOURCES.map(parseFeed))).flat();

    // Ordenar: primero por relevancia, luego por fecha
    allArticles.sort((a, b) => {
      if (b.relevance !== a.relevance) return b.relevance - a.relevance;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });

    // Eliminar duplicados por título similar
    const seen    = new Set<string>();
    const unique  = allArticles.filter(a => {
      const key = a.title.toLowerCase().slice(0, 60);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Devolver las 20 más relevantes
    const articles = unique.slice(0, 20).map(({ relevance: _, ...a }) => a);

    return NextResponse.json({ articles, total: unique.length });
  } catch (err: any) {
    return NextResponse.json({ articles: [], error: err.message }, { status: 500 });
  }
}

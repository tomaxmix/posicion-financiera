import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { query, funds: cartera } = await req.json();

    const systemPrompt = `Eres el asistente financiero personal de Tomás. Tienes acceso al catálogo completo de MyInvestor (~2.300 fondos y 13 carteras automatizadas) a través de las herramientas disponibles.

La cartera actual de Tomás es:
${cartera.map((f: any) => `- ${f.short} (${f.type}): ${f.m.toFixed(2)} € | Rent. acum.: ${f.r >= 0 ? '+' : ''}${f.r.toFixed(2)}%`).join('\n')}

Cuando busques o compares fondos, ten en cuenta la cartera de Tomás para dar contexto relevante.
Responde en español, de forma clara y conversacional. Destaca siempre: nombre completo, gestora, TER/comisiones, rentabilidad a 1A y 3A, y rating Morningstar si está disponible.
Si el usuario quiere añadir un fondo a su cartera, indica el ISIN claramente al final.`;

    // Llamada a Claude con el MCP de MyInvestor conectado
    const response = await (client.beta.messages as any).create({
      model: 'claude-opus-4-5',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: query }],
      betas: ['mcp-client-2025-04-04'],
      mcp_servers: [{
        type: 'url',
        url: 'https://mcp.myinvestor.es/mcp',
        name: 'myinvestor',
      }],
    });

    // Extraer el texto de la respuesta
    const textContent = response.content
      .filter((c: any) => c.type === 'text')
      .map((c: any) => c.text)
      .join('\n');

    // Extraer pares nombre+ISIN del texto
    // Busca patrones como "Nombre del Fondo (IE00XXXXXX)" o "**Nombre** ... ISIN: IE00XXXXXX"
    const funds: { isin: string; name: string }[] = [];
    const seen = new Set<string>();

    // Patrón 1: "Nombre (ISIN)" - más común en respuestas de MyInvestor
    const pattern1 = /([A-ZÀ-Ža-zà-ž][^\n(]{3,60}?)\s*[\(（]\s*([A-Z]{2}[A-Z0-9]{10})\s*[\)）]/g;
    let m1;
    while ((m1 = pattern1.exec(textContent)) !== null) {
      const name = m1[1].replace(/\*\*/g, '').replace(/^[-·•]\s*/, '').trim();
      const isin = m1[2];
      if (!seen.has(isin) && name.length > 3) { seen.add(isin); funds.push({ isin, name }); }
    }

    // Patrón 2: ISIN suelto sin nombre previo capturado
    const isinRegex = /\b([A-Z]{2}[A-Z0-9]{10})\b/g;
    let m2;
    while ((m2 = isinRegex.exec(textContent)) !== null) {
      const isin = m2[1];
      if (!seen.has(isin)) {
        // Intentar capturar nombre en las 80 chars antes del ISIN
        const before = textContent.slice(Math.max(0, m2.index - 80), m2.index);
        const nameMatch = before.match(/([A-ZÀ-Ža-zà-ž][^\n]{3,50}?)[\s:–-]*$/);
        const name = nameMatch ? nameMatch[1].replace(/\*\*/g, '').trim() : isin;
        seen.add(isin); funds.push({ isin, name });
      }
    }

    return NextResponse.json({ response: textContent, funds });
  } catch (err: any) {
    console.error('Explorar API error:', err);
    return NextResponse.json({ response: '', error: err.message }, { status: 500 });
  }
}

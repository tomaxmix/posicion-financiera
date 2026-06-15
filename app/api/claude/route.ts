import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type } = body;
    let prompt = '';

    /* ── Análisis automático diario: cartera + noticias ── */
    if (type === 'auto_resumen') {
      const { funds, invTotal, ti, pl, plp, news } = body;
      prompt = `Eres el asesor financiero personal de Tomás. Cada vez que abre su dashboard financiero generas un resumen ejecutivo diario que combina el estado de su cartera con las noticias relevantes del día.

CARTERA DE TOMÁS (a día de hoy):
• Valor total: ${Number(invTotal).toFixed(2)} €
• Capital invertido: ${Number(ti).toFixed(2)} €
• Plusvalía latente: ${pl >= 0 ? '+' : ''}${Number(pl).toFixed(2)} € (${plp >= 0 ? '+' : ''}${Number(plp).toFixed(2)}%)

POSICIONES:
${funds.map((f: any) => `• ${f.short} (${f.type}) — ${f.peso}% cartera — Rent. acum.: ${f.r >= 0 ? '+' : ''}${Number(f.r).toFixed(2)}%`).join('\n')}

${news?.length > 0 ? `NOTICIAS DEL DÍA (${news.length} artículos procesados):
${news.map((n: any, i: number) => `${i + 1}. ${n.title}${n.description ? ' — ' + n.description : ''}`).join('\n')}` : ''}

Genera un resumen ejecutivo diario con este formato EXACTO (usa los emojis al inicio de cada sección):

📊 **Estado de la cartera**
[2-3 líneas sobre el estado actual: plusvalía, distribución destacada, posición más relevante]

📰 **Noticias relevantes para tu cartera**
[Máximo 3 noticias del día que puedan afectar directamente a alguna posición. Si no hay noticias disponibles, indica tendencias generales del mercado]

⚡ **Punto de atención hoy**
[1 cosa concreta en la que fijarse hoy — puede ser una posición a vigilar, una oportunidad o un riesgo]

💡 **Recomendación del día**
[1 sola recomendación accionable y específica para Tomás]

Sé directo, sin rodeos. Máximo 250 palabras en total. En español.`;
    }

    /* ── Análisis completo de cartera ── */
    else if (type === 'portfolio') {
      const { funds, invTotal, ti, pl, plp } = body;
      prompt = `Eres un asesor financiero personal experto. Analiza la cartera de inversión de Tomás en detalle.

CARTERA:
• Valor total: ${Number(invTotal).toFixed(2)} €
• Capital invertido: ${Number(ti).toFixed(2)} €
• Plusvalía latente: ${pl >= 0 ? '+' : ''}${Number(pl).toFixed(2)} € (${Number(plp).toFixed(2)}%)

POSICIONES:
${funds.map((f: any) => `• ${f.short} (${f.type}): ${Number(f.m).toFixed(2)} € | ${f.peso}% cartera | Rent: ${f.r >= 0 ? '+' : ''}${Number(f.r).toFixed(2)}%`).join('\n')}

Proporciona:
1. **Resumen ejecutivo** (2-3 líneas)
2. **Diversificación**: distribución actual y concentración de riesgo
3. **Puntos fuertes** de la cartera
4. **Riesgos y debilidades** detectados
5. **Recomendaciones concretas** (máximo 4 acciones específicas)
6. **Valoración global**: ¿la estrategia es coherente con el largo plazo?

Sé directo y concreto. En español.`;
    }

    /* ── Impacto de noticias en cartera ── */
    else if (type === 'news_impact') {
      const { news, funds } = body;
      prompt = `Eres un analista financiero experto. Analiza el impacto de estas noticias en la cartera de Tomás.

NOTICIAS:
${news.map((n: any, i: number) => `${i + 1}. ${n.title}${n.description ? '\n   ' + n.description : ''}`).join('\n\n')}

CARTERA:
${funds.map((f: any) => `• ${f.short} (${f.type}, ${f.isin}): ${f.peso}% de la cartera`).join('\n')}

Proporciona:
1. **Noticias más relevantes** para esta cartera específica
2. **Impacto por posición**: positivo, negativo o neutral para cada fondo afectado
3. **Visión global**: cómo afecta el conjunto al portfolio
4. **Acción recomendada**: ¿actuar o mantener? Sé concreto.

En español. Máximo 300 palabras.`;
    }

    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const analysis = message.content[0].type === 'text' ? message.content[0].text : '';
    return NextResponse.json({ analysis });
  } catch (err: any) {
    console.error('Claude API error:', err);
    return NextResponse.json({ analysis: '', error: err.message }, { status: 500 });
  }
}

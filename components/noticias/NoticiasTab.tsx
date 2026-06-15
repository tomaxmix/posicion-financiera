'use client';

import { useState, useEffect, useRef } from 'react';
import { Fund } from '@/lib/types';
import { S, subTabBtn } from '@/lib/styles';

interface NewsItem {
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
}

interface Props { funds: Fund[] }

export default function NoticiasTab({ funds }: Props) {
  const [subTab, setSubTab] = useState<'resumen' | 'noticias'>('resumen');
  const [news, setNews]     = useState<NewsItem[]>([]);
  const [loadingNews, setLoadingNews] = useState(false);
  const [analysis, setAnalysis]       = useState('');
  const [loadingAI, setLoadingAI]     = useState(false);
  const [historial, setHistorial]     = useState<{ text: string; ts: string }[]>([]);
  const didInit = useRef(false);

  /* ── Auto-carga al montar: noticias + análisis IA ── */
  useEffect(() => {
    if (didInit.current || funds.length === 0) return;
    didInit.current = true;
    void loadAll();
  }, [funds]); // eslint-disable-line

  async function loadAll() {
    // 1. Noticias (en paralelo con el análisis)
    setLoadingNews(true);
    setLoadingAI(true);

    const [newsData] = await Promise.all([
      fetch('/api/news').then(r => r.json()).catch(() => ({ articles: [] })),
    ]);
    const articles: NewsItem[] = newsData.articles || [];
    setNews(articles);
    setLoadingNews(false);

    // 2. Análisis IA con las noticias y la cartera
    try {
      const invTotal = funds.reduce((s, f) => s + f.m, 0);
      const ti       = funds.reduce((s, f) => s + f.inv, 0);
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'auto_resumen',
          funds: funds.map(f => ({
            short: f.short, type: f.type, isin: f.isin,
            m: f.m, r: f.r, peso: (f.m / invTotal * 100).toFixed(1),
          })),
          invTotal, ti, pl: invTotal - ti, plp: ti ? (invTotal - ti) / ti * 100 : 0,
          news: articles.slice(0, 10).map(n => ({ title: n.title, description: n.description })),
        }),
      });
      const json = await res.json();
      const txt  = json.analysis || 'No se pudo generar el análisis.';
      setAnalysis(txt);
      setHistorial(prev => [{ text: txt, ts: new Date().toLocaleString('es-ES') }, ...prev.slice(0, 4)]);
    } catch {
      setAnalysis('Error al conectar con Claude. Comprueba tu API key en .env.local');
    } finally {
      setLoadingAI(false);
    }
  }

  async function refreshAnalysis() {
    setLoadingAI(true);
    try {
      const invTotal = funds.reduce((s, f) => s + f.m, 0);
      const ti       = funds.reduce((s, f) => s + f.inv, 0);
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'auto_resumen',
          funds: funds.map(f => ({
            short: f.short, type: f.type, isin: f.isin,
            m: f.m, r: f.r, peso: (f.m / invTotal * 100).toFixed(1),
          })),
          invTotal, ti, pl: invTotal - ti, plp: ti ? (invTotal - ti) / ti * 100 : 0,
          news: news.slice(0, 10).map(n => ({ title: n.title, description: n.description })),
        }),
      });
      const json = await res.json();
      const txt  = json.analysis || '';
      setAnalysis(txt);
      setHistorial(prev => [{ text: txt, ts: new Date().toLocaleString('es-ES') }, ...prev.slice(0, 4)]);
    } catch {
      setAnalysis('Error al conectar con Claude.');
    } finally {
      setLoadingAI(false);
    }
  }

  const now = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div>
      {/* Sub-tabs */}
      <div style={S.subTabs}>
        {[['resumen', '🤖 Resumen IA'], ['noticias', '📰 Noticias']].map(([k, v]) => (
          <button key={k} onClick={() => setSubTab(k as 'resumen' | 'noticias')} style={subTabBtn(subTab === k)}>{v}</button>
        ))}
      </div>

      {/* ── RESUMEN IA ── */}
      {subTab === 'resumen' && (
        <div>
          {/* Header */}
          <div style={{ ...S.card, marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={S.sec}>Análisis diario de cartera</div>
                <div style={{ fontSize: 12, color: '#475569', marginTop: -4 }}>{now}</div>
              </div>
              <button
                onClick={refreshAnalysis}
                disabled={loadingAI}
                style={{ ...S.btnG, opacity: loadingAI ? 0.6 : 1, fontSize: 12 }}
              >
                {loadingAI ? '🤖 Analizando…' : '↺ Actualizar análisis'}
              </button>
            </div>

            {/* Resultado */}
            <div style={{ marginTop: '1.25rem' }}>
              {loadingAI ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {['70%','90%','55%','80%','65%'].map((w, i) => (
                    <div key={i} style={{ height: 12, background: '#1e293b', borderRadius: 6, width: w, animation: 'pulse 1.5s infinite' }} />
                  ))}
                  <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>Claude está analizando tu cartera y las noticias del día…</div>
                </div>
              ) : analysis ? (
                <div style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{analysis}</div>
              ) : (
                <div style={{ fontSize: 13, color: '#475569', textAlign: 'center', padding: '2rem' }}>Cargando análisis…</div>
              )}
            </div>
          </div>

          {/* Historial de análisis */}
          {historial.length > 1 && (
            <div style={S.card}>
              <div style={S.sec}>Historial de análisis</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {historial.slice(1).map((h, i) => (
                  <details key={i} style={{ background: '#0a0f1e', border: '1px solid #1f2937', borderRadius: 10, overflow: 'hidden' }}>
                    <summary style={{ padding: '10px 14px', fontSize: 12, color: '#64748b', cursor: 'pointer', userSelect: 'none' }}>
                      Análisis del {h.ts}
                    </summary>
                    <div style={{ padding: '12px 14px', fontSize: 12, color: '#94a3b8', lineHeight: 1.7, whiteSpace: 'pre-wrap', borderTop: '1px solid #1f2937' }}>
                      {h.text}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── NOTICIAS ── */}
      {subTab === 'noticias' && (
        <div style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <div style={S.sec}>10 noticias más relevantes</div>
              <div style={{ fontSize: 11, color: '#475569', marginTop: -6 }}>Fuentes financieras internacionales · filtradas por tu cartera</div>
            </div>
            <button
              onClick={() => { setLoadingNews(true); fetch('/api/news').then(r => r.json()).then(d => { setNews(d.articles || []); setLoadingNews(false); }).catch(() => setLoadingNews(false)); }}
              disabled={loadingNews}
              style={{ ...S.btnP, opacity: loadingNews ? 0.6 : 1 }}
            >
              {loadingNews ? 'Cargando…' : '↺ Actualizar'}
            </button>
          </div>

          {loadingNews ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ background: '#0a0f1e', borderRadius: 10, padding: '1rem', border: '1px solid #1f2937' }}>
                  <div style={{ height: 14, background: '#1e293b', borderRadius: 4, width: '85%', marginBottom: 8 }} />
                  <div style={{ height: 10, background: '#1e293b', borderRadius: 4, width: '60%' }} />
                </div>
              ))}
            </div>
          ) : news.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#475569', fontSize: 13 }}>
              No hay noticias disponibles. Pulsa <strong style={{ color: '#3b82f6' }}>Actualizar</strong> para cargar.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {news.slice(0, 10).map((n, i) => (
                <a
                  key={i}
                  href={n.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'block', textDecoration: 'none', background: '#0a0f1e', border: '1px solid #1f2937', borderRadius: 10, padding: '1rem 1.1rem', transition: 'border-color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = '#3b82f633')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = '#1f2937')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 6 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', lineHeight: 1.4 }}>{n.title}</div>
                    <span style={{ fontSize: 10, color: '#334155', whiteSpace: 'nowrap', flexShrink: 0, background: '#1e293b', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>{n.source}</span>
                  </div>
                  {n.description && (
                    <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{n.description}</div>
                  )}
                  <div style={{ fontSize: 10, color: '#334155', marginTop: 6 }}>
                    {new Date(n.publishedAt).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

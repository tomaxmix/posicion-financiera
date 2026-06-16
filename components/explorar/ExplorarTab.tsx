'use client';

import { useState } from 'react';
import { Fund } from '@/lib/types';
import { S } from '@/lib/styles';

interface Props {
  funds: Fund[];
  onAddFund?: (isin: string, name: string) => void;
}

const QUICK_QUERIES = [
  { label: '🌍 Fondos indexados globales baratos', query: 'Busca los mejores fondos indexados globales con TER inferior a 0.20%' },
  { label: '📊 Alternativas a mis fondos RV', query: 'Busca alternativas de renta variable global a los fondos que tengo en cartera, especialmente para Fidelity MSCI World y Vanguard EM' },
  { label: '🏦 Carteras automatizadas MyInvestor', query: 'Muéstrame las carteras automatizadas de MyInvestor y cuál encajaría mejor con mi perfil actual' },
  { label: '🔒 Renta fija corto plazo', query: 'Busca fondos de renta fija a corto plazo con bajo riesgo, buenos sustitutos al monetario que tengo' },
  { label: '⚡ Fondos tecnología y energía', query: 'Busca fondos de tecnología o energías renovables disponibles en MyInvestor' },
  { label: '⭐ Top fondos 5 estrellas Morningstar', query: 'Muéstrame fondos con 5 estrellas Morningstar disponibles en MyInvestor ordenados por rentabilidad a 3 años' },
];

interface FundRef { isin: string; name: string; }
interface Message {
  role: 'user' | 'assistant';
  text: string;
  funds?: FundRef[];
}

export default function ExplorarTab({ funds, onAddFund }: Props) {
  const [messages,   setMessages]   = useState<Message[]>([]);
  const [input,      setInput]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const [addedIsins, setAddedIsins] = useState<Set<string>>(new Set());

  const existingIsins = new Set(funds.map(f => f.isin));

  async function sendQuery(query: string) {
    if (!query.trim() || loading) return;
    const userMsg: Message = { role: 'user', text: query };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res  = await fetch('/api/explorar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, funds: funds.map(f => ({ short: f.short, type: f.type, m: f.m, r: f.r, isin: f.isin })) }),
      });
      const data = await res.json();
      const assistantMsg: Message = {
        role: 'assistant',
        text: data.response || data.error || 'Sin respuesta',
        funds: data.funds || [],
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Error al conectar con MyInvestor. Inténtalo de nuevo.' }]);
    } finally {
      setLoading(false);
    }
  }

  const handleAdd = (isin: string, name: string) => {
    if (onAddFund) onAddFund(isin, name);
    setAddedIsins(prev => new Set([...prev, isin]));
  };

  return (
    <div>
      {/* Header informativo */}
      <div style={{ ...S.card, marginBottom: '1rem', background: 'linear-gradient(135deg,#0c1a3a,#0a1628)', borderColor: '#1e3a5f' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 28, flexShrink: 0 }}>
            <img src="https://mcp.myinvestor.es/icon.png" alt="MyInvestor" style={{ width: 40, height: 40, borderRadius: 8 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 2 }}>
              Explorar catálogo MyInvestor
            </div>
            <div style={{ fontSize: 11, color: '#475569' }}>
              ~2.300 fondos de inversión · 13 carteras automatizadas · Datos en tiempo real
            </div>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: '#10b981', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>● Conectado</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1rem', alignItems: 'start' }}>

        {/* ── Chat principal ── */}
        <div>
          {/* Área de mensajes */}
          <div style={{ ...S.card, padding: 0, overflow: 'hidden', marginBottom: '1rem' }}>
            <div style={{ minHeight: 320, maxHeight: 520, overflowY: 'auto', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: 16 }}>

              {messages.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#334155' }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
                  <div style={{ fontSize: 14, color: '#475569', marginBottom: 6 }}>Pregunta lo que quieras sobre fondos</div>
                  <div style={{ fontSize: 12, color: '#334155' }}>Usa los accesos rápidos de la derecha o escribe tu consulta</div>
                </div>
              )}

              {messages.map((m, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  {/* Etiqueta */}
                  <div style={{ fontSize: 10, color: '#334155', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {m.role === 'user' ? 'Tú' : '🤖 MyInvestor + Claude'}
                  </div>

                  {/* Burbuja */}
                  <div style={{
                    maxWidth: '90%',
                    background: m.role === 'user' ? 'linear-gradient(135deg,#1d4ed8,#1e40af)' : '#0a0f1e',
                    border: m.role === 'user' ? 'none' : '1px solid #1f2937',
                    borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '4px 14px 14px 14px',
                    padding: '0.875rem 1.1rem',
                  }}>
                    <div style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                      {m.text}
                    </div>

                    {/* Fondos detectados — botones de añadir con nombre */}
                    {m.role === 'assistant' && m.funds && m.funds.filter(f => !existingIsins.has(f.isin)).length > 0 && (
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #1f2937' }}>
                        <div style={{ fontSize: 10, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          Añadir a mi cartera:
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {m.funds.filter(f => !existingIsins.has(f.isin)).map(f => (
                            <button
                              key={f.isin}
                              onClick={() => handleAdd(f.isin, f.name)}
                              disabled={addedIsins.has(f.isin)}
                              style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                                padding: '7px 12px', borderRadius: 8, cursor: addedIsins.has(f.isin) ? 'default' : 'pointer',
                                border: `1px solid ${addedIsins.has(f.isin) ? '#064e3b' : '#10b98133'}`,
                                fontFamily: 'inherit', textAlign: 'left',
                                background: addedIsins.has(f.isin) ? '#064e3b22' : '#0a1628',
                              }}
                            >
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: addedIsins.has(f.isin) ? '#6ee7b7' : '#e2e8f0' }}>
                                  {f.name}
                                </div>
                                <div style={{ fontSize: 10, color: '#475569', marginTop: 1 }}>{f.isin}</div>
                              </div>
                              <span style={{
                                fontSize: 11, padding: '3px 10px', borderRadius: 20, flexShrink: 0,
                                background: addedIsins.has(f.isin) ? '#10b981' : '#10b981',
                                color: '#fff', fontWeight: 700,
                              }}>
                                {addedIsins.has(f.isin) ? '✓ Añadido' : '+ Añadir'}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Indicador de carga */}
              {loading && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ background: '#0a0f1e', border: '1px solid #1f2937', borderRadius: '4px 14px 14px 14px', padding: '0.875rem 1.1rem' }}>
                    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                      {[0,1,2].map(i => (
                        <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6', animation: `bounce 1s ease-in-out ${i * 0.15}s infinite` }} />
                      ))}
                      <span style={{ fontSize: 12, color: '#475569', marginLeft: 6 }}>Consultando catálogo MyInvestor…</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div style={{ borderTop: '1px solid #1f2937', padding: '1rem 1.25rem', display: 'flex', gap: 10 }}>
              <input
                style={{ ...S.inp, flex: 1, padding: '10px 14px' }}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendQuery(input); } }}
                placeholder="Ej: busca fondos indexados globales con TER < 0.20%..."
                disabled={loading}
              />
              <button
                onClick={() => sendQuery(input)}
                disabled={loading || !input.trim()}
                style={{ ...S.btnP, padding: '10px 18px', opacity: loading || !input.trim() ? 0.5 : 1, flexShrink: 0 }}
              >
                Enviar
              </button>
            </div>
          </div>

          {/* Botón limpiar */}
          {messages.length > 0 && (
            <button onClick={() => setMessages([])} style={{ ...S.btn, fontSize: 11 }}>
              ↺ Nueva conversación
            </button>
          )}
        </div>

        {/* ── Panel derecho: accesos rápidos ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ ...S.sec, marginBottom: 4 }}>Consultas rápidas</div>
          {QUICK_QUERIES.map((q, i) => (
            <button
              key={i}
              onClick={() => sendQuery(q.query)}
              disabled={loading}
              style={{
                ...S.card,
                display: 'block', width: '100%', textAlign: 'left',
                cursor: loading ? 'not-allowed' : 'pointer',
                padding: '0.75rem 1rem', borderRadius: 10,
                opacity: loading ? 0.5 : 1,
                border: '1px solid #1f2937',
                fontFamily: 'inherit',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.borderColor = '#3b82f633'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#1f2937'; }}
            >
              <div style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 500, lineHeight: 1.4 }}>{q.label}</div>
            </button>
          ))}

          {/* Info */}
          <div style={{ ...S.card, padding: '0.875rem 1rem', marginTop: 4, background: '#0a0f1e', borderRadius: 10 }}>
            <div style={{ fontSize: 10, color: '#334155', lineHeight: 1.6 }}>
              💡 <strong style={{ color: '#475569' }}>Puedes preguntar:</strong><br />
              · Comparar fondos entre sí<br />
              · Alternativas más baratas a los que tienes<br />
              · Fondos por sector, geografía o perfil<br />
              · Carteras modelo de MyInvestor<br />
              · Top fondos por rentabilidad o rating
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

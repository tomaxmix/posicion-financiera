'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Fund, CaptureRow, Broker } from '@/lib/types';
import { S } from '@/lib/styles';
import { fmt2, todayISO, BROKER_LABELS, TYPE_LABELS } from '@/lib/utils';
import { applyCapture, CaptureDecision, NEW_FUND, prepareImage, PreparedImage, typeFromSection } from '@/lib/captura';
import Modal from '@/components/shared/Modal';

interface Props {
  funds: Fund[];
  onClose: () => void;
  onApply: (funds: Fund[], snapshot: boolean) => Promise<void>;
}

const MAX_IMAGES  = 6;
const MAX_PAYLOAD = 4_000_000;   // Vercel rechaza peticiones de más de ~4,5 MB

const platformLabel = (p: CaptureRow['platform']) => p === 'otra' ? 'banco desconocido' : BROKER_LABELS[p as Broker];

export default function ModalCaptura({ funds, onClose, onApply }: Props) {
  const [phase,     setPhase]     = useState<'subir' | 'leyendo' | 'revisar'>('subir');
  const [images,    setImages]    = useState<PreparedImage[]>([]);
  const [rows,      setRows]      = useState<CaptureRow[]>([]);
  const [decisions, setDecisions] = useState<CaptureDecision[]>([]);
  const [snapshot,  setSnapshot]  = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [saving,    setSaving]    = useState(false);
  const [dragOver,  setDragOver]  = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(async (files: File[]) => {
    const imgs = files.filter(f => f.type.startsWith('image/'));
    if (!imgs.length) return;
    setError(null);
    try {
      const prepared = await Promise.all(imgs.map(prepareImage));
      setImages(prev => [...prev, ...prepared].slice(0, MAX_IMAGES));
    } catch {
      setError('No he podido abrir alguna de las imágenes.');
    }
  }, []);

  /* Pegar capturas con ⌘V mientras la ventana está abierta */
  useEffect(() => {
    if (phase !== 'subir') return;
    const onPaste = (e: ClipboardEvent) => {
      const files = [...(e.clipboardData?.files ?? [])];
      if (files.length) { e.preventDefault(); addFiles(files); }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [phase, addFiles]);

  /* Enviar las capturas al lector */
  const read = async () => {
    if (images.reduce((s, i) => s + i.data.length, 0) > MAX_PAYLOAD) {
      setError('Las capturas pesan demasiado juntas: sube menos a la vez.');
      return;
    }
    setPhase('leyendo');
    setError(null);
    try {
      const res = await fetch('/api/captura', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: images.map(i => ({ data: i.data, mediaType: 'image/jpeg' })),
          funds: funds.map(f => ({ id: f.id, short: f.short, isin: f.isin, type: f.type, broker: f.broker, brokerName: f.brokerName })),
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || `Error ${res.status}`);
      const got: CaptureRow[] = json.rows;
      if (!got.length) throw new Error('No he encontrado posiciones en estas capturas.');
      setRows(got);
      // Marcadas de entrada solo las filas emparejadas cuyas cifras cuadran
      setDecisions(got.map(r => ({
        include: !!r.matchId && r.checks.length === 0,
        target:  r.matchId ?? '',
        newIsin: r.code ?? '',
        newType: typeFromSection(r.platform, r.section),
      })));
      setPhase('revisar');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al leer las capturas');
      setPhase('subir');
    }
  };

  const upd = (i: number, patch: Partial<CaptureDecision>) =>
    setDecisions(ds => ds.map((d, j) => j === i ? { ...d, ...patch } : d));

  /* ── Paso 1: subir ── */
  if (phase !== 'revisar') return (
    <Modal title="Actualizar desde capturas" onClose={onClose} wide>
      <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12, lineHeight: 1.5 }}>
        Sube capturas de tus posiciones en MyInvestor (fondos o planes), CaixaBank o Trade Republic. Puedes mezclar bancos.
        Antes de guardar nada verás lo que he leído y podrás corregirlo.
      </p>

      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); addFiles([...e.dataTransfer.files]); }}
        style={{
          border: `2px dashed ${dragOver ? '#3b82f6' : '#1f2937'}`, borderRadius: 12, padding: '1.75rem 1rem',
          textAlign: 'center', cursor: 'pointer', color: '#64748b', fontSize: 13, background: dragOver ? '#0f172a' : 'transparent',
        }}
      >
        Arrastra aquí tus capturas, pégalas con ⌘V o haz clic para elegirlas
        <div style={{ fontSize: 11, color: '#334155', marginTop: 4 }}>Hasta {MAX_IMAGES} a la vez</div>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden
          onChange={e => { addFiles([...(e.target.files ?? [])]); e.target.value = ''; }} />
      </div>

      {images.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          {images.map((img, i) => (
            <div key={img.id} style={{ position: 'relative', width: 110 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.preview} alt={img.name} style={{ width: 110, height: 80, objectFit: 'cover', objectPosition: 'top', borderRadius: 8, border: '1px solid #1f2937' }} />
              <div style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>Captura {i + 1}</div>
              {phase === 'subir' && (
                <button onClick={() => setImages(prev => prev.filter(x => x.id !== img.id))} title="Quitar"
                  style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, border: 'none', background: '#0a0f1ecc', color: '#e2e8f0', cursor: 'pointer', fontSize: 13, lineHeight: '20px', padding: 0 }}>×</button>
              )}
            </div>
          ))}
        </div>
      )}

      {error && <div style={{ marginTop: 12, fontSize: 12, color: '#ef4444' }}>{error}</div>}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center', marginTop: '1.25rem' }}>
        {phase === 'leyendo' && (
          <span style={{ fontSize: 12, color: '#94a3b8', marginRight: 'auto' }}>
            Leyendo {images.length} {images.length === 1 ? 'captura' : 'capturas'}… suele tardar entre 20 y 60 segundos
          </span>
        )}
        <button style={S.btn} onClick={onClose}>Cancelar</button>
        <button style={{ ...S.btnP, opacity: images.length && phase === 'subir' ? 1 : 0.5 }} disabled={!images.length || phase !== 'subir'} onClick={read}>
          {phase === 'leyendo' ? 'Leyendo…' : `Leer ${images.length || ''} ${images.length === 1 ? 'captura' : 'capturas'}`}
        </button>
      </div>
    </Modal>
  );

  /* ── Paso 2: revisar ── */
  const included   = decisions.filter(d => d.include && d.target);
  const targetIds  = included.map(d => d.target).filter(t => t !== NEW_FUND);
  const duplicated = new Set(targetIds.filter((t, i) => targetIds.indexOf(t) !== i));
  const platforms  = new Set(rows.map(r => r.platform));
  // Fondos de los bancos leídos que no se van a tocar
  const untouched  = funds.filter(f => f.broker && platforms.has(f.broker) && !targetIds.includes(f.id));
  const fundsSorted = [...funds].sort((a, b) => a.short.localeCompare(b.short));

  const apply = async () => {
    setSaving(true);
    try {
      await onApply(applyCapture(funds, rows, decisions, todayISO()).funds, snapshot);
      onClose();
    } catch {
      setError('No se ha podido guardar. Inténtalo de nuevo.');
      setSaving(false);
    }
  };

  return (
    <Modal title="Revisa lo que he leído" onClose={onClose} wide>
      <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12, lineHeight: 1.5 }}>
        Las filas marcadas se guardarán con el valor y el invertido de la captura.
        Las que tienen ⚠ no cuadran o no sé a qué fondo corresponden: revísalas antes de marcarlas.
      </p>

      {rows.map((r, i) => {
        const d   = decisions[i];
        const f   = funds.find(x => x.id === d.target);
        const ok  = r.checks.length === 0;
        const dup = duplicated.has(d.target) && d.include;
        const diff = f ? r.value - f.m : 0;
        return (
          <div key={i} style={{ ...S.inner, marginBottom: 8, opacity: d.include ? 1 : 0.6, border: `1px solid ${dup ? '#ef4444' : 'transparent'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="checkbox" checked={d.include} disabled={!d.target} onChange={e => upd(i, { include: e.target.checked })}
                style={{ width: 16, height: 16, accentColor: '#3b82f6', cursor: d.target ? 'pointer' : 'default' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{r.name}</div>
                <div style={{ fontSize: 10, color: '#475569', marginTop: 1 }}>
                  Captura {r.image} · {platformLabel(r.platform)}{r.section ? ` · ${r.section}` : ''}{r.code ? ` · ${r.code}` : ''}
                </div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: ok ? '#10b981' : '#f59e0b', whiteSpace: 'nowrap' }}>{ok ? '✓ cuadra' : '⚠ revisar'}</span>
            </div>

            {(!ok || dup) && (
              <div style={{ fontSize: 11, color: dup ? '#ef4444' : '#f59e0b', margin: '6px 0 0 26px' }}>
                {[...r.checks, ...(dup ? ['dos filas marcadas actualizan el mismo fondo'] : [])].join(' · ')}
              </div>
            )}

            <div style={{ margin: '8px 0 0 26px', display: 'grid', gap: 6 }}>
              <select style={{ ...S.inp, padding: '6px 8px', fontSize: 12 }} value={d.target}
                onChange={e => upd(i, { target: e.target.value, include: e.target.value !== '' })}>
                <option value="">— ignorar esta fila —</option>
                <optgroup label="Tus fondos">
                  {fundsSorted.map(x => (
                    <option key={x.id} value={x.id}>{x.short}{x.broker ? ` · ${BROKER_LABELS[x.broker]}` : ''}</option>
                  ))}
                </optgroup>
                <option value={NEW_FUND}>+ Añadir como fondo nuevo</option>
              </select>

              {d.target === NEW_FUND && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  <input style={{ ...S.inp, padding: '6px 8px', fontSize: 12 }} placeholder="ISIN (para que ⟳ Precios lo encuentre)"
                    value={d.newIsin} onChange={e => upd(i, { newIsin: e.target.value })} />
                  <select style={{ ...S.inp, padding: '6px 8px', fontSize: 12 }} value={d.newType}
                    onChange={e => upd(i, { newType: e.target.value as Fund['type'] })}>
                    {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              )}

              <div style={{ fontSize: 11, color: '#64748b' }}>
                Valor {f ? `${fmt2(f.m)} → ` : ''}<b style={{ color: '#e2e8f0' }}>{fmt2(r.value)} €</b>
                {f && Math.abs(diff) >= 0.01 && (
                  <span style={{ color: diff >= 0 ? '#10b981' : '#ef4444' }}> ({diff >= 0 ? '+' : ''}{fmt2(diff)})</span>
                )}
                {' · '}Invertido {f ? `${fmt2(f.inv)} → ` : ''}<b style={{ color: '#e2e8f0' }}>{fmt2(r.invested)} €</b>
              </div>
            </div>
          </div>
        );
      })}

      {untouched.length > 0 && (
        <div style={{ fontSize: 11, color: '#64748b', margin: '12px 0 0', lineHeight: 1.5 }}>
          <b style={{ color: '#94a3b8' }}>No aparecen en estas capturas (no se tocan):</b> {untouched.map(f => f.short).join(', ')}
        </div>
      )}

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#94a3b8', marginTop: 14, cursor: 'pointer' }}>
        <input type="checkbox" checked={snapshot} onChange={e => setSnapshot(e.target.checked)} style={{ accentColor: '#3b82f6' }} />
        Guardar también una foto del patrimonio en Evolución
      </label>

      {error && <div style={{ marginTop: 10, fontSize: 12, color: '#ef4444' }}>{error}</div>}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: '1.25rem' }}>
        <button style={S.btn} onClick={() => { setPhase('subir'); setRows([]); setDecisions([]); }}>← Otras capturas</button>
        <button style={S.btn} onClick={onClose}>Cancelar</button>
        <button style={{ ...S.btnG, opacity: included.length && !duplicated.size && !saving ? 1 : 0.5 }}
          disabled={!included.length || duplicated.size > 0 || saving} onClick={apply}>
          {saving ? 'Guardando…' : `Aplicar ${included.length} ${included.length === 1 ? 'cambio' : 'cambios'}`}
        </button>
      </div>
    </Modal>
  );
}

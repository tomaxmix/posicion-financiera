import { TYPE_LABELS, TYPE_COLORS } from '@/lib/utils';

export default function Tag({ type }: { type: string }) {
  const [bg, color] = (TYPE_COLORS[type] || '#f0f0f0|#666').split('|');
  return (
    <span
      style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, fontWeight: 700, background: bg, color, whiteSpace: 'nowrap' }}
    >
      {TYPE_LABELS[type] || type}
    </span>
  );
}

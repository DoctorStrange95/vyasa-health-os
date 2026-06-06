import { useState } from 'react';
import { usePadStore } from '@/store/usePadStore';
import type { FavDrug, Medication } from '@/types';
import { Star, ChevronDown, ChevronRight, X } from 'lucide-react';

interface Props {
  diagnosis?: string;
  onAddDrug: (drug: Partial<Medication>) => void;
  onLoadBundle: (drugs: Partial<Medication>[]) => void;
}

export function FavDrugsPanel({ diagnosis, onAddDrug, onLoadBundle }: Props) {
  const { favDrugs, favPrescriptions, deleteFavBundle } = usePadStore();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'drugs' | 'bundles'>('drugs');

  if (favDrugs.length === 0 && favPrescriptions.length === 0) return null;

  const diagLower = (diagnosis ?? '').toLowerCase();
  const topDrugs = diagLower
    ? favDrugs.filter(d =>
        d.name.toLowerCase().includes(diagLower) ||
        d.frequency.toLowerCase().includes(diagLower)
      ).slice(0, 6).concat(
        favDrugs.filter(d =>
          !d.name.toLowerCase().includes(diagLower)
        ).slice(0, Math.max(0, 6 - favDrugs.filter(d => d.name.toLowerCase().includes(diagLower)).length))
      )
    : favDrugs.slice(0, 8);

  const handleDrug = (d: FavDrug) => {
    onAddDrug({ drug: d.name, dose: d.dose, route: d.route, frequency: d.frequency, duration: d.duration, instructions: d.instructions });
  };

  return (
    <div style={{ marginBottom: 8, border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', background: '#fafafa' }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 10px', background: 'transparent', border: 'none', cursor: 'pointer',
          fontSize: 12, color: '#475569', fontWeight: 500,
        }}
      >
        <Star style={{ width: 13, height: 13, color: '#eab308' }} />
        Favourites
        <span style={{ color: '#94a3b8', fontSize: 11, fontWeight: 400 }}>
          ({favDrugs.length} drugs · {favPrescriptions.length} bundles)
        </span>
        {open ? <ChevronDown style={{ width: 13, height: 13, marginLeft: 'auto' }} /> : <ChevronRight style={{ width: 13, height: 13, marginLeft: 'auto' }} />}
      </button>

      {open && (
        <div style={{ padding: '0 10px 10px', borderTop: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', gap: 6, marginTop: 8, marginBottom: 8 }}>
            {(['drugs', 'bundles'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                style={{
                  fontSize: 11, padding: '2px 10px', borderRadius: 999, border: 'none', cursor: 'pointer',
                  background: tab === t ? '#0d9488' : '#e2e8f0',
                  color: tab === t ? 'white' : '#475569',
                  fontWeight: tab === t ? 600 : 400,
                }}
              >
                {t === 'drugs' ? 'Top Drugs' : 'Bundles'}
              </button>
            ))}
          </div>

          {tab === 'drugs' && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {topDrugs.length === 0 && (
                <span style={{ fontSize: 11, color: '#94a3b8' }}>No favourites yet — prescribe drugs to build your list.</span>
              )}
              {topDrugs.map(d => (
                <button
                  key={d.id}
                  type="button"
                  title={`${d.dose} ${d.route} ${d.frequency} × ${d.duration}`}
                  onClick={() => handleDrug(d)}
                  className="fav-chip"
                >
                  {d.name}
                  <span style={{ color: '#94a3b8', fontSize: 10, marginLeft: 3 }}>×{d.usageCount}</span>
                </button>
              ))}
            </div>
          )}

          {tab === 'bundles' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {favPrescriptions.length === 0 && (
                <span style={{ fontSize: 11, color: '#94a3b8' }}>No bundles yet — prescribe 3+ drugs together to auto-save.</span>
              )}
              {favPrescriptions.sort((a, b) => b.usageCount - a.usageCount).map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'white', border: '1px solid #e2e8f0', borderRadius: 6, padding: '5px 8px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>{p.label}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8' }}>
                      {p.drugs.map(d => d.drug).join(', ')} · used {p.usageCount}×
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onLoadBundle(p.drugs)}
                    style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: '#f0fdfa', color: '#0f766e', border: '1px solid #99f6e4', cursor: 'pointer' }}
                  >
                    Load
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteFavBundle(p.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}
                  >
                    <X style={{ width: 12, height: 12 }} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

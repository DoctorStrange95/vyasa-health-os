import { useState } from 'react';
import { cn } from '@/lib/utils';
import { X, ChevronDown, ChevronUp } from 'lucide-react';

interface BodyRegion {
  id: string;
  label: string;
  shortLabel: string;
  // SVG fill element(s) — positioned on a 120×280 viewBox
  cx?: number; cy?: number; rx?: number; ry?: number; // ellipse
  x?: number; y?: number; w?: number; h?: number;     // rect
  points?: string;                                      // polygon
}

const REGIONS: BodyRegion[] = [
  { id: 'head',      label: 'Head / Face / CNS',          shortLabel: 'Head',    cx: 60, cy: 24, rx: 20, ry: 22 },
  { id: 'neck',      label: 'Neck / Throat / JVP',        shortLabel: 'Neck',    x: 52,  y: 46,  w: 16,   h: 10 },
  { id: 'chest',     label: 'Chest — CVS / RS',           shortLabel: 'Chest',   points: '32,56 88,56 84,110 36,110' },
  { id: 'abdomen',   label: 'Abdomen / GI / Liver',       shortLabel: 'Abdomen', points: '36,110 84,110 82,150 38,150' },
  { id: 'pelvis',    label: 'Pelvis / Groin / Genitalia', shortLabel: 'Pelvis',  points: '38,150 82,150 86,170 34,170' },
  { id: 'l-arm',     label: 'Left Arm / Shoulder',        shortLabel: 'L Arm',   points: '10,62 32,58 34,110 12,120' },
  { id: 'r-arm',     label: 'Right Arm / Shoulder',       shortLabel: 'R Arm',   points: '110,62 88,58 86,110 108,120' },
  { id: 'l-hand',    label: 'Left Hand / Wrist',          shortLabel: 'L Hand',  points: '8,120 14,122 12,145 5,143' },
  { id: 'r-hand',    label: 'Right Hand / Wrist',         shortLabel: 'R Hand',  points: '112,120 106,122 108,145 115,143' },
  { id: 'l-leg',     label: 'Left Leg / Knee / Ankle',    shortLabel: 'L Leg',   points: '38,168 58,170 56,260 32,260' },
  { id: 'r-leg',     label: 'Right Leg / Knee / Ankle',   shortLabel: 'R Leg',   points: '82,168 62,170 64,260 88,260' },
  { id: 'l-foot',    label: 'Left Foot',                  shortLabel: 'L Foot',  points: '30,258 57,258 58,268 28,268' },
  { id: 'r-foot',    label: 'Right Foot',                 shortLabel: 'R Foot',  points: '63,258 90,258 92,268 62,268' },
];

const CLINICAL_CHECKS = [
  'Pallor', 'Icterus / Jaundice', 'Cyanosis', 'Clubbing',
  'Koilonychia', 'Pitting Oedema', 'Lymphadenopathy', 'Dehydration',
];

interface Props {
  notes: Record<string, string>;
  checks: string[];
  onChange: (region: string, text: string) => void;
  onCheckToggle: (check: string) => void;
}

export function BodyDiagram({ notes, checks, onChange, onCheckToggle }: Props) {
  const [active, setActive] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const activeRegion = REGIONS.find(r => r.id === active);

  function regionFill(id: string) {
    if (id === active) return '#0d9488';
    if (notes[id]?.trim()) return '#99f6e4';
    return '#e2e8f0';
  }

  function renderRegion(r: BodyRegion) {
    const fill = regionFill(r.id);
    const props = {
      fill,
      stroke: active === r.id ? '#0f766e' : '#cbd5e1',
      strokeWidth: active === r.id ? 1.5 : 0.75,
      className: 'cursor-pointer transition-all hover:opacity-75',
      onClick: () => setActive(active === r.id ? null : r.id),
    };
    if (r.cx !== undefined) return <ellipse key={r.id} cx={r.cx} cy={r.cy} rx={r.rx} ry={r.ry} {...props} />;
    if (r.points) return <polygon key={r.id} points={r.points} {...props} />;
    return <rect key={r.id} x={r.x} y={r.y} width={r.w} height={r.h} rx={2} {...props} />;
  }

  const filledCount = Object.values(notes).filter(n => n.trim()).length + checks.length;

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button type="button" onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors">
        <span className="text-sm font-semibold text-slate-700">
          Body Diagram &amp; Clinical Signs
          {filledCount > 0 && <span className="ml-2 text-xs font-bold bg-teal-500 text-white px-1.5 py-0.5 rounded-full">{filledCount}</span>}
        </span>
        {collapsed ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
      </button>

      {!collapsed && (
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Left: SVG body */}
          <div className="flex flex-col items-center">
            <div className="text-[10px] text-slate-400 mb-2 uppercase tracking-widest">Click region to add findings</div>
            <svg viewBox="0 0 120 280" width="120" height="280" className="drop-shadow-sm">
              {REGIONS.map(renderRegion)}
              {/* Body centerline for reference */}
              <line x1="60" y1="46" x2="60" y2="170" stroke="#cbd5e1" strokeWidth="0.5" strokeDasharray="2,2" />
              {/* Eyes (decorative) */}
              <circle cx="53" cy="22" r="2.5" fill="#94a3b8" />
              <circle cx="67" cy="22" r="2.5" fill="#94a3b8" />
              {/* Navel (decorative) */}
              <circle cx="60" cy="130" r="1.5" fill="#94a3b8" />
            </svg>
            {/* Region labels below SVG */}
            <div className="flex flex-wrap gap-1 mt-2 justify-center">
              {REGIONS.filter(r => notes[r.id]?.trim()).map(r => (
                <span key={r.id} className="text-[10px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full">
                  {r.shortLabel}
                </span>
              ))}
            </div>
          </div>

          {/* Right: Notes + checks */}
          <div className="space-y-3">
            {/* Active region note */}
            {activeRegion && (
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-teal-700">{activeRegion.label}</span>
                  <button type="button" onClick={() => setActive(null)}
                    className="p-0.5 rounded hover:bg-teal-100 text-teal-500">
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <textarea
                  autoFocus
                  value={notes[activeRegion.id] ?? ''}
                  onChange={e => onChange(activeRegion.id, e.target.value)}
                  rows={3}
                  className="input text-sm w-full resize-none text-xs"
                  placeholder={`Examination findings for ${activeRegion.label}…\ne.g. S1S2 heard, no murmur`}
                />
              </div>
            )}

            {/* All filled regions */}
            {REGIONS.filter(r => r.id !== active && notes[r.id]?.trim()).map(r => (
              <div key={r.id} className="bg-slate-50 rounded-lg px-3 py-2">
                <button type="button" onClick={() => setActive(r.id)}
                  className="w-full flex items-start gap-2 text-left">
                  <span className="text-[10px] font-bold text-slate-500 uppercase flex-shrink-0 mt-0.5 w-14">{r.shortLabel}</span>
                  <span className="text-xs text-slate-700 line-clamp-2">{notes[r.id]}</span>
                </button>
              </div>
            ))}

            {/* Clinical signs checklist */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                Clinical Signs (PIPCED+)
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {CLINICAL_CHECKS.map(c => (
                  <button key={c} type="button" onClick={() => onCheckToggle(c)}
                    className={cn('text-xs px-2.5 py-1.5 rounded-lg border-2 font-medium transition-all text-left',
                      checks.includes(c)
                        ? 'border-red-400 bg-red-50 text-red-700'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300')}>
                    {checks.includes(c) ? '✓ ' : ''}{c}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

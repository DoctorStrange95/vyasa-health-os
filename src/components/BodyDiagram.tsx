import { useState } from 'react';
import { cn } from '@/lib/utils';
import { X, ChevronDown, ChevronUp } from 'lucide-react';

interface BodyRegion {
  id: string;
  label: string;
  shortLabel: string;
  path: string;
  tx: number; ty: number;
}

// Front-view paths — 130×310 viewBox
const FRONT_PATHS = {
  head:       'M65,8 C51,8 41,18 41,30 C41,42 51,52 65,52 C79,52 89,42 89,30 C89,18 79,8 65,8 Z',
  neck:       'M57,52 L73,52 L72,68 L58,68 Z',
  chest:      'M28,68 Q65,64 102,68 L98,118 Q65,122 32,118 Z',
  abdomen:    'M32,118 Q65,122 98,118 L96,156 Q65,160 34,156 Z',
  pelvis:     'M34,156 Q65,160 96,156 L100,180 Q65,186 30,180 Z',
  lshoulder:  'M28,68 Q16,68 10,80 L16,98 Q22,88 32,88 L32,118 Q29,100 28,68 Z',
  rshoulder:  'M102,68 Q114,68 120,80 L114,98 Q108,88 98,88 L98,118 Q101,100 102,68 Z',
  larm:       'M10,80 L16,98 L14,148 L6,148 L5,100 Z',
  rarm:       'M120,80 L114,98 L116,148 L124,148 L125,100 Z',
  lhand:      'M6,148 L14,148 L12,172 L4,170 Z',
  rhand:      'M116,148 L124,148 L126,170 L118,172 Z',
  lthigh:     'M30,180 Q48,186 63,186 L60,240 Q44,238 30,228 Z',
  rthigh:     'M100,180 Q82,186 67,186 L70,240 Q86,238 100,228 Z',
  lleg:       'M30,228 Q44,238 60,240 L58,286 Q42,286 28,276 Z',
  rleg:       'M100,228 Q86,238 70,240 L72,286 Q88,286 102,276 Z',
  lfoot:      'M28,276 Q42,286 58,286 L58,298 L24,296 Z',
  rfoot:      'M102,276 Q88,286 72,286 L72,298 L106,296 Z',
};

const FRONT_REGIONS: BodyRegion[] = [
  { id: 'head',       label: 'Head / Face / CNS',              shortLabel: 'Head',       path: FRONT_PATHS.head,      tx: 65, ty: 32  },
  { id: 'neck',       label: 'Neck / Throat / JVP',            shortLabel: 'Neck',       path: FRONT_PATHS.neck,      tx: 65, ty: 61  },
  { id: 'chest',      label: 'Chest — CVS / Respiratory',      shortLabel: 'Chest',      path: FRONT_PATHS.chest,     tx: 65, ty: 93  },
  { id: 'abdomen',    label: 'Abdomen / Liver / GI',           shortLabel: 'Abdomen',    path: FRONT_PATHS.abdomen,   tx: 65, ty: 139 },
  { id: 'pelvis',     label: 'Pelvis / Groin / Genitalia',     shortLabel: 'Pelvis',     path: FRONT_PATHS.pelvis,    tx: 65, ty: 169 },
  { id: 'l-shoulder', label: 'Left Shoulder / Axilla',         shortLabel: 'L Shoulder', path: FRONT_PATHS.lshoulder, tx: 19, ty: 84  },
  { id: 'r-shoulder', label: 'Right Shoulder / Axilla',        shortLabel: 'R Shoulder', path: FRONT_PATHS.rshoulder, tx: 111,ty: 84  },
  { id: 'l-arm',      label: 'Left Arm / Elbow',               shortLabel: 'L Arm',      path: FRONT_PATHS.larm,      tx: 10, ty: 122 },
  { id: 'r-arm',      label: 'Right Arm / Elbow',              shortLabel: 'R Arm',      path: FRONT_PATHS.rarm,      tx: 120,ty: 122 },
  { id: 'l-hand',     label: 'Left Hand / Wrist',              shortLabel: 'L Hand',     path: FRONT_PATHS.lhand,     tx: 9,  ty: 160 },
  { id: 'r-hand',     label: 'Right Hand / Wrist',             shortLabel: 'R Hand',     path: FRONT_PATHS.rhand,     tx: 121,ty: 160 },
  { id: 'l-thigh',    label: 'Left Thigh / Hip',               shortLabel: 'L Thigh',    path: FRONT_PATHS.lthigh,    tx: 47, ty: 212 },
  { id: 'r-thigh',    label: 'Right Thigh / Hip',              shortLabel: 'R Thigh',    path: FRONT_PATHS.rthigh,    tx: 84, ty: 212 },
  { id: 'l-leg',      label: 'Left Leg / Knee / Ankle',        shortLabel: 'L Leg',      path: FRONT_PATHS.lleg,      tx: 44, ty: 262 },
  { id: 'r-leg',      label: 'Right Leg / Knee / Ankle',       shortLabel: 'R Leg',      path: FRONT_PATHS.rleg,      tx: 86, ty: 262 },
  { id: 'l-foot',     label: 'Left Foot',                      shortLabel: 'L Foot',     path: FRONT_PATHS.lfoot,     tx: 42, ty: 291 },
  { id: 'r-foot',     label: 'Right Foot',                     shortLabel: 'R Foot',     path: FRONT_PATHS.rfoot,     tx: 89, ty: 291 },
];

// Back-view: reuse same SVG paths, different anatomical labels
const BACK_REGIONS: BodyRegion[] = [
  { id: 'b-head',      label: 'Occiput / Back of Head',              shortLabel: 'Occiput',     path: FRONT_PATHS.head,      tx: 65, ty: 32  },
  { id: 'b-neck',      label: 'Nape of Neck / Cervical Spine',       shortLabel: 'Nape',        path: FRONT_PATHS.neck,      tx: 65, ty: 61  },
  { id: 'b-upper',     label: 'Upper Back / Thoracic / Scapulae',    shortLabel: 'Upper Back',  path: FRONT_PATHS.chest,     tx: 65, ty: 93  },
  { id: 'b-lower',     label: 'Lower Back / Lumbar Spine',           shortLabel: 'Lower Back',  path: FRONT_PATHS.abdomen,   tx: 65, ty: 139 },
  { id: 'b-sacrum',    label: 'Sacrum / Gluteal Region',             shortLabel: 'Sacrum/Glut', path: FRONT_PATHS.pelvis,    tx: 65, ty: 169 },
  { id: 'b-l-scap',   label: 'Left Scapula / Posterior Shoulder',   shortLabel: 'L Scapula',   path: FRONT_PATHS.lshoulder, tx: 19, ty: 84  },
  { id: 'b-r-scap',   label: 'Right Scapula / Posterior Shoulder',  shortLabel: 'R Scapula',   path: FRONT_PATHS.rshoulder, tx: 111,ty: 84  },
  { id: 'b-l-arm',    label: 'Left Posterior Arm / Triceps',        shortLabel: 'L Post Arm',  path: FRONT_PATHS.larm,      tx: 10, ty: 122 },
  { id: 'b-r-arm',    label: 'Right Posterior Arm / Triceps',       shortLabel: 'R Post Arm',  path: FRONT_PATHS.rarm,      tx: 120,ty: 122 },
  { id: 'b-l-hand',   label: 'Left Dorsum of Hand',                 shortLabel: 'L Dorsum',    path: FRONT_PATHS.lhand,     tx: 9,  ty: 160 },
  { id: 'b-r-hand',   label: 'Right Dorsum of Hand',                shortLabel: 'R Dorsum',    path: FRONT_PATHS.rhand,     tx: 121,ty: 160 },
  { id: 'b-l-thigh',  label: 'Left Posterior Thigh / Hamstring',    shortLabel: 'L Post Thigh',path: FRONT_PATHS.lthigh,    tx: 47, ty: 212 },
  { id: 'b-r-thigh',  label: 'Right Posterior Thigh / Hamstring',   shortLabel: 'R Post Thigh',path: FRONT_PATHS.rthigh,    tx: 84, ty: 212 },
  { id: 'b-l-calf',   label: 'Left Calf / Popliteal / Achilles',    shortLabel: 'L Calf',      path: FRONT_PATHS.lleg,      tx: 44, ty: 262 },
  { id: 'b-r-calf',   label: 'Right Calf / Popliteal / Achilles',   shortLabel: 'R Calf',      path: FRONT_PATHS.rleg,      tx: 86, ty: 262 },
  { id: 'b-l-heel',   label: 'Left Heel / Plantar Surface',         shortLabel: 'L Heel',      path: FRONT_PATHS.lfoot,     tx: 42, ty: 291 },
  { id: 'b-r-heel',   label: 'Right Heel / Plantar Surface',        shortLabel: 'R Heel',      path: FRONT_PATHS.rfoot,     tx: 89, ty: 291 },
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
  const [view, setView] = useState<'front' | 'back'>('front');

  const REGIONS = view === 'front' ? FRONT_REGIONS : BACK_REGIONS;
  const activeRegion = REGIONS.find(r => r.id === active);
  const filledCount = Object.values(notes).filter(n => n.trim()).length + checks.length;

  // When switching view, clear active so old ID doesn't linger
  function switchView(v: 'front' | 'back') {
    setView(v);
    setActive(null);
  }

  function regionFill(id: string) {
    if (id === active) return '#0d9488';
    if (notes[id]?.trim()) return '#99f6e4';
    return '#f1f5f9';
  }
  function regionStroke(id: string) {
    if (id === active) return '#0f766e';
    if (notes[id]?.trim()) return '#2dd4bf';
    return '#cbd5e1';
  }

  const filledRegions = REGIONS.filter(r => notes[r.id]?.trim());

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
      {/* Header */}
      <button type="button" onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-700">Body Diagram &amp; Clinical Signs</span>
          {filledCount > 0 && (
            <span className="text-[10px] font-bold bg-teal-500 text-white px-1.5 py-0.5 rounded-full">
              {filledCount}
            </span>
          )}
        </div>
        {collapsed
          ? <ChevronDown className="w-4 h-4 text-slate-400" />
          : <ChevronUp className="w-4 h-4 text-slate-400" />}
      </button>

      {!collapsed && (
        <div className="p-3 sm:p-4">
          {/* Front / Back toggle */}
          <div className="flex justify-center mb-3">
            <div className="inline-flex bg-slate-100 rounded-lg p-0.5 gap-0.5">
              {(['front', 'back'] as const).map(v => (
                <button key={v} type="button" onClick={() => switchView(v)}
                  className={cn(
                    'px-4 py-1 rounded-md text-xs font-semibold transition-all duration-200',
                    view === v
                      ? 'bg-white text-teal-700 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  )}>
                  {v === 'front' ? '◈ Front' : '◉ Back'}
                </button>
              ))}
            </div>
          </div>

          {/* Two-column layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Left: SVG */}
            <div className="flex flex-col items-center">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mb-2">
                Tap region · {view === 'front' ? 'Anterior' : 'Posterior'} view
              </p>
              <div className="relative">
                <svg viewBox="0 0 130 310" className="w-28 sm:w-32 h-auto drop-shadow-sm select-none">
                  <defs>
                    <filter id="body-shadow">
                      <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#94a3b8" floodOpacity="0.25"/>
                    </filter>
                  </defs>
                  {/* Silhouette */}
                  <path
                    d="M65,8 C51,8 41,18 41,30 C41,42 51,52 65,52 C79,52 89,42 89,30 C89,18 79,8 65,8 Z
                       M57,52 L73,52 L72,68 L58,68 Z
                       M28,68 Q65,64 102,68 L100,180 Q65,186 30,180 L28,68 Z
                       M30,180 Q48,186 63,186 L60,286 Q42,286 28,276 L30,180 Z
                       M100,180 Q82,186 67,186 L70,286 Q88,286 102,276 L100,180 Z
                       M28,276 Q42,286 60,286 L60,298 L24,296 Z
                       M102,276 Q88,286 70,286 L72,298 L106,296 Z
                       M10,80 L5,100 L4,170 L12,172 L14,148 L16,98 L10,80 Z
                       M120,80 L125,100 L126,170 L118,172 L116,148 L114,98 L120,80 Z"
                    fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1.5" strokeLinejoin="round"
                  />
                  {/* Clickable regions */}
                  {REGIONS.map(r => (
                    <g key={r.id} onClick={() => setActive(active === r.id ? null : r.id)}
                      className="cursor-pointer" style={{ transition: 'opacity 0.1s' }}>
                      <path d={r.path} fill={regionFill(r.id)} stroke={regionStroke(r.id)}
                        strokeWidth={active === r.id ? 1.5 : 0.75} strokeLinejoin="round" opacity={0.9} />
                      {notes[r.id]?.trim() && active !== r.id && (
                        <circle cx={r.tx} cy={r.ty} r="3.5" fill="#0d9488" opacity={0.9} />
                      )}
                      {active === r.id && (
                        <circle cx={r.tx} cy={r.ty} r="3.5" fill="white" opacity={0.9} />
                      )}
                    </g>
                  ))}
                  {/* Front landmarks */}
                  {view === 'front' && <>
                    <circle cx="58" cy="27" r="2" fill="#94a3b8" opacity={0.5} />
                    <circle cx="72" cy="27" r="2" fill="#94a3b8" opacity={0.5} />
                    <circle cx="65" cy="33" r="1.2" fill="#94a3b8" opacity={0.4} />
                    <circle cx="65" cy="136" r="1.5" fill="#94a3b8" opacity={0.4} />
                    <line x1="58" y1="68" x2="36" y2="76" stroke="#cbd5e1" strokeWidth="0.8" />
                    <line x1="72" y1="68" x2="94" y2="76" stroke="#cbd5e1" strokeWidth="0.8" />
                    <line x1="65" y1="68" x2="65" y2="118" stroke="#e2e8f0" strokeWidth="0.8" strokeDasharray="3,3" />
                    <circle cx="46" cy="244" r="3" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="0.5" />
                    <circle cx="84" cy="244" r="3" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="0.5" />
                  </>}
                  {/* Back landmarks */}
                  {view === 'back' && <>
                    <line x1="65" y1="68" x2="65" y2="156" stroke="#e2e8f0" strokeWidth="0.8" strokeDasharray="3,3" />
                    <circle cx="50" cy="90" r="4" fill="none" stroke="#cbd5e1" strokeWidth="0.8" />
                    <circle cx="80" cy="90" r="4" fill="none" stroke="#cbd5e1" strokeWidth="0.8" />
                    <line x1="46" y1="244" x2="54" y2="252" stroke="#e2e8f0" strokeWidth="0.8" />
                    <line x1="84" y1="244" x2="76" y2="252" stroke="#e2e8f0" strokeWidth="0.8" />
                  </>}
                </svg>
              </div>
              {/* Filled region pills */}
              {filledRegions.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2 justify-center max-w-[130px]">
                  {filledRegions.map(r => (
                    <button key={r.id} type="button" onClick={() => setActive(r.id)}
                      className="text-[10px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full hover:bg-teal-200 transition-colors">
                      {r.shortLabel}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Notes + signs */}
            <div className="space-y-3 min-h-0">
              {/* Active region note */}
              {activeRegion && (
                <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 transition-all">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-teal-700">{activeRegion.label}</span>
                    <button type="button" onClick={() => setActive(null)}
                      className="p-0.5 rounded hover:bg-teal-100 text-teal-400">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <textarea autoFocus value={notes[activeRegion.id] ?? ''}
                    onChange={e => onChange(activeRegion.id, e.target.value)}
                    rows={3} className="input text-sm w-full resize-none"
                    placeholder={`Findings for ${activeRegion.shortLabel}…`} />
                </div>
              )}

              {/* Filled notes list */}
              {REGIONS.filter(r => r.id !== active && notes[r.id]?.trim()).map(r => (
                <div key={r.id} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                  <button type="button" onClick={() => setActive(r.id)} className="w-full flex items-start gap-2 text-left">
                    <span className="text-[10px] font-bold text-teal-600 uppercase flex-shrink-0 mt-0.5 min-w-[50px]">{r.shortLabel}</span>
                    <span className="text-xs text-slate-700 line-clamp-2">{notes[r.id]}</span>
                  </button>
                </div>
              ))}

              {/* Empty state */}
              {!activeRegion && REGIONS.filter(r => notes[r.id]?.trim()).length === 0 && (
                <div className="flex flex-col items-center justify-center py-6 text-slate-300">
                  <div className="text-3xl mb-2 select-none">☝</div>
                  <div className="text-xs text-slate-400">Tap any region on the diagram</div>
                </div>
              )}

              {/* Clinical signs */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 mt-1">
                  Clinical Signs (PIPCED+)
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {CLINICAL_CHECKS.map(c => {
                    const on = checks.includes(c);
                    return (
                      <button key={c} type="button" onClick={() => onCheckToggle(c)}
                        className={cn(
                          'text-xs px-2.5 py-1.5 rounded-lg border-2 font-medium transition-all text-left flex items-center gap-1.5',
                          on ? 'border-red-300 bg-red-50 text-red-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                        )}>
                        <span className={cn('w-2 h-2 rounded-full flex-shrink-0 transition-colors',
                          on ? 'bg-red-400' : 'bg-slate-200')} />
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

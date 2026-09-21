import { useState, useRef, useEffect, useCallback } from 'react';
import type { KeyboardEvent } from 'react';
import { DRUG_KB } from '@/data/drugKB';
import type { DrugKB } from '@/types';
import { api, isApiEnabled } from '@/lib/api';

interface Props {
  value: string;
  onChange: (val: string, drug?: DrugKB) => void;
  placeholder?: string;
  autoFocus?: boolean;
  currentForm?: string;
}

interface ApiDrug {
  name: string;
  generic_name: string;
  brand_names: string;
  form: string;
  category: string;
  default_dose: string;
  default_frequency: string;
  default_duration: string;
  default_instructions: string;
  common_for: string;
}

function apiDrugToKB(d: ApiDrug): DrugKB {
  return {
    id: `api_${d.name}`,
    name: d.name,
    genericName: d.generic_name || d.name,
    brandNames: d.brand_names ? d.brand_names.split(',').map(s => s.trim()) : [],
    category: d.category || '',
    defaultDose: d.default_dose || '',
    defaultRoute: '',
    defaultFrequency: d.default_frequency || '',
    defaultDuration: d.default_duration || '',
    defaultInstructions: d.default_instructions || '',
    commonFor: d.common_for ? d.common_for.split(',').map(s => s.trim()) : [],
    contraindications: [],
    interactions: [],
  };
}

export function DrugAutocomplete({ value, onChange, placeholder, autoFocus, currentForm }: Props) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [apiResults, setApiResults] = useState<DrugKB[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Local KB search (instant)
  const localResults = value.length >= 2
    ? DRUG_KB.filter(d =>
        d.name.toLowerCase().includes(value.toLowerCase()) ||
        d.genericName.toLowerCase().includes(value.toLowerCase()) ||
        d.brandNames.some(b => b.toLowerCase().includes(value.toLowerCase())) ||
        d.commonFor.some(c => c.toLowerCase().includes(value.toLowerCase()))
      ).slice(0, 10)
    : [];

  // Merge: local KB first, then API results not already in local
  const localNames = new Set(localResults.map(d => d.name.toLowerCase()));
  const merged = [
    ...localResults,
    ...apiResults.filter(d => !localNames.has(d.name.toLowerCase())),
  ].slice(0, 12);

  const fetchFromApi = useCallback(async (q: string) => {
    if (!isApiEnabled() || q.length < 2) { setApiResults([]); return; }
    try {
      const rows = await api.get<ApiDrug[]>(`/api/drugs?q=${encodeURIComponent(q)}`);
      setApiResults(rows.map(apiDrugToKB));
    } catch {
      // silently fail — local KB still works
    }
  }, []);

  useEffect(() => {
    setOpen(merged.length > 0 || value.length >= 2);
    setCursor(0);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length >= 2) {
      debounceRef.current = setTimeout(() => fetchFromApi(value), 350);
    } else {
      setApiResults([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const select = (drug: DrugKB) => {
    onChange(drug.name, drug);
    setOpen(false);
  };

  const saveNewDrug = async () => {
    if (!isApiEnabled() || value.trim().length < 2) return;
    const alreadyKnown = merged.some(d => d.name.toLowerCase() === value.trim().toLowerCase());
    if (alreadyKnown) return;
    try {
      await api.post('/api/drugs', {
        name: value.trim(),
        form: currentForm ?? '',
        genericName: '',
        category: '',
        defaultDose: '',
        defaultFrequency: '',
        defaultDuration: '',
        defaultInstructions: '',
        commonFor: '',
      });
    } catch {
      // silent — saving to DB is best-effort
    }
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, merged.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
    if (e.key === 'Enter')     { e.preventDefault(); if (merged[cursor]) select(merged[cursor]); else { setOpen(false); saveNewDrug(); } }
    if (e.key === 'Escape')    { setOpen(false); }
    if (e.key === 'Tab')       { if (merged[cursor]) { e.preventDefault(); select(merged[cursor]); } }
  };

  const isFromApi = (d: DrugKB) => d.id.startsWith('api_');

  return (
    <div style={{ position: 'relative', flex: 1 }}>
      <input
        ref={inputRef}
        className="rx-input"
        value={value}
        placeholder={placeholder ?? 'Drug name / generic / brand'}
        autoFocus={autoFocus}
        onChange={e => { onChange(e.target.value); }}
        onKeyDown={onKey}
        onFocus={() => merged.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => { setOpen(false); saveNewDrug(); }, 180)}
        autoComplete="off"
        style={{ width: '100%' }}
      />
      {open && merged.length > 0 && (
        <div className="ac-dropdown">
          {merged.map((d, i) => (
            <div
              key={d.id}
              className={`ac-item${i === cursor ? ' selected' : ''}`}
              onMouseDown={() => select(d)}
            >
              <span>
                <span style={{ fontWeight: 500 }}>{d.genericName}</span>
                {d.brandNames[0] && (
                  <span style={{ color: '#94a3b8', marginLeft: 6, fontSize: 11 }}>{d.brandNames[0]}</span>
                )}
                {isFromApi(d) && (
                  <span style={{ marginLeft: 6, fontSize: 10, color: '#0ea5e9', background: '#e0f2fe', borderRadius: 3, padding: '1px 4px' }}>saved</span>
                )}
              </span>
              {d.defaultDose && (
                <span className="ac-dose">{d.defaultDose}{d.defaultFrequency ? ` · ${d.defaultFrequency}` : ''}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

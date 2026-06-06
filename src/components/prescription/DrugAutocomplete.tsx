import { useState, useRef, useEffect } from 'react';
import type { KeyboardEvent } from 'react';
import { DRUG_KB } from '@/data/drugKB';
import type { DrugKB } from '@/types';

interface Props {
  value: string;
  onChange: (val: string, drug?: DrugKB) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function DrugAutocomplete({ value, onChange, placeholder, autoFocus }: Props) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = value.length >= 2
    ? DRUG_KB.filter(d =>
        d.name.toLowerCase().includes(value.toLowerCase()) ||
        d.genericName.toLowerCase().includes(value.toLowerCase()) ||
        d.brandNames.some(b => b.toLowerCase().includes(value.toLowerCase())) ||
        d.commonFor.some(c => c.toLowerCase().includes(value.toLowerCase()))
      ).slice(0, 12)
    : [];

  useEffect(() => {
    setOpen(filtered.length > 0);
    setCursor(0);
  }, [value]);

  const select = (drug: DrugKB) => {
    onChange(drug.name, drug);
    setOpen(false);
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
    if (e.key === 'Enter')     { e.preventDefault(); if (filtered[cursor]) select(filtered[cursor]); }
    if (e.key === 'Escape')    { setOpen(false); }
    if (e.key === 'Tab')       { if (filtered[cursor]) { e.preventDefault(); select(filtered[cursor]); } }
  };

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
        onFocus={() => filtered.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        autoComplete="off"
        style={{ width: '100%' }}
      />
      {open && (
        <div className="ac-dropdown">
          {filtered.map((d, i) => (
            <div
              key={d.id}
              className={`ac-item${i === cursor ? ' selected' : ''}`}
              onMouseDown={() => select(d)}
            >
              <span>
                <span style={{ fontWeight: 500 }}>{d.genericName}</span>
                <span style={{ color: '#94a3b8', marginLeft: 6, fontSize: 11 }}>{d.brandNames[0]}</span>
              </span>
              <span className="ac-dose">{d.defaultDose} · {d.defaultFrequency}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

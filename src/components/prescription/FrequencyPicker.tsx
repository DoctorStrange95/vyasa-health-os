const FREQS = ['OD', 'BD', 'TDS', 'QID', 'SOS', 'OD HS', 'OD AC', 'BD AC', 'TDS AC', 'Weekly', 'Stat'];

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export function FrequencyPicker({ value, onChange }: Props) {
  const isCustom = value && !FREQS.includes(value);
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center' }}>
      {FREQS.map(f => (
        <button
          key={f}
          type="button"
          onClick={() => onChange(f)}
          style={{
            padding: '2px 7px',
            borderRadius: 999,
            fontSize: 11,
            border: value === f ? '1.5px solid #0d9488' : '1px solid #e2e8f0',
            background: value === f ? '#f0fdfa' : 'white',
            color: value === f ? '#0f766e' : '#475569',
            cursor: 'pointer',
            fontWeight: value === f ? 600 : 400,
            lineHeight: '1.4',
          }}
        >
          {f}
        </button>
      ))}
      <input
        className="rx-input"
        style={{ width: 72, fontSize: 11 }}
        placeholder="custom"
        value={isCustom ? value : ''}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}

const DURATIONS = ['1 day', '3 days', '5 days', '7 days', '10 days', '14 days', '1 month', '3 months', 'Continued', 'SOS'];

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export function DurationPicker({ value, onChange }: Props) {
  const isCustom = value && !DURATIONS.includes(value);
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center' }}>
      {DURATIONS.map(d => (
        <button
          key={d}
          type="button"
          onClick={() => onChange(d)}
          style={{
            padding: '2px 7px',
            borderRadius: 999,
            fontSize: 11,
            border: value === d ? '1.5px solid #0d9488' : '1px solid #e2e8f0',
            background: value === d ? '#f0fdfa' : 'white',
            color: value === d ? '#0f766e' : '#475569',
            cursor: 'pointer',
            fontWeight: value === d ? 600 : 400,
            lineHeight: '1.4',
          }}
        >
          {d}
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

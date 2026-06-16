import { useRef, useState, useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { api } from '@/lib/api';
import { Printer, Send, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const THEME_COLORS: Record<string, string> = {
  teal: '#14b8a6', blue: '#3b82f6', green: '#10b981', purple: '#a855f7', rose: '#f43f5e', slate: '#64748b',
};

interface PrintSections {
  complaint: boolean;
  diagnosis: boolean;
  rx: boolean;
  investigation: boolean;
  advice: boolean;
  followup: boolean;
  vitalsRow: boolean;
  hopi: boolean;
}

interface ConsultDraft {
  chiefComplaint: string;
  hopi: string;
  diagnosis: string;
  icdCode: string;
  secondaryDx: string;
  rxRows: Array<{ id: string; form: string; drug: string; dose: string; strength: string; puffs: string; route: string; frequency: string; duration: string; instructions: string }>;
  vitals: { bp: string; hr: string; temp: string; spo2: string; weight: string; height: string; rr: string };
  investigation: string;
  advice: string;
  followUp: string;
  referredTo: string;
}

interface PrintPreviewProps {
  patient: any;
  draft: ConsultDraft;
  pad: any;
  clinicName?: string;
  clinicAddress?: string;
  clinicPhone?: string;
  onClose: () => void;
  onWhatsApp?: () => void;
}

export function PrintPreview({ patient, draft, pad, clinicName, clinicAddress, clinicPhone, onClose, onWhatsApp }: PrintPreviewProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const theme = THEME_COLORS[pad.theme] ?? THEME_COLORS.teal;
  const patientAge = typeof patient.age === 'number' ? patient.age : '';
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const [ps, setPs] = useState<PrintSections>({
    complaint: true,
    diagnosis: true,
    rx: true,
    investigation: true,
    advice: true,
    followup: true,
    vitalsRow: true,
    hopi: false,
  });

  function togglePs(key: keyof PrintSections) {
    setPs(s => ({ ...s, [key]: !s[key] }));
  }

  const SECTION_LABELS: { key: keyof PrintSections; label: string }[] = [
    { key: 'complaint', label: 'C/C' },
    { key: 'hopi', label: 'History' },
    { key: 'diagnosis', label: 'Diagnosis' },
    { key: 'rx', label: 'Rx' },
    { key: 'investigation', label: 'Investigations' },
    { key: 'advice', label: 'Advice' },
    { key: 'followup', label: 'Follow-up' },
    { key: 'vitalsRow', label: 'Vitals Row' },
  ];

  // Build a fully self-contained HTML doc with INLINE styles so it prints
  // identically on mobile + desktop (matches the on-screen preview exactly).
  function buildPrintHtml(): string {
    const esc = (s: any) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const activeDrugs = draft.rxRows.filter(r => r.drug.trim());

    // Left column (doctor)
    const left = `
      <div style="flex:1;">
        <div style="color:${theme};font-size:22px;font-weight:bold;line-height:1.1;">${esc(doctorDisplayName)}</div>
        ${pad.degrees ? `<div style="color:#475569;font-size:12px;margin-top:2px;">${esc(pad.degrees)}</div>` : ''}
        ${pad.specialty ? `<div style="color:#475569;font-size:12px;font-weight:600;">${esc(pad.specialty)}</div>` : ''}
        ${pad.regNumber ? `<div style="color:#94a3b8;font-size:12px;">Reg: ${esc(pad.regNumber)}</div>` : ''}
        ${pad.showQuote && pad.quote ? `<div style="color:${theme};font-style:italic;font-size:11px;margin-top:4px;">"${esc(pad.quote)}"</div>` : ''}
      </div>`;

    // Right column (clinic)
    const cName = clinicName || pad.clinicName;
    const cAddr = clinicAddress || pad.address;
    const cPhone = clinicPhone || pad.phone;
    const right = `
      <div style="text-align:right;font-size:12px;color:#475569;">
        ${cName ? `<div style="font-weight:700;color:#334155;">${esc(cName)}</div>` : ''}
        ${cAddr ? `<div>${esc(cAddr)}</div>` : ''}
        ${cPhone ? `<div>📞 ${esc(cPhone)}</div>` : ''}
        ${pad.email ? `<div>✉ ${esc(pad.email)}</div>` : ''}
        ${pad.showTimings && pad.timings ? `<div>⏰ ${esc(pad.timings)}</div>` : ''}
      </div>`;

    // Patient row cells
    const cell = (label: string, val: string) =>
      `<div style="font-size:12px;"><span style="color:#94a3b8;">${label}: </span><span style="font-weight:600;color:#0f172a;">${esc(val)}</span></div>`;
    const ptCells = [
      cell('Patient', patient.name),
      cell('Age/Sex', `${patientAge}Y/${patient.gender}`),
      cell('Date', today),
      patient.mrn ? cell('MRN', patient.mrn) : '',
      ps.vitalsRow && draft.vitals.bp ? cell('BP', draft.vitals.bp) : '',
      ps.vitalsRow && draft.vitals.weight ? cell('Wt', `${draft.vitals.weight}kg`) : '',
      ps.vitalsRow && draft.vitals.hr ? cell('HR', `${draft.vitals.hr} bpm`) : '',
      ps.vitalsRow && draft.vitals.spo2 ? cell('SpO2', `${draft.vitals.spo2}%`) : '',
    ].filter(Boolean).join('');

    const sectionTitle = (t: string) =>
      `<div style="color:${theme};font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:0.05em;margin:14px 0 4px;">${t}</div>`;

    let body = '';
    if (ps.complaint && draft.chiefComplaint) body += sectionTitle('C/C') + `<div style="font-size:13px;">${esc(draft.chiefComplaint)}</div>`;
    if (ps.hopi && draft.hopi) body += sectionTitle('History') + `<div style="font-size:13px;">${esc(draft.hopi)}</div>`;
    if (ps.diagnosis && draft.diagnosis) {
      body += sectionTitle('Diagnosis') + `<div style="font-size:13px;font-weight:500;">${esc(draft.diagnosis)}${draft.icdCode ? ` (${esc(draft.icdCode)})` : ''}</div>`;
      if (draft.secondaryDx) body += `<div style="font-size:12px;color:#475569;">${esc(draft.secondaryDx)}</div>`;
    }
    if (ps.rx && activeDrugs.length) {
      body += `<div style="color:${theme};font-size:24px;font-weight:bold;margin:14px 0 6px;">℞</div>`;
      activeDrugs.forEach((r, i) => {
        const formLabel = r.form && r.form !== 'Tab' ? `${r.form}. ` : 'Tab. ';
        const detail = [
          r.form === 'MDI' && r.puffs ? r.puffs : '',
          r.route && r.form !== 'MDI' && r.form !== 'Cream' ? r.route : '',
          r.frequency, r.duration, r.instructions,
        ].filter(Boolean).map(esc).join(' · ');
        body += `
          <div style="margin-bottom:10px;">
            <div style="font-weight:600;font-size:13px;">${i + 1}. ${esc(formLabel)}${esc(r.drug)}${r.dose ? ` ${esc(r.dose)}` : ''}${r.strength ? ` (${esc(r.strength)})` : ''}</div>
            <div style="font-size:12px;color:#475569;padding-left:16px;">${detail}</div>
          </div>`;
      });
    }
    if (ps.investigation && draft.investigation) body += sectionTitle('Investigations') + `<div style="font-size:13px;">${esc(draft.investigation)}</div>`;
    if (ps.advice && draft.advice) body += sectionTitle('Advice') + `<div style="font-size:13px;">${esc(draft.advice)}</div>`;
    if (ps.followup && draft.followUp && draft.followUp !== 'No follow-up') {
      body += sectionTitle('Follow-up') + `<div style="font-size:13px;">After <strong>${esc(draft.followUp)}</strong>${draft.referredTo ? ` · Refer to: ${esc(draft.referredTo)}` : ''}</div>`;
    }
    (pad.customFields ?? []).forEach((cf: any) => {
      if (cf.label) body += `<div style="margin:6px 0;font-size:13px;"><span style="font-weight:700;color:#64748b;text-transform:uppercase;font-size:11px;">${esc(cf.label)}: </span>${esc(cf.value)}</div>`;
    });

    const signature = `
      <div style="margin-top:48px;display:flex;justify-content:flex-end;">
        <div style="text-align:center;border-top:1px solid #475569;padding-top:4px;min-width:160px;font-size:12px;color:#475569;">
          ${esc(doctorDisplayName)}<br/>
          ${pad.degrees ? `<span style="color:#94a3b8;">${esc(pad.degrees)}</span>` : ''}
        </div>
      </div>`;

    const footer = pad.footerNote
      ? `<div style="margin-top:16px;padding-top:8px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;text-align:center;">${esc(pad.footerNote)}</div>`
      : '';

    const qrHtml = bookingUrl
      ? `<div style="text-align:center;">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(bookingUrl)}&bgcolor=ffffff&color=0a1628&margin=2" width="44" height="44" alt="Scan to book" style="border-radius:4px;border:1px solid #e2e8f0;" />
          <div style="font-size:8px;color:#94a3b8;margin-top:2px;">Scan to Book</div>
         </div>`
      : '';

    // Fixed header/footer repeat on every printed page via position:fixed inside iframe
    const printHeader = `
      <div id="phdr" style="position:fixed;top:0;left:0;right:0;background:#fff;padding:10px 20px 8px;border-bottom:3px solid ${theme};display:flex;align-items:flex-start;justify-content:space-between;gap:16px;">
        ${left}${right}
      </div>`;
    const printFooter = `
      <div id="pftr" style="position:fixed;bottom:0;left:0;right:0;background:#fff;border-top:1px solid #e2e8f0;padding:6px 20px;display:flex;align-items:center;justify-content:space-between;gap:8px;">
        ${qrHtml}
        <div style="flex:1;display:flex;align-items:center;justify-content:flex-end;gap:6px;">
          <img src="${window.location.origin}/logos/vyasa-logo.svg" width="14" height="14" alt="Vyasa" style="display:inline-block;vertical-align:middle;border-radius:3px;" />
          <span style="font-size:9px;color:#94a3b8;letter-spacing:0.04em;">Powered by <strong style="color:#64748b;">Vyasa Integrated Healthcare</strong></span>
        </div>
      </div>`;

    return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Prescription</title>
      <style>
        @page { size: A4; margin: 0; }
        * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 0; padding: 110px 24px 70px; }
        #phdr, #pftr { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      </style></head>
      <body>
        ${printHeader}
        ${printFooter}
        <div style="display:flex;flex-wrap:wrap;gap:8px 24px;background:#f1f5f9;border-radius:6px;padding:10px 14px;margin-bottom:12px;">
          ${ptCells}
        </div>
        ${body}
        ${signature}
        ${footer}
      </body></html>`;
  }

  function doPrint() {
    const html = buildPrintHtml();
    // Use a hidden iframe so it works on mobile Safari (no popup blocking) and desktop.
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) { document.body.removeChild(iframe); return; }
    doc.open();
    doc.write(html);
    doc.close();
    const win = iframe.contentWindow!;
    const cleanup = () => { setTimeout(() => { try { document.body.removeChild(iframe); } catch {} }, 1000); };
    setTimeout(() => {
      win.focus();
      win.print();
      cleanup();
    }, 350);
  }

  const doctorDisplayName = pad.doctorName || 'Dr. ';

  const user = useAuthStore(s => s.user);
  const [bookingUrl, setBookingUrl] = useState('');
  useEffect(() => {
    api.get<{ profile_slug?: string }>('/auth/me/public-profile').then(p => {
      const slug = p?.profile_slug
        ?? (user?.name ?? '').toLowerCase().replace(/^dr\.?\s+/i, '').replace(/[^a-z0-9\s]/g, '').trim().replace(/\s+/g, '-');
      if (!slug) return;
      const base = window.location.hostname === 'localhost'
        ? `${window.location.protocol}//${window.location.host}`
        : 'https://vyasaa.com';
      setBookingUrl(`${base}/dr/${slug}`);
    }).catch(() => {});
  }, [user?.name]);
  const qrSrc = bookingUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(bookingUrl)}&bgcolor=ffffff&color=0a1628&margin=2`
    : '';

  return (
    <div className="rx-print-modal fixed inset-0 z-50 flex bg-black/60" onClick={onClose}>
      <div className="ml-auto w-full max-w-2xl bg-white h-full overflow-y-auto shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}>
        {/* Preview toolbar */}
        <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between z-10">
          <span className="font-semibold text-slate-800">Prescription Preview</span>
          <div className="flex items-center gap-2">
            <button onClick={doPrint} className="btn-primary btn-sm">
              <Printer className="w-3.5 h-3.5" /> Print / PDF
            </button>
            {onWhatsApp && (
              <button onClick={() => { onClose(); onWhatsApp(); }} className="btn-secondary btn-sm text-emerald-700 border-emerald-300 hover:bg-emerald-50">
                <Send className="w-3.5 h-3.5" /> WhatsApp
              </button>
            )}
            <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Section toggles */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mr-1">Print sections:</span>
            {SECTION_LABELS.map(({ key, label }) => (
              <button key={key} type="button" onClick={() => togglePs(key)}
                className={cn('text-xs px-2.5 py-1 rounded-full border font-medium transition-all',
                  ps[key]
                    ? 'bg-teal-500 border-teal-500 text-white'
                    : 'bg-white border-slate-300 text-slate-400 line-through')}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* A5 paper preview */}
        <div className="flex-1 p-4 bg-slate-100 overflow-y-auto">
          <div ref={printRef} className="bg-white mx-auto shadow-xl p-6 max-w-lg"
            style={{ minHeight: '700px', fontSize: '13px', fontFamily: 'Arial, sans-serif' }}>

            {/* Pad header */}
            <div className="pad-header pb-3 mb-3" style={{ borderBottom: `3px solid ${theme}` }}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="pad-name" style={{ color: theme, fontSize: '20px', fontWeight: 'bold' }}>
                    {doctorDisplayName}
                  </div>
                  {pad.degrees && <div className="text-slate-600 text-xs">{pad.degrees}</div>}
                  {pad.specialty && <div className="text-slate-600 text-xs font-medium">{pad.specialty}</div>}
                  {pad.regNumber && <div className="text-slate-400 text-xs">Reg: {pad.regNumber}</div>}
                  {pad.showQuote && pad.quote && <div className="italic text-xs mt-1" style={{ color: theme }}>"{pad.quote}"</div>}
                </div>
                <div className="text-right text-xs text-slate-500">
                  {(clinicName || pad.clinicName) && <div className="font-semibold text-slate-700">{clinicName || pad.clinicName}</div>}
                  {(clinicAddress || pad.address) && <div>{clinicAddress || pad.address}</div>}
                  {(clinicPhone || pad.phone) && <div>📞 {clinicPhone || pad.phone}</div>}
                  {pad.email && <div>✉ {pad.email}</div>}
                  {pad.showTimings && pad.timings && <div>⏰ {pad.timings}</div>}
                </div>
              </div>
            </div>

            {/* Patient row */}
            <div className="grid grid-cols-3 gap-2 bg-slate-50 rounded px-3 py-2 text-xs mb-3">
              <div><span className="text-slate-400">Patient: </span><span className="font-semibold">{patient.name}</span></div>
              <div><span className="text-slate-400">Age/Sex: </span><span className="font-semibold">{patientAge}Y/{patient.gender}</span></div>
              <div><span className="text-slate-400">Date: </span><span className="font-semibold">{today}</span></div>
              {patient.mrn && <div><span className="text-slate-400">MRN: </span><span className="font-semibold">{patient.mrn}</span></div>}
              {ps.vitalsRow && draft.vitals.bp && <div><span className="text-slate-400">BP: </span><span className="font-semibold">{draft.vitals.bp}</span></div>}
              {ps.vitalsRow && draft.vitals.weight && <div><span className="text-slate-400">Wt: </span><span className="font-semibold">{draft.vitals.weight}kg</span></div>}
              {ps.vitalsRow && draft.vitals.hr && <div><span className="text-slate-400">HR: </span><span className="font-semibold">{draft.vitals.hr} bpm</span></div>}
              {ps.vitalsRow && draft.vitals.spo2 && <div><span className="text-slate-400">SpO2: </span><span className="font-semibold">{draft.vitals.spo2}%</span></div>}
            </div>

            {/* Complaint */}
            {ps.complaint && draft.chiefComplaint && (
              <div className="mb-2">
                <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: theme }}>C/C</div>
                <div className="text-sm">{draft.chiefComplaint}</div>
              </div>
            )}

            {/* History / HOPI */}
            {ps.hopi && draft.hopi && (
              <div className="mb-2">
                <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: theme }}>History</div>
                <div className="text-sm">{draft.hopi}</div>
              </div>
            )}

            {/* Diagnosis */}
            {ps.diagnosis && draft.diagnosis && (
              <div className="mb-3">
                <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: theme }}>Diagnosis</div>
                <div className="text-sm font-medium">{draft.diagnosis} {draft.icdCode && `(${draft.icdCode})`}</div>
                {draft.secondaryDx && <div className="text-xs text-slate-600 mt-0.5">{draft.secondaryDx}</div>}
              </div>
            )}

            {/* Rx */}
            {ps.rx && draft.rxRows.some(r => r.drug.trim()) && (
              <div className="mb-3">
                <div className="text-xl font-bold mb-2" style={{ color: theme }}>℞</div>
                {draft.rxRows.filter(r => r.drug.trim()).map((r, i) => (
                  <div key={r.id} className="mb-2.5">
                    <div className="font-semibold text-sm">
                      {i + 1}. {r.form && r.form !== 'Tab' ? `${r.form}. ` : 'Tab. '}{r.drug}
                      {r.dose && ` ${r.dose}`}
                      {r.strength && ` (${r.strength})`}
                    </div>
                    <div className="text-xs text-slate-600 pl-4">
                      {r.form === 'MDI' && r.puffs ? `${r.puffs} · ` : ''}
                      {r.route && r.form !== 'MDI' && r.form !== 'Cream' ? `${r.route} · ` : ''}
                      {r.frequency} · {r.duration}
                      {r.instructions && <> · {r.instructions}</>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Investigations */}
            {ps.investigation && draft.investigation && (
              <div className="mb-3">
                <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: theme }}>Investigations</div>
                <div className="text-sm">{draft.investigation}</div>
              </div>
            )}

            {/* Advice */}
            {ps.advice && draft.advice && (
              <div className="mb-3">
                <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: theme }}>Advice</div>
                <div className="text-sm">{draft.advice}</div>
              </div>
            )}

            {/* Follow-up */}
            {ps.followup && draft.followUp && draft.followUp !== 'No follow-up' && (
              <div className="mb-4">
                <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: theme }}>Follow-up</div>
                <div className="text-sm">After <strong>{draft.followUp}</strong>
                  {draft.referredTo && <> · Refer to: {draft.referredTo}</>}
                </div>
              </div>
            )}

            {/* Custom fields */}
            {pad.customFields?.map((cf: any) => cf.label && (
              <div key={cf.label} className="mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase">{cf.label}: </span>
                <span className="text-sm">{cf.value}</span>
              </div>
            ))}

            {/* Signature */}
            <div className="mt-8 flex justify-end">
              <div className="text-center">
                <div className="w-36 border-t border-slate-400 pt-1 text-xs text-slate-500">
                  {doctorDisplayName}<br />
                  {pad.degrees && <span className="text-slate-400">{pad.degrees}</span>}
                </div>
              </div>
            </div>

            {/* Footer note (user-editable) */}
            {pad.footerNote && (
              <div className="mt-4 pt-2 border-t border-slate-200 text-xs text-slate-400 text-center">
                {pad.footerNote}
              </div>
            )}

            {/* Fixed Vyasa branding — always visible, non-removable */}
            <div className="mt-5 pt-2 border-t border-slate-200 flex items-center justify-between gap-2">
              {bookingUrl && (
                <div className="flex flex-col items-center">
                  <img src={qrSrc} width={44} height={44} alt="Scan to book" className="rounded border border-slate-200" />
                  <span className="text-[8px] text-slate-400 mt-0.5">Scan to Book</span>
                </div>
              )}
              <div className="flex-1 flex items-center justify-end gap-1.5">
                <img src="/logos/vyasa-logo.svg" width={14} height={14} alt="Vyasa" className="rounded-sm" />
                <span className="text-[9px] text-slate-400 tracking-wide">
                  Powered by <strong className="text-slate-500">Vyasa Integrated Healthcare</strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useRef, useState, useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { usePadStore } from '@/store/usePadStore';
import { api, trackEvent } from '@/lib/api';
import { Printer, Send, X, ChevronDown, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VaccineEntry, ProcedureEntry } from '@/types';

const THEME_COLORS: Record<string, string> = {
  teal: '#0d9488', navy: '#0a1628', maroon: '#7f1d1d', dark: '#1e293b',
};

interface PrintSections {
  complaint: boolean;
  hopi: boolean;
  vitalsRow: boolean;
  specialtyExam: boolean;
  diagnosis: boolean;
  rx: boolean;
  investigation: boolean;
  advice: boolean;
  followup: boolean;
  vaccines: boolean;
  procedures: boolean;
  referral: boolean;
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
  // Optional — present from the live consult; may be absent when printing an old visit.
  generalExam?: string;
  systemicExam?: string;
  bodyNotes?: Record<string, string>;
  bodySigns?: string[];
  comorbidities?: string[];
  pastMedical?: string;
  pastSurgical?: string;
  familyHistory?: string;
  socialHistory?: string;
  allergiesNote?: string;
  currentMeds?: string;
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
  onEndConsult?: () => void;
  specialtyExam?: Record<string, string>;
  doctorSpecialty?: string;
  vaccines?: VaccineEntry[];
  procedures?: ProcedureEntry[];
}

// Strip stale form prefixes so drug name never double-prints (e.g. "Syr. Tab. Metronidazole" → "Syr. Metronidazole")
const cleanDrug = (name: string) =>
  name.replace(/^(tab\.?|cap\.?|syr\.?|syrup|mdi\.?|drops?\.?|cream\.?|inj\.?|injection\.?|sachet\.?)\s+/i, '').trim();

// Strip embedded concentration (e.g. "Amoxicillin 228.5mg/5ml" → "Amoxicillin") so (strength) doesn't duplicate it
const CONC_RE = /\s*\d+(?:\.\d+)?\s*(?:mg|mcg|IU|g)\s*\/\s*\d+(?:\.\d+)?\s*(?:mL|ml|L|g)\b/gi;
const stripConc = (name: string) => name.replace(CONC_RE, '').replace(/\s+/g, ' ').trim();

export function PrintPreview({ patient, draft, pad, clinicName, clinicAddress, clinicPhone, onClose, onWhatsApp, onEndConsult, specialtyExam: _specialtyExam, vaccines: _vaccines = [], procedures: _procedures = [] }: PrintPreviewProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const { eSignUrl } = usePadStore();
  const theme = THEME_COLORS[pad.theme] ?? THEME_COLORS.teal;
  const patientAge = typeof patient.age === 'number' ? patient.age : '';
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const _wKg = parseFloat(draft.vitals.weight || '');
  const _hCm = parseFloat(draft.vitals.height || '');
  const bmiVal = _wKg > 0 && _hCm > 0 ? (_wKg / ((_hCm / 100) ** 2)).toFixed(1) : '';

  const [ps, setPs] = useState<PrintSections>({
    complaint: true,
    hopi: false,
    vitalsRow: true,
    specialtyExam: true,
    diagnosis: true,
    rx: true,
    investigation: true,
    advice: true,
    followup: true,
    vaccines: true,
    procedures: true,
    referral: true,
  });
  const [sectionsOpen, setSectionsOpen] = useState(false);

  function togglePs(key: keyof PrintSections) {
    setPs(s => ({ ...s, [key]: !s[key] }));
  }

  const SECTION_LABELS: { key: keyof PrintSections; label: string }[] = [
    { key: 'complaint', label: 'Chief Complaint' },
    { key: 'hopi', label: 'History (HOPI)' },
    { key: 'vitalsRow', label: 'Vitals Row' },
    { key: 'specialtyExam', label: 'Examination' },
    { key: 'diagnosis', label: 'Diagnosis' },
    { key: 'rx', label: 'Prescription (Rx)' },
    { key: 'investigation', label: 'Investigations' },
    { key: 'advice', label: 'Advice' },
    { key: 'followup', label: 'Follow-up' },
    { key: 'vaccines', label: 'Vaccines Given' },
    { key: 'procedures', label: 'Procedures Done' },
    { key: 'referral', label: 'Referral' },
  ];

  // Build a fully self-contained HTML doc with INLINE styles so it prints
  // identically on mobile + desktop (matches the on-screen preview exactly).
  function buildPrintHtml(): string {
    const esc = (s: any) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const activeDrugs = draft.rxRows.filter(r => r.drug.trim());

    const doctorName = pad.doctorName || 'Doctor';
    const cName  = clinicName  || pad.clinicName  || '';
    const cAddr  = clinicAddress || pad.address   || '';
    const cPhone = clinicPhone  || pad.phone      || '';
    const logoUrl  = (pad as { logoUrl?: string }).logoUrl  || '';
    const stampUrl = (pad as { stampUrl?: string }).stampUrl || '';

    // ── HEADER ─────────────────────────────────────────────────────────────
    const rxBadge = logoUrl
      ? `<div style="width:52px;height:52px;flex-shrink:0;display:flex;align-items:center;justify-content:center;">
           <img src="${esc(logoUrl)}" alt="Logo" style="max-width:52px;max-height:52px;object-fit:contain;border-radius:6px;" />
         </div>`
      : `<div style="width:44px;height:44px;background:#f59e0b;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
           <span style="color:white;font-size:22px;font-weight:900;font-family:serif;line-height:1;">℞</span>
         </div>`;

    const doctorBlock = `
      <div style="flex:1;min-width:0;padding-left:12px;">
        <div style="font-size:16px;font-weight:800;color:#0f172a;">${esc(doctorName)}</div>
        ${pad.specialty || pad.degrees ? `<div style="font-size:12px;color:#475569;margin-top:1px;">${[pad.specialty,pad.degrees].filter(Boolean).map(esc).join(', ')}</div>` : ''}
        ${pad.regNumber ? `<div style="font-size:12px;color:#475569;margin-top:1px;">Reg. No: ${esc(pad.regNumber)}</div>` : ''}
      </div>`;

    const qrBlock = qrSrc
      ? `<div style="text-align:center;flex-shrink:0;">
           <img src="${esc(qrSrc)}" width="60" height="60" alt="QR" style="border-radius:4px;border:1px solid #e2e8f0;display:block;" />
           <div style="font-size:8px;color:#94a3b8;margin-top:2px;">Know your doctor</div>
         </div>`
      : '';

    const headerHtml = `
      <div style="display:flex;align-items:center;gap:0;padding:12px 20px 10px;border-bottom:2px solid #e2e8f0;">
        ${rxBadge}
        ${doctorBlock}
        ${qrBlock}
      </div>`;

    // ── PATIENT INFO ────────────────────────────────────────────────────────
    const dateStr = new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
    const ptName = esc(patient.name || '');
    const ptAgeGender = [patientAge ? `${patientAge} Yrs` : '', patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : patient.gender || ''].filter(Boolean).join(', ');
    const allergies = esc(draft.allergiesNote || patient.allergies?.join(', ') || 'None');
    const currentMeds = esc(draft.currentMeds || 'None');

    const patientHtml = `
      <div style="padding:12px 20px 8px;display:flex;justify-content:space-between;align-items:flex-start;">
        <div>
          <div style="font-size:14px;font-weight:700;color:#0f172a;">${ptName}</div>
          <div style="font-size:12px;color:#64748b;margin-top:1px;">${esc(ptAgeGender)}</div>
          <div style="font-size:12px;color:#475569;margin-top:8px;"><strong>Drug Allergies</strong> • ${allergies}</div>
          <div style="font-size:12px;color:#475569;margin-top:2px;"><strong>Ongoing Medication</strong> • ${currentMeds}</div>
        </div>
        <div style="text-align:right;font-size:12px;color:#475569;">
          <strong>Date : ${esc(dateStr)}</strong>
          ${patient.mrn ? `<div style="color:#94a3b8;font-size:11px;margin-top:2px;">MRN: ${esc(patient.mrn)}</div>` : ''}
        </div>
      </div>
      <div style="border-top:1px solid #e2e8f0;margin:0 20px;"></div>`;

    // ── VITALS ──────────────────────────────────────────────────────────────
    const vitalsItems = [
      ps.vitalsRow && draft.vitals.bp     ? `BP: <b>${esc(draft.vitals.bp)}</b>` : '',
      ps.vitalsRow && draft.vitals.hr     ? `Pulse: <b>${esc(draft.vitals.hr)}/min</b>` : '',
      ps.vitalsRow && draft.vitals.temp   ? `Temp: <b>${esc(draft.vitals.temp)}°C</b>` : '',
      ps.vitalsRow && draft.vitals.spo2   ? `SpO₂: <b>${esc(draft.vitals.spo2)}%</b>` : '',
      ps.vitalsRow && draft.vitals.weight ? `Wt: <b>${esc(draft.vitals.weight)} kg</b>` : '',
      ps.vitalsRow && bmiVal              ? `BMI: <b>${esc(bmiVal)}</b>` : '',
    ].filter(Boolean);
    const vitalsHtml = vitalsItems.length ? `
      <div style="padding:8px 20px;font-size:12px;color:#475569;display:flex;flex-wrap:wrap;gap:12px;background:#f8fafc;">
        ${vitalsItems.join(' &nbsp;·&nbsp; ')}
      </div>
      <div style="border-top:1px solid #e2e8f0;margin:0 20px;"></div>` : '';

    // ── COMPLAINTS + DIAGNOSIS (2-col) ──────────────────────────────────────
    const complaintHtml = (ps.complaint && draft.chiefComplaint) ? `
      <div style="padding:12px 20px 0;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
          <div>
            <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:6px;">Chief Complaints</div>
            ${draft.chiefComplaint.split(/\n|,/).map(c => c.trim()).filter(Boolean).map(c =>
              `<div style="font-size:12px;color:#374151;margin-bottom:3px;">${esc(c)}</div>`
            ).join('')}
            ${draft.hopi ? `<div style="font-size:12px;color:#64748b;margin-top:4px;">${esc(draft.hopi)}</div>` : ''}
          </div>
          ${(ps.diagnosis && draft.diagnosis) ? `
          <div>
            <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:6px;">Provisional Diagnosis</div>
            <div style="font-size:12px;color:#374151;">${esc(draft.diagnosis)}${draft.icdCode ? ` (${esc(draft.icdCode)})` : ''}</div>
            ${draft.secondaryDx ? `<div style="font-size:12px;color:#64748b;margin-top:2px;">${esc(draft.secondaryDx)}</div>` : ''}
          </div>` : ''}
        </div>
      </div>
      <div style="border-top:1px solid #e2e8f0;margin:12px 20px 0;"></div>` : '';

    // ── MEDICATION TABLE ────────────────────────────────────────────────────
    const rxHtml = (ps.rx && activeDrugs.length > 0) ? (() => {
      const rows = activeDrugs.map((r, i) => {
        const formLabel = r.form && r.form !== 'Tab' ? `${r.form}. ` : '';
        const drugName = `${formLabel}${stripConc(cleanDrug(r.drug))}${r.dose ? ` ${r.dose}` : ''}${r.strength ? ` (${r.strength})` : ''}`;
        const timing = r.frequency || '';
        const durationStr = r.duration ? r.duration.replace(/\s*(day|days|d)\s*/i, ' day(s)') : '';
        const dosage = [r.route !== 'Oral' && r.route ? r.route : '', r.instructions].filter(Boolean).join(' · ');
        return `
          <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:8px 8px 8px 0;font-size:12px;color:#64748b;width:40px;">${i + 1}</td>
            <td style="padding:8px 8px 8px 0;font-size:13px;">
              <div style="font-weight:600;color:#0f172a;">${esc(drugName)}</div>
            </td>
            <td style="padding:8px 8px 8px 0;font-size:12px;color:#374151;">${esc(timing)}</td>
            <td style="padding:8px 8px 8px 0;font-size:12px;color:#374151;">${esc(durationStr)}</td>
            <td style="padding:8px 0 8px 0;font-size:12px;color:#374151;">${esc(dosage)}</td>
          </tr>`;
      }).join('');
      return `
        <div style="padding:14px 20px 0;">
          <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:8px;">Medication Advised</div>
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="border-bottom:1.5px solid #e2e8f0;background:#f8fafc;">
                <th style="text-align:left;padding:6px 8px 6px 0;font-size:11px;font-weight:600;color:#64748b;width:40px;">S.No.</th>
                <th style="text-align:left;padding:6px 8px 6px 0;font-size:11px;font-weight:600;color:#64748b;">Medicine name</th>
                <th style="text-align:left;padding:6px 8px 6px 0;font-size:11px;font-weight:600;color:#64748b;">Timing</th>
                <th style="text-align:left;padding:6px 8px 6px 0;font-size:11px;font-weight:600;color:#64748b;">Duration</th>
                <th style="text-align:left;padding:6px 0 6px 0;font-size:11px;font-weight:600;color:#64748b;">Dosage</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <div style="padding:8px 20px 0;font-size:12px;color:#475569;">
          <strong>Substitution Instruction</strong><br/>Apply the generic equivalent wherever applicable
        </div>
        <div style="border-top:1px solid #e2e8f0;margin:12px 20px 0;"></div>`;
    })() : '';

    // ── INVESTIGATIONS + ADVICE + FOLLOW-UP ─────────────────────────────────
    let extraBody = '';
    if (ps.investigation && draft.investigation) {
      extraBody += `<div style="padding:8px 20px 0;"><div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:4px;">Investigations Advised</div><div style="font-size:12px;color:#374151;">${esc(draft.investigation)}</div></div>`;
    }
    if (ps.advice && draft.advice) {
      extraBody += `<div style="padding:8px 20px 0;"><div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:4px;">Advice</div><div style="font-size:12px;color:#374151;">${esc(draft.advice)}</div></div>`;
    }
    if (ps.followup && draft.followUp && draft.followUp !== 'No follow-up') {
      extraBody += `<div style="padding:8px 20px 0;"><div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:4px;">Follow-up</div><div style="font-size:12px;color:#374151;">After <strong>${esc(draft.followUp)}</strong></div></div>`;
    }
    if (ps.referral && draft.referredTo) {
      extraBody += `<div style="padding:8px 20px 0;"><div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:4px;">Referral</div><div style="font-size:12px;color:#374151;">Referred to: <strong>${esc(draft.referredTo)}</strong></div></div>`;
    }
    if (extraBody) extraBody += `<div style="border-top:1px solid #e2e8f0;margin:12px 20px 0;"></div>`;

    // ── SIGNATURE BLOCK ─────────────────────────────────────────────────────
    const signatureHtml = `
      <div style="padding:16px 20px 8px;">
        ${eSignUrl ? `<img src="${esc(eSignUrl)}" alt="Signature" style="max-height:48px;max-width:140px;object-fit:contain;display:block;margin-bottom:6px;" />` : '<div style="height:48px;"></div>'}
        <div style="font-size:13px;font-weight:700;color:#0f172a;">${esc(doctorName)}</div>
        ${pad.specialty || pad.degrees ? `<div style="font-size:12px;color:#475569;">${[pad.specialty,pad.degrees].filter(Boolean).map(esc).join(', ')}</div>` : ''}
        ${pad.regNumber ? `<div style="font-size:12px;color:#475569;">Reg. No: ${esc(pad.regNumber)}</div>` : ''}
        ${stampUrl ? `<img src="${esc(stampUrl)}" alt="Stamp" style="max-height:64px;max-width:120px;object-fit:contain;display:block;margin-top:6px;opacity:0.9;" />` : ''}
      </div>
      <div style="border-top:1.5px solid #e2e8f0;margin:8px 20px;"></div>`;

    // ── DISCLAIMER NOTES ────────────────────────────────────────────────────
    const noteLines = [
      'This prescription is issued by a registered medical practitioner.',
      'The diagnosis and treatment are provisional. An in-person visit is advised for thorough examination.',
      'The prescription is valid only for the period and dosage advised.',
      'The contents of this prescription are confidential and meant solely for the intended recipient.',
    ];
    const noteHtml = `
      <div style="padding:8px 20px;">
        <div style="font-size:12px;font-weight:700;color:#0f172a;margin-bottom:4px;">Note:</div>
        ${noteLines.map((n, i) => `<div style="font-size:11px;color:#64748b;margin-bottom:3px;">${i + 1}. ${n}</div>`).join('')}
      </div>`;

    // ── CLINIC FOOTER ───────────────────────────────────────────────────────
    const footerHtml = `
      <div style="position:fixed;bottom:0;left:0;right:0;background:#fff;border-top:3px solid ${theme};padding:6px 20px;display:flex;align-items:center;justify-content:space-between;gap:8px;">
        <div style="font-size:10px;color:#475569;flex:1;">
          ${cName ? `<div style="font-weight:600;color:#374151;">${esc(cName)}</div>` : ''}
          ${pad.email ? `<div>Email: <span style="color:${theme};">${esc(pad.email)}</span></div>` : ''}
          ${cAddr ? `<div>Address: ${esc(cAddr)}</div>` : ''}
          ${cPhone ? `<div>Phone: ${esc(cPhone)}</div>` : ''}
        </div>
        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
          <img src="${window.location.origin}/logos/vyasa-logo.svg" width="14" height="14" alt="Vyasa" style="border-radius:3px;" />
          <span style="font-size:9px;color:#94a3b8;">Powered by <strong style="color:#64748b;">Vyasa</strong></span>
        </div>
      </div>`;

    return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Prescription – ${esc(patient.name)}</title>
      <style>
        @page { size: A4; margin: 0; }
        * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 0; padding: 0 0 60px; }
      </style></head>
      <body>
        ${headerHtml}
        ${patientHtml}
        ${vitalsHtml}
        ${complaintHtml}
        ${rxHtml}
        ${extraBody}
        ${signatureHtml}
        ${noteHtml}
        ${footerHtml}
      </body></html>`;
  }

  function doPrint() {
    trackEvent('rx_printed', { rx_count: draft.rxRows.filter(r => r.drug.trim()).length });
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
            {onEndConsult && (
              <button onClick={onEndConsult} className="btn-sm text-sm font-semibold px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-1.5 transition-colors">
                <X className="w-3.5 h-3.5" /> End Consultation
              </button>
            )}
            {!onEndConsult && (
              <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Section toggles — dropdown */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2">
          <div className="relative">
            <button type="button" onClick={() => setSectionsOpen(o => !o)}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all duration-100 active:scale-[0.97]',
                sectionsOpen
                  ? 'bg-teal-500 border-teal-500 text-white shadow-sm'
                  : 'bg-white border-slate-300 text-slate-600 hover:border-teal-400 hover:text-teal-600'
              )}>
              <Settings2 className="w-3.5 h-3.5" />
              Print sections
              <span className="ml-1 bg-white/20 rounded px-1 text-[10px]">
                {SECTION_LABELS.filter(l => ps[l.key]).length}/{SECTION_LABELS.length}
              </span>
              <ChevronDown className={cn('w-3 h-3 transition-transform duration-200', sectionsOpen && 'rotate-180')} />
            </button>

            {sectionsOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setSectionsOpen(false)} />
                <div className="absolute left-0 top-full mt-1 z-20 bg-white border border-slate-200 rounded-xl shadow-xl w-56 py-1 overflow-hidden">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 border-b border-slate-100">
                    Toggle print sections
                  </div>
                  {SECTION_LABELS.map(({ key, label }) => (
                    <button key={key} type="button" onClick={() => togglePs(key)}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors duration-75 active:scale-[0.99]',
                        ps[key] ? 'text-slate-800 hover:bg-slate-50' : 'text-slate-400 hover:bg-slate-50'
                      )}>
                      <span className={cn('w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                        ps[key] ? 'bg-teal-500 border-teal-500' : 'border-slate-300')}>
                        {ps[key] && (
                          <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                            <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      <span className={cn('flex-1 text-left', !ps[key] && 'line-through')}>{label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* A4 paper preview — mirrors the print layout */}
        <div className="flex-1 p-4 bg-slate-100 overflow-y-auto">
          <div ref={printRef} className="bg-white mx-auto shadow-xl"
            style={{ maxWidth: '595px', minHeight: '700px', fontFamily: 'Arial, sans-serif', fontSize: '13px' }}>

            {/* ── Header ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '14px 20px 12px', borderBottom: `2px solid #e2e8f0` }}>
              {/* Logo (if uploaded) or ℞ badge fallback */}
              {(pad as { logoUrl?: string }).logoUrl ? (
                <div style={{ width: 52, height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={(pad as { logoUrl?: string }).logoUrl} alt="Logo" style={{ maxWidth: 52, maxHeight: 52, objectFit: 'contain', borderRadius: 6 }} />
                </div>
              ) : (
                <div style={{ width: 44, height: 44, background: '#f59e0b', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ color: 'white', fontSize: 22, fontWeight: 900, fontFamily: 'serif', lineHeight: 1 }}>℞</span>
                </div>
              )}
              <div style={{ flex: 1, paddingLeft: 12 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{doctorDisplayName}</div>
                {(pad.specialty || pad.degrees) && <div style={{ fontSize: 12, color: '#475569', marginTop: 1 }}>{[pad.specialty, pad.degrees].filter(Boolean).join(', ')}</div>}
                {pad.regNumber && <div style={{ fontSize: 12, color: '#475569', marginTop: 1 }}>Reg. No: {pad.regNumber}</div>}
              </div>
              {qrSrc && (
                <div style={{ textAlign: 'center', flexShrink: 0 }}>
                  <img src={qrSrc} width={56} height={56} alt="QR" style={{ borderRadius: 4, border: '1px solid #e2e8f0', display: 'block' }} />
                  <div style={{ fontSize: 8, color: '#94a3b8', marginTop: 2 }}>Know your doctor</div>
                </div>
              )}
            </div>

            {/* ── Patient Info ── */}
            <div style={{ padding: '12px 20px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{patient.name}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>
                  {[patientAge ? `${patientAge} Yrs` : '', patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : patient.gender || ''].filter(Boolean).join(', ')}
                </div>
                <div style={{ fontSize: 12, color: '#475569', marginTop: 8 }}>
                  <strong>Drug Allergies</strong> • {draft.allergiesNote || (patient.allergies?.join(', ')) || 'None'}
                </div>
                <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                  <strong>Ongoing Medication</strong> • {draft.currentMeds || 'None'}
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: 12, color: '#475569' }}>
                <strong>Date : {today}</strong>
                {patient.mrn && <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>MRN: {patient.mrn}</div>}
              </div>
            </div>
            <hr style={{ margin: '0 20px', border: 'none', borderTop: '1px solid #e2e8f0' }} />

            {/* ── Vitals ── */}
            {ps.vitalsRow && (draft.vitals.bp || draft.vitals.hr || draft.vitals.temp || draft.vitals.spo2 || draft.vitals.weight) && (
              <>
                <div style={{ padding: '8px 20px', fontSize: 12, color: '#475569', display: 'flex', flexWrap: 'wrap' as const, gap: '0 14px', background: '#f8fafc' }}>
                  {draft.vitals.bp && <span>BP: <strong>{draft.vitals.bp}</strong></span>}
                  {draft.vitals.hr && <span>Pulse: <strong>{draft.vitals.hr}/min</strong></span>}
                  {draft.vitals.temp && <span>Temp: <strong>{draft.vitals.temp}°C</strong></span>}
                  {draft.vitals.spo2 && <span>SpO₂: <strong>{draft.vitals.spo2}%</strong></span>}
                  {draft.vitals.weight && <span>Wt: <strong>{draft.vitals.weight} kg</strong></span>}
                  {bmiVal && <span>BMI: <strong>{bmiVal}</strong></span>}
                </div>
                <hr style={{ margin: '0 20px', border: 'none', borderTop: '1px solid #e2e8f0' }} />
              </>
            )}

            {/* ── Complaints + Diagnosis (2-col) ── */}
            {(ps.complaint && draft.chiefComplaint) && (
              <>
                <div style={{ padding: '12px 20px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>Chief Complaints</div>
                    {draft.chiefComplaint.split(/\n|,/).map(c => c.trim()).filter(Boolean).map((c, i) => (
                      <div key={i} style={{ fontSize: 12, color: '#374151', marginBottom: 3 }}>{c}</div>
                    ))}
                    {ps.hopi && draft.hopi && <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{draft.hopi}</div>}
                  </div>
                  {ps.diagnosis && draft.diagnosis && (
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>Provisional Diagnosis</div>
                      <div style={{ fontSize: 12, color: '#374151' }}>{draft.diagnosis}{draft.icdCode ? ` (${draft.icdCode})` : ''}</div>
                      {draft.secondaryDx && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{draft.secondaryDx}</div>}
                    </div>
                  )}
                </div>
                <hr style={{ margin: '12px 20px 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />
              </>
            )}

            {/* ── Medication table ── */}
            {ps.rx && draft.rxRows.filter(r => r.drug.trim()).length > 0 && (
              <div style={{ padding: '14px 20px 0' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Medication Advised</div>
                <table style={{ width: '100%', borderCollapse: 'collapse' as const }}>
                  <thead>
                    <tr style={{ borderBottom: '1.5px solid #e2e8f0', background: '#f8fafc' }}>
                      {['S.No.', 'Medicine name', 'Timing', 'Duration', 'Dosage'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '6px 8px 6px 0', fontSize: 11, fontWeight: 600, color: '#64748b' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {draft.rxRows.filter(r => r.drug.trim()).map((r, i) => {
                      const formLabel = r.form && r.form !== 'Tab' ? `${r.form}. ` : '';
                      const drugName = `${formLabel}${stripConc(cleanDrug(r.drug))}${r.dose ? ` ${r.dose}` : ''}${r.strength ? ` (${r.strength})` : ''}`;
                      const dosage = [r.route !== 'Oral' && r.route ? r.route : '', r.instructions].filter(Boolean).join(' · ');
                      const durationDisplay = r.duration ? r.duration.replace(/\s*(day|days|d)\s*/i, ' day(s)') : '';
                      return (
                        <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 8px 8px 0', fontSize: 12, color: '#64748b', width: 40 }}>{i + 1}</td>
                          <td style={{ padding: '8px 8px 8px 0', fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{drugName}</td>
                          <td style={{ padding: '8px 8px 8px 0', fontSize: 12, color: '#374151' }}>{r.frequency}</td>
                          <td style={{ padding: '8px 8px 8px 0', fontSize: 12, color: '#374151' }}>{durationDisplay}</td>
                          <td style={{ padding: '8px 0 8px 0', fontSize: 12, color: '#374151' }}>{dosage}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div style={{ marginTop: 10, fontSize: 12, color: '#475569' }}>
                  <strong>Substitution Instruction</strong><br />Apply the generic equivalent wherever applicable
                </div>
              </div>
            )}

            {/* ── Investigations / Advice / Follow-up ── */}
            {ps.investigation && draft.investigation && (
              <div style={{ padding: '12px 20px 0' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Investigations Advised</div>
                <div style={{ fontSize: 12, color: '#374151' }}>{draft.investigation}</div>
              </div>
            )}
            {ps.advice && draft.advice && (
              <div style={{ padding: '8px 20px 0' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Advice</div>
                <div style={{ fontSize: 12, color: '#374151' }}>{draft.advice}</div>
              </div>
            )}
            {ps.followup && draft.followUp && draft.followUp !== 'No follow-up' && (
              <div style={{ padding: '8px 20px 0' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Follow-up</div>
                <div style={{ fontSize: 12, color: '#374151' }}>After <strong>{draft.followUp}</strong></div>
              </div>
            )}
            {ps.referral && draft.referredTo && (
              <div style={{ padding: '8px 20px 0' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Referral</div>
                <div style={{ fontSize: 12, color: '#374151' }}>Referred to: <strong>{draft.referredTo}</strong></div>
              </div>
            )}

            <hr style={{ margin: '14px 20px 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />

            {/* ── Signature ── */}
            <div style={{ padding: '16px 20px 8px' }}>
              {eSignUrl && <img src={eSignUrl} alt="Signature" style={{ maxHeight: 48, maxWidth: 140, objectFit: 'contain', display: 'block', marginBottom: 6 }} />}
              {!eSignUrl && <div style={{ height: 48 }} />}
              {(pad as { stampUrl?: string }).stampUrl && (
                <img src={(pad as { stampUrl?: string }).stampUrl} alt="Stamp" style={{ maxHeight: 56, maxWidth: 110, objectFit: 'contain', display: 'block', marginBottom: 6, opacity: 0.9 }} />
              )}
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{doctorDisplayName}</div>
              {(pad.specialty || pad.degrees) && <div style={{ fontSize: 12, color: '#475569' }}>{[pad.specialty, pad.degrees].filter(Boolean).join(', ')}</div>}
              {pad.regNumber && <div style={{ fontSize: 12, color: '#475569' }}>Reg. No: {pad.regNumber}</div>}
            </div>

            <hr style={{ margin: '8px 20px', border: 'none', borderTop: '1.5px solid #e2e8f0' }} />

            {/* ── Disclaimer ── */}
            <div style={{ padding: '8px 20px 16px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Note:</div>
              {[
                'This prescription is issued by a registered medical practitioner.',
                'The diagnosis and treatment are provisional. An in-person visit is advised for thorough examination.',
                'The prescription is valid only for the period and dosage advised.',
                'The contents of this prescription are confidential and meant solely for the intended recipient.',
              ].map((n, i) => (
                <div key={i} style={{ fontSize: 11, color: '#64748b', marginBottom: 3 }}>{i + 1}. {n}</div>
              ))}
            </div>

            {/* ── Clinic footer ── */}
            <div style={{ borderTop: `3px solid ${theme}`, padding: '8px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ fontSize: 10, color: '#475569', flex: 1 }}>
                {(clinicName || pad.clinicName) && <div style={{ fontWeight: 600, color: '#374151' }}>{clinicName || pad.clinicName}</div>}
                {pad.email && <div>Email: <span style={{ color: theme }}>{pad.email}</span></div>}
                {(clinicAddress || pad.address) && <div>Address: {clinicAddress || pad.address}</div>}
                {(clinicPhone || pad.phone) && <div>Phone: {clinicPhone || pad.phone}</div>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <img src={`${window.location.origin}/logos/vyasa-logo.svg`} width={14} height={14} alt="Vyasa" style={{ borderRadius: 3 }} />
                <span style={{ fontSize: 9, color: '#94a3b8' }}>Powered by <strong style={{ color: '#64748b' }}>Vyasa</strong></span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

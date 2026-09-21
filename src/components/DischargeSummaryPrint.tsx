import { useState } from 'react';
import { Printer, X, ChevronDown } from 'lucide-react';
import { usePadStore } from '@/store/usePadStore';
import { useAuthStore } from '@/store/useAuthStore';
import { cn, formatDate } from '@/lib/utils';
import type { Patient, VisitRecord, Vitals, LabOrder, Medication } from '@/types';

const THEME_COLORS: Record<string, string> = {
  teal: '#0d9488', navy: '#0a1628', maroon: '#7f1d1d', dark: '#1e293b',
};

interface DischargeForm {
  dischargeType: string;
  finalDiagnosis: string;
  conditionAtDischarge: string;
  treatmentSummary: string;
  proceduresDone: string;
  followUp: string;
  instructions: string;
  referredTo: string;
}

interface PrintSections {
  vitals: boolean;
  labs: boolean;
  medications: boolean;
  consultations: boolean;
  treatmentSummary: boolean;
  procedures: boolean;
  instructions: boolean;
  followUp: boolean;
}

interface Props {
  patient: Patient;
  form: DischargeForm;
  admitDate?: string;
  dischargeDate: string;
  visits: VisitRecord[];
  vitals: Vitals[];
  labs: LabOrder[];
  prescriptions: Medication[];
  onClose: () => void;
}

const SECTION_LABELS: { key: keyof PrintSections; label: string }[] = [
  { key: 'vitals', label: 'Vitals Trend' },
  { key: 'labs', label: 'Lab Results' },
  { key: 'medications', label: 'Medications' },
  { key: 'consultations', label: 'Consultations' },
  { key: 'treatmentSummary', label: 'Treatment Summary' },
  { key: 'procedures', label: 'Procedures' },
  { key: 'instructions', label: 'Instructions' },
  { key: 'followUp', label: 'Follow-up' },
];

export function DischargeSummaryPrint({ patient, form, admitDate, dischargeDate, visits, vitals, labs, prescriptions, onClose }: Props) {
  const { settings: pad } = usePadStore();
  const { user } = useAuthStore();
  const theme = THEME_COLORS[pad.theme as string] ?? THEME_COLORS.teal;

  const [ps, setPs] = useState<PrintSections>({
    vitals: true,
    labs: true,
    medications: true,
    consultations: true,
    treatmentSummary: true,
    procedures: true,
    instructions: true,
    followUp: true,
  });
  const [sectionsOpen, setSectionsOpen] = useState(false);

  const doctorName = pad.doctorName || user?.name || 'Doctor';
  const clinicName = pad.clinicName || '';
  const clinicAddr = pad.address || '';
  const clinicPhone = pad.phone || '';

  const resultedLabs = labs.filter(l => l.status === 'resulted' && l.result);

  function togglePs(key: keyof PrintSections) {
    setPs(s => ({ ...s, [key]: !s[key] }));
  }

  function buildPrintHtml(): string {
    const esc = (s: any) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const sectionTitle = (t: string) =>
      `<div style="color:${theme};font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:0.06em;margin:14px 0 5px;border-bottom:1.5px solid ${theme}22;padding-bottom:3px;">${t}</div>`;
    const row = (label: string, val: string) =>
      `<div style="font-size:12px;margin-bottom:2px;"><span style="color:#94a3b8;min-width:160px;display:inline-block;">${label}</span><span style="font-weight:600;color:#0f172a;">${esc(val)}</span></div>`;

    const header = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:10px;border-bottom:2px solid ${theme};margin-bottom:12px;">
        <div style="flex:1;min-width:0;">
          <div style="color:${theme};font-size:22px;font-weight:bold;line-height:1.1;">${esc(doctorName)}</div>
          ${pad.degrees ? `<div style="color:#475569;font-size:12px;margin-top:2px;">${esc(pad.degrees)}</div>` : ''}
          ${pad.specialty ? `<div style="color:#475569;font-size:12px;font-weight:600;">${esc(pad.specialty)}</div>` : ''}
          ${pad.regNumber ? `<div style="color:#94a3b8;font-size:12px;">Reg: ${esc(pad.regNumber)}</div>` : ''}
        </div>
        <div style="text-align:right;font-size:12px;color:#475569;max-width:48%;flex-shrink:0;">
          ${clinicName ? `<div style="font-weight:700;color:#334155;font-size:14px;">${esc(clinicName)}</div>` : ''}
          ${clinicAddr ? `<div>${esc(clinicAddr)}</div>` : ''}
          ${clinicPhone ? `<div>📞 ${esc(clinicPhone)}</div>` : ''}
          ${pad.email ? `<div>✉ ${esc(pad.email)}</div>` : ''}
        </div>
      </div>`;

    const docTitle = `<div style="text-align:center;font-size:16px;font-weight:bold;color:${theme};letter-spacing:0.05em;margin-bottom:10px;text-transform:uppercase;">Discharge Summary</div>`;

    const patientInfo = `
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px;margin-bottom:10px;display:flex;flex-wrap:wrap;gap:6px 20px;">
        ${row('Patient', `${patient.name} (${patient.age}Y / ${patient.gender})`)}
        ${patient.mrn ? row('MRN', patient.mrn) : ''}
        ${patient.bloodGroup ? row('Blood Group', patient.bloodGroup) : ''}
        ${patient.phone ? row('Phone', patient.phone) : ''}
        ${row('Admitted', admitDate ? new Date(admitDate).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—')}
        ${row('Discharged', new Date(dischargeDate).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }))}
        ${patient.ward ? row('Ward / Bed', `${patient.ward}${patient.bed ? ' · ' + patient.bed : ''}`) : ''}
        ${patient.attendingDoctor ? row('Attending', patient.attendingDoctor) : ''}
        ${row('Discharge Type', form.dischargeType)}
        ${form.conditionAtDischarge ? row('Condition', form.conditionAtDischarge) : ''}
        ${patient.allergies?.length ? `<div style="font-size:12px;margin-bottom:2px;"><span style="color:#ef4444;min-width:160px;display:inline-block;">⚠ Allergies</span><span style="font-weight:600;color:#ef4444;">${esc(patient.allergies.join(', '))}</span></div>` : ''}
      </div>`;

    const diagSection = `
      ${sectionTitle('Diagnosis')}
      ${patient.diagnosis ? `<div style="font-size:12px;color:#64748b;margin-bottom:2px;">Admission: ${esc(patient.diagnosis)}</div>` : ''}
      <div style="font-size:13px;font-weight:600;color:#0f172a;">Final: ${esc(form.finalDiagnosis)}</div>`;

    let vitalsSection = '';
    if (ps.vitals && vitals.length > 0) {
      const rows = vitals.slice(-6).map(v => `
        <tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:4px 8px;font-size:11px;color:#64748b;">${new Date(v.time).toLocaleDateString('en-IN', { day:'2-digit', month:'short' })} ${new Date(v.time).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}</td>
          <td style="padding:4px 8px;font-size:11px;">${esc(v.bp || '—')}</td>
          <td style="padding:4px 8px;font-size:11px;">${v.pulse ? v.pulse + ' bpm' : '—'}</td>
          <td style="padding:4px 8px;font-size:11px;">${v.temp ? v.temp + '°F' : '—'}</td>
          <td style="padding:4px 8px;font-size:11px;">${v.spo2 ? v.spo2 + '%' : '—'}</td>
          ${v.sugar !== undefined ? `<td style="padding:4px 8px;font-size:11px;">${v.sugar} mg/dL</td>` : '<td style="padding:4px 8px;font-size:11px;">—</td>'}
        </tr>`).join('');
      vitalsSection = `
        ${sectionTitle('Vital Signs')}
        <table style="width:100%;border-collapse:collapse;font-size:11px;">
          <thead>
            <tr style="background:${theme}15;">
              <th style="padding:5px 8px;text-align:left;color:#64748b;font-weight:600;font-size:10px;text-transform:uppercase;">Date/Time</th>
              <th style="padding:5px 8px;text-align:left;color:#64748b;font-weight:600;font-size:10px;">BP</th>
              <th style="padding:5px 8px;text-align:left;color:#64748b;font-weight:600;font-size:10px;">Pulse</th>
              <th style="padding:5px 8px;text-align:left;color:#64748b;font-weight:600;font-size:10px;">Temp</th>
              <th style="padding:5px 8px;text-align:left;color:#64748b;font-weight:600;font-size:10px;">SpO₂</th>
              <th style="padding:5px 8px;text-align:left;color:#64748b;font-weight:600;font-size:10px;">Sugar</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>`;
    }

    let labsSection = '';
    if (ps.labs && resultedLabs.length > 0) {
      const rows = resultedLabs.map(l => `
        <tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:4px 8px;font-size:11px;font-weight:600;">${esc(l.testName)}</td>
          <td style="padding:4px 8px;font-size:11px;${l.critical ? 'color:#ef4444;font-weight:700;' : ''}">${esc(l.result || '—')} ${esc(l.unit || '')}</td>
          <td style="padding:4px 8px;font-size:11px;color:#64748b;">${esc(l.refRange || '—')}</td>
          <td style="padding:4px 8px;font-size:11px;">${l.orderedAt ? new Date(l.orderedAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short' }) : '—'}</td>
        </tr>`).join('');
      labsSection = `
        ${sectionTitle('Laboratory Results')}
        <table style="width:100%;border-collapse:collapse;font-size:11px;">
          <thead>
            <tr style="background:${theme}15;">
              <th style="padding:5px 8px;text-align:left;color:#64748b;font-weight:600;font-size:10px;text-transform:uppercase;">Test</th>
              <th style="padding:5px 8px;text-align:left;color:#64748b;font-weight:600;font-size:10px;">Result</th>
              <th style="padding:5px 8px;text-align:left;color:#64748b;font-weight:600;font-size:10px;">Ref Range</th>
              <th style="padding:5px 8px;text-align:left;color:#64748b;font-weight:600;font-size:10px;">Date</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>`;
    }

    let rxSection = '';
    if (ps.medications && prescriptions.length > 0) {
      const rows = prescriptions.map((rx, i) => `
        <tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:4px 8px;font-size:11px;color:#94a3b8;">${i + 1}</td>
          <td style="padding:4px 8px;font-size:11px;font-weight:600;">${esc(rx.drug)}</td>
          <td style="padding:4px 8px;font-size:11px;">${esc(rx.dose || '—')}</td>
          <td style="padding:4px 8px;font-size:11px;">${esc(rx.route || '—')}</td>
          <td style="padding:4px 8px;font-size:11px;">${esc(rx.frequency || '—')}</td>
          <td style="padding:4px 8px;font-size:11px;">${esc(rx.duration || '—')}</td>
        </tr>`).join('');
      rxSection = `
        ${sectionTitle('Medications Given During Admission')}
        <table style="width:100%;border-collapse:collapse;font-size:11px;">
          <thead>
            <tr style="background:${theme}15;">
              <th style="padding:5px 8px;text-align:left;color:#64748b;font-size:10px;">#</th>
              <th style="padding:5px 8px;text-align:left;color:#64748b;font-weight:600;font-size:10px;text-transform:uppercase;">Drug</th>
              <th style="padding:5px 8px;text-align:left;color:#64748b;font-weight:600;font-size:10px;">Dose</th>
              <th style="padding:5px 8px;text-align:left;color:#64748b;font-weight:600;font-size:10px;">Route</th>
              <th style="padding:5px 8px;text-align:left;color:#64748b;font-weight:600;font-size:10px;">Frequency</th>
              <th style="padding:5px 8px;text-align:left;color:#64748b;font-weight:600;font-size:10px;">Duration</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>`;
    }

    let consultsSection = '';
    if (ps.consultations && visits.length > 0) {
      const items = visits.slice().reverse().map(v => {
        const d = v.date ? new Date(v.date).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '';
        return `<div style="margin-bottom:6px;padding:6px 8px;background:#f8fafc;border-left:3px solid ${theme};border-radius:0 4px 4px 0;">
          <div style="font-size:11px;color:#64748b;">${d}</div>
          ${v.diagnosis ? `<div style="font-size:12px;font-weight:600;">Dx: ${esc(v.diagnosis)}</div>` : ''}
          ${v.chiefComplaint ? `<div style="font-size:11px;color:#475569;">C/C: ${esc(v.chiefComplaint)}</div>` : ''}
          ${v.advice ? `<div style="font-size:11px;color:#475569;">Advice: ${esc(v.advice)}</div>` : ''}
        </div>`;
      }).join('');
      consultsSection = `${sectionTitle('Consultation Notes')}${items}`;
    }

    let treatSection = '';
    if (ps.treatmentSummary && form.treatmentSummary) {
      treatSection = `${sectionTitle('Treatment Summary')}<div style="font-size:13px;color:#0f172a;white-space:pre-wrap;">${esc(form.treatmentSummary)}</div>`;
    }

    let procSection = '';
    if (ps.procedures && form.proceduresDone) {
      procSection = `${sectionTitle('Procedures Done')}<div style="font-size:13px;color:#0f172a;white-space:pre-wrap;">${esc(form.proceduresDone)}</div>`;
    }

    let instrSection = '';
    if (ps.instructions && form.instructions) {
      instrSection = `${sectionTitle('Discharge Instructions')}<div style="font-size:13px;color:#0f172a;white-space:pre-wrap;">${esc(form.instructions)}</div>`;
    }

    let fuSection = '';
    if (ps.followUp) {
      fuSection = sectionTitle('Follow-up');
      if (form.followUp) fuSection += `<div style="font-size:13px;font-weight:600;color:#0f172a;">Review in: ${esc(form.followUp)}</div>`;
      if (form.referredTo) fuSection += `<div style="font-size:12px;color:#64748b;margin-top:2px;">Referred to: ${esc(form.referredTo)}</div>`;
    }

    const footer = `
      <div style="margin-top:24px;padding-top:10px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:flex-end;font-size:11px;color:#94a3b8;">
        <div>Prepared by: <strong style="color:#334155;">${esc(doctorName)}</strong></div>
        <div style="text-align:center;">
          <div style="border-top:1px solid #334155;width:140px;padding-top:4px;color:#334155;">Signature &amp; Stamp</div>
        </div>
        <div>Date: <strong style="color:#334155;">${new Date(dischargeDate).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</strong></div>
      </div>`;

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Discharge Summary — ${esc(patient.name)}</title>
      <style>
        @media print { @page { margin: 12mm 14mm; } body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; margin: 0; padding: 16px 20px; font-size: 13px; }
        table { border-collapse: collapse; }
      </style>
    </head><body>
      ${header}
      ${docTitle}
      ${patientInfo}
      ${diagSection}
      ${vitalsSection}
      ${labsSection}
      ${rxSection}
      ${consultsSection}
      ${treatSection}
      ${procSection}
      ${instrSection}
      ${fuSection}
      ${footer}
    </body></html>`;
  }

  function doPrint() {
    const html = buildPrintHtml();
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 300);
  }

  // ── On-screen preview ──────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/80 flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200 flex-shrink-0 flex-wrap">
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 cursor-pointer">
          <X className="w-5 h-5 text-slate-600" />
        </button>
        <span className="font-semibold text-slate-800">Discharge Summary — {patient.name}</span>

        <div className="relative ml-1">
          <button onClick={() => setSectionsOpen(o => !o)}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
            Sections <ChevronDown className={cn('w-4 h-4 transition-transform', sectionsOpen && 'rotate-180')} />
          </button>
          {sectionsOpen && (
            <div className="absolute top-full left-0 mt-1 z-10 bg-white rounded-xl border border-slate-200 shadow-lg p-3 min-w-[200px]">
              {SECTION_LABELS.map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 py-1.5 cursor-pointer hover:text-teal-600 text-sm">
                  <input type="checkbox" checked={ps[key]} onChange={() => togglePs(key)} className="accent-teal-500" />
                  {label}
                </label>
              ))}
            </div>
          )}
        </div>

        <button onClick={doPrint}
          className="ml-auto flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl font-semibold text-sm hover:bg-teal-700 cursor-pointer">
          <Printer className="w-4 h-4" /> Print / Save PDF
        </button>
      </div>

      {/* Preview */}
      <div className="flex-1 overflow-auto p-4 md:p-8">
        <div className="max-w-[780px] mx-auto bg-white rounded-2xl shadow-xl p-6 md:p-8 text-sm">
          {/* PAD header */}
          <div className="flex justify-between items-start pb-4 border-b-2 mb-5" style={{ borderColor: theme }}>
            <div>
              <div className="text-xl font-bold" style={{ color: theme }}>{doctorName}</div>
              {pad.degrees && <div className="text-xs text-slate-500 mt-0.5">{pad.degrees}</div>}
              {pad.specialty && <div className="text-xs text-slate-600 font-semibold">{pad.specialty}</div>}
              {pad.regNumber && <div className="text-xs text-slate-400">Reg: {pad.regNumber}</div>}
            </div>
            <div className="text-right text-xs text-slate-500 max-w-[48%]">
              {clinicName && <div className="font-bold text-slate-700 text-sm">{clinicName}</div>}
              {clinicAddr && <div>{clinicAddr}</div>}
              {clinicPhone && <div>📞 {clinicPhone}</div>}
              {pad.email && <div>✉ {pad.email}</div>}
            </div>
          </div>

          {/* Document title */}
          <div className="text-center text-base font-bold uppercase tracking-widest mb-5" style={{ color: theme }}>
            Discharge Summary
          </div>

          {/* Patient info box */}
          <div className="bg-slate-50 rounded-xl p-4 mb-5 grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
            {[
              ['Patient', `${patient.name} (${patient.age}Y / ${patient.gender})`],
              patient.mrn ? ['MRN', patient.mrn] : null,
              patient.bloodGroup ? ['Blood Group', patient.bloodGroup] : null,
              patient.phone ? ['Phone', patient.phone] : null,
              ['Admitted', admitDate ? formatDate(admitDate) : '—'],
              ['Discharged', formatDate(dischargeDate)],
              patient.ward ? ['Ward / Bed', `${patient.ward}${patient.bed ? ' · ' + patient.bed : ''}`] : null,
              patient.attendingDoctor ? ['Attending', patient.attendingDoctor] : null,
              ['Discharge Type', form.dischargeType],
              form.conditionAtDischarge ? ['Condition', form.conditionAtDischarge] : null,
            ].filter((x): x is [string, string] => Array.isArray(x)).map(([label, val]) => (
              <div key={label}>
                <span className="text-slate-400">{label}: </span>
                <span className="font-semibold text-slate-800">{val}</span>
              </div>
            ))}
            {(patient.allergies?.length ?? 0) > 0 && (
              <div className="col-span-2">
                <span className="text-red-400">⚠ Allergies: </span>
                <span className="font-semibold text-red-600">{patient.allergies!.join(', ')}</span>
              </div>
            )}
          </div>

          {/* Diagnosis */}
          <SectionHead label="Diagnosis" color={theme} />
          {patient.diagnosis && <div className="text-xs text-slate-500 mb-1">Admission: {patient.diagnosis}</div>}
          <div className="text-sm font-semibold text-slate-800">Final: {form.finalDiagnosis}</div>

          {/* Vitals */}
          {ps.vitals && vitals.length > 0 && (
            <>
              <SectionHead label="Vital Signs" color={theme} />
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200">
                      {['Date/Time', 'BP', 'Pulse', 'Temp', 'SpO₂', 'Sugar'].map(h => (
                        <th key={h} className="py-2 px-2 text-left text-[10px] font-semibold uppercase text-slate-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {vitals.slice(-6).map(v => (
                      <tr key={v.id} className="border-b border-slate-100">
                        <td className="py-1.5 px-2 text-slate-500">{new Date(v.time).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} {new Date(v.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td>
                        <td className="py-1.5 px-2">{v.bp || '—'}</td>
                        <td className="py-1.5 px-2">{v.pulse ? `${v.pulse} bpm` : '—'}</td>
                        <td className="py-1.5 px-2">{v.temp ? `${v.temp}°F` : '—'}</td>
                        <td className="py-1.5 px-2">{v.spo2 ? `${v.spo2}%` : '—'}</td>
                        <td className="py-1.5 px-2">{v.sugar !== undefined ? `${v.sugar} mg/dL` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Labs */}
          {ps.labs && resultedLabs.length > 0 && (
            <>
              <SectionHead label="Laboratory Results" color={theme} />
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200">
                      {['Test', 'Result', 'Ref Range', 'Date'].map(h => (
                        <th key={h} className="py-2 px-2 text-left text-[10px] font-semibold uppercase text-slate-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {resultedLabs.map(l => (
                      <tr key={l.id} className="border-b border-slate-100">
                        <td className="py-1.5 px-2 font-semibold">{l.testName}</td>
                        <td className={cn('py-1.5 px-2', l.critical ? 'text-red-600 font-bold' : '')}>{l.result} {l.unit || ''}</td>
                        <td className="py-1.5 px-2 text-slate-400">{l.refRange || '—'}</td>
                        <td className="py-1.5 px-2 text-slate-400">{l.orderedAt ? new Date(l.orderedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Medications */}
          {ps.medications && prescriptions.length > 0 && (
            <>
              <SectionHead label="Medications During Admission" color={theme} />
              <div className="space-y-1">
                {prescriptions.map((rx, i) => (
                  <div key={rx.id} className="flex gap-3 text-xs py-1 border-b border-slate-50">
                    <span className="text-slate-400 w-5 flex-shrink-0">{i + 1}.</span>
                    <span className="font-semibold flex-1">{rx.drug}</span>
                    <span className="text-slate-500">{rx.dose}</span>
                    <span className="text-slate-400">{rx.route}</span>
                    <span className="text-slate-500">{rx.frequency}</span>
                    <span className="text-slate-400">{rx.duration}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Consultation notes */}
          {ps.consultations && visits.length > 0 && (
            <>
              <SectionHead label="Consultation Notes" color={theme} />
              <div className="space-y-2">
                {[...visits].reverse().map(v => (
                  <div key={v.id} className="text-xs p-2 bg-slate-50 rounded-lg border-l-2" style={{ borderColor: theme }}>
                    <div className="text-slate-400">{v.date ? formatDate(v.date) : ''}</div>
                    {v.diagnosis && <div className="font-semibold text-slate-800">Dx: {v.diagnosis}</div>}
                    {v.chiefComplaint && <div className="text-slate-500">C/C: {v.chiefComplaint}</div>}
                    {v.advice && <div className="text-slate-500">Advice: {v.advice}</div>}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Treatment summary */}
          {ps.treatmentSummary && form.treatmentSummary && (
            <>
              <SectionHead label="Treatment Summary" color={theme} />
              <div className="text-sm text-slate-700 whitespace-pre-wrap">{form.treatmentSummary}</div>
            </>
          )}

          {/* Procedures */}
          {ps.procedures && form.proceduresDone && (
            <>
              <SectionHead label="Procedures Done" color={theme} />
              <div className="text-sm text-slate-700 whitespace-pre-wrap">{form.proceduresDone}</div>
            </>
          )}

          {/* Instructions */}
          {ps.instructions && form.instructions && (
            <>
              <SectionHead label="Discharge Instructions" color={theme} />
              <div className="text-sm text-slate-700 whitespace-pre-wrap">{form.instructions}</div>
            </>
          )}

          {/* Follow-up */}
          {ps.followUp && (
            <>
              <SectionHead label="Follow-up" color={theme} />
              {form.followUp && <div className="text-sm font-semibold text-slate-800">Review in: {form.followUp}</div>}
              {form.referredTo && <div className="text-sm text-slate-500">Referred to: {form.referredTo}</div>}
            </>
          )}

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-slate-200 flex justify-between items-end text-xs text-slate-400">
            <div>Prepared by: <span className="font-semibold text-slate-700">{doctorName}</span></div>
            <div className="text-center">
              <div className="border-t border-slate-600 w-36 pt-1 text-slate-600">Signature &amp; Stamp</div>
            </div>
            <div>Date: <span className="font-semibold text-slate-700">{formatDate(dischargeDate)}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHead({ label, color }: { label: string; color: string }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-widest mt-5 mb-2 pb-1 border-b-2"
      style={{ color, borderColor: `${color}33` }}>
      {label}
    </div>
  );
}

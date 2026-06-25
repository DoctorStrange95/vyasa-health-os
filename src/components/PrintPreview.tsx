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

export function PrintPreview({ patient, draft, pad, clinicName, clinicAddress, clinicPhone, onClose, onWhatsApp, onEndConsult, specialtyExam, vaccines = [], procedures = [] }: PrintPreviewProps) {
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

    // Left column (doctor)
    const left = `
      <div style="flex:1;min-width:0;">
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
      <div style="text-align:right;font-size:12px;color:#475569;max-width:50%;flex-shrink:0;word-break:break-word;">
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
      ps.vitalsRow && draft.vitals.hr ? cell('Pulse', `${draft.vitals.hr}/min`) : '',
      ps.vitalsRow && draft.vitals.temp ? cell('Temp', `${draft.vitals.temp}°C`) : '',
      ps.vitalsRow && draft.vitals.spo2 ? cell('SpO2', `${draft.vitals.spo2}%`) : '',
      ps.vitalsRow && draft.vitals.rr ? cell('RR', `${draft.vitals.rr}/min`) : '',
      ps.vitalsRow && draft.vitals.weight ? cell('Wt', `${draft.vitals.weight}kg`) : '',
      ps.vitalsRow && bmiVal ? cell('BMI', bmiVal) : '',
    ].filter(Boolean).join('');

    const sectionTitle = (t: string) =>
      `<div style="color:${theme};font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:0.05em;margin:14px 0 4px;">${t}</div>`;

    let body = '';
    if (ps.complaint && draft.chiefComplaint) body += sectionTitle('C/C') + `<div style="font-size:13px;">${esc(draft.chiefComplaint)}</div>`;
    if (ps.hopi && draft.hopi) body += sectionTitle('History') + `<div style="font-size:13px;">${esc(draft.hopi)}</div>`;
    {
      const ph = [
        draft.comorbidities?.length && `Comorbidities: ${draft.comorbidities.join(', ')}`,
        draft.pastMedical?.trim() && `Past Medical: ${draft.pastMedical}`,
        draft.pastSurgical?.trim() && `Past Surgical: ${draft.pastSurgical}`,
        draft.familyHistory?.trim() && `Family H/o: ${draft.familyHistory}`,
        draft.socialHistory?.trim() && `Social: ${draft.socialHistory}`,
        draft.allergiesNote?.trim() && `Allergies: ${draft.allergiesNote}`,
        draft.currentMeds?.trim() && `Current Meds: ${draft.currentMeds}`,
      ].filter(Boolean) as string[];
      if (ph.length) body += sectionTitle('Past & Family History') + ph.map(p => `<div style="font-size:13px;">${esc(p)}</div>`).join('');
    }
    if (ps.diagnosis && draft.diagnosis) {
      body += sectionTitle('Diagnosis') + `<div style="font-size:13px;font-weight:500;">${esc(draft.diagnosis)}${draft.icdCode ? ` (${esc(draft.icdCode)})` : ''}</div>`;
      if (draft.secondaryDx) body += `<div style="font-size:12px;color:#475569;">${esc(draft.secondaryDx)}</div>`;
    }
    // ── Examination: general + systemic findings, body diagram, then specialty modules ──
    // Psychiatry fields are NEVER printed (sensitive clinical notes).
    let examBody = '';
    if (ps.specialtyExam) {
      if (draft.bodySigns?.length) examBody += `<div style="font-size:13px;margin-bottom:4px;"><span style="color:#94a3b8;">General signs: </span>${esc(draft.bodySigns.join(', '))}</div>`;
      if (draft.generalExam?.trim()) examBody += `<div style="font-size:13px;margin-bottom:4px;"><span style="color:#94a3b8;">General: </span>${esc(draft.generalExam)}</div>`;
      if (draft.systemicExam?.trim()) examBody += `<div style="font-size:13px;margin-bottom:4px;"><span style="color:#94a3b8;">Systemic: </span>${esc(draft.systemicExam)}</div>`;
      const bnotes = draft.bodyNotes ? Object.entries(draft.bodyNotes).filter(([, v]) => (v as string)?.trim()).map(([k, v]) => `${k}: ${v}`).join('; ') : '';
      if (bnotes) examBody += `<div style="font-size:12px;color:#475569;margin-bottom:4px;">${esc(bnotes)}</div>`;
    }
    if (ps.specialtyExam && specialtyExam) {
      const sp = specialtyExam;
      const has = (...keys: string[]) => keys.some(k => sp[k]?.trim());
      const spRow = (label: string, val: string) =>
        val?.trim() ? `<div style="font-size:12px;margin-bottom:3px;"><span style="color:#94a3b8;min-width:130px;display:inline-block;">${label}</span><span style="font-weight:600;">${esc(val)}</span></div>` : '';
      const dualRow = (label: string, re: string, le: string) =>
        (re?.trim() || le?.trim()) ? `<div style="font-size:12px;margin-bottom:3px;"><span style="color:#94a3b8;min-width:130px;display:inline-block;">${label}</span><span style="font-weight:600;">RE: ${esc(re)||'—'} &nbsp;|&nbsp; LE: ${esc(le)||'—'}</span></div>` : '';

      const subTitle = (t: string) =>
        `<div style="font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;margin:8px 0 3px;border-bottom:1px solid #f1f5f9;padding-bottom:2px;">${t}</div>`;

      // Ophthalmology
      if (has('va_re_ucva','va_re_bcva','va_le_ucva','va_le_bcva','iop_re','iop_le','refx_re_sph','refx_le_sph','ant_re','ant_le','post_re','post_le','add_power')) {
        examBody += subTitle('Ophthalmic');
        const va = (e: string) => [sp[`va_${e}_ucva`], sp[`va_${e}_bcva`]].filter(Boolean).join(' / ');
        const rfx = (e: string) => [sp[`refx_${e}_sph`] && `Sph ${sp[`refx_${e}_sph`]}`, sp[`refx_${e}_cyl`] && `Cyl ${sp[`refx_${e}_cyl`]}`, sp[`refx_${e}_axis`] && `Axis ${sp[`refx_${e}_axis`]}`].filter(Boolean).join(' ');
        examBody += dualRow('VA (UCVA / BCVA)', va('re'), va('le'));
        examBody += dualRow('IOP', sp.iop_re ? `${sp.iop_re} mmHg` : '', sp.iop_le ? `${sp.iop_le} mmHg` : '');
        examBody += dualRow('Refraction', rfx('re'), rfx('le'));
        if (sp.add_power) examBody += spRow('Add Power', sp.add_power);
        examBody += dualRow('Anterior Segment', sp.ant_re ?? '', sp.ant_le ?? '');
        examBody += dualRow('Posterior Segment', sp.post_re ?? '', sp.post_le ?? '');
      }

      // Dentistry
      if (has('dent_tooth_fdi','dent_diagnosis','dent_procedure','dent_material','dent_post_op','dent_xray_findings','dent_ohi_score')) {
        examBody += subTitle('Dental');
        examBody += spRow('Tooth (FDI)', sp.dent_tooth_fdi ?? '');
        examBody += spRow('Dental Diagnosis', sp.dent_diagnosis ?? '');
        examBody += spRow('Procedure', sp.dent_procedure ?? '');
        examBody += spRow('Material', sp.dent_material ?? '');
        if (sp.dent_local_anaesthetic && sp.dent_local_anaesthetic !== 'Not used') examBody += spRow('Local Anaesthetic', sp.dent_local_anaesthetic);
        if (sp.dent_xray_type && sp.dent_xray_type !== 'Not taken') {
          examBody += spRow('Radiograph', sp.dent_xray_type);
          examBody += spRow('Radiographic Findings', sp.dent_xray_findings ?? '');
        }
        if (sp.dent_ohi_score) examBody += spRow('OHI Score', sp.dent_ohi_score);
        examBody += spRow('Post-op Instructions', sp.dent_post_op ?? '');
      }

      // Surgery
      if (has('surg_procedure_name','surg_pre_op_dx','surg_post_op_dx','surg_intraop','surg_postop','surg_anaesthesia','surg_implant')) {
        examBody += subTitle('Surgical Notes');
        examBody += spRow('Procedure', sp.surg_procedure_name ?? '');
        examBody += spRow('Pre-op Diagnosis', sp.surg_pre_op_dx ?? '');
        examBody += spRow('Post-op Diagnosis', sp.surg_post_op_dx ?? '');
        examBody += spRow('Anaesthesia', sp.surg_anaesthesia ?? '');
        if (sp.surg_duration_min) examBody += spRow('Duration', `${sp.surg_duration_min} min`);
        if (sp.surg_blood_loss_ml) examBody += spRow('Blood Loss', `${sp.surg_blood_loss_ml} ml`);
        examBody += spRow('Implant / Device', sp.surg_implant ?? '');
        examBody += spRow('Intraoperative Findings', sp.surg_intraop ?? '');
        examBody += spRow('Post-op Instructions', sp.surg_postop ?? '');
      }

      // Orthopaedics
      if (has('orth_region','orth_laterality','orth_mechanism','orth_xray','orth_mri_ct','orth_fracture_type','orth_implant')) {
        examBody += subTitle('Orthopaedic');
        examBody += spRow('Region / Laterality', [sp.orth_region, sp.orth_laterality].filter(Boolean).join(' — '));
        examBody += spRow('Mechanism of Injury', sp.orth_mechanism ?? '');
        examBody += spRow('X-ray Findings', sp.orth_xray ?? '');
        examBody += spRow('MRI / CT Findings', sp.orth_mri_ct ?? '');
        examBody += spRow('Fracture Type', sp.orth_fracture_type ?? '');
        examBody += spRow('Implant / Fixation', sp.orth_implant ?? '');
      }

      // Dermatology
      if (has('derm_primary_lesion','derm_secondary_lesion','derm_distribution','derm_site','derm_dermoscopy','derm_biopsy','derm_treatment')) {
        examBody += subTitle('Dermatology');
        examBody += spRow('Primary Lesion', sp.derm_primary_lesion ?? '');
        examBody += spRow('Secondary Lesion', sp.derm_secondary_lesion ?? '');
        examBody += spRow('Distribution', sp.derm_distribution ?? '');
        examBody += spRow('Site', sp.derm_site ?? '');
        examBody += spRow('Dermatoscopy', sp.derm_dermoscopy ?? '');
        if (sp.derm_biopsy && sp.derm_biopsy !== 'Not sent') examBody += spRow('Biopsy', sp.derm_biopsy);
        examBody += spRow('Treatment Plan', sp.derm_treatment ?? '');
      }

      // OBG
      if (has('obg_lmp','obg_edd','obg_ga_weeks','obg_gravida','obg_para','obg_presentation','obg_pv_findings','obg_usg')) {
        examBody += subTitle('Obstetric & Gynaecology');
        if (sp.obg_lmp) examBody += spRow('LMP', sp.obg_lmp);
        if (sp.obg_edd) examBody += spRow('EDD', sp.obg_edd);
        if (sp.obg_ga_weeks) examBody += spRow('Gestational Age', `${sp.obg_ga_weeks} weeks (${sp.obg_ga_source || 'LMP'})`);
        const gpla = [sp.obg_gravida && `G${sp.obg_gravida}`, sp.obg_para && `P${sp.obg_para}`, sp.obg_live && `L${sp.obg_live}`, sp.obg_abortion && `A${sp.obg_abortion}`].filter(Boolean).join(' ');
        if (gpla) examBody += spRow('Obstetric History', gpla);
        examBody += spRow('Presentation', sp.obg_presentation ?? '');
        examBody += spRow('P/V Findings', sp.obg_pv_findings ?? '');
        examBody += spRow('USG Summary', sp.obg_usg ?? '');
      }

      // Paediatrics
      if (has('paed_apgar_1','paed_apgar_5','paed_birth_wt','paed_ga_birth','paed_dev_motor','paed_dev_language','paed_immunisation','paed_notes')) {
        examBody += subTitle('Paediatrics');
        if (sp.paed_apgar_1 || sp.paed_apgar_5) examBody += spRow('APGAR', [sp.paed_apgar_1 && `1 min: ${sp.paed_apgar_1}`, sp.paed_apgar_5 && `5 min: ${sp.paed_apgar_5}`].filter(Boolean).join('  |  '));
        if (sp.paed_birth_wt) examBody += spRow('Birth Weight', `${sp.paed_birth_wt} kg`);
        if (sp.paed_ga_birth) examBody += spRow('GA at Birth', `${sp.paed_ga_birth} weeks`);
        examBody += spRow('Developmental Milestones', [sp.paed_dev_motor && `Motor: ${sp.paed_dev_motor}`, sp.paed_dev_language && `Language: ${sp.paed_dev_language}`].filter(Boolean).join('  ·  '));
        examBody += spRow('Immunisation', sp.paed_immunisation ?? '');
        examBody += spRow('Notes', sp.paed_notes ?? '');
      }

      // General Medicine
      if (has('gm_built','gm_pallor','gm_icterus','gm_cyanosis','gm_clubbing','gm_oedema','gm_lymph','gm_jvp')) {
        const gmFindings = [
          sp.gm_built && `Built: ${sp.gm_built}`,
          sp.gm_pallor && sp.gm_pallor !== 'Absent' && `Pallor: ${sp.gm_pallor}`,
          sp.gm_icterus && sp.gm_icterus !== 'Absent' && `Icterus: ${sp.gm_icterus}`,
          sp.gm_cyanosis && sp.gm_cyanosis !== 'Absent' && `Cyanosis: ${sp.gm_cyanosis}`,
          sp.gm_clubbing && sp.gm_clubbing !== 'Absent' && `Clubbing: ${sp.gm_clubbing}`,
          sp.gm_oedema && sp.gm_oedema !== 'Absent' && `Oedema: ${sp.gm_oedema}`,
          sp.gm_lymph && sp.gm_lymph !== 'Not palpable' && `LN: ${sp.gm_lymph}`,
          sp.gm_jvp && sp.gm_jvp !== 'Normal' && `JVP: ${sp.gm_jvp}`,
        ].filter(Boolean).join('  ·  ');
        if (gmFindings) examBody += subTitle('Clinical Findings') + `<div style="font-size:13px;">${esc(gmFindings)}</div>`;
      }
      // Psychiatry: intentionally omitted from PDF
    }
    if (examBody) body += sectionTitle('Examination') + examBody;

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
            <div style="font-weight:600;font-size:13px;">${i + 1}. ${esc(formLabel)}${esc(stripConc(cleanDrug(r.drug)))}${r.dose ? ` ${esc(r.dose)}` : ''}${r.strength ? ` (${esc(r.strength)})` : ''}</div>
            <div style="font-size:12px;color:#475569;padding-left:16px;">${detail}</div>
          </div>`;
      });
    }
    if (ps.investigation && draft.investigation) body += sectionTitle('Investigations') + `<div style="font-size:13px;">${esc(draft.investigation)}</div>`;
    if (ps.advice && draft.advice) body += sectionTitle('Advice') + `<div style="font-size:13px;">${esc(draft.advice)}</div>`;
    if (ps.followup && draft.followUp && draft.followUp !== 'No follow-up') {
      body += sectionTitle('Follow-up') + `<div style="font-size:13px;">After <strong>${esc(draft.followUp)}</strong>${draft.referredTo && !ps.referral ? ` · Refer to: ${esc(draft.referredTo)}` : ''}</div>`;
    }
    if (ps.referral && draft.referredTo) {
      body += sectionTitle('Referral') + `<div style="font-size:13px;">Referred to: <strong>${esc(draft.referredTo)}</strong></div>`;
    }
    if (ps.vaccines && vaccines.length > 0) {
      const rows = vaccines.map(v =>
        `<tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:3px 8px 3px 0;font-weight:600;">${esc(v.name)}</td>
          <td style="padding:3px 8px 3px 0;color:#64748b;">${esc(v.site || '—')}</td>
          <td style="padding:3px 8px 3px 0;color:#64748b;">${esc(v.batchNo || '—')}</td>
          <td style="padding:3px 0;color:#64748b;">${v.nextDueDate ? new Date(v.nextDueDate).toLocaleDateString('en-IN') : '—'}</td>
        </tr>`
      ).join('');
      body += sectionTitle('Vaccines Given') + `
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead><tr style="border-bottom:1px solid ${theme}60;">
            <th style="text-align:left;padding:3px 8px 3px 0;font-weight:600;color:#475569;">Vaccine</th>
            <th style="text-align:left;padding:3px 8px 3px 0;font-weight:600;color:#475569;">Site</th>
            <th style="text-align:left;padding:3px 8px 3px 0;font-weight:600;color:#475569;">Batch</th>
            <th style="text-align:left;padding:3px 0;font-weight:600;color:#475569;">Next Due</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>`;
    }
    if (ps.procedures && procedures.length > 0) {
      const items = procedures.map(p =>
        `<div style="font-size:12px;margin:2px 0;"><span style="font-weight:600;">${esc(p.name)}</span>${p.notes ? `<span style="color:#64748b;"> — ${esc(p.notes)}</span>` : ''}</div>`
      ).join('');
      body += sectionTitle('Procedures Performed') + items;
    }
    (pad.customFields ?? []).forEach((cf: any) => {
      if (cf.label) body += `<div style="margin:6px 0;font-size:13px;"><span style="font-weight:700;color:#64748b;text-transform:uppercase;font-size:11px;">${esc(cf.label)}: </span>${esc(cf.value)}</div>`;
    });

    const signature = `
      <div style="margin-top:48px;display:flex;justify-content:flex-end;">
        <div style="text-align:center;padding-top:4px;min-width:160px;">
          ${eSignUrl ? `<img src="${esc(eSignUrl)}" alt="Signature" style="max-height:48px;max-width:160px;object-fit:contain;display:block;margin:0 auto 4px;" />` : ''}
          <div style="border-top:1px solid #475569;padding-top:4px;font-size:12px;color:#475569;">
            ${esc(doctorDisplayName)}<br/>
            ${pad.degrees ? `<span style="color:#94a3b8;">${esc(pad.degrees)}</span>` : ''}
          </div>
        </div>
      </div>`;

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
        <div style="flex:1;text-align:center;font-size:9px;color:#94a3b8;padding:0 8px;">
          ${pad.footerNote ? esc(pad.footerNote) : ''}
        </div>
        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
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
                <div className="text-right text-xs text-slate-500 max-w-[45%] shrink-0 break-words">
                  {(clinicName || pad.clinicName) && <div className="font-semibold text-slate-700">{clinicName || pad.clinicName}</div>}
                  {(clinicAddress || pad.address) && <div>{clinicAddress || pad.address}</div>}
                  {(clinicPhone || pad.phone) && <div>📞 {clinicPhone || pad.phone}</div>}
                  {pad.email && <div>✉ {pad.email}</div>}
                  {pad.showTimings && pad.timings && <div>⏰ {pad.timings}</div>}
                </div>
              </div>
            </div>

            {/* Patient row */}
            <div className="flex flex-wrap gap-x-5 gap-y-1 bg-slate-50 rounded px-3 py-2 text-xs mb-3">
              <div><span className="text-slate-400">Patient: </span><span className="font-semibold">{patient.name}</span></div>
              <div><span className="text-slate-400">Age/Sex: </span><span className="font-semibold">{patientAge}Y/{patient.gender}</span></div>
              <div><span className="text-slate-400">Date: </span><span className="font-semibold">{today}</span></div>
              {patient.mrn && <div><span className="text-slate-400">MRN: </span><span className="font-semibold">{patient.mrn}</span></div>}
              {ps.vitalsRow && draft.vitals.bp && <div><span className="text-slate-400">BP: </span><span className="font-semibold">{draft.vitals.bp}</span></div>}
              {ps.vitalsRow && draft.vitals.hr && <div><span className="text-slate-400">Pulse: </span><span className="font-semibold">{draft.vitals.hr}/min</span></div>}
              {ps.vitalsRow && draft.vitals.temp && <div><span className="text-slate-400">Temp: </span><span className="font-semibold">{draft.vitals.temp}°C</span></div>}
              {ps.vitalsRow && draft.vitals.spo2 && <div><span className="text-slate-400">SpO2: </span><span className="font-semibold">{draft.vitals.spo2}%</span></div>}
              {ps.vitalsRow && draft.vitals.rr && <div><span className="text-slate-400">RR: </span><span className="font-semibold">{draft.vitals.rr}/min</span></div>}
              {ps.vitalsRow && draft.vitals.weight && <div><span className="text-slate-400">Wt: </span><span className="font-semibold">{draft.vitals.weight}kg</span></div>}
              {ps.vitalsRow && bmiVal && <div><span className="text-slate-400">BMI: </span><span className="font-semibold">{bmiVal}</span></div>}
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

            {/* Past & Family History */}
            {((draft.comorbidities?.length ?? 0) > 0 || draft.pastMedical?.trim() || draft.pastSurgical?.trim() || draft.familyHistory?.trim() || draft.socialHistory?.trim() || draft.allergiesNote?.trim() || draft.currentMeds?.trim()) && (
              <div className="mb-2">
                <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: theme }}>Past &amp; Family History</div>
                {draft.comorbidities && draft.comorbidities.length > 0 && <div className="text-sm"><span className="text-slate-400">Comorbidities: </span>{draft.comorbidities.join(', ')}</div>}
                {draft.pastMedical?.trim() && <div className="text-sm"><span className="text-slate-400">Past Medical: </span>{draft.pastMedical}</div>}
                {draft.pastSurgical?.trim() && <div className="text-sm"><span className="text-slate-400">Past Surgical: </span>{draft.pastSurgical}</div>}
                {draft.familyHistory?.trim() && <div className="text-sm"><span className="text-slate-400">Family H/o: </span>{draft.familyHistory}</div>}
                {draft.socialHistory?.trim() && <div className="text-sm"><span className="text-slate-400">Social: </span>{draft.socialHistory}</div>}
                {draft.allergiesNote?.trim() && <div className="text-sm"><span className="text-slate-400">Allergies: </span>{draft.allergiesNote}</div>}
                {draft.currentMeds?.trim() && <div className="text-sm"><span className="text-slate-400">Current Meds: </span>{draft.currentMeds}</div>}
              </div>
            )}

            {/* Examination — general signs, body-map notes, general & systemic findings */}
            {ps.specialtyExam && (draft.bodySigns?.length || (draft.bodyNotes && Object.values(draft.bodyNotes).some(v => v?.trim())) || draft.generalExam?.trim() || draft.systemicExam?.trim()) && (
              <div className="mb-3">
                <div className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: theme }}>Examination</div>
                {draft.bodySigns && draft.bodySigns.length > 0 && <div className="text-sm mb-1"><span className="text-slate-400">General signs: </span>{draft.bodySigns.join(', ')}</div>}
                {draft.generalExam?.trim() && <div className="text-sm mb-1"><span className="text-slate-400">General: </span>{draft.generalExam}</div>}
                {draft.systemicExam?.trim() && <div className="text-sm mb-1"><span className="text-slate-400">Systemic: </span>{draft.systemicExam}</div>}
                {draft.bodyNotes && Object.entries(draft.bodyNotes).filter(([, v]) => v?.trim()).map(([k, v]) => (
                  <div key={k} className="text-xs text-slate-600"><span className="text-slate-400">{k}: </span>{v}</div>
                ))}
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

            {/* Examination (specialty modules — psychiatry always excluded) */}
            {ps.specialtyExam && specialtyExam && (() => {
              const sp = specialtyExam;
              const has = (...keys: string[]) => keys.some(k => sp[k]?.trim());
              const Row = ({ label, val }: { label: string; val?: string }) =>
                val?.trim() ? (
                  <div className="flex gap-2 text-xs mb-1">
                    <span className="text-slate-400 min-w-[110px] flex-shrink-0">{label}</span>
                    <span className="font-medium text-slate-800">{val}</span>
                  </div>
                ) : null;
              const DualRow = ({ label, re, le }: { label: string; re?: string; le?: string }) =>
                (re?.trim() || le?.trim()) ? (
                  <div className="flex gap-2 text-xs mb-1">
                    <span className="text-slate-400 min-w-[110px] flex-shrink-0">{label}</span>
                    <span className="font-medium text-slate-800">RE: {re || '—'} &nbsp;|&nbsp; LE: {le || '—'}</span>
                  </div>
                ) : null;
              const Sub = ({ title }: { title: string }) => (
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-2 mb-1 border-b border-slate-100 pb-0.5">{title}</div>
              );

              const hasOphth = has('va_re_ucva','va_re_bcva','va_le_ucva','va_le_bcva','iop_re','iop_le','refx_re_sph','refx_le_sph','ant_re','ant_le','post_re','post_le','add_power');
              const hasDent  = has('dent_tooth_fdi','dent_diagnosis','dent_procedure','dent_material','dent_post_op','dent_xray_findings');
              const hasSurg  = has('surg_procedure_name','surg_pre_op_dx','surg_post_op_dx','surg_intraop','surg_postop','surg_anaesthesia','surg_implant');
              const hasOrth  = has('orth_region','orth_laterality','orth_mechanism','orth_xray','orth_mri_ct','orth_fracture_type','orth_implant');
              const hasDerm  = has('derm_primary_lesion','derm_secondary_lesion','derm_distribution','derm_site','derm_dermoscopy','derm_biopsy','derm_treatment');
              const hasObg   = has('obg_lmp','obg_edd','obg_ga_weeks','obg_gravida','obg_para','obg_presentation','obg_pv_findings','obg_usg');
              const hasPaed  = has('paed_apgar_1','paed_apgar_5','paed_birth_wt','paed_ga_birth','paed_dev_motor','paed_dev_language','paed_immunisation','paed_notes');
              const hasGm    = has('gm_built','gm_pallor','gm_icterus','gm_cyanosis','gm_clubbing','gm_oedema','gm_lymph','gm_jvp');
              const anyData  = hasOphth || hasDent || hasSurg || hasOrth || hasDerm || hasObg || hasPaed || hasGm;
              if (!anyData) return null;

              return (
                <div className="mb-3">
                  <div className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: theme }}>Examination</div>

                  {hasOphth && <>
                    <Sub title="Ophthalmic" />
                    <DualRow label="VA (UCVA/BCVA)" re={[sp.va_re_ucva,sp.va_re_bcva].filter(Boolean).join('/')} le={[sp.va_le_ucva,sp.va_le_bcva].filter(Boolean).join('/')} />
                    <DualRow label="IOP" re={sp.iop_re ? `${sp.iop_re} mmHg` : ''} le={sp.iop_le ? `${sp.iop_le} mmHg` : ''} />
                    <DualRow label="Refraction" re={[sp.refx_re_sph && `Sph ${sp.refx_re_sph}`,sp.refx_re_cyl && `Cyl ${sp.refx_re_cyl}`,sp.refx_re_axis && `Axis ${sp.refx_re_axis}`].filter(Boolean).join(' ')} le={[sp.refx_le_sph && `Sph ${sp.refx_le_sph}`,sp.refx_le_cyl && `Cyl ${sp.refx_le_cyl}`,sp.refx_le_axis && `Axis ${sp.refx_le_axis}`].filter(Boolean).join(' ')} />
                    {sp.add_power && <Row label="Add Power" val={sp.add_power} />}
                    <DualRow label="Anterior Segment" re={sp.ant_re} le={sp.ant_le} />
                    <DualRow label="Posterior Segment" re={sp.post_re} le={sp.post_le} />
                  </>}

                  {hasDent && <>
                    <Sub title="Dental" />
                    <Row label="Tooth (FDI)" val={sp.dent_tooth_fdi} />
                    <Row label="Dental Diagnosis" val={sp.dent_diagnosis} />
                    <Row label="Procedure" val={sp.dent_procedure} />
                    <Row label="Material" val={sp.dent_material} />
                    {sp.dent_local_anaesthetic && sp.dent_local_anaesthetic !== 'Not used' && <Row label="Local Anaesthetic" val={sp.dent_local_anaesthetic} />}
                    {sp.dent_xray_type && sp.dent_xray_type !== 'Not taken' && <Row label="Radiograph" val={sp.dent_xray_type} />}
                    <Row label="Radiographic Findings" val={sp.dent_xray_findings} />
                    {sp.dent_ohi_score && <Row label="OHI Score" val={sp.dent_ohi_score} />}
                    <Row label="Post-op Instructions" val={sp.dent_post_op} />
                  </>}

                  {hasSurg && <>
                    <Sub title="Surgical Notes" />
                    <Row label="Procedure" val={sp.surg_procedure_name} />
                    <Row label="Pre-op Diagnosis" val={sp.surg_pre_op_dx} />
                    <Row label="Post-op Diagnosis" val={sp.surg_post_op_dx} />
                    <Row label="Anaesthesia" val={sp.surg_anaesthesia} />
                    {sp.surg_duration_min && <Row label="Duration" val={`${sp.surg_duration_min} min`} />}
                    {sp.surg_blood_loss_ml && <Row label="Blood Loss" val={`${sp.surg_blood_loss_ml} ml`} />}
                    <Row label="Implant / Device" val={sp.surg_implant} />
                    <Row label="Intraoperative Findings" val={sp.surg_intraop} />
                    <Row label="Post-op Instructions" val={sp.surg_postop} />
                  </>}

                  {hasOrth && <>
                    <Sub title="Orthopaedic" />
                    <Row label="Region / Laterality" val={[sp.orth_region,sp.orth_laterality].filter(Boolean).join(' — ')} />
                    <Row label="Mechanism of Injury" val={sp.orth_mechanism} />
                    <Row label="X-ray Findings" val={sp.orth_xray} />
                    <Row label="MRI / CT Findings" val={sp.orth_mri_ct} />
                    <Row label="Fracture Type" val={sp.orth_fracture_type} />
                    <Row label="Implant / Fixation" val={sp.orth_implant} />
                  </>}

                  {hasDerm && <>
                    <Sub title="Dermatology" />
                    <Row label="Primary Lesion" val={sp.derm_primary_lesion} />
                    <Row label="Secondary Lesion" val={sp.derm_secondary_lesion} />
                    <Row label="Distribution" val={sp.derm_distribution} />
                    <Row label="Site" val={sp.derm_site} />
                    <Row label="Dermatoscopy" val={sp.derm_dermoscopy} />
                    {sp.derm_biopsy && sp.derm_biopsy !== 'Not sent' && <Row label="Biopsy" val={sp.derm_biopsy} />}
                    <Row label="Treatment Plan" val={sp.derm_treatment} />
                  </>}

                  {hasObg && <>
                    <Sub title="Obstetric & Gynaecology" />
                    {sp.obg_lmp && <Row label="LMP" val={sp.obg_lmp} />}
                    {sp.obg_edd && <Row label="EDD" val={sp.obg_edd} />}
                    {sp.obg_ga_weeks && <Row label="Gestational Age" val={`${sp.obg_ga_weeks} weeks (${sp.obg_ga_source || 'LMP'})`} />}
                    {[sp.obg_gravida && `G${sp.obg_gravida}`,sp.obg_para && `P${sp.obg_para}`,sp.obg_live && `L${sp.obg_live}`,sp.obg_abortion && `A${sp.obg_abortion}`].filter(Boolean).length > 0 &&
                      <Row label="Obstetric History" val={[sp.obg_gravida && `G${sp.obg_gravida}`,sp.obg_para && `P${sp.obg_para}`,sp.obg_live && `L${sp.obg_live}`,sp.obg_abortion && `A${sp.obg_abortion}`].filter(Boolean).join(' ')} />}
                    <Row label="Presentation" val={sp.obg_presentation} />
                    <Row label="P/V Findings" val={sp.obg_pv_findings} />
                    <Row label="USG Summary" val={sp.obg_usg} />
                  </>}

                  {hasPaed && <>
                    <Sub title="Paediatrics" />
                    {(sp.paed_apgar_1 || sp.paed_apgar_5) && <Row label="APGAR" val={[sp.paed_apgar_1 && `1 min: ${sp.paed_apgar_1}`,sp.paed_apgar_5 && `5 min: ${sp.paed_apgar_5}`].filter(Boolean).join(' | ')} />}
                    {sp.paed_birth_wt && <Row label="Birth Weight" val={`${sp.paed_birth_wt} kg`} />}
                    {sp.paed_ga_birth && <Row label="GA at Birth" val={`${sp.paed_ga_birth} weeks`} />}
                    <Row label="Milestones" val={[sp.paed_dev_motor && `Motor: ${sp.paed_dev_motor}`,sp.paed_dev_language && `Language: ${sp.paed_dev_language}`].filter(Boolean).join(' · ')} />
                    <Row label="Immunisation" val={sp.paed_immunisation} />
                    <Row label="Notes" val={sp.paed_notes} />
                  </>}

                  {hasGm && (() => {
                    const findings = [
                      sp.gm_built && `Built: ${sp.gm_built}`,
                      sp.gm_pallor && sp.gm_pallor !== 'Absent' && `Pallor: ${sp.gm_pallor}`,
                      sp.gm_icterus && sp.gm_icterus !== 'Absent' && `Icterus: ${sp.gm_icterus}`,
                      sp.gm_cyanosis && sp.gm_cyanosis !== 'Absent' && `Cyanosis: ${sp.gm_cyanosis}`,
                      sp.gm_clubbing && sp.gm_clubbing !== 'Absent' && `Clubbing: ${sp.gm_clubbing}`,
                      sp.gm_oedema && sp.gm_oedema !== 'Absent' && `Oedema: ${sp.gm_oedema}`,
                      sp.gm_lymph && sp.gm_lymph !== 'Not palpable' && `LN: ${sp.gm_lymph}`,
                      sp.gm_jvp && sp.gm_jvp !== 'Normal' && `JVP: ${sp.gm_jvp}`,
                    ].filter(Boolean).join('  ·  ');
                    return findings ? <><Sub title="Clinical Findings" /><div className="text-xs text-slate-800">{findings}</div></> : null;
                  })()}
                </div>
              );
            })()}

            {/* Rx */}
            {ps.rx && draft.rxRows.some(r => r.drug.trim()) && (
              <div className="mb-3">
                <div className="text-xl font-bold mb-2" style={{ color: theme }}>℞</div>
                {draft.rxRows.filter(r => r.drug.trim()).map((r, i) => (
                  <div key={r.id} className="mb-2.5">
                    <div className="font-semibold text-sm">
                      {i + 1}. {r.form && r.form !== 'Tab' ? `${r.form}. ` : 'Tab. '}{stripConc(cleanDrug(r.drug))}
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

            {/* Referral */}
            {ps.referral && draft.referredTo && (
              <div className="mb-4">
                <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: theme }}>Referral</div>
                <div className="text-sm">Referred to: <strong>{draft.referredTo}</strong></div>
              </div>
            )}

            {/* Vaccines */}
            {ps.vaccines && vaccines.length > 0 && (
              <div className="mb-4">
                <div className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: theme }}>Vaccines Given</div>
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b" style={{ borderColor: theme + '40' }}>
                      <th className="text-left py-1 pr-3 font-semibold text-slate-600">Vaccine</th>
                      <th className="text-left py-1 pr-3 font-semibold text-slate-600">Site</th>
                      <th className="text-left py-1 pr-3 font-semibold text-slate-600">Batch</th>
                      <th className="text-left py-1 font-semibold text-slate-600">Next Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vaccines.map(v => (
                      <tr key={v.id} className="border-b border-slate-100">
                        <td className="py-1 pr-3 font-medium text-slate-800">{v.name}</td>
                        <td className="py-1 pr-3 text-slate-600">{v.site || '—'}</td>
                        <td className="py-1 pr-3 text-slate-600">{v.batchNo || '—'}</td>
                        <td className="py-1 text-slate-600">{v.nextDueDate ? new Date(v.nextDueDate).toLocaleDateString('en-IN') : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Procedures */}
            {ps.procedures && procedures.length > 0 && (
              <div className="mb-4">
                <div className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: theme }}>Procedures Performed</div>
                <div className="space-y-0.5">
                  {procedures.map(p => (
                    <div key={p.id} className="text-xs text-slate-700">
                      <span className="font-medium">{p.name}</span>
                      {p.notes && <span className="text-slate-500"> — {p.notes}</span>}
                    </div>
                  ))}
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
              <div className="text-center min-w-[144px]">
                {eSignUrl && (
                  <img src={eSignUrl} alt="Signature" className="max-h-12 max-w-[144px] object-contain mx-auto mb-1" />
                )}
                <div className="border-t border-slate-400 pt-1 text-xs text-slate-500">
                  {doctorDisplayName}<br />
                  {pad.degrees && <span className="text-slate-400">{pad.degrees}</span>}
                </div>
              </div>
            </div>

            {/* Fixed footer — QR | footer note | Vyasa branding */}
            <div className="mt-5 pt-2 border-t border-slate-200 flex items-center gap-2">
              {bookingUrl && (
                <div className="flex flex-col items-center flex-shrink-0">
                  <img src={qrSrc} width={44} height={44} alt="Scan to book" className="rounded border border-slate-200" />
                  <span className="text-[8px] text-slate-400 mt-0.5">Scan to Book</span>
                </div>
              )}
              <div className="flex-1 text-center text-[9px] text-slate-400 px-2">
                {pad.footerNote}
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
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

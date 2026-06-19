import React, { useEffect } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SpecialtyKey =
  | 'ophthalmology' | 'psychiatry' | 'dentistry' | 'surgery'
  | 'orthopaedics'  | 'dermatology' | 'obg'       | 'paediatrics'
  | 'general_medicine';

type Data = Record<string, string>;

interface Props {
  specialtyKey: SpecialtyKey;
  data: Data;
  onChange: (key: string, val: string) => void;
}

// ─── Placement: 'exam' = inside Examination section, 'procedure' = own Section ─

export function specialtyPlacement(key: SpecialtyKey): 'exam' | 'procedure' {
  return (['surgery', 'dentistry', 'psychiatry'] as SpecialtyKey[]).includes(key)
    ? 'procedure'
    : 'exam';
}

export function specialtyLabel(key: SpecialtyKey): string {
  const map: Record<SpecialtyKey, string> = {
    ophthalmology: 'Ophthalmic Examination',
    psychiatry: 'Psychiatric Assessment',
    dentistry: 'Dental Examination',
    surgery: 'Surgical Notes',
    orthopaedics: 'Orthopaedic Examination',
    dermatology: 'Dermatological Examination',
    obg: 'Obstetric & Gynaecology',
    paediatrics: 'Paediatric Assessment',
    general_medicine: 'Clinical Findings',
  };
  return map[key];
}

// ─── Specialty detection from user.specialty string ───────────────────────────

export function detectSpecialty(specialty?: string): SpecialtyKey | null {
  const s = (specialty ?? '').toLowerCase();
  if (s.includes('ophthal') || s.includes('eye'))                          return 'ophthalmology';
  if (s.includes('psychiat') || s.includes('mental health'))               return 'psychiatry';
  if (s.includes('dent') || s.includes('oral') || s.includes('dental'))   return 'dentistry';
  if (s.includes('surg'))                                                   return 'surgery';
  if (s.includes('ortho'))                                                  return 'orthopaedics';
  if (s.includes('derm') || s.includes('skin'))                            return 'dermatology';
  if (s.includes('obg') || s.includes('gynae') || s.includes('obstet') || s.includes('gynaecol')) return 'obg';
  if (s.includes('paed') || s.includes('pedi') || s.includes('child'))    return 'paediatrics';
  // General medicine / MBBS / family → null so default GP modules show instead
  return null;
}

// All available specialty modules (general_medicine excluded — body diagram covers those signs)
export const ALL_SPECIALTY_MODULES: SpecialtyKey[] = [
  'ophthalmology', 'surgery', 'dentistry', 'psychiatry',
  'orthopaedics', 'dermatology', 'obg', 'paediatrics',
];

export const MODULE_META: Record<SpecialtyKey, { icon: string; short: string }> = {
  ophthalmology:    { icon: '👁',  short: 'Eye Exam'   },
  surgery:          { icon: '✂',  short: 'Surgery'     },
  dentistry:        { icon: '🦷', short: 'Dental'      },
  psychiatry:       { icon: '🧠', short: 'Psych'       },
  orthopaedics:     { icon: '🦴', short: 'Ortho'       },
  dermatology:      { icon: '🩺', short: 'Derma'       },
  obg:              { icon: '🤰', short: 'OBG'         },
  paediatrics:      { icon: '👶', short: 'Paediatrics' },
  general_medicine: { icon: '💊', short: 'General'     },
};

export const SPECIALTY_COLORS: Record<SpecialtyKey, string> = {
  ophthalmology:    '#3b82f6',
  surgery:          '#ef4444',
  dentistry:        '#06b6d4',
  psychiatry:       '#8b5cf6',
  orthopaedics:     '#f59e0b',
  dermatology:      '#ec4899',
  obg:              '#f43f5e',
  paediatrics:      '#22c55e',
  general_medicine: '#64748b',
};

// ─── Shared primitive components ──────────────────────────────────────────────

function Lbl({ children }: { children: React.ReactNode }) {
  return <span className="text-xs font-medium text-slate-500 block mb-0.5">{children}</span>;
}

function Sub({ children }: { children: React.ReactNode }) {
  return <div className="text-xs font-semibold text-teal-700 uppercase tracking-wide mt-3 mb-1.5 first:mt-0">{children}</div>;
}

function Inp({ field, data, onChange, placeholder, type = 'text', cls = '' }: {
  field: string; data: Data; onChange: (k: string, v: string) => void;
  placeholder?: string; type?: string; cls?: string;
}) {
  return (
    <input type={type} value={data[field] ?? ''} onChange={e => onChange(field, e.target.value)}
      placeholder={placeholder}
      className={`w-full text-sm px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white ${cls}`} />
  );
}

function Sel({ field, data, onChange, opts }: {
  field: string; data: Data; onChange: (k: string, v: string) => void;
  opts: string[];
}) {
  return (
    <select value={data[field] ?? ''} onChange={e => onChange(field, e.target.value)}
      className="w-full text-sm px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white">
      <option value="">—</option>
      {opts.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function Txt({ field, data, onChange, placeholder, rows = 2 }: {
  field: string; data: Data; onChange: (k: string, v: string) => void;
  placeholder?: string; rows?: number;
}) {
  return (
    <textarea rows={rows} value={data[field] ?? ''} onChange={e => onChange(field, e.target.value)}
      placeholder={placeholder}
      className="w-full text-sm px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white resize-none" />
  );
}

// ─── 1. General Medicine ──────────────────────────────────────────────────────

function GeneralMedicineFields({ data, onChange }: { data: Data; onChange: (k: string, v: string) => void }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5">
      {([
        ['Built',     'gm_built',    ['Well-nourished', 'Malnourished', 'Obese', 'Cachectic']],
        ['Pallor',    'gm_pallor',   ['Absent', 'Present', 'Severe']],
        ['Icterus',   'gm_icterus',  ['Absent', 'Present']],
        ['Cyanosis',  'gm_cyanosis', ['Absent', 'Central', 'Peripheral', 'Both']],
        ['Clubbing',  'gm_clubbing', ['Absent', 'Grade I', 'Grade II', 'Grade III', 'Grade IV']],
        ['Oedema',    'gm_oedema',   ['Absent', 'Present (pitting)', 'Present (non-pitting)', 'Anasarca']],
        ['Lymph nodes','gm_lymph',   ['Not palpable', 'Cervical', 'Axillary', 'Inguinal', 'Generalised']],
        ['JVP',       'gm_jvp',      ['Normal', 'Raised', 'Not assessed']],
      ] as [string, string, string[]][]).map(([label, key, opts]) => (
        <div key={key}>
          <Lbl>{label}</Lbl>
          <Sel field={key} data={data} onChange={onChange} opts={opts} />
        </div>
      ))}
    </div>
  );
}

// ─── 2. Ophthalmology ────────────────────────────────────────────────────────

function OphthalmologyFields({ data, onChange }: { data: Data; onChange: (k: string, v: string) => void }) {
  return (
    <div className="space-y-3">
      <Sub>Visual Acuity</Sub>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr>
            <th className="text-left text-xs text-slate-500 font-semibold pb-1 w-10" />
            <th className="text-left text-xs text-slate-500 font-semibold pb-1 pr-2">UCVA (Unaided)</th>
            <th className="text-left text-xs text-slate-500 font-semibold pb-1">BCVA (Aided)</th>
          </tr></thead>
          <tbody>
            {[['RE','va_re_ucva','va_re_bcva'],['LE','va_le_ucva','va_le_bcva']].map(([eye,k1,k2])=>(
              <tr key={eye}>
                <td className="font-bold text-slate-600 pr-2 py-1">{eye}</td>
                <td className="pr-2 py-1"><Inp field={k1} data={data} onChange={onChange} placeholder="6/6" /></td>
                <td className="py-1"><Inp field={k2} data={data} onChange={onChange} placeholder="6/6" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Sub>IOP (mmHg)</Sub>
      <div className="grid grid-cols-2 gap-3">
        <div><Lbl>RE</Lbl><Inp field="iop_re" data={data} onChange={onChange} placeholder="14" type="number" /></div>
        <div><Lbl>LE</Lbl><Inp field="iop_le" data={data} onChange={onChange} placeholder="16" type="number" /></div>
      </div>

      <Sub>Refraction</Sub>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr>
            <th className="text-left text-xs text-slate-500 font-semibold pb-1 w-10" />
            <th className="text-left text-xs text-slate-500 font-semibold pb-1 pr-2">Sph</th>
            <th className="text-left text-xs text-slate-500 font-semibold pb-1 pr-2">Cyl</th>
            <th className="text-left text-xs text-slate-500 font-semibold pb-1">Axis</th>
          </tr></thead>
          <tbody>
            {[['RE','refx_re_sph','refx_re_cyl','refx_re_axis'],['LE','refx_le_sph','refx_le_cyl','refx_le_axis']].map(([eye,k1,k2,k3])=>(
              <tr key={eye}>
                <td className="font-bold text-slate-600 pr-2 py-1">{eye}</td>
                <td className="pr-2 py-1"><Inp field={k1} data={data} onChange={onChange} placeholder="-2.00" cls="w-20" /></td>
                <td className="pr-2 py-1"><Inp field={k2} data={data} onChange={onChange} placeholder="-0.50" cls="w-20" /></td>
                <td className="py-1"><Inp field={k3} data={data} onChange={onChange} placeholder="180" cls="w-20" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-3">
        <Lbl>Add (presbyopia)</Lbl>
        <div className="w-28"><Inp field="add_power" data={data} onChange={onChange} placeholder="+1.50" /></div>
      </div>

      <Sub>Segment Findings</Sub>
      <div className="grid grid-cols-2 gap-3">
        <div><Lbl>Anterior — RE</Lbl><Txt field="ant_re" data={data} onChange={onChange} placeholder="Cornea clear, AC deep…" /></div>
        <div><Lbl>Anterior — LE</Lbl><Txt field="ant_le" data={data} onChange={onChange} placeholder="Cornea clear, AC deep…" /></div>
        <div><Lbl>Posterior — RE</Lbl><Txt field="post_re" data={data} onChange={onChange} placeholder="Disc normal, macula healthy…" /></div>
        <div><Lbl>Posterior — LE</Lbl><Txt field="post_le" data={data} onChange={onChange} placeholder="Disc normal, macula healthy…" /></div>
      </div>
    </div>
  );
}

// ─── 3. Orthopaedics ─────────────────────────────────────────────────────────

function OrthopaedicsFields({ data, onChange }: { data: Data; onChange: (k: string, v: string) => void }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><Lbl>Affected Region</Lbl><Inp field="orth_region" data={data} onChange={onChange} placeholder="e.g. Left Knee, L4-L5" /></div>
        <div><Lbl>Laterality</Lbl><Sel field="orth_laterality" data={data} onChange={onChange} opts={['Left','Right','Bilateral','Midline']} /></div>
      </div>
      <div><Lbl>Mechanism of Injury</Lbl><Txt field="orth_mechanism" data={data} onChange={onChange} placeholder="RTA, fall, sports, overuse…" /></div>
      <div><Lbl>X-ray Findings</Lbl><Txt field="orth_xray" data={data} onChange={onChange} placeholder="Fracture type, joint space, alignment…" /></div>
      <div><Lbl>MRI / CT Findings</Lbl><Txt field="orth_mri_ct" data={data} onChange={onChange} placeholder="Ligament tear, disc herniation…" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Lbl>Fracture Type</Lbl><Inp field="orth_fracture_type" data={data} onChange={onChange} placeholder="e.g. Colles, Compound" /></div>
        <div><Lbl>Implant</Lbl><Inp field="orth_implant" data={data} onChange={onChange} placeholder="e.g. DHS, TKR" /></div>
      </div>
    </div>
  );
}

// ─── 4. Dermatology ──────────────────────────────────────────────────────────

function DermatologyFields({ data, onChange }: { data: Data; onChange: (k: string, v: string) => void }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Lbl>Primary Lesion</Lbl>
          <Sel field="derm_primary_lesion" data={data} onChange={onChange}
            opts={['Macule','Papule','Plaque','Vesicle','Bulla','Pustule','Nodule','Wheal','Patch']} />
        </div>
        <div>
          <Lbl>Secondary Lesion</Lbl>
          <Sel field="derm_secondary_lesion" data={data} onChange={onChange}
            opts={['Scale','Crust','Erosion','Ulcer','Fissure','Lichenification','Scar','Excoriation']} />
        </div>
        <div>
          <Lbl>Distribution</Lbl>
          <Sel field="derm_distribution" data={data} onChange={onChange}
            opts={['Localised','Generalised','Dermatomal','Acral','Intertriginous','Sun-exposed','Follicular']} />
        </div>
        <div>
          <Lbl>Biopsy</Lbl>
          <Sel field="derm_biopsy" data={data} onChange={onChange}
            opts={['Not sent','Sent — pending','Results received']} />
        </div>
      </div>
      <div><Lbl>Site Description</Lbl><Txt field="derm_site" data={data} onChange={onChange} placeholder="Location, size, shape, colour, border, surface…" /></div>
      <div><Lbl>Dermatoscopy Findings</Lbl><Txt field="derm_dermoscopy" data={data} onChange={onChange} placeholder="Pigment network, vessels, structures…" /></div>
      <div><Lbl>Treatment Approach</Lbl><Txt field="derm_treatment" data={data} onChange={onChange} placeholder="Topical / systemic / procedural plan…" /></div>
    </div>
  );
}

// ─── 5. OBG ──────────────────────────────────────────────────────────────────

function ObgFields({ data, onChange }: { data: Data; onChange: (k: string, v: string) => void }) {
  // Auto-compute EDD from LMP
  useEffect(() => {
    if (!data['obg_lmp']) return;
    const lmp = new Date(data['obg_lmp']);
    if (isNaN(lmp.getTime())) return;
    lmp.setDate(lmp.getDate() + 280);
    const edd = lmp.toISOString().slice(0, 10);
    if (data['obg_edd'] !== edd) onChange('obg_edd', edd);
    // GA in weeks
    const gaMs = Date.now() - new Date(data['obg_lmp']).getTime();
    const gaWk = Math.floor(gaMs / (7 * 24 * 3600 * 1000));
    if (gaWk > 0 && gaWk < 44) onChange('obg_ga_weeks', String(gaWk));
  }, [data['obg_lmp']]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div><Lbl>LMP</Lbl><Inp field="obg_lmp" data={data} onChange={onChange} type="date" /></div>
        <div><Lbl>EDD (auto)</Lbl><Inp field="obg_edd" data={data} onChange={onChange} type="date" /></div>
        <div><Lbl>GA (weeks)</Lbl><Inp field="obg_ga_weeks" data={data} onChange={onChange} placeholder="12" type="number" /></div>
      </div>
      <div className="grid grid-cols-4 gap-3">
        <div><Lbl>Gravida</Lbl><Inp field="obg_gravida" data={data} onChange={onChange} placeholder="G2" type="number" /></div>
        <div><Lbl>Para</Lbl><Inp field="obg_para" data={data} onChange={onChange} placeholder="P1" type="number" /></div>
        <div><Lbl>Live</Lbl><Inp field="obg_live" data={data} onChange={onChange} placeholder="1" type="number" /></div>
        <div><Lbl>Abortion</Lbl><Inp field="obg_abortion" data={data} onChange={onChange} placeholder="0" type="number" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Lbl>GA Source</Lbl>
          <Sel field="obg_ga_source" data={data} onChange={onChange} opts={['LMP','USS','Both']} />
        </div>
        <div>
          <Lbl>Presentation</Lbl>
          <Sel field="obg_presentation" data={data} onChange={onChange}
            opts={['Cephalic','Breech','Transverse','Oblique','Not applicable']} />
        </div>
      </div>
      <div><Lbl>P/V / Speculum Findings</Lbl><Txt field="obg_pv_findings" data={data} onChange={onChange} placeholder="Cervix findings, os, discharge…" /></div>
      <div><Lbl>USG Report Summary</Lbl><Txt field="obg_usg" data={data} onChange={onChange} placeholder="BPD, HC, AC, FL, AFI, placenta…" /></div>
    </div>
  );
}

// ─── 6. Paediatrics ──────────────────────────────────────────────────────────

function PaediatricsFields({ data, onChange }: { data: Data; onChange: (k: string, v: string) => void }) {
  return (
    <div className="space-y-3">
      <Sub>Birth History</Sub>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div><Lbl>APGAR @ 1 min</Lbl><Inp field="paed_apgar_1" data={data} onChange={onChange} placeholder="0–10" type="number" /></div>
        <div><Lbl>APGAR @ 5 min</Lbl><Inp field="paed_apgar_5" data={data} onChange={onChange} placeholder="0–10" type="number" /></div>
        <div><Lbl>Birth weight (kg)</Lbl><Inp field="paed_birth_wt" data={data} onChange={onChange} placeholder="3.2" type="number" /></div>
        <div><Lbl>GA at birth (wk)</Lbl><Inp field="paed_ga_birth" data={data} onChange={onChange} placeholder="38" type="number" /></div>
      </div>
      <Sub>Developmental Milestones</Sub>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Lbl>Social / Gross motor</Lbl>
          <Sel field="paed_dev_motor" data={data} onChange={onChange} opts={['Age appropriate','Delayed','Advanced']} />
        </div>
        <div>
          <Lbl>Language / Fine motor</Lbl>
          <Sel field="paed_dev_language" data={data} onChange={onChange} opts={['Age appropriate','Delayed','Advanced']} />
        </div>
      </div>
      <div>
        <Lbl>Immunisation Status</Lbl>
        <Sel field="paed_immunisation" data={data} onChange={onChange}
          opts={['Up to date','Partially done','Not done','Not known']} />
      </div>
      <div><Lbl>Additional Notes</Lbl><Txt field="paed_notes" data={data} onChange={onChange} placeholder="Feeding, growth, developmental concerns…" /></div>
    </div>
  );
}

// ─── 7. Surgery ──────────────────────────────────────────────────────────────

function SurgeryFields({ data, onChange }: { data: Data; onChange: (k: string, v: string) => void }) {
  return (
    <div className="space-y-3">
      <div><Lbl>Procedure Name</Lbl><Inp field="surg_procedure_name" data={data} onChange={onChange} placeholder="e.g. Appendicectomy, CABG, Hernioplasty" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Lbl>Pre-op Diagnosis</Lbl><Txt field="surg_pre_op_dx" data={data} onChange={onChange} placeholder="Pre-operative diagnosis…" /></div>
        <div><Lbl>Post-op Diagnosis</Lbl><Txt field="surg_post_op_dx" data={data} onChange={onChange} placeholder="Post-operative findings…" /></div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <Lbl>Anaesthesia</Lbl>
          <Sel field="surg_anaesthesia" data={data} onChange={onChange} opts={['GA','Spinal','Epidural','Local','Sedation','Regional']} />
        </div>
        <div><Lbl>Duration (min)</Lbl><Inp field="surg_duration_min" data={data} onChange={onChange} placeholder="90" type="number" /></div>
        <div><Lbl>Blood Loss (ml)</Lbl><Inp field="surg_blood_loss_ml" data={data} onChange={onChange} placeholder="200" type="number" /></div>
        <div><Lbl>Implant Used</Lbl><Inp field="surg_implant" data={data} onChange={onChange} placeholder="e.g. Mesh, Plate" /></div>
      </div>
      <div><Lbl>Intraoperative Findings</Lbl><Txt field="surg_intraop" data={data} onChange={onChange} placeholder="Findings during surgery…" /></div>
      <div><Lbl>Post-op Instructions</Lbl><Txt field="surg_postop" data={data} onChange={onChange} placeholder="Diet, drain care, wound care, restrictions…" /></div>
    </div>
  );
}

// ─── 8. Dentistry ────────────────────────────────────────────────────────────

function DentistryFields({ data, onChange }: { data: Data; onChange: (k: string, v: string) => void }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><Lbl>Tooth No. (FDI)</Lbl><Inp field="dent_tooth_fdi" data={data} onChange={onChange} placeholder="e.g. 16, 26, 46" /></div>
        <div><Lbl>Dental Diagnosis</Lbl><Inp field="dent_diagnosis" data={data} onChange={onChange} placeholder="e.g. Acute pulpitis" /></div>
        <div><Lbl>Procedure Done</Lbl><Inp field="dent_procedure" data={data} onChange={onChange} placeholder="e.g. Root canal treatment" /></div>
        <div><Lbl>Material Used</Lbl><Inp field="dent_material" data={data} onChange={onChange} placeholder="e.g. MTA, GIC, Composite" /></div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Lbl>Local Anaesthetic</Lbl>
          <Sel field="dent_local_anaesthetic" data={data} onChange={onChange}
            opts={['Not used','Lignocaine 2%','Lignocaine 2% + Adrenaline','Articaine 4%','Mepivacaine 3%','Bupivacaine 0.5%']} />
        </div>
        <div>
          <Lbl>Radiograph Type</Lbl>
          <Sel field="dent_xray_type" data={data} onChange={onChange}
            opts={['Not taken','IOPA','Bitewing','OPG','CBCT','Occlusal']} />
        </div>
        <div><Lbl>OHI Score</Lbl><Inp field="dent_ohi_score" data={data} onChange={onChange} placeholder="0–6" type="number" /></div>
      </div>
      {data['dent_xray_type'] && data['dent_xray_type'] !== 'Not taken' && (
        <div><Lbl>Radiographic Findings</Lbl><Txt field="dent_xray_findings" data={data} onChange={onChange} placeholder="Periapical radiolucency at apex of 26…" /></div>
      )}
      <div><Lbl>Post-op Instructions</Lbl><Txt field="dent_post_op" data={data} onChange={onChange} placeholder="Avoid hard foods, warm saline rinse…" /></div>
    </div>
  );
}

// ─── 9. Psychiatry ───────────────────────────────────────────────────────────

function PsychiatryFields({ data, onChange }: { data: Data; onChange: (k: string, v: string) => void }) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200">
        <span className="text-amber-600 mt-0.5">🔒</span>
        <p className="text-xs text-amber-700 font-medium leading-relaxed">
          Clinical notes only — <strong>never printed in the Rx or sent via WhatsApp</strong>.
        </p>
      </div>
      <div><Lbl>Mental Status Examination (MSE)</Lbl><Txt field="psych_mse" data={data} onChange={onChange} rows={3} placeholder="Appearance, behaviour, speech, mood/affect, thought, perception, cognition, insight, judgement…" /></div>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <Lbl>Assessment Scale</Lbl>
          <Sel field="psych_scale_name" data={data} onChange={onChange}
            opts={['PHQ-9','GAD-7','MMSE','CAGE','Y-BOCS','MADRS','PANSS','HAM-D','HAM-A','Other']} />
        </div>
        <div><Lbl>Score</Lbl><Inp field="psych_scale_score" data={data} onChange={onChange} placeholder="e.g. 12" type="number" /></div>
      </div>
      <div><Lbl>DSM-5 Diagnosis</Lbl><Inp field="psych_dsm5_dx" data={data} onChange={onChange} placeholder="e.g. F32.1 — Major Depressive Disorder, moderate" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Lbl>Suicidal Ideation</Lbl>
          <Sel field="psych_suicidal_ideation" data={data} onChange={onChange}
            opts={['None','Passive (no plan)','Active — has plan','Active — intent to act']} />
        </div>
        <div>
          <Lbl>Risk Level</Lbl>
          <Sel field="psych_risk_level" data={data} onChange={onChange} opts={['Low','Moderate','High','Very High / Imminent']} />
        </div>
      </div>
      <div><Lbl>Safety Plan</Lbl><Txt field="psych_safety_plan" data={data} onChange={onChange} placeholder="Crisis contacts, coping strategies, means restriction…" /></div>
      <div><Lbl>Psychotherapy / Next Session Goal</Lbl><Inp field="psych_therapy_goal" data={data} onChange={onChange} placeholder="e.g. Review PHQ-9, introduce sleep hygiene" /></div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function SpecialtyExamSection({ specialtyKey, data, onChange }: Props) {
  switch (specialtyKey) {
    case 'general_medicine': return <GeneralMedicineFields data={data} onChange={onChange} />;
    case 'ophthalmology':    return <OphthalmologyFields data={data} onChange={onChange} />;
    case 'orthopaedics':     return <OrthopaedicsFields data={data} onChange={onChange} />;
    case 'dermatology':      return <DermatologyFields data={data} onChange={onChange} />;
    case 'obg':              return <ObgFields data={data} onChange={onChange} />;
    case 'paediatrics':      return <PaediatricsFields data={data} onChange={onChange} />;
    case 'surgery':          return <SurgeryFields data={data} onChange={onChange} />;
    case 'dentistry':        return <DentistryFields data={data} onChange={onChange} />;
    case 'psychiatry':       return <PsychiatryFields data={data} onChange={onChange} />;
    default:                 return null;
  }
}

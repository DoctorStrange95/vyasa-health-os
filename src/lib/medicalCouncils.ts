// All medical & AYUSH councils — single source of truth for both registration pages

export const INDIAN_MEDICAL_COUNCILS = [
  // ── National Allopathy ──────────────────────────────────────────────────────
  { id: 'nmc',           name: 'National Medical Commission (NMC)' },
  { id: 'mci',           name: 'Medical Council of India (MCI) — legacy' },

  // ── AYUSH National Bodies ───────────────────────────────────────────────────
  { id: 'ccim',          name: 'Central Council of Indian Medicine (CCIM) — Ayurveda / Unani / Siddha' },
  { id: 'cch',           name: 'Central Council of Homeopathy (CCH)' },

  // ── Other National Bodies ───────────────────────────────────────────────────
  { id: 'dci',           name: 'Dental Council of India (DCI)' },
  { id: 'inc',           name: 'Indian Nursing Council (INC)' },
  { id: 'pci',           name: 'Pharmacy Council of India (PCI)' },
  { id: 'rci',           name: 'Rehabilitation Council of India (RCI)' },
  { id: 'imc_natur',     name: 'Indian Medicine Central Council (Naturopathy / Yoga)' },

  // ── State Allopathy Medical Councils ───────────────────────────────────────
  { id: 'apmc',          name: 'Andhra Pradesh Medical Council' },
  { id: 'ammuk',         name: 'Assam Medical Council' },
  { id: 'bmicouncil',    name: 'Bihar Medical Council' },
  { id: 'chhattisgarh',  name: 'Chhattisgarh Medical Council' },
  { id: 'dcmcgnc',       name: 'Delhi Medical Council' },
  { id: 'goamedical',    name: 'Goa Medical Council' },
  { id: 'gmc',           name: 'Gujarat Medical Council' },
  { id: 'haryana',       name: 'Haryana Medical Council' },
  { id: 'himachal',      name: 'Himachal Pradesh Medical Council' },
  { id: 'jharkhand',     name: 'Jharkhand Medical Council' },
  { id: 'kmc',           name: 'Karnataka Medical Council' },
  { id: 'kml',           name: 'Kerala Medical Council' },
  { id: 'mpmc',          name: 'Madhya Pradesh Medical Council' },
  { id: 'mmc',           name: 'Maharashtra Medical Council' },
  { id: 'manipur',       name: 'Manipur Medical Council' },
  { id: 'meghalaya',     name: 'Meghalaya Medical Council' },
  { id: 'mizoram',       name: 'Mizoram Medical Council' },
  { id: 'nagaland',      name: 'Nagaland Medical Council' },
  { id: 'odisha',        name: 'Odisha Medical Council' },
  { id: 'pmc',           name: 'Punjab Medical Council' },
  { id: 'rmc',           name: 'Rajasthan Medical Council' },
  { id: 'sikkim',        name: 'Sikkim Medical Council' },
  { id: 'tmc',           name: 'Tamil Nadu Medical Council' },
  { id: 'tgmedical',     name: 'Telangana Medical Council' },
  { id: 'tripura',       name: 'Tripura Medical Council' },
  { id: 'upmc',          name: 'Uttar Pradesh Medical Council' },
  { id: 'uttarakhand',   name: 'Uttarakhand Medical Council' },
  { id: 'wbmc',          name: 'West Bengal Medical Council' },

  // ── State AYUSH Boards ─────────────────────────────────────────────────────
  { id: 'apayush',       name: 'Andhra Pradesh Board of Indian Medicine (AYUSH)' },
  { id: 'biharboard',    name: 'Bihar State Board of Indian Medicine' },
  { id: 'delhiayush',    name: 'Delhi Board of Ayurvedic & Unani Systems of Medicine' },
  { id: 'gjayush',       name: 'Gujarat Ayurved University / State Board' },
  { id: 'krnayush',      name: 'Karnataka Rajya Ayurveda Mahamandala' },
  { id: 'kerayush',      name: 'Kerala Board of Indian Medicine' },
  { id: 'mpayush',       name: 'Madhya Pradesh Ayurvedic Council' },
  { id: 'mhayush',       name: 'Maharashtra Council of Indian Medicine (MCIM)' },
  { id: 'rjayush',       name: 'Rajasthan Board of Ayurvedic & Unani Medicine' },
  { id: 'tnayush',       name: 'Tamil Nadu Board of Indian Medicine' },
  { id: 'tgayush',       name: 'Telangana Board of Homeopathy & Indian Medicine' },
  { id: 'upayush',       name: 'Uttar Pradesh Board of Indian Medicine' },
  { id: 'wbayush',       name: 'West Bengal Council of Homeopathic Medicine' },
  { id: 'mhbhms',        name: 'Maharashtra Board of Homeopathic Medicine' },
  { id: 'punjabhomeo',   name: 'Punjab State Board of Homeopathic Medicine' },

  // ── Other ──────────────────────────────────────────────────────────────────
  { id: 'other',         name: 'Other (please specify below)' },
];

// Indian States for registration state field
export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman & Nicobar Islands', 'Chandigarh', 'Dadra & Nagar Haveli and Daman & Diu',
  'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

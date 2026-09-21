import { useState, useCallback } from 'react';

// Default order of consult sections
export const DEFAULT_SECTION_ORDER = [
  's-prev',
  's-vitals',
  's-cc',
  's-hopi',
  's-past',
  's-exam',
  's-inv',
  's-dx',
  's-rx',
  's-vax',
  's-proc',
  's-attach',
  's-advice',
] as const;

export type SectionId = typeof DEFAULT_SECTION_ORDER[number];

const STORAGE_KEY = 'vyasa_consult_section_order';

function loadOrder(): SectionId[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...DEFAULT_SECTION_ORDER];
    const parsed = JSON.parse(raw) as string[];
    // Merge: keep stored order but add any new sections at end
    const stored = parsed.filter(id => DEFAULT_SECTION_ORDER.includes(id as SectionId)) as SectionId[];
    const missing = DEFAULT_SECTION_ORDER.filter(id => !stored.includes(id));
    return [...stored, ...missing];
  } catch {
    return [...DEFAULT_SECTION_ORDER];
  }
}

function saveOrder(order: SectionId[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(order)); } catch {}
}

export function useConsultSectionOrder() {
  const [order, setOrderState] = useState<SectionId[]>(loadOrder);

  const reorder = useCallback((newOrder: SectionId[]) => {
    setOrderState(newOrder);
    saveOrder(newOrder);
  }, []);

  const reset = useCallback(() => {
    const def = [...DEFAULT_SECTION_ORDER];
    setOrderState(def);
    saveOrder(def);
  }, []);

  return { order, reorder, reset };
}

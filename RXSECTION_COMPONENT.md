# RxSection Component - Reusable Prescription UI

## Overview

The `RxSection` component extracts the prescription rendering UI from `ConsultPage.tsx` (lines 760-900+) into a reusable, standalone component that can be used across multiple pages with identical styling and behavior.

**Key Goal:** Doctors see the SAME prescription form everywhere—no confusion.

## Location

- **Component:** `/src/components/prescription/RxSection.tsx`
- **Exports:** `RxSection`, `RxForm`, `RxRow` types

## Component Features

### 1. Form Type Selector with Colors
- 7 form types: Tab, Cap, Syr (blue), MDI (violet), Drops, Cream (pink), Inj (red)
- Active form highlighted with type-specific colors
- Auto-updates route based on form type

### 2. Dynamic Fields Based on Form Type

| Form Type | Special Fields | Route |
|-----------|---|---|
| **Tab / Cap / Drops** | None | Oral / Topical |
| **Syr** | Strength (125mg/5mL) | Oral |
| **MDI** | Puffs (2 puffs) | Inhaled |
| **Cream** | None | Topical |
| **Inj** | None | IM |

### 3. Complete Drug Fields
- Drug Name with autocomplete (DrugAutocomplete)
- Dose (adaptive label: mcg for MDI, mg for liquids)
- Strength (syrup/drops)
- Puffs (MDI)
- Route dropdown (hidden for obvious forms)
- Frequency picker (FrequencyPicker)
- Duration picker (DurationPicker)
- Instructions/Notes with form-specific placeholders

### 4. Pediatric Support
- Detects if patient < 12 years old
- Shows "Pediatric" badge on drug name
- Auto-calculates mL from strength + dose + weight (syrup only)
- Example: If strength = "125mg/5mL", dose = "250mg", weight = 10kg → 10 mL/dose

### 5. Add/Remove Buttons
- "+" button to add new drug row
- Trash icon to remove (hidden if only 1 row)
- Minimum 1 drug row maintained

### 6. Professional Styling
- Card-based layout matching ConsultPage
- Responsive grid: compact (2 cols) → tablet (3 cols) → desktop (6 cols)
- Color-coded form buttons
- Index numbering (1, 2, 3...)
- Pediatric helper section at bottom

## Props

```typescript
interface RxSectionProps {
  // State and callbacks
  rxRows: RxRow[];
  onUpdateRxForm: (id: string, form: RxForm) => void;
  onUpdateRx: (id: string, field: keyof RxRow, val: string) => void;
  onUpdateRxMulti: (id: string, fields: Partial<RxRow>) => void;
  onRemoveRx: (id: string) => void;
  onAddRx: () => void;
  
  // Context
  isPediatric?: boolean;
  patientWeightKg?: number | null;
  
  // UI flags
  showAddButton?: boolean;
  compact?: boolean;
}
```

## Types

### RxForm
```typescript
type RxForm = 'Tab' | 'Cap' | 'Syr' | 'MDI' | 'Drops' | 'Cream' | 'Inj';
```

### RxRow
```typescript
interface RxRow {
  id: string;
  form: RxForm;
  drug: string;
  dose: string;
  strength: string;      // e.g. "125mg/5mL" for Syr
  puffs: string;         // for MDI
  doseML: string;        // auto-calculated mL for Syr (deprecated, kept for compat)
  route: string;
  frequency: string;
  duration: string;
  instructions: string;
}
```

## Usage in ConsultPage

```typescript
import { RxSection, type RxRow, type RxForm } from '@/components/prescription/RxSection';

// In ConsultPage state
const [draft, setDraft] = useState<ConsultDraft>({ rxRows: [...] });

// Update handlers
function updateRxForm(id: string, form: RxForm) {
  set('rxRows', draft.rxRows.map(r => 
    r.id === id ? { ...r, form, route: FORM_ROUTES[form] } : r
  ));
}

function updateRx(id: string, field: keyof RxRow, val: string) {
  set('rxRows', draft.rxRows.map(r => 
    r.id === id ? { ...r, [field]: val } : r
  ));
}

function updateRxMulti(id: string, fields: Partial<RxRow>) {
  set('rxRows', draft.rxRows.map(r => 
    r.id === id ? { ...r, ...fields } : r
  ));
}

function removeRx(id: string) {
  set('rxRows', draft.rxRows.filter(r => r.id !== id));
}

function addRxRow() {
  set('rxRows', [...draft.rxRows, BLANK_RX_ROW()]);
}

// In JSX
<RxSection
  rxRows={draft.rxRows}
  onUpdateRxForm={updateRxForm}
  onUpdateRx={updateRx}
  onUpdateRxMulti={updateRxMulti}
  onRemoveRx={removeRx}
  onAddRx={addRxRow}
  isPediatric={isPediatric}
  patientWeightKg={patientWeightKg}
  showAddButton={true}
/>
```

## Usage in PrescriptionsPage (Write Rx Modal)

```typescript
import { RxSection, type RxRow } from '@/components/prescription/RxSection';

const [rxRows, setRxRows] = useState<RxRow[]>([BLANK_RX_ROW()]);

function updateRxForm(id: string, form: RxRow['form']) {
  const FORM_ROUTES = { Tab: 'Oral', Cap: 'Oral', Syr: 'Oral', ... };
  setRxRows(rows => rows.map(r => 
    r.id === id ? { ...r, form, route: FORM_ROUTES[form] } : r
  ));
}

function updateRx(id: string, field: keyof RxRow, val: string) {
  setRxRows(rows => rows.map(r => 
    r.id === id ? { ...r, [field]: val } : r
  ));
}

// ... other handlers

// In JSX (within modal)
<RxSection
  rxRows={rxRows}
  onUpdateRxForm={updateRxForm}
  onUpdateRx={updateRx}
  onUpdateRxMulti={updateRxMulti}
  onRemoveRx={removeRx}
  onAddRx={addRxRow}
  showAddButton={true}
  compact={true}  // For modal, use compact mode
/>
```

## CSS & Styling

Uses existing utilities from ConsultPage:
- `.btn-secondary` - Secondary button
- `.input` - Input/select styles
- `.card` - Card container
- Tailwind classes: `grid`, `gap`, `col-span`, `px/py`, `rounded-*`, `text-*`, `bg-*`

No new CSS needed—fully integrated with existing design system.

## Migration from Old Code

### Before (ConsultPage lines 760-926)
```typescript
{draft.rxRows.map((row, idx) => {
  const isLiquid = row.form === 'Syr' || row.form === 'Drops';
  // 146 lines of JSX...
  return (
    <div key={row.id} className="border border-slate-200 rounded-xl bg-slate-50 overflow-hidden">
      {/* Form selector */}
      {/* Fields grid */}
      {/* Pediatric calc */}
    </div>
  );
})}
<button onClick={addRxRow}>Add Medication</button>
```

### After (Single Component Call)
```typescript
<RxSection
  rxRows={draft.rxRows}
  onUpdateRxForm={updateRxForm}
  onUpdateRx={updateRx}
  onUpdateRxMulti={updateRxMulti}
  onRemoveRx={removeRx}
  onAddRx={addRxRow}
  isPediatric={isPediatric}
  patientWeightKg={patientWeightKg}
/>
```

**Lines saved:** ~150 lines of JSX consolidated into 1 reusable component.

## Pages Using RxSection

1. ✅ **ConsultPage.tsx** - Full consultation form (non-compact)
2. ✅ **PrescriptionsPage.tsx** - Write Prescription modal (compact)
3. **Future Pages:**
   - Re-admission form
   - Discharge prescription
   - Follow-up consultation
   - Prescription batch printing
   - Hospital pharmacy order

## Responsive Grid Behavior

### Compact Mode (PrescriptionsPage Modal)
```
Mobile:    [Drug Name] [Dose]
           [Freq] [Duration]
           [Instructions]

Tablet:    [Drug Name] [Dose] [Strength/Puffs]
           [Freq] [Duration]

Desktop:   Same as tablet
```

### Normal Mode (ConsultPage)
```
Mobile:    [Drug Name] [Dose]
           [Strength] [MDI Puffs]
           [Freq (3 cols)] [Duration (3 cols)]
           [Instructions]

Tablet:    [Drug Name] [Dose] [Strength] [Route]
           [Freq (2 cols)] [Duration (2 cols)]

Desktop:   [Drug Name] [Dose] [Strength] [Route] [Freq] [Duration]
           [Instructions (full width)]
```

## Key Differences Between Usages

| Feature | ConsultPage | PrescriptionsPage |
|---------|---|---|
| **FavDrugsPanel** | Yes (before RxSection) | No |
| **Previous Rx** | Yes (after RxSection) | No |
| **Compact** | false | true |
| **Pediatric Calc** | Yes | No (adult Rx page) |

## Testing Checklist

- [ ] Add drug row → form defaults to "Tab" with "Oral" route
- [ ] Click form button (Syr) → strength field appears, route stays "Oral"
- [ ] Click MDI → puffs field appears, route changes to "Inhaled"
- [ ] Fill strength "125mg/5mL", dose "250", weight 10 → shows "10 mL / dose"
- [ ] Clear strength → hides mL calculation
- [ ] Remove button appears only if > 1 row
- [ ] Add button adds new blank row
- [ ] DrugAutocomplete fills dose/frequency/route from knowledge base
- [ ] Compact mode: fewer columns, tighter spacing
- [ ] Responsive: mobile 2 cols → tablet 3 cols → desktop 6 cols

## Files Modified

1. **Created:** `/src/components/prescription/RxSection.tsx` (290 lines)
2. **Updated:** `/src/pages/doctor/ConsultPage.tsx` 
   - Import RxSection types
   - Removed 146 lines of duplicate JSX
   - Added single RxSection component call
3. **Updated:** `/src/pages/doctor/PrescriptionsPage.tsx`
   - Import RxSection types
   - Replaced drug array with RxRow array
   - Updated state handlers to use RxRow
   - Replaced drug form grid with RxSection component

## Benefits

1. **Single Source of Truth:** Prescription UI is consistent everywhere
2. **Maintainability:** Bug fixes in one place benefit all pages
3. **DRY:** 146 lines of duplicate JSX eliminated
4. **Extensibility:** Easy to add new form types, fields, validations
5. **Testing:** Single component to test for all pages
6. **Reusability:** Can be used in any new page needing prescriptions
7. **Type Safety:** Full TypeScript support with RxForm, RxRow types
8. **Accessibility:** Semantic HTML, proper labels

## Future Enhancements

1. **Presets:** Load common drug combinations (e.g., "Cold Relief Bundle")
2. **Validation:** Required field indicators, drug-drug interaction warnings
3. **Dosing:** Weight-based automatic dose calculation for all ages
4. **Plurals:** Support for multi-drug instructions (e.g., "Take these together")
5. **Print Format:** Custom RX card rendering inline
6. **Undo/Redo:** Transaction-based state management
7. **Accessibility:** ARIA labels, keyboard navigation, screen reader support

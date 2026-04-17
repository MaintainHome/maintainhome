import { ChevronDown, ChevronUp, Hammer, Calendar, Layers, Paintbrush2, Package, Plus, Trash2, FileText, Car, TreePine } from "lucide-react";

export interface NewConstructionData {
  warrantyDates: { label: string; date: string }[];
  flooring: { material: string; color: string; company: string }[];
  interiorPaint: { brand: string; color: string };
  interiorPaint2: { brand: string; color: string };
  interiorPaint3: { brand: string; color: string };
  exteriorPaint: { brand: string; color: string };
  exteriorOther: { company: string; brand: string; color: string };
  misc1: { description: string };
  misc2: { description: string };
  appliances: { brand: string; modelSerial: string }[];
  garage: { hasGarage: boolean; type: "" | "Detached" | "Attached"; spaces: string };
  porches: { hasFront: boolean; hasRear: boolean; screened: boolean; materials: string };
}

export const emptyNewConstruction: NewConstructionData = {
  warrantyDates: [
    { label: "Warranty 1", date: "" },
    { label: "Warranty 2", date: "" },
    { label: "Warranty 3", date: "" },
    { label: "Warranty 4", date: "" },
  ],
  flooring: [
    { material: "", color: "", company: "" },
    { material: "", color: "", company: "" },
    { material: "", color: "", company: "" },
  ],
  interiorPaint: { brand: "", color: "" },
  interiorPaint2: { brand: "", color: "" },
  interiorPaint3: { brand: "", color: "" },
  exteriorPaint: { brand: "", color: "" },
  exteriorOther: { company: "", brand: "", color: "" },
  misc1: { description: "" },
  misc2: { description: "" },
  appliances: [],
  garage: { hasGarage: false, type: "", spaces: "" },
  porches: { hasFront: false, hasRear: false, screened: false, materials: "" },
};

const FLOORING_MATERIALS = ["Carpet", "Hardwood", "Tile", "LVP", "Other"];

interface Props {
  data: NewConstructionData;
  onChange: (data: NewConstructionData) => void;
  accent?: string;
  onDocumentLinkClick?: () => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm text-slate-800 transition-all bg-white";
const selectCls = "w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm text-slate-800 transition-all bg-white";

function SubSection({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
        {icon}
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">{title}</h4>
      </div>
      <div className="px-4 py-3 space-y-3">{children}</div>
    </div>
  );
}

function Checkbox({ checked, onChange, label, accent = "#1f9e6e" }: { checked: boolean; onChange: (v: boolean) => void; label: string; accent?: string }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="sr-only"
        aria-label={label}
      />
      <div
        className="w-5 h-5 rounded border-2 flex items-center justify-center transition-all shrink-0 pointer-events-none"
        style={{ backgroundColor: checked ? accent : "white", borderColor: checked ? accent : "#cbd5e1" }}
      >
        {checked && (
          <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
            <polyline points="2,6 5,9 10,3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span className="text-sm text-slate-700 font-medium">{label}</span>
    </label>
  );
}

export function NewConstructionSection({ data, onChange, accent = "#1f9e6e", onDocumentLinkClick }: Props) {
  const safe = { ...emptyNewConstruction, ...data };

  function setWarranty(idx: number, field: "label" | "date", val: string) {
    const next = safe.warrantyDates.map((w, i) => i === idx ? { ...w, [field]: val } : w);
    onChange({ ...safe, warrantyDates: next });
  }

  function setFlooring(idx: number, field: "material" | "color" | "company", val: string) {
    const next = safe.flooring.map((f, i) => i === idx ? { ...f, [field]: val } : f);
    onChange({ ...safe, flooring: next });
  }

  function addAppliance() {
    onChange({ ...safe, appliances: [...safe.appliances, { brand: "", modelSerial: "" }] });
  }

  function setAppliance(idx: number, field: "brand" | "modelSerial", val: string) {
    const next = safe.appliances.map((a, i) => i === idx ? { ...a, [field]: val } : a);
    onChange({ ...safe, appliances: next });
  }

  function removeAppliance(idx: number) {
    onChange({ ...safe, appliances: safe.appliances.filter((_, i) => i !== idx) });
  }

  const hasPorch = safe.porches.hasFront || safe.porches.hasRear;

  return (
    <div className="space-y-4 pt-2">

      {/* Builder Warranty Dates */}
      <SubSection icon={<Calendar className="w-3.5 h-3.5 text-slate-400" />} title="Builder Warranty Dates">
        <p className="text-xs text-slate-500">These dates will trigger SMS reminders as they approach.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {safe.warrantyDates.map((w, idx) => (
            <div key={idx} className="space-y-1.5">
              <input
                type="text"
                value={w.label}
                onChange={e => setWarranty(idx, "label", e.target.value)}
                placeholder={`Warranty ${idx + 1} label`}
                className={inputCls}
              />
              <input
                type="date"
                value={w.date}
                onChange={e => setWarranty(idx, "date", e.target.value)}
                className={inputCls}
              />
            </div>
          ))}
        </div>
      </SubSection>

      {/* Garage */}
      <SubSection icon={<Car className="w-3.5 h-3.5 text-slate-400" />} title="Garage">
        <Checkbox
          checked={safe.garage.hasGarage}
          onChange={v => onChange({ ...safe, garage: { ...safe.garage, hasGarage: v } })}
          label="Has Garage?"
          accent={accent}
        />
        {safe.garage.hasGarage && (
          <div className="grid grid-cols-2 gap-3 mt-2 pl-7">
            <Field label="Detached or Attached?">
              <select
                value={safe.garage.type}
                onChange={e => onChange({ ...safe, garage: { ...safe.garage, type: e.target.value as "" | "Detached" | "Attached" } })}
                className={selectCls}
              >
                <option value="">Select…</option>
                <option value="Detached">Detached</option>
                <option value="Attached">Attached</option>
              </select>
            </Field>
            <Field label="Number of Spaces">
              <input
                type="number"
                min={1}
                max={10}
                value={safe.garage.spaces}
                onChange={e => onChange({ ...safe, garage: { ...safe.garage, spaces: e.target.value } })}
                placeholder="e.g. 2"
                className={inputCls}
              />
            </Field>
          </div>
        )}
      </SubSection>

      {/* Porches */}
      <SubSection icon={<TreePine className="w-3.5 h-3.5 text-slate-400" />} title="Porches">
        <div className="flex flex-wrap gap-4">
          <Checkbox
            checked={safe.porches.hasFront}
            onChange={v => onChange({ ...safe, porches: { ...safe.porches, hasFront: v } })}
            label="Has Front Porch?"
            accent={accent}
          />
          <Checkbox
            checked={safe.porches.hasRear}
            onChange={v => onChange({ ...safe, porches: { ...safe.porches, hasRear: v } })}
            label="Has Rear Porch?"
            accent={accent}
          />
        </div>
        {hasPorch && (
          <div className="grid grid-cols-2 gap-3 mt-2 pl-7">
            <Field label="Screened?">
              <select
                value={safe.porches.screened ? "yes" : "no"}
                onChange={e => onChange({ ...safe, porches: { ...safe.porches, screened: e.target.value === "yes" } })}
                className={selectCls}
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </Field>
            <Field label="Porch Materials">
              <input
                type="text"
                value={safe.porches.materials}
                onChange={e => onChange({ ...safe, porches: { ...safe.porches, materials: e.target.value } })}
                placeholder="e.g. Pressure-treated wood"
                className={inputCls}
              />
            </Field>
          </div>
        )}
      </SubSection>

      {/* Flooring */}
      <SubSection icon={<Layers className="w-3.5 h-3.5 text-slate-400" />} title="Flooring">
        <div className="space-y-3">
          {safe.flooring.map((f, idx) => (
            <div key={idx} className="grid grid-cols-3 gap-2">
              <Field label={`Area ${idx + 1} — Material`}>
                <select value={f.material} onChange={e => setFlooring(idx, "material", e.target.value)} className={selectCls}>
                  <option value="">Select…</option>
                  {FLOORING_MATERIALS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </Field>
              <Field label="Color">
                <input type="text" value={f.color} onChange={e => setFlooring(idx, "color", e.target.value)} placeholder="e.g. Oak Beige" className={inputCls} />
              </Field>
              <Field label="Company">
                <input type="text" value={f.company} onChange={e => setFlooring(idx, "company", e.target.value)} placeholder="e.g. Shaw" className={inputCls} />
              </Field>
            </div>
          ))}
        </div>
      </SubSection>

      {/* Interior Paint — 3 entries */}
      <SubSection icon={<Paintbrush2 className="w-3.5 h-3.5 text-slate-400" />} title="Interior Paint">
        <div className="space-y-3">
          {([
            { key: "interiorPaint" as const, label: "Interior Paint 1" },
            { key: "interiorPaint2" as const, label: "Interior Paint 2" },
            { key: "interiorPaint3" as const, label: "Interior Paint 3" },
          ]).map(({ key, label }) => (
            <div key={key}>
              <p className="text-xs font-semibold text-slate-500 mb-1.5">{label}</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Brand">
                  <input
                    type="text"
                    value={safe[key].brand}
                    onChange={e => onChange({ ...safe, [key]: { ...safe[key], brand: e.target.value } })}
                    placeholder="e.g. Sherwin-Williams"
                    className={inputCls}
                  />
                </Field>
                <Field label="Color / Code">
                  <input
                    type="text"
                    value={safe[key].color}
                    onChange={e => onChange({ ...safe, [key]: { ...safe[key], color: e.target.value } })}
                    placeholder="e.g. Agreeable Gray SW 7029"
                    className={inputCls}
                  />
                </Field>
              </div>
            </div>
          ))}
        </div>
      </SubSection>

      {/* Exterior Paint */}
      <SubSection icon={<Paintbrush2 className="w-3.5 h-3.5 text-slate-400" />} title="Exterior Paint">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Brand">
            <input type="text" value={safe.exteriorPaint.brand} onChange={e => onChange({ ...safe, exteriorPaint: { ...safe.exteriorPaint, brand: e.target.value } })} placeholder="e.g. Benjamin Moore" className={inputCls} />
          </Field>
          <Field label="Color / Code">
            <input type="text" value={safe.exteriorPaint.color} onChange={e => onChange({ ...safe, exteriorPaint: { ...safe.exteriorPaint, color: e.target.value } })} placeholder="e.g. Simply White OC-17" className={inputCls} />
          </Field>
        </div>
      </SubSection>

      {/* Exterior Other Materials */}
      <SubSection icon={<Hammer className="w-3.5 h-3.5 text-slate-400" />} title="Exterior Other Materials (Brick / Stone)">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Company">
            <input type="text" value={safe.exteriorOther.company} onChange={e => onChange({ ...safe, exteriorOther: { ...safe.exteriorOther, company: e.target.value } })} placeholder="e.g. Boral" className={inputCls} />
          </Field>
          <Field label="Brand / Line">
            <input type="text" value={safe.exteriorOther.brand} onChange={e => onChange({ ...safe, exteriorOther: { ...safe.exteriorOther, brand: e.target.value } })} placeholder="e.g. Meridian" className={inputCls} />
          </Field>
          <Field label="Color">
            <input type="text" value={safe.exteriorOther.color} onChange={e => onChange({ ...safe, exteriorOther: { ...safe.exteriorOther, color: e.target.value } })} placeholder="e.g. Chestnut" className={inputCls} />
          </Field>
        </div>
      </SubSection>

      {/* Miscellaneous */}
      <SubSection icon={<FileText className="w-3.5 h-3.5 text-slate-400" />} title="Miscellaneous">
        <Field label="Item 1 — Brand / Color / Description">
          <input type="text" value={safe.misc1.description} onChange={e => onChange({ ...safe, misc1: { description: e.target.value } })} placeholder="e.g. Trim paint: Bright White OC-17 by Benjamin Moore" className={inputCls} />
        </Field>
        <Field label="Item 2 — Brand / Color / Description">
          <input type="text" value={safe.misc2.description} onChange={e => onChange({ ...safe, misc2: { description: e.target.value } })} placeholder="e.g. Cabinet stain: Classic Walnut by Minwax" className={inputCls} />
        </Field>
      </SubSection>

      {/* Appliances */}
      <SubSection icon={<Package className="w-3.5 h-3.5 text-slate-400" />} title="Appliances">
        <div className="space-y-2">
          {safe.appliances.map((a, idx) => (
            <div key={idx} className="flex items-end gap-2">
              <div className="flex-1 grid grid-cols-2 gap-2">
                <Field label="Brand">
                  <input type="text" value={a.brand} onChange={e => setAppliance(idx, "brand", e.target.value)} placeholder="e.g. Whirlpool" className={inputCls} />
                </Field>
                <Field label="Model / Serial #">
                  <input type="text" value={a.modelSerial} onChange={e => setAppliance(idx, "modelSerial", e.target.value)} placeholder="WRF535SWHZ / A23K..." className={inputCls} />
                </Field>
              </div>
              <button onClick={() => removeAppliance(idx)} className="mb-0.5 p-2 rounded-lg border border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={addAppliance}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed text-xs font-semibold transition-colors hover:bg-slate-50"
            style={{ borderColor: accent, color: accent }}
          >
            <Plus className="w-3.5 h-3.5" /> Add Appliance
          </button>
          {onDocumentLinkClick && (
            <button
              onClick={onDocumentLinkClick}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors underline underline-offset-2"
            >
              <FileText className="w-3 h-3" /> Upload Warranty → Home Documents
            </button>
          )}
        </div>
      </SubSection>
    </div>
  );
}

interface CheckboxProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  accent?: string;
}

export function NewConstructionCheckbox({ checked, onChange, accent = "#1f9e6e" }: CheckboxProps) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="sr-only"
        aria-label="New Construction?"
      />
      <div
        className="w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0 pointer-events-none"
        style={{
          backgroundColor: checked ? accent : "white",
          borderColor: checked ? accent : "#cbd5e1",
        }}
      >
        {checked && (
          <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
            <polyline points="2,6 5,9 10,3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span className="text-sm font-semibold text-slate-800 group-hover:text-slate-900 transition-colors">
        New Construction?
      </span>
      <span className="text-xs text-slate-400 font-normal">Track builder specs, warranties &amp; finishes</span>
    </label>
  );
}

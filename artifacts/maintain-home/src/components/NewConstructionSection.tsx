import { useState } from "react";
import { ChevronDown, ChevronUp, Hammer, Calendar, Layers, Paintbrush2, Package, Plus, Trash2, FileText } from "lucide-react";

export interface NewConstructionData {
  warrantyDates: { label: string; date: string }[];
  flooring: { material: string; color: string; company: string }[];
  interiorPaint: { brand: string; color: string };
  exteriorPaint: { brand: string; color: string };
  exteriorOther: { company: string; brand: string; color: string };
  misc1: { description: string };
  misc2: { description: string };
  appliances: { brand: string; modelSerial: string }[];
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
  exteriorPaint: { brand: "", color: "" },
  exteriorOther: { company: "", brand: "", color: "" },
  misc1: { description: "" },
  misc2: { description: "" },
  appliances: [],
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

export function NewConstructionSection({ data, onChange, accent = "#1f9e6e", onDocumentLinkClick }: Props) {
  function setWarranty(idx: number, field: "label" | "date", val: string) {
    const next = data.warrantyDates.map((w, i) => i === idx ? { ...w, [field]: val } : w);
    onChange({ ...data, warrantyDates: next });
  }

  function setFlooring(idx: number, field: "material" | "color" | "company", val: string) {
    const next = data.flooring.map((f, i) => i === idx ? { ...f, [field]: val } : f);
    onChange({ ...data, flooring: next });
  }

  function addAppliance() {
    onChange({ ...data, appliances: [...data.appliances, { brand: "", modelSerial: "" }] });
  }

  function setAppliance(idx: number, field: "brand" | "modelSerial", val: string) {
    const next = data.appliances.map((a, i) => i === idx ? { ...a, [field]: val } : a);
    onChange({ ...data, appliances: next });
  }

  function removeAppliance(idx: number) {
    onChange({ ...data, appliances: data.appliances.filter((_, i) => i !== idx) });
  }

  return (
    <div className="space-y-4 pt-2">

      {/* Builder Warranty Dates */}
      <SubSection icon={<Calendar className="w-3.5 h-3.5 text-slate-400" />} title="Builder Warranty Dates">
        <p className="text-xs text-slate-500">These dates will trigger SMS reminders as they approach.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {data.warrantyDates.map((w, idx) => (
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

      {/* Flooring */}
      <SubSection icon={<Layers className="w-3.5 h-3.5 text-slate-400" />} title="Flooring">
        <div className="space-y-3">
          {data.flooring.map((f, idx) => (
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

      {/* Interior Paint */}
      <SubSection icon={<Paintbrush2 className="w-3.5 h-3.5 text-slate-400" />} title="Interior Paint">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Brand">
            <input type="text" value={data.interiorPaint.brand} onChange={e => onChange({ ...data, interiorPaint: { ...data.interiorPaint, brand: e.target.value } })} placeholder="e.g. Sherwin-Williams" className={inputCls} />
          </Field>
          <Field label="Color / Code">
            <input type="text" value={data.interiorPaint.color} onChange={e => onChange({ ...data, interiorPaint: { ...data.interiorPaint, color: e.target.value } })} placeholder="e.g. Agreeable Gray SW 7029" className={inputCls} />
          </Field>
        </div>
      </SubSection>

      {/* Exterior Paint */}
      <SubSection icon={<Paintbrush2 className="w-3.5 h-3.5 text-slate-400" />} title="Exterior Paint">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Brand">
            <input type="text" value={data.exteriorPaint.brand} onChange={e => onChange({ ...data, exteriorPaint: { ...data.exteriorPaint, brand: e.target.value } })} placeholder="e.g. Benjamin Moore" className={inputCls} />
          </Field>
          <Field label="Color / Code">
            <input type="text" value={data.exteriorPaint.color} onChange={e => onChange({ ...data, exteriorPaint: { ...data.exteriorPaint, color: e.target.value } })} placeholder="e.g. Simply White OC-17" className={inputCls} />
          </Field>
        </div>
      </SubSection>

      {/* Exterior Other Materials */}
      <SubSection icon={<Hammer className="w-3.5 h-3.5 text-slate-400" />} title="Exterior Other Materials (Brick / Stone)">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Company">
            <input type="text" value={data.exteriorOther.company} onChange={e => onChange({ ...data, exteriorOther: { ...data.exteriorOther, company: e.target.value } })} placeholder="e.g. Boral" className={inputCls} />
          </Field>
          <Field label="Brand / Line">
            <input type="text" value={data.exteriorOther.brand} onChange={e => onChange({ ...data, exteriorOther: { ...data.exteriorOther, brand: e.target.value } })} placeholder="e.g. Meridian" className={inputCls} />
          </Field>
          <Field label="Color">
            <input type="text" value={data.exteriorOther.color} onChange={e => onChange({ ...data, exteriorOther: { ...data.exteriorOther, color: e.target.value } })} placeholder="e.g. Chestnut" className={inputCls} />
          </Field>
        </div>
      </SubSection>

      {/* Miscellaneous */}
      <SubSection icon={<FileText className="w-3.5 h-3.5 text-slate-400" />} title="Miscellaneous">
        <Field label="Item 1 — Brand / Color / Description">
          <input type="text" value={data.misc1.description} onChange={e => onChange({ ...data, misc1: { description: e.target.value } })} placeholder="e.g. Trim paint: Bright White OC-17 by Benjamin Moore" className={inputCls} />
        </Field>
        <Field label="Item 2 — Brand / Color / Description">
          <input type="text" value={data.misc2.description} onChange={e => onChange({ ...data, misc2: { description: e.target.value } })} placeholder="e.g. Cabinet stain: Classic Walnut by Minwax" className={inputCls} />
        </Field>
      </SubSection>

      {/* Appliances */}
      <SubSection icon={<Package className="w-3.5 h-3.5 text-slate-400" />} title="Appliances">
        <div className="space-y-2">
          {data.appliances.map((a, idx) => (
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
      <div
        className="w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0"
        style={{
          backgroundColor: checked ? accent : "white",
          borderColor: checked ? accent : "#cbd5e1",
        }}
        onClick={() => onChange(!checked)}
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

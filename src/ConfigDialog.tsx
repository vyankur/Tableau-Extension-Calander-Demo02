import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { ExtensionSettings, normalizeSettings, WeekStart } from "./settings";
import { WorksheetField } from "./tableau";

interface ConfigDialogProps {
  open: boolean;
  settings: ExtensionSettings;
  fields: WorksheetField[];
  worksheets: string[];
  onClose: () => void;
  onSave: (settings: ExtensionSettings) => void;
}

const palettes = [
  "#eff6ff,#bfdbfe,#60a5fa,#2563eb,#1e3a8a",
  "#f0fdf4,#bbf7d0,#4ade80,#16a34a,#14532d",
  "#fff7ed,#fed7aa,#fb923c,#ea580c,#7c2d12",
  "#fdf2f8,#fbcfe8,#f472b6,#db2777,#831843",
  "#f8fafc,#cbd5e1,#64748b,#334155,#0f172a"
];

export function ConfigDialog({ open, settings, fields, worksheets, onClose, onSave }: ConfigDialogProps) {
  const [draft, setDraft] = useState(settings);

  useEffect(() => {
    setDraft(settings);
  }, [settings, open]);

  if (!open) return null;

  const update = <K extends keyof ExtensionSettings>(key: K, value: ExtensionSettings[K]) => {
    setDraft((current) => normalizeSettings({ ...current, [key]: value }));
  };

  return (
    <div className="config-backdrop" role="dialog" aria-modal="true" aria-labelledby="config-title">
      <form
        className="config-dialog"
        onSubmit={(event) => {
          event.preventDefault();
          onSave(normalizeSettings(draft));
        }}
      >
        <header className="config-header">
          <div>
            <h2 id="config-title">Developer Configuration</h2>
            <p>Bind Tableau data and tune the calendar presentation.</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close configuration">
            <X size={18} />
          </button>
        </header>

        <div className="config-grid">
          <fieldset>
            <legend>Data</legend>
            <label>
              Worksheet
              <select value={draft.worksheetName} onChange={(event) => update("worksheetName", event.target.value)}>
                <option value="">First available worksheet</option>
                {worksheets.map((worksheet) => (
                  <option key={worksheet} value={worksheet}>
                    {worksheet}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Date field
              <select value={draft.dateField} onChange={(event) => update("dateField", event.target.value)}>
                <option value="">Auto-detect</option>
                {fields.map((field) => (
                  <option key={field.fieldName} value={field.fieldName}>
                    {field.fieldName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Value field
              <select value={draft.valueField} onChange={(event) => update("valueField", event.target.value)}>
                <option value="">Auto-detect</option>
                {fields.map((field) => (
                  <option key={field.fieldName} value={field.fieldName}>
                    {field.fieldName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Week starts on
              <select value={draft.weekStart} onChange={(event) => update("weekStart", event.target.value as WeekStart)}>
                <option value="monday">Monday</option>
                <option value="sunday">Sunday</option>
              </select>
            </label>
          </fieldset>

          <fieldset>
            <legend>Layout</legend>
            <NumberInput label="Cell size" value={draft.cellSize} min={8} max={64} onChange={(value) => update("cellSize", value)} />
            <NumberInput label="Cell spacing" value={draft.cellSpacing} min={0} max={24} onChange={(value) => update("cellSpacing", value)} />
            <NumberInput label="Border width" value={draft.borderWidth} min={0} max={12} onChange={(value) => update("borderWidth", value)} />
            <NumberInput label="Border radius" value={draft.borderRadius} min={0} max={50} onChange={(value) => update("borderRadius", value)} />
            <NumberInput label="Month spacing" value={draft.monthSpacing} min={4} max={80} onChange={(value) => update("monthSpacing", value)} />
            <NumberInput label="Months per row" value={draft.monthsPerRow} min={1} max={6} onChange={(value) => update("monthsPerRow", value)} />
            <label>
              Font
              <input value={draft.fontFamily} onChange={(event) => update("fontFamily", event.target.value)} />
            </label>
          </fieldset>

          <fieldset>
            <legend>Colors</legend>
            <ColorInput label="Background" value={draft.backgroundColor} onChange={(value) => update("backgroundColor", value)} />
            <ColorInput label="Header" value={draft.headerColor} onChange={(value) => update("headerColor", value)} />
            <ColorInput label="Weekend border" value={draft.weekendColor} onChange={(value) => update("weekendColor", value)} />
            <ColorInput label="Today" value={draft.todayColor} onChange={(value) => update("todayColor", value)} />
            <ColorInput label="Null" value={draft.nullColor} onChange={(value) => update("nullColor", value)} />
            <label>
              Heatmap palette
              <select value={draft.heatmapPalette} onChange={(event) => update("heatmapPalette", event.target.value)}>
                {palettes.map((palette) => (
                  <option key={palette} value={palette}>
                    {palette}
                  </option>
                ))}
              </select>
            </label>
          </fieldset>

          <fieldset className="wide">
            <legend>Custom CSS</legend>
            <textarea
              rows={7}
              value={draft.customCss}
              spellCheck={false}
              onChange={(event) => update("customCss", event.target.value)}
              placeholder=".calendar-shell { ... }"
            />
          </fieldset>
        </div>

        <footer className="config-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="primary">
            Save settings
          </button>
        </footer>
      </form>
    </div>
  );
}

function NumberInput({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return (
    <label>
      {label}
      <input type="number" value={value} min={min} max={max} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="color-label">
      {label}
      <span>
        <input type="color" value={value} onChange={(event) => onChange(event.target.value)} />
        <input value={value} onChange={(event) => onChange(event.target.value)} />
      </span>
    </label>
  );
}

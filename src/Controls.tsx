import { Grid3X3, CalendarDays } from "lucide-react";
import { AttributeFilter } from "./tableau";
import { ExtensionSettings, WeekStart } from "./settings";

interface ControlsProps {
  settings: ExtensionSettings;
  years: number[];
  attributeFilters: AttributeFilter[];
  onSettingsChange: (settings: ExtensionSettings) => void;
  onAttributeFilterChange: (fieldName: string, value: string) => void;
}

const gridOptions = [
  { value: 1, label: "1 x 12" },
  { value: 2, label: "2 x 6" },
  { value: 3, label: "3 x 4" },
  { value: 4, label: "4 x 3" },
  { value: 6, label: "6 x 2" },
  { value: 12, label: "12 x 1" }
];

export function Controls({ settings, years, attributeFilters, onSettingsChange, onAttributeFilterChange }: ControlsProps) {
  const selectedYear = settings.selectedYear && years.includes(settings.selectedYear) ? settings.selectedYear : years[0] ?? "";

  const update = <K extends keyof ExtensionSettings>(key: K, value: ExtensionSettings[K]) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <section className="viewer-controls" aria-label="Calendar controls">
      <label>
        <CalendarDays size={16} />
        <span>Year</span>
        <select value={selectedYear} onChange={(event) => update("selectedYear", event.target.value ? Number(event.target.value) : null)}>
          {years.length === 0 ? <option value="">Auto</option> : null}
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </label>

      <label>
        <Grid3X3 size={16} />
        <span>Grid</span>
        <select value={settings.monthsPerRow} onChange={(event) => update("monthsPerRow", Number(event.target.value))}>
          {gridOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>Week</span>
        <select value={settings.weekStart} onChange={(event) => update("weekStart", event.target.value as WeekStart)}>
          <option value="monday">Monday start</option>
          <option value="sunday">Sunday start</option>
        </select>
      </label>

      {attributeFilters.map((filter) => (
        <label key={filter.fieldName}>
          <span>{filter.fieldName}</span>
          <select value={settings.attributeFilters[filter.fieldName] ?? ""} onChange={(event) => onAttributeFilterChange(filter.fieldName, event.target.value)}>
            <option value="">All</option>
            {filter.values.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      ))}
    </section>
  );
}

export type WeekStart = "sunday" | "monday";

export interface ExtensionSettings {
  worksheetName: string;
  dateField: string;
  valueField: string;
  selectedYear: number | null;
  weekStart: WeekStart;
  cellSize: number;
  cellSpacing: number;
  borderWidth: number;
  borderRadius: number;
  fontFamily: string;
  monthSpacing: number;
  backgroundColor: string;
  headerColor: string;
  weekendColor: string;
  todayColor: string;
  nullColor: string;
  heatmapPalette: string;
  monthsPerRow: number;
  attributeFilters: Record<string, string>;
  customCss: string;
}

export const defaultSettings: ExtensionSettings = {
  worksheetName: "",
  dateField: "",
  valueField: "",
  selectedYear: null,
  weekStart: "monday",
  cellSize: 18,
  cellSpacing: 4,
  borderWidth: 1,
  borderRadius: 50,
  fontFamily: "Inter, Segoe UI, Arial, sans-serif",
  monthSpacing: 22,
  backgroundColor: "#ffffff",
  headerColor: "#1f2937",
  weekendColor: "#f8fafc",
  todayColor: "#111827",
  nullColor: "#e5e7eb",
  heatmapPalette: "#eff6ff,#bfdbfe,#60a5fa,#2563eb,#1e3a8a",
  monthsPerRow: 3,
  attributeFilters: {},
  customCss: ""
};

const SETTINGS_KEY = "extension01.settings";

export function normalizeSettings(input: Partial<ExtensionSettings> = {}): ExtensionSettings {
  return {
    ...defaultSettings,
    ...input,
    selectedYear: normalizeYear(input.selectedYear),
    attributeFilters: input.attributeFilters && typeof input.attributeFilters === "object" ? input.attributeFilters : {},
    cellSize: clampNumber(input.cellSize, defaultSettings.cellSize, 8, 64),
    cellSpacing: clampNumber(input.cellSpacing, defaultSettings.cellSpacing, 0, 24),
    borderWidth: clampNumber(input.borderWidth, defaultSettings.borderWidth, 0, 12),
    borderRadius: clampNumber(input.borderRadius, defaultSettings.borderRadius, 0, 50),
    monthSpacing: clampNumber(input.monthSpacing, defaultSettings.monthSpacing, 4, 80),
    monthsPerRow: clampNumber(input.monthsPerRow, defaultSettings.monthsPerRow, 1, 6)
  };
}

function normalizeYear(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1900 && parsed <= 2200 ? parsed : null;
}

export function readSettingsFromTableau(): ExtensionSettings {
  const tableau = window.tableau;
  const stored = tableau?.extensions?.settings?.get(SETTINGS_KEY);
  if (!stored) return defaultSettings;

  try {
    return normalizeSettings(JSON.parse(stored) as Partial<ExtensionSettings>);
  } catch {
    return defaultSettings;
  }
}

export async function saveSettingsToTableau(settings: ExtensionSettings): Promise<void> {
  const tableau = window.tableau;
  if (!tableau?.extensions?.settings) return;

  tableau.extensions.settings.set(SETTINGS_KEY, JSON.stringify(normalizeSettings(settings)));
  await tableau.extensions.settings.saveAsync();
}

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

declare global {
  interface Window {
    tableau?: TableauGlobal;
  }
}

export interface TableauGlobal {
  extensions: {
    initializeAsync: (options?: { configure?: () => void }) => Promise<void>;
    dashboardContent?: {
      dashboard: TableauDashboard;
    };
    worksheetContent?: {
      worksheet: TableauWorksheet;
    };
    settings: {
      get: (key: string) => string | undefined;
      set: (key: string, value: string) => void;
      saveAsync: () => Promise<void>;
    };
    ui?: {
      displayDialogAsync: (url: string, payload: string, options?: { width?: number; height?: number }) => Promise<string>;
    };
  };
  FilterUpdateType: {
    Replace: string;
    All?: string;
  };
  ErrorCodes?: Record<string, string>;
}

export interface TableauDashboard {
  worksheets: TableauWorksheet[];
}

export interface TableauWorksheet {
  name: string;
  getSummaryDataAsync: (options?: Record<string, unknown>) => Promise<TableauDataTable>;
  applyFilterAsync: (fieldName: string, values: string | string[], updateType: string, options?: Record<string, unknown>) => Promise<void>;
}

export interface TableauDataTable {
  columns: TableauColumn[];
  data: TableauCell[][];
}

export interface TableauColumn {
  fieldName?: string;
  dataType?: string;
}

export interface TableauCell {
  value: unknown;
  formattedValue?: string;
}

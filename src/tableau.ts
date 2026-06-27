import { ExtensionSettings } from "./settings";
import type { TableauColumn, TableauDataTable, TableauWorksheet } from "./settings";

export interface WorksheetField {
  fieldName: string;
  dataType: string;
}

export interface CalendarDataPoint {
  isoDate: string;
  value: number | null;
  label: string;
  filterValue: string;
}

export interface TableauDataResult {
  points: CalendarDataPoint[];
  fields: WorksheetField[];
  worksheets: string[];
  selectedWorksheetName: string;
  years: number[];
  attributeFilters: AttributeFilter[];
  warnings: string[];
}

export interface AttributeFilter {
  fieldName: string;
  values: string[];
}

export async function initializeTableau(configure: () => void): Promise<boolean> {
  if (!window.tableau?.extensions) return false;
  await window.tableau.extensions.initializeAsync({ configure });
  return true;
}

export function isVizExtensionContext(): boolean {
  return Boolean(window.tableau?.extensions?.worksheetContent?.worksheet);
}

export function getWorksheets(): TableauWorksheet[] {
  const worksheet = window.tableau?.extensions?.worksheetContent?.worksheet;
  if (worksheet) return [worksheet];

  return window.tableau?.extensions?.dashboardContent?.dashboard?.worksheets ?? [];
}

export function getWorksheet(name?: string): TableauWorksheet | undefined {
  const worksheet = window.tableau?.extensions?.worksheetContent?.worksheet;
  if (worksheet) return worksheet;

  const worksheets = getWorksheets();
  if (name) {
    const matched = worksheets.find((worksheet) => worksheet.name === name);
    if (matched) return matched;
  }
  return worksheets[0];
}

export async function loadSummaryCalendarData(settings: ExtensionSettings): Promise<TableauDataResult> {
  const warnings: string[] = [];
  const worksheets = getWorksheets();
  const worksheet = getWorksheet(settings.worksheetName);

  if (!worksheet) {
    return {
      points: [],
      fields: [],
      worksheets: [],
      selectedWorksheetName: "",
      years: [],
      attributeFilters: [],
      warnings: ["No Tableau worksheet is available to the extension."]
    };
  }

  const table = await getSummaryData(worksheet);
  const fields = table.columns.map((column, index) => ({
    fieldName: column.fieldName || `Column ${index + 1}`,
    dataType: column.dataType || "unknown"
  }));

  const dateIndex = resolveDateIndex(table.columns, settings.dateField);
  const valueIndex = resolveValueIndex(table.columns, settings.valueField, dateIndex);

  if (dateIndex < 0) warnings.push("Choose a date field in configuration.");
  if (valueIndex < 0) warnings.push("Choose a numeric measure in configuration.");

  if (dateIndex >= 0 && isYearLevelDateField(table.columns[dateIndex])) {
    warnings.push("The selected date field appears to be year-level. Add the exact date field to the worksheet, preferably on Detail, so the calendar can render MDY/day-level cells.");
  }

  const pointsByDate = new Map<string, { value: number; count: number; label: string; filterValue: string }>();

  if (dateIndex >= 0 && valueIndex >= 0) {
    table.data.forEach((row) => {
      const dateCell = row[dateIndex];
      const valueCell = row[valueIndex];
      const date = parseTableauDate(dateCell?.value, dateCell?.formattedValue);
      if (!date) return;

      const isoDate = toIsoDate(date);
      const numericValue = parseNumber(valueCell?.value, valueCell?.formattedValue);
      const filterValue = dateCell.formattedValue || isoDate;
      if (numericValue === null) {
        if (!pointsByDate.has(isoDate)) {
          pointsByDate.set(isoDate, { value: 0, count: 0, label: dateCell.formattedValue || isoDate, filterValue });
        }
        return;
      }

      const existing = pointsByDate.get(isoDate) ?? { value: 0, count: 0, label: dateCell.formattedValue || isoDate, filterValue };
      existing.value += numericValue;
      existing.count += 1;
      pointsByDate.set(isoDate, existing);
    });
  }

  const points = Array.from(pointsByDate.entries()).map(([isoDate, point]) => ({
    isoDate,
    value: point.count > 0 ? point.value : null,
    label: point.label,
    filterValue: point.filterValue
  }));
  const years = Array.from(new Set(points.map((point) => Number(point.isoDate.slice(0, 4))).filter(Number.isFinite))).sort((a, b) => a - b);
  const attributeFilters = buildAttributeFilters(table, dateIndex, valueIndex);

  return {
    points,
    fields,
    worksheets: worksheets.map((item, index) => item.name || `Worksheet ${index + 1}`),
    selectedWorksheetName: worksheet.name || "Current worksheet",
    years,
    attributeFilters,
    warnings
  };
}

export async function filterDay(settings: ExtensionSettings, isoDate: string, filterValue?: string): Promise<void> {
  const worksheet = getWorksheet(settings.worksheetName);
  if (!worksheet || !settings.dateField) return;

  const updateType = window.tableau?.FilterUpdateType?.Replace || "replace";
  await worksheet.applyFilterAsync(settings.dateField, filterValue || isoDate, updateType);
}

export async function filterAttribute(settings: ExtensionSettings, fieldName: string, value: string): Promise<void> {
  const worksheet = getWorksheet(settings.worksheetName);
  if (!worksheet) return;

  const filterUpdateType = window.tableau?.FilterUpdateType;
  if (!value) {
    await worksheet.applyFilterAsync(fieldName, "", filterUpdateType?.All || "all");
    return;
  }

  await worksheet.applyFilterAsync(fieldName, value, filterUpdateType?.Replace || "replace");
}

async function getSummaryData(worksheet: TableauWorksheet): Promise<TableauDataTable> {
  try {
    return await worksheet.getSummaryDataAsync({ maxRows: 0, ignoreAliases: false, ignoreSelection: true });
  } catch {
    return worksheet.getSummaryDataAsync();
  }
}

function resolveDateIndex(columns: TableauColumn[], configuredField: string): number {
  const configured = columns.findIndex((column) => column.fieldName === configuredField);
  if (configured >= 0) return configured;

  return columns.findIndex((column) => {
    const name = (column.fieldName || "").toLowerCase();
    const type = (column.dataType || "").toLowerCase();
    return type.includes("date") || name.includes("date") || name.includes("day");
  });
}

function isYearLevelDateField(column?: TableauColumn): boolean {
  const name = (column?.fieldName || "").toLowerCase();
  return /\byear\s*\(/.test(name) || /^year of /.test(name) || name === "year";
}

function resolveValueIndex(columns: TableauColumn[], configuredField: string, dateIndex: number): number {
  const configured = columns.findIndex((column) => column.fieldName === configuredField);
  if (configured >= 0) return configured;

  return columns.findIndex((column, index) => {
    if (index === dateIndex) return false;
    const type = (column.dataType || "").toLowerCase();
    return type.includes("int") || type.includes("float") || type.includes("real") || type.includes("number");
  });
}

function buildAttributeFilters(table: TableauDataTable, dateIndex: number, valueIndex: number): AttributeFilter[] {
  return table.columns
    .map((column, index) => ({ column, index }))
    .filter(({ column, index }) => {
      if (index === dateIndex || index === valueIndex) return false;
      if (isYearLevelDateField(column)) return false;
      const type = (column.dataType || "").toLowerCase();
      return !type.includes("int") && !type.includes("float") && !type.includes("real") && !type.includes("number");
    })
    .map(({ column, index }) => {
      const values = Array.from(
        new Set(
          table.data
            .map((row) => row[index]?.formattedValue ?? row[index]?.value)
            .filter((value): value is string | number | boolean => value !== null && value !== undefined && `${value}`.trim() !== "")
            .map((value) => `${value}`)
        )
      ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

      return {
        fieldName: column.fieldName || `Column ${index + 1}`,
        values: values.slice(0, 200)
      };
    })
    .filter((filter) => filter.values.length > 1 && filter.values.length <= 200)
    .slice(0, 8);
}

function parseTableauDate(value: unknown, formattedValue?: string): Date | null {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value;

  const explicit = parseExplicitDate(value) ?? parseExplicitDate(formattedValue);
  if (explicit) return explicit;

  if (typeof value === "number") {
    return null;
  }

  for (const candidate of [value, formattedValue]) {
    if (typeof candidate !== "string" || candidate.trim() === "") continue;
    if (/^\d{4}$/.test(candidate.trim())) return null;
    const date = new Date(candidate);
    if (Number.isFinite(date.getTime())) return date;
  }

  return null;
}

function parseExplicitDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;

  const text = value.trim();
  if (!text || /^\d{4}$/.test(text)) return null;

  const isoMatch = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    return buildLocalDate(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));
  }

  const mdyMatch = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (mdyMatch) {
    const year = normalizeYear(Number(mdyMatch[3]));
    return buildLocalDate(year, Number(mdyMatch[1]), Number(mdyMatch[2]));
  }

  const namedMonth = text.match(/^([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})$/);
  if (namedMonth) {
    const month = monthNameToNumber(namedMonth[1]);
    return month ? buildLocalDate(Number(namedMonth[3]), month, Number(namedMonth[2])) : null;
  }

  const dayNamedMonth = text.match(/^(\d{1,2})\s+([A-Za-z]{3,9}),?\s+(\d{4})$/);
  if (dayNamedMonth) {
    const month = monthNameToNumber(dayNamedMonth[2]);
    return month ? buildLocalDate(Number(dayNamedMonth[3]), month, Number(dayNamedMonth[1])) : null;
  }

  return null;
}

function buildLocalDate(year: number, month: number, day: number): Date | null {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

function normalizeYear(year: number): number {
  if (year >= 100) return year;
  return year >= 70 ? 1900 + year : 2000 + year;
}

function monthNameToNumber(monthName: string): number | null {
  const index = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(monthName.slice(0, 3).toLowerCase());
  return index >= 0 ? index + 1 : null;
}

function parseNumber(value: unknown, formattedValue?: string): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  const candidate = typeof value === "string" ? value : formattedValue;
  if (!candidate) return null;

  const trimmed = candidate.trim();
  const isNegative = /^\(.*\)$/.test(trimmed) || trimmed.startsWith("-");
  const parsed = Number(trimmed.replace(/[()$,%\s,-]/g, ""));
  const signed = isNegative ? -parsed : parsed;
  return Number.isFinite(signed) ? signed : null;
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

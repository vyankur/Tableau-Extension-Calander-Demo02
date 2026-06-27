import { CalendarDataPoint } from "./tableau";
import { ExtensionSettings } from "./settings";

export interface CalendarDay {
  date: Date;
  isoDate: string;
  dayOfMonth: number;
  weekday: number;
  weekIndex: number;
  value: number | null;
  label: string;
  filterValue: string;
  isToday: boolean;
  isWeekend: boolean;
  color: string;
}

export interface CalendarMonth {
  monthIndex: number;
  name: string;
  year: number;
  days: CalendarDay[];
  weekCount: number;
}

export interface CalendarRenderModel {
  year: number;
  months: CalendarMonth[];
  minValue: number;
  maxValue: number;
  weekLabels: string[];
}

export function buildCalendarRenderModel(points: CalendarDataPoint[], settings: ExtensionSettings): CalendarRenderModel {
  const pointsByDate = new Map(points.map((point) => [point.isoDate, point]));
  const availableYears = getAvailableYears(points);
  const year = settings.selectedYear && availableYears.includes(settings.selectedYear) ? settings.selectedYear : inferYear(points);
  const values = points
    .filter((point) => Number(point.isoDate.slice(0, 4)) === year)
    .map((point) => point.value)
    .filter((value): value is number => value !== null && Number.isFinite(value));
  const minValue = values.length ? Math.min(...values) : 0;
  const maxValue = values.length ? Math.max(...values) : 0;
  const todayIso = toIsoDate(new Date());
  const palette = parsePalette(settings.heatmapPalette);

  const months = Array.from({ length: 12 }, (_, monthIndex) => {
    const first = new Date(year, monthIndex, 1);
    const last = new Date(year, monthIndex + 1, 0);
    const days: CalendarDay[] = [];
    let weekCount = 1;

    for (let day = 1; day <= last.getDate(); day += 1) {
      const date = new Date(year, monthIndex, day);
      const isoDate = toIsoDate(date);
      const dataPoint = pointsByDate.get(isoDate);
      const weekIndex = getWeekIndex(first, date, settings.weekStart);
      weekCount = Math.max(weekCount, weekIndex + 1);

      days.push({
        date,
        isoDate,
        dayOfMonth: day,
        weekday: normalizeWeekday(date.getDay(), settings.weekStart),
        weekIndex,
        value: dataPoint?.value ?? null,
        label: dataPoint?.label ?? isoDate,
        filterValue: dataPoint?.filterValue ?? isoDate,
        isToday: isoDate === todayIso,
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
        color: getHeatmapColor(dataPoint?.value ?? null, minValue, maxValue, palette, settings.nullColor)
      });
    }

    return {
      monthIndex,
      name: first.toLocaleString(undefined, { month: "long" }),
      year,
      days,
      weekCount
    };
  });

  return {
    year,
    months,
    minValue,
    maxValue,
    weekLabels: settings.weekStart === "monday" ? ["M", "T", "W", "T", "F", "S", "S"] : ["S", "M", "T", "W", "T", "F", "S"]
  };
}

export function getHeatmapColor(value: number | null, min: number, max: number, palette: string[], nullColor: string): string {
  if (value === null || !Number.isFinite(value)) return nullColor;
  if (palette.length === 0) return nullColor;
  if (max <= min) return palette[palette.length - 1];

  const ratio = Math.min(Math.max((value - min) / (max - min), 0), 1);
  const index = Math.min(Math.floor(ratio * palette.length), palette.length - 1);
  return palette[index];
}

export function formatTooltip(day: CalendarDay): string {
  const date = day.date.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });
  const value = day.value === null ? "No data" : new Intl.NumberFormat().format(day.value);
  return `${date}\n${value}`;
}

function inferYear(points: CalendarDataPoint[]): number {
  const years = getAvailableYears(points);
  if (years.length) return years[0];

  const firstDate = points
    .map((point) => new Date(`${point.isoDate}T00:00:00`))
    .filter((date) => Number.isFinite(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime())[0];

  return firstDate?.getFullYear() ?? new Date().getFullYear();
}

function getAvailableYears(points: CalendarDataPoint[]): number[] {
  return Array.from(new Set(points.map((point) => Number(point.isoDate.slice(0, 4))).filter(Number.isFinite))).sort((a, b) => a - b);
}

function getWeekIndex(firstOfMonth: Date, date: Date, weekStart: "sunday" | "monday"): number {
  const firstOffset = normalizeWeekday(firstOfMonth.getDay(), weekStart);
  return Math.floor((firstOffset + date.getDate() - 1) / 7);
}

function normalizeWeekday(day: number, weekStart: "sunday" | "monday"): number {
  if (weekStart === "sunday") return day;
  return day === 0 ? 6 : day - 1;
}

function parsePalette(palette: string): string[] {
  return palette
    .split(",")
    .map((color) => color.trim())
    .filter(Boolean);
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

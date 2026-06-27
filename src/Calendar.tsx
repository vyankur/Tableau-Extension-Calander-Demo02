import { ExtensionSettings } from "./settings";
import { buildCalendarRenderModel } from "./renderer";
import { CalendarDataPoint } from "./tableau";
import { DayCell } from "./DayCell";
import type { CSSProperties } from "react";

interface CalendarProps {
  points: CalendarDataPoint[];
  settings: ExtensionSettings;
  onDayClick: (isoDate: string, filterValue: string) => void;
}

export function Calendar({ points, settings, onDayClick }: CalendarProps) {
  const model = buildCalendarRenderModel(points, settings);
  const cellTrack = `${settings.cellSize}px`;

  return (
    <section
      className="calendar-shell"
      style={
        {
          "--calendar-bg": settings.backgroundColor,
          "--calendar-font": settings.fontFamily,
          "--month-gap": `${settings.monthSpacing}px`,
          "--cell-gap": `${settings.cellSpacing}px`,
          "--cell-size": `${settings.cellSize}px`,
          "--header-color": settings.headerColor
        } as CSSProperties
      }
    >
      {settings.customCss ? <style>{settings.customCss}</style> : null}
      <div className="calendar-topline">
        <h1>{model.year}</h1>
        <div className="legend" aria-label="Heatmap legend">
          <span>{model.minValue}</span>
          <div className="legend-ramp">
            {settings.heatmapPalette.split(",").map((color, index) => (
              <i key={`${color}-${index}`} style={{ backgroundColor: color.trim() }} />
            ))}
          </div>
          <span>{model.maxValue}</span>
        </div>
      </div>

      <div className="months-grid" style={{ gridTemplateColumns: `repeat(${settings.monthsPerRow}, minmax(0, 1fr))` }}>
        {model.months.map((month) => (
          <article className="month" key={month.monthIndex}>
            <header className="month-header">{month.name}</header>
            <div className="month-body">
              <div className="weekday-column">
                {model.weekLabels.map((label, index) => (
                  <span key={`${label}-${index}`}>{label}</span>
                ))}
              </div>
              <div
                className="days-grid"
                style={{
                  gridTemplateColumns: `repeat(${month.weekCount}, ${cellTrack})`,
                  gridTemplateRows: `repeat(7, ${cellTrack})`
                }}
              >
                {month.days.map((day) => (
                  <DayCell
                    key={day.isoDate}
                    day={day}
                    cellSize={settings.cellSize}
                    borderWidth={settings.borderWidth}
                    borderRadius={settings.borderRadius}
                    todayColor={settings.todayColor}
                    weekendColor={settings.weekendColor}
                    onClick={onDayClick}
                  />
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

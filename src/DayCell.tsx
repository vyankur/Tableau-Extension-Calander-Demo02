import { CalendarDay, formatTooltip } from "./renderer";

interface DayCellProps {
  day: CalendarDay;
  cellSize: number;
  borderWidth: number;
  borderRadius: number;
  todayColor: string;
  weekendColor: string;
  onClick: (isoDate: string, filterValue: string) => void;
}

export function DayCell({ day, cellSize, borderWidth, borderRadius, todayColor, weekendColor, onClick }: DayCellProps) {
  return (
    <button
      className="day-cell"
      title={formatTooltip(day)}
      aria-label={formatTooltip(day).replace("\n", ", ")}
      onClick={() => onClick(day.isoDate, day.filterValue)}
      style={{
        gridColumn: day.weekIndex + 1,
        gridRow: day.weekday + 1,
        width: cellSize,
        height: cellSize,
        borderWidth,
        borderRadius: `${borderRadius}%`,
        backgroundColor: day.color,
        borderColor: day.isToday ? todayColor : day.isWeekend ? weekendColor : "rgba(17, 24, 39, 0.12)",
        outlineColor: day.isToday ? todayColor : "transparent"
      }}
    >
      <span>{day.dayOfMonth}</span>
    </button>
  );
}

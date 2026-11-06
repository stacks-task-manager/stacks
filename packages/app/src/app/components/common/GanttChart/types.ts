// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
export type GanttScale = "day" | "week" | "month" | "quarter" | "halfYear";
export type DateEdit = "move" | "left" | "right";

export interface GanttRow {
    id: string;
    name: string;
    startDate: Date | null;
    endDate: Date | null;
    color?: string;
    secondaryLabel?: string;
    children: GanttRow[];
}

export interface DateRange {
    startDate: Date;
    endDate: Date;
}

export interface GanttChartProps {
    rows: GanttRow[];
    onActivate: (id: string) => void;
    onDatesChange: (id: string, range: DateRange) => Promise<void>;
}

// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import type { calendarViewType } from "app/widgets/calendar2/Calendar2";

export const CALENDAR_VIEW_TO_FC: Record<string, calendarViewType> = {
    day: "one",
    week: "week",
    month: "month",
    agenda: "month",
};

export function mapCalendarStoreViewToFc(view: string): calendarViewType {
    return CALENDAR_VIEW_TO_FC[view] ?? "week";
}

// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
export interface TimelinePopupProps {
    id: string;
    rowId: string;
}

export interface TimelineDayPopupProps extends TimelinePopupProps {
    date: Date;
}

export interface TimelineComponents {
    dayPopup: React.ComponentType<TimelineDayPopupProps> | undefined;
    totalPopup?: React.ComponentType<TimelinePopupProps>;
}

export interface TimelineDay {
    date: Date;
    hours: number;
}

export interface TimelineData {
    days: TimelineDay[];
    id: string;
    title: string;
}

// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
export enum FIELDTYPE {
    TEXT = "text",
    TEXTAREA = "textarea",
    NUMBER = "number",
    DATE = "date",
    DROPDOWN = "dropdown",
    CHECKBOXES = "checkboxes",
    RADIO = "radio",
    SWITCH = "switch",
    SLIDER = "slider",
    URL = "url",
}

export enum FIELDTYPEICON {
    TEXT = "type-01",
    TEXTAREA = "menu-03",
    NUMBER = "hash-02",
    DATE = "calendar-date",
    DROPDOWN = "arrow-circle-down",
    CHECKBOXES = "check-square",
    RADIO = "check-circle",
    SWITCH = "lightbulb-04",
    SLIDER = "sliders-04",
    URL = "link-03",
}

export interface IField {
    id: string;
    title: string;
    description?: string;
    type: FIELDTYPE;
    options?: any;
}

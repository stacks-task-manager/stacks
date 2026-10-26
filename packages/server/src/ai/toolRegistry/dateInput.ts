// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { z } from "zod";

/** Validate before mutation dispatch while preserving the string-based tool interface. */
export const aiDateInput = z.string().refine(value => {
    // A time of day is only accepted with an explicit timezone, so no value depends on the host clock
    if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(Z|[+-]\d{2}:\d{2}))?$/.test(value))
        return false;
    const day = value.slice(0, 10);
    const date = new Date(day + "T00:00:00.000Z");
    return (
        Number.isFinite(date.getTime()) &&
        date.toISOString().slice(0, 10) === day &&
        Number.isFinite(Date.parse(value))
    );
}, "Use a valid ISO date or date-time with an explicit timezone");

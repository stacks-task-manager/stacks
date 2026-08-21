// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Date hooks and selectors.
 */
import { useMemo } from "react";
import { usePreferences } from "./preferences";
import { is24Hours } from "../utils/date";

/**
 * Returns whether the user prefers a 24-hour clock, recomputed when the date locale changes.
 * @returns True if 24-hour time format is active, otherwise false.
 */
export const use24Hours = () => {
    const { dateLocale } = usePreferences(["dateLocale"]);

    return useMemo(() => {
        return is24Hours();
    }, [dateLocale]);
};

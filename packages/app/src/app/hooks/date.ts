// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Date hooks and selectors.
 */
import { useMemo } from "react";
import { usePreferences } from "./preferences";
import { is24Hours } from "../utils/date";

export const use24Hours = () => {
    const { dateLocale } = usePreferences(["dateLocale"]);

    return useMemo(() => {
        return is24Hours();
    }, [dateLocale]);
};

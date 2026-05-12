// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import {
    differenceInMilliseconds,
    format,
    formatDistanceToNow,
    formatRelative,
    intervalToDuration,
    isAfter,
    isBefore,
    isSameDay,
    isToday,
    isValid,
    Locale,
    parseISO,
    setDefaultOptions,
    startOfDay,
} from "date-fns";

export const timeAgo = (date: Date) => {
    if (isSameDay(date, new Date())) {
        return formatDistanceToNow(date, { addSuffix: true });
    }
    return format(date, "PP");
};

// Cache for loaded locales to avoid re-importing
const localeCache = new Map<string, Locale>();

// Locale mapping for dynamic imports - all supported date-fns locales
const localeImportMap: { [key: string]: () => Promise<any> } = {
    af: () => import("date-fns/locale/af"),
    ar: () => import("date-fns/locale/ar"),
    "ar-DZ": () => import("date-fns/locale/ar-DZ"),
    "ar-EG": () => import("date-fns/locale/ar-EG"),
    "ar-MA": () => import("date-fns/locale/ar-MA"),
    "ar-SA": () => import("date-fns/locale/ar-SA"),
    "ar-TN": () => import("date-fns/locale/ar-TN"),
    az: () => import("date-fns/locale/az"),
    be: () => import("date-fns/locale/be"),
    "be-tarask": () => import("date-fns/locale/be-tarask"),
    bg: () => import("date-fns/locale/bg"),
    bn: () => import("date-fns/locale/bn"),
    bs: () => import("date-fns/locale/bs"),
    ca: () => import("date-fns/locale/ca"),

    cs: () => import("date-fns/locale/cs"),
    cy: () => import("date-fns/locale/cy"),
    da: () => import("date-fns/locale/da"),
    de: () => import("date-fns/locale/de"),
    "de-AT": () => import("date-fns/locale/de-AT"),
    el: () => import("date-fns/locale/el"),
    "en-AU": () => import("date-fns/locale/en-AU"),
    "en-CA": () => import("date-fns/locale/en-CA"),
    "en-GB": () => import("date-fns/locale/en-GB"),
    "en-IE": () => import("date-fns/locale/en-IE"),
    "en-IN": () => import("date-fns/locale/en-IN"),
    "en-NZ": () => import("date-fns/locale/en-NZ"),
    "en-US": () => import("date-fns/locale/en-US"),
    "en-ZA": () => import("date-fns/locale/en-ZA"),
    eo: () => import("date-fns/locale/eo"),
    es: () => import("date-fns/locale/es"),
    et: () => import("date-fns/locale/et"),
    eu: () => import("date-fns/locale/eu"),
    "fa-IR": () => import("date-fns/locale/fa-IR"),
    fi: () => import("date-fns/locale/fi"),
    fr: () => import("date-fns/locale/fr"),
    "fr-CA": () => import("date-fns/locale/fr-CA"),
    "fr-CH": () => import("date-fns/locale/fr-CH"),
    fy: () => import("date-fns/locale/fy"),
    gd: () => import("date-fns/locale/gd"),
    gl: () => import("date-fns/locale/gl"),
    gu: () => import("date-fns/locale/gu"),
    he: () => import("date-fns/locale/he"),
    hi: () => import("date-fns/locale/hi"),
    hr: () => import("date-fns/locale/hr"),
    ht: () => import("date-fns/locale/ht"),
    hu: () => import("date-fns/locale/hu"),
    hy: () => import("date-fns/locale/hy"),
    id: () => import("date-fns/locale/id"),
    is: () => import("date-fns/locale/is"),
    it: () => import("date-fns/locale/it"),
    "it-CH": () => import("date-fns/locale/it-CH"),
    ja: () => import("date-fns/locale/ja"),
    "ja-Hira": () => import("date-fns/locale/ja-Hira"),
    ka: () => import("date-fns/locale/ka"),
    kk: () => import("date-fns/locale/kk"),
    km: () => import("date-fns/locale/km"),
    kn: () => import("date-fns/locale/kn"),
    ko: () => import("date-fns/locale/ko"),
    lb: () => import("date-fns/locale/lb"),
    lt: () => import("date-fns/locale/lt"),
    lv: () => import("date-fns/locale/lv"),
    mk: () => import("date-fns/locale/mk"),
    mn: () => import("date-fns/locale/mn"),
    ms: () => import("date-fns/locale/ms"),
    mt: () => import("date-fns/locale/mt"),
    nb: () => import("date-fns/locale/nb"),
    nl: () => import("date-fns/locale/nl"),
    "nl-BE": () => import("date-fns/locale/nl-BE"),
    nn: () => import("date-fns/locale/nn"),
    oc: () => import("date-fns/locale/oc"),
    pl: () => import("date-fns/locale/pl"),
    pt: () => import("date-fns/locale/pt"),
    "pt-BR": () => import("date-fns/locale/pt-BR"),
    ro: () => import("date-fns/locale/ro"),
    ru: () => import("date-fns/locale/ru"),

    sk: () => import("date-fns/locale/sk"),
    sl: () => import("date-fns/locale/sl"),
    sq: () => import("date-fns/locale/sq"),
    sr: () => import("date-fns/locale/sr"),
    "sr-Latn": () => import("date-fns/locale/sr-Latn"),
    sv: () => import("date-fns/locale/sv"),
    ta: () => import("date-fns/locale/ta"),
    te: () => import("date-fns/locale/te"),
    th: () => import("date-fns/locale/th"),
    tr: () => import("date-fns/locale/tr"),
    ug: () => import("date-fns/locale/ug"),
    uk: () => import("date-fns/locale/uk"),
    uz: () => import("date-fns/locale/uz"),
    "uz-Cyrl": () => import("date-fns/locale/uz-Cyrl"),
    vi: () => import("date-fns/locale/vi"),
    "zh-CN": () => import("date-fns/locale/zh-CN"),
    "zh-HK": () => import("date-fns/locale/zh-HK"),
    "zh-TW": () => import("date-fns/locale/zh-TW"),
};

// Create a locale map for supported languages with fallback to dynamic loading
const localeMap: { [key: string]: Locale } = {
    // All locales will be dynamically loaded
};

export const formatDate = (theDate: string | Date | undefined | null, formatStr = "PPp") => {
    if (!theDate) return "";
    const parsedDate = typeof theDate === "string" ? parseISO(theDate) : theDate;
    if (!isValid(parsedDate)) return "";
    return format(parsedDate, formatStr);
};

interface DurationUnits {
    hours: string;
    minutes: string;
    seconds: string;
}

interface FormatConfig {
    units: DurationUnits;
    delimiter: string;
    showZero: boolean;
    padZeros: boolean;
    alwaysShowSeconds: boolean;
    pluralize?: boolean;
}

type PresetFormat = "short" | "long" | "colon" | "compact" | "verbose";
/**
 *
 * @param totalSeconds
 * @param format
 * @returns
 * console.log(`Short: ${formatDuration(testSeconds, 'short')}`);     // "2h 2m 3s"
 * console.log(`Long: ${formatDuration(testSeconds, 'long')}`);       // "2 hours 2 minutes 3 seconds"
 * console.log(`Colon: ${formatDuration(testSeconds, 'colon')}`);     // "02:02:03"
 * console.log(`Compact: ${formatDuration(testSeconds, 'compact')}`); // "2h2m3s"
 * console.log(`Verbose: ${formatDuration(testSeconds, 'verbose')}`); // "2 hours, 2 minutes, 3 seconds"
 */
export function formatDuration(totalSeconds: number, format: PresetFormat | FormatConfig = "short"): string {
    const duration = intervalToDuration({
        start: 0,
        end: totalSeconds * 1000,
    });

    const formats: Record<PresetFormat, FormatConfig> = {
        short: {
            units: { hours: "h", minutes: "m", seconds: "s" },
            delimiter: " ",
            showZero: false,
            padZeros: false,
            alwaysShowSeconds: false,
        },
        long: {
            units: { hours: " hours", minutes: " minutes", seconds: " seconds" },
            delimiter: "",
            showZero: false,
            padZeros: false,
            alwaysShowSeconds: false,
        },
        colon: {
            units: { hours: ":", minutes: ":", seconds: "" },
            delimiter: "",
            padZeros: true,
            showZero: true,
            alwaysShowSeconds: true,
        },
        compact: {
            units: { hours: "h", minutes: "m", seconds: "s" },
            delimiter: "",
            showZero: false,
            padZeros: false,
            alwaysShowSeconds: false,
        },
        verbose: {
            units: { hours: " hour", minutes: " minute", seconds: " second" },
            delimiter: ", ",
            showZero: false,
            padZeros: false,
            alwaysShowSeconds: false,
            pluralize: true,
        },
    };

    // Use preset format or custom format object
    const config: FormatConfig = typeof format === "string" ? formats[format] : format;

    if (!config) {
        throw new Error(`Unknown format: ${format}. Available formats: ${Object.keys(formats).join(", ")}`);
    }

    const { units, delimiter, showZero, padZeros, alwaysShowSeconds, pluralize } = config;

    const parts = [];

    // Hours
    if (duration.hours || showZero) {
        const value = padZeros ? String(duration.hours || 0).padStart(2, "0") : duration.hours || 0;
        let unit = units.hours;

        if (pluralize && (duration.hours || 0) !== 1) {
            unit = unit + "s";
        }

        parts.push(`${value}${unit}`);
    }

    // Minutes
    if (duration.minutes || showZero || (parts.length > 0 && format === "colon")) {
        const value = padZeros ? String(duration.minutes || 0).padStart(2, "0") : duration.minutes || 0;
        let unit = units.minutes;

        if (pluralize && (duration.minutes || 0) !== 1) {
            unit = unit + "s";
        }

        parts.push(`${value}${unit}`);
    }

    // Seconds
    if (duration.seconds || showZero || alwaysShowSeconds || parts.length === 0) {
        const value = padZeros ? String(duration.seconds || 0).padStart(2, "0") : duration.seconds || 0;
        let unit = units.seconds;

        if (pluralize && (duration.seconds || 0) !== 1) {
            unit = unit + "s";
        }

        parts.push(`${value}${unit}`);
    }

    return parts.join(delimiter);
}

export const parseDate = (date?: string | Date | null, defaultToNow?: boolean): Date | null => {
    if (!date) return defaultToNow ? new Date() : null;
    if (typeof date === "string") {
        const parsedDate = parseISO(date);
        return isValid(parsedDate) ? parsedDate : new Date(date);
    }
    return date;
};

/** True if `date` is strictly before now (due/start/do checks share this semantics). */
const isBeforeNow = (date?: Date) => {
    if (!date) return false;
    return isBefore(date, new Date());
};

export const isOverdue = isBeforeNow;
export const isStarted = isBeforeNow;
export const isDo = isBeforeNow;

export const timeSince = (date?: Date) => {
    if (!date) return "-";
    if (!isToday(date)) {
        return formatDate(date);
    }

    return formatRelative(date, new Date());
};

export const isAfterToday = (date?: Date) => {
    if (!date) return false;
    const inputDate = typeof date === "string" ? new Date(date) : date;
    return isAfter(startOfDay(inputDate), startOfDay(new Date()));
};

export const formatDateDiff = (date: Date | null) => {
    if (!date) return "";
    const diffInMs = differenceInMilliseconds(new Date(), date);
    const days = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    return `${days}d`;
};

export const is24Hours = () => {
    const now = new Date();
    const formattedDate = format(now, "p");

    // If it contains 'PM' or 'AM', it's 12-hour format
    return !formattedDate.includes("PM") && !formattedDate.includes("AM");
};

export const isAmPm = () => !is24Hours();

export const getDateFnsLocaleByLanguage = async (lang: string): Promise<Locale> => {
    // Check if locale is already cached
    if (localeCache.has(lang)) {
        return localeCache.get(lang)!;
    }

    // Check if locale is already loaded in localeMap
    if (localeMap[lang]) {
        localeCache.set(lang, localeMap[lang]);
        return localeMap[lang];
    }

    // Handle special cases for language codes
    let importKey = lang;
    if (lang === "zh") {
        importKey = "zh-CN";
    }

    // Try to dynamically import the locale
    if (localeImportMap[importKey]) {
        try {
            const localeModule = await localeImportMap[importKey]();
            // Handle both default exports and named exports
            const locale = localeModule.default || localeModule;
            localeCache.set(lang, locale);
            localeCache.set(importKey, locale); // Cache both keys
            return locale;
        } catch (error) {
            console.warn(`Failed to load locale for ${lang}:`, error);
        }
    }

    // Fallback to en-US (dynamically loaded)
    try {
        const enUSModule = await import("date-fns/locale/en-US");
        const enUSLocale = enUSModule.default || enUSModule;
        localeCache.set(lang, enUSLocale);
        return enUSLocale;
    } catch (error) {
        console.error("Failed to load fallback locale en-US:", error);
        // Return a minimal locale object as last resort
        const fallbackLocale = { code: "en-US" } as Locale;
        localeCache.set(lang, fallbackLocale);
        return fallbackLocale;
    }
};

export const setDateFnsLocale = async (lang: string) => {
    const locale = await getDateFnsLocaleByLanguage(lang);
    setDefaultOptions({ locale });
};

/**
 * Parses a duration string in format "2w 4d 6h 45m" and converts it to total seconds.
 * For year/month-style inputs (`timeToMinutes` / `minutesToTime` in `string.tsx`), use those helpers instead.
 * @param durationStr - Duration string (e.g., "2w 4d 6h 45m")
 * @returns Total seconds
 */
export const parseStringDuration = (durationStr: string): number => {
    if (!durationStr || typeof durationStr !== "string") {
        return 0;
    }

    const trimmed = durationStr.trim();

    // If it's just a number without units, treat as minutes
    if (/^\d+$/.test(trimmed)) {
        return parseInt(trimmed, 10) * 60;
    }

    // Regular expression to match duration parts (number followed by unit)
    const regex = /(\d+)\s*([wdhm])/gi;
    let totalSeconds = 0;
    let match;

    while ((match = regex.exec(trimmed)) !== null) {
        const value = parseInt(match[1], 10);
        const unit = match[2].toLowerCase();

        switch (unit) {
            case "w": // weeks
                totalSeconds += value * 7 * 24 * 60 * 60;
                break;
            case "d": // days
                totalSeconds += value * 24 * 60 * 60;
                break;
            case "h": // hours
                totalSeconds += value * 60 * 60;
                break;
            case "m": // minutes
                totalSeconds += value * 60;
                break;
        }
    }

    return totalSeconds;
};

// Time unit constants for duration formatting
const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 60 * 60;
const HOURS_PER_DAY = 24;
const SECONDS_PER_DAY = HOURS_PER_DAY * 60 * 60;
const DAYS_PER_WEEK = 7;
const SECONDS_PER_WEEK = DAYS_PER_WEEK * SECONDS_PER_DAY;

// Type for maximum unit constraint
type MaxUnit = "w" | "d" | "h" | "m";

/**
 * Formats seconds into a duration string in format "2w 4d 6h 45m"
 * @param totalSeconds - Total seconds to format
 * @param maxUnit - Optional maximum unit to display (w=weeks, d=days, h=hours, m=minutes).
 *                  When specified, larger units will be converted to this unit instead of being displayed separately.
 *                  For example, with maxUnit='d', "5w 2d 5h" becomes "37d 5h"
 * @returns Formatted duration string
 */
export const formatStringDuration = (totalSeconds: number, maxUnit?: MaxUnit): string => {
    if (totalSeconds <= 0) {
        return "0m";
    }

    let weeks = 0;
    let days = 0;
    let hours = 0;
    let minutes = 0;

    if (maxUnit === "m") {
        // Convert everything to minutes
        minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
    } else if (maxUnit === "h") {
        // Convert everything to hours and minutes
        hours = Math.floor(totalSeconds / SECONDS_PER_HOUR);
        minutes = Math.floor((totalSeconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
    } else if (maxUnit === "d") {
        // Convert everything to days, hours, and minutes
        days = Math.floor(totalSeconds / SECONDS_PER_DAY);
        hours = Math.floor((totalSeconds % SECONDS_PER_DAY) / SECONDS_PER_HOUR);
        minutes = Math.floor((totalSeconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
    } else {
        // Default behavior or maxUnit === 'w'
        weeks = Math.floor(totalSeconds / SECONDS_PER_WEEK);
        days = Math.floor((totalSeconds % SECONDS_PER_WEEK) / SECONDS_PER_DAY);
        hours = Math.floor((totalSeconds % SECONDS_PER_DAY) / SECONDS_PER_HOUR);
        minutes = Math.floor((totalSeconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
    }

    const parts = [];

    if (weeks > 0) parts.push(`${weeks}w`);
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);

    return parts.length > 0 ? parts.join(" ") : "0m";
};

/**
 * Converts seconds to hours with decimal precision
 * @param totalSeconds - Total seconds to convert
 * @returns Number of hours as a decimal
 */
export const durationToHours = (totalSeconds: number): number => {
    if (totalSeconds <= 0) {
        return 0;
    }
    return totalSeconds / SECONDS_PER_HOUR;
};

/**
 * Converts seconds to working days (8 hours per working day)
 * @param totalSeconds - Total seconds to convert
 * @returns Number of working days as a decimal
 */
export const durationToWorkingDays = (totalSeconds: number): number => {
    if (totalSeconds <= 0) {
        return 0;
    }
    const HOURS_PER_WORKING_DAY = 8;
    const SECONDS_PER_WORKING_DAY = HOURS_PER_WORKING_DAY * SECONDS_PER_HOUR;
    return totalSeconds / SECONDS_PER_WORKING_DAY;
};

/**
 * Validates if a duration string is in the correct format
 * @param durationStr - Duration string to validate
 * @returns True if valid, false otherwise
 */
export const isDurationValid = (durationStr: string): boolean => {
    if (!durationStr || typeof durationStr !== "string") {
        return true;
    }

    const trimmed = durationStr.trim();

    // If it's just a number, it's valid (treated as minutes)
    if (/^\d+$/.test(trimmed)) {
        return true;
    }

    // Check if the string only contains valid duration patterns
    // Valid pattern: one or more groups of (number + valid unit)
    const validPattern = /^(\d+\s*[wdhm]\s*)+$/i;

    if (!validPattern.test(trimmed)) {
        return false;
    }

    // Additional check: ensure no invalid characters are present
    // Remove all valid patterns and see if anything remains
    const withoutValidParts = trimmed.replace(/\d+\s*[wdhm]\s*/gi, "");

    // If anything remains after removing valid parts, it's invalid
    return withoutValidParts.trim() === "";
};

/** FullCalendar time-grid slot labels (strip ":00 " for a shorter rail). */
export const formatFullCalendarSlotTime = (date: Date) => format(date, "p").replace(":00 ", "");

/** FullCalendar now-indicator time (no space between time and AM/PM). */
export const formatFullCalendarNowIndicatorTime = (date: Date) => format(date, "p").replace(" ", "");

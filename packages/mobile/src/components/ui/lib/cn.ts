// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge conditional class names, letting later utility classes win over
 * earlier ones (Tailwind-aware dedupe). This is the runtime equivalent of the
 * old `tva(...)` variant-merging used by the gluestack primitives.
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
    return twMerge(clsx(classes));
}

/** Spacing scale → Tailwind gap classes (shared by VStack/HStack). */
export const SPACE_TO_GAP: Record<string, string> = {
    xs: "gap-1",
    sm: "gap-2",
    md: "gap-3",
    lg: "gap-4",
    xl: "gap-5",
    "2xl": "gap-6",
    "3xl": "gap-7",
    "4xl": "gap-8",
};

/** Text size scale → Tailwind font-size classes (shared by Text/Heading). */
export const SIZE_TO_TEXT: Record<string, string> = {
    "2xs": "text-2xs",
    xs: "text-xs",
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
    xl: "text-xl",
    "2xl": "text-2xl",
    "3xl": "text-3xl",
    "4xl": "text-4xl",
    "5xl": "text-5xl",
    "6xl": "text-6xl",
};

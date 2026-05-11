// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Locales TUI theme and layout constants.
 *
 * Terminals use a fixed cell grid — there is no true “font size”. Use `bold` / `dimColor`
 * on `<Text>` for hierarchy; Ink maps colors via chalk-compatible names.
 */
export const tuiTheme = {
    colors: {
        brand: "magenta",
        title: "white",
        accent: "cyan",
        accentMuted: "gray",
        /** Full-row / block selection (browse list, high contrast) */
        selection: {
            fg: "black",
            bg: "cyan",
        },
        /** ink-select-input highlighted item */
        menu: {
            selectedFg: "black",
            selectedBg: "cyan",
            unselectedFg: undefined as string | undefined,
            indicatorSelectedFg: "black",
            indicatorSelectedBg: "cyan",
            indicatorIdleFg: "gray",
        },
        list: {
            bulletIdle: "gray",
            keyIdle: "white",
            valueIdle: "gray",
        },
        border: {
            default: "cyan",
            warning: "yellow",
            danger: "red",
        },
        semantic: {
            warning: "yellow",
            danger: "red",
            success: "green",
            note: "yellow",
            body: "white",
        },
        label: "gray",
        separator: "gray",
    },
    /**
     * Typography: terminal has one cell height per row. These flags map to Ink `Text` props.
     */
    typography: {
        titleBold: true,
        labelBold: true,
        listValueItalicWhenIdle: true,
    },
    layout: {
        menuLimitMin: 8,
        menuLimitMax: 60,
        /** `limit ≈ rows - this` for SelectInput menus */
        menuLimitRowsReserved: 10,
        /** Browse / unused list: `visibleLines ≈ rows - this` */
        browseListRowsReserved: 17,
        unusedListRowsReserved: 20,
        unusedListMinVisible: 12,
    },
} as const;

export type TuiTheme = typeof tuiTheme;

export function menuLimitForRows(rows: number): number {
    const { menuLimitMin, menuLimitMax, menuLimitRowsReserved } = tuiTheme.layout;
    return Math.max(menuLimitMin, Math.min(menuLimitMax, rows - menuLimitRowsReserved));
}

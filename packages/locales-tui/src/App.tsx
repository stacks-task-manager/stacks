// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import type { TranslationValue } from "@stacks/translations";
import { isLocaleKeyWithinMaxLength, isValidLocaleKey, MAX_LOCALE_KEY_LENGTH } from "./validation.js";
import React, { useMemo, useState } from "react";
import { Box, Text, useApp, useInput } from "ink";
import SelectInput from "ink-select-input";
import TextInput from "ink-text-input";
import {
    addEnglishEntry,
    addLanguageFile,
    deleteKeyAcrossLocales,
    indexLocaleFilesById,
    readLocaleJson,
    renameKeyAcrossLocales,
    syncMissingKeysFromEn,
    updateEnglishValue,
    updateLocaleValue,
} from "./localeOps.js";
import { repoRootFromModuleUrl } from "./repoRoot.js";
import { findSimilarEntries, type SimilarityHit } from "./similarity.js";
import {
    sectionLocalesAbsPath,
    sectionScanAbsPaths,
    TRANSLATION_SECTIONS,
    type TranslationSection,
} from "./sections.js";
import { findUnusedEnglishKeys } from "./unusedTranslate.js";
import { filterBrowseKeys } from "./browseFilters.js";
import {
    BodyText,
    Label,
    menuLimitForRows,
    ScreenShell,
    tuiSelectInputProps,
    TuiSelectItem,
    tuiTheme,
    useViewport,
} from "./tuiChrome.js";

function trunc(s: string, n: number): string {
    const t = s.replace(/\s+/g, " ");
    return t.length <= n ? t : t.slice(0, n - 1) + "…";
}

/** Rough line count when `text` is wrapped at `width` cells (for sizing the browse/unused list). */
function estimatedWrappedLines(text: string, width: number): number {
    if (width < 1) return 1;
    return text.split("\n").reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / width)), 0);
}

function displayValue(v: TranslationValue): string {
    if (typeof v === "string") return v;
    return JSON.stringify(v);
}

function parseTranslationValue(s: string): TranslationValue {
    const t = s.trim();
    if (t.startsWith("{")) {
        try {
            return JSON.parse(t) as TranslationValue;
        } catch {
            return s;
        }
    }
    return s;
}

const LANG_MENU_SEPARATOR_VALUE = "__lang_menu_sep__";
const LANG_MENU_SEPARATOR_LABEL = " ─── languages ─── ";

function LanguagePickItem({ isSelected, label }: { isSelected?: boolean; label: string }): React.ReactElement {
    if (label === LANG_MENU_SEPARATOR_LABEL) {
        return (
            <Text dimColor color={tuiTheme.colors.separator}>
                {label}
            </Text>
        );
    }
    return <TuiSelectItem isSelected={isSelected} label={label} />;
}

type Screen =
    | { name: "sections" }
    | { name: "language_pick"; section: TranslationSection; note?: string }
    | { name: "hub"; section: TranslationSection; localeId: string; note?: string }
    | {
          name: "browse";
          section: TranslationSection;
          localeId: string;
          index: number;
          mode: "list";
          searchQuery: string;
          untranslatedOnly: boolean;
      }
    | {
          name: "browse";
          section: TranslationSection;
          localeId: string;
          mode: "search";
          /** Filter before opening search (Esc restores this). */
          listSearchQuery: string;
          searchDraft: string;
          untranslatedOnly: boolean;
      }
    | {
          name: "browse";
          section: TranslationSection;
          localeId: string;
          index: number;
          mode: "edit";
          draft: string;
          searchQuery: string;
          untranslatedOnly: boolean;
      }
    | { name: "add"; section: TranslationSection; step: "key" | "value" | "similar"; key: string; value: string; hits?: SimilarityHit[] }
    | {
          name: "edit_rename";
          section: TranslationSection;
          oldKey: string;
          draft: string;
          browseIndex: number;
          searchQuery: string;
          untranslatedOnly: boolean;
      }
    | {
          name: "edit_rename_confirm";
          section: TranslationSection;
          oldKey: string;
          newKey: string;
          browseIndex: number;
          searchQuery: string;
          untranslatedOnly: boolean;
      }
    | { name: "sync_confirm"; section: TranslationSection }
    | {
          name: "delete_confirm";
          section: TranslationSection;
          key: string;
          browseIndex: number;
          searchQuery: string;
          untranslatedOnly: boolean;
      }
    | { name: "add_lang"; section: TranslationSection; draft: string }
    | {
          name: "unused";
          section: TranslationSection;
          unused: string[];
          dynamicSites: { file: string; line: number }[];
          index: number;
      }
    | {
          name: "unused_delete_confirm";
          section: TranslationSection;
          key: string;
          unusedIndex: number;
          unused: string[];
          dynamicSites: { file: string; line: number }[];
      };

export function App(): React.ReactElement {
    const { exit } = useApp();
    const { rows, columns } = useViewport();
    const menuLimit = menuLimitForRows(rows);
    const repoRoot = useMemo(() => repoRootFromModuleUrl(import.meta.url), []);
    const [screen, setScreen] = useState<Screen>({ name: "sections" });
    const [refresh, setRefresh] = useState(0);
    const bump = () => setRefresh(r => r + 1);

    const ld = (section: TranslationSection) => sectionLocalesAbsPath(repoRoot, section);

    const readLocaleMap = (section: TranslationSection, localeId: string): Record<string, TranslationValue> => {
        void refresh;
        const map = indexLocaleFilesById(ld(section));
        const p = map.get(localeId.toLowerCase());
        if (!p) return {};
        return readLocaleJson(p) ?? {};
    };

    const readEn = (section: TranslationSection): Record<string, TranslationValue> => readLocaleMap(section, "en");

    const keysList = (section: TranslationSection, localeId: string): string[] =>
        Object.keys(readLocaleMap(section, localeId)).sort((a, b) => a.localeCompare(b));

    useInput((input, key) => {
        if (key.escape) {
            if (screen.name === "browse" && screen.mode === "edit")
                setScreen({
                    name: "browse",
                    section: screen.section,
                    localeId: screen.localeId,
                    index: screen.index,
                    mode: "list",
                    searchQuery: screen.searchQuery,
                    untranslatedOnly: screen.untranslatedOnly,
                });
            else if (screen.name === "browse" && screen.mode === "search")
                setScreen({
                    name: "browse",
                    section: screen.section,
                    localeId: screen.localeId,
                    index: 0,
                    mode: "list",
                    searchQuery: screen.listSearchQuery,
                    untranslatedOnly: screen.untranslatedOnly,
                });
            else if (screen.name === "browse" && screen.mode === "list")
                setScreen({ name: "hub", section: screen.section, localeId: screen.localeId });
            else if (screen.name === "add" && screen.step === "key")
                setScreen({ name: "hub", section: screen.section, localeId: "en" });
            else if (screen.name === "add" && screen.step === "value")
                setScreen({ name: "add", section: screen.section, step: "key", key: screen.key, value: "" });
            else if (screen.name === "add" && screen.step === "similar")
                setScreen({ name: "add", section: screen.section, step: "value", key: screen.key, value: screen.value });
            else if (screen.name === "edit_rename")
                setScreen({
                    name: "browse",
                    section: screen.section,
                    localeId: "en",
                    index: screen.browseIndex,
                    mode: "list",
                    searchQuery: screen.searchQuery,
                    untranslatedOnly: screen.untranslatedOnly,
                });
            else if (screen.name === "edit_rename_confirm")
                setScreen({
                    name: "edit_rename",
                    section: screen.section,
                    oldKey: screen.oldKey,
                    draft: screen.newKey,
                    browseIndex: screen.browseIndex,
                    searchQuery: screen.searchQuery,
                    untranslatedOnly: screen.untranslatedOnly,
                });
            else if (screen.name === "sync_confirm")
                setScreen({ name: "language_pick", section: screen.section });
            else if (screen.name === "delete_confirm")
                setScreen({
                    name: "browse",
                    section: screen.section,
                    localeId: "en",
                    index: screen.browseIndex,
                    mode: "list",
                    searchQuery: screen.searchQuery,
                    untranslatedOnly: screen.untranslatedOnly,
                });
            else if (screen.name === "add_lang")
                setScreen({ name: "language_pick", section: screen.section });
            else if (screen.name === "unused_delete_confirm")
                setScreen({
                    name: "unused",
                    section: screen.section,
                    unused: screen.unused,
                    dynamicSites: screen.dynamicSites,
                    index: screen.unusedIndex,
                });
            else if (screen.name === "unused")
                setScreen({ name: "language_pick", section: screen.section });
            else if (screen.name === "hub") setScreen({ name: "language_pick", section: screen.section });
            else if (screen.name === "language_pick") setScreen({ name: "sections" });
            return;
        }
        if (screen.name === "browse" && screen.mode === "list") {
            const allKeys = keysList(screen.section, screen.localeId);
            const map = readLocaleMap(screen.section, screen.localeId);
            const filtered = filterBrowseKeys(allKeys, map, screen.searchQuery, screen.untranslatedOnly);
            const { searchQuery, untranslatedOnly, section, localeId } = screen;
            const listBase = {
                name: "browse" as const,
                section,
                localeId,
                mode: "list" as const,
                searchQuery,
                untranslatedOnly,
            };
            if (input === "u" && !key.ctrl && !key.meta) {
                const nextU = !untranslatedOnly;
                const f2 = filterBrowseKeys(allKeys, map, searchQuery, nextU);
                const nextIdx = Math.min(screen.index, Math.max(0, f2.length - 1));
                setScreen({ ...listBase, untranslatedOnly: nextU, index: nextIdx });
                return;
            }
            if (input === "/" && !key.ctrl && !key.meta) {
                setScreen({
                    name: "browse",
                    section,
                    localeId,
                    mode: "search",
                    listSearchQuery: searchQuery,
                    searchDraft: searchQuery,
                    untranslatedOnly,
                });
                return;
            }
            if (
                localeId === "en" &&
                input === "d" &&
                !key.ctrl &&
                !key.meta &&
                filtered.length > 0
            ) {
                const si = Math.min(screen.index, filtered.length - 1);
                const sel = filtered[si];
                if (!sel) return;
                setScreen({
                    name: "delete_confirm",
                    section,
                    key: sel,
                    browseIndex: si,
                    searchQuery,
                    untranslatedOnly,
                });
                return;
            }
            if (
                localeId === "en" &&
                input === "r" &&
                !key.ctrl &&
                !key.meta &&
                filtered.length > 0
            ) {
                const si = Math.min(screen.index, filtered.length - 1);
                const sel = filtered[si];
                if (!sel) return;
                setScreen({
                    name: "edit_rename",
                    section,
                    oldKey: sel,
                    draft: "",
                    browseIndex: si,
                    searchQuery,
                    untranslatedOnly,
                });
                return;
            }
            if (filtered.length === 0) return;
            if (key.upArrow) {
                setScreen({
                    ...listBase,
                    index: Math.max(0, screen.index - 1),
                });
                return;
            }
            if (key.downArrow) {
                setScreen({
                    ...listBase,
                    index: Math.min(filtered.length - 1, screen.index + 1),
                });
                return;
            }
            if (key.return) {
                const si = Math.min(screen.index, filtered.length - 1);
                const sel = filtered[si];
                if (!sel) return;
                setScreen({
                    name: "browse",
                    section,
                    localeId,
                    index: si,
                    mode: "edit",
                    draft: displayValue(map[sel]!),
                    searchQuery,
                    untranslatedOnly,
                });
            }
            return;
        }
        if (screen.name === "unused") {
            const { unused: uList, index, section } = screen;
            const safeIdx = uList.length === 0 ? 0 : Math.min(index, Math.max(0, uList.length - 1));
            if (input === "q" && !key.ctrl && !key.meta) {
                exit();
                return;
            }
            if (input === "b" && !key.ctrl && !key.meta) {
                setScreen({ name: "language_pick", section });
                return;
            }
            if (input === "d" && !key.ctrl && !key.meta && uList.length > 0) {
                const sel = uList[safeIdx]!;
                setScreen({
                    name: "unused_delete_confirm",
                    section,
                    key: sel,
                    unusedIndex: safeIdx,
                    unused: uList,
                    dynamicSites: screen.dynamicSites,
                });
                return;
            }
            if (uList.length === 0) return;
            if (key.upArrow) {
                setScreen({ ...screen, index: Math.max(0, safeIdx - 1) });
                return;
            }
            if (key.downArrow) {
                setScreen({ ...screen, index: Math.min(uList.length - 1, safeIdx + 1) });
                return;
            }
            return;
        }
        if (input === "q" && (screen.name === "hub" || screen.name === "sections" || screen.name === "language_pick"))
            exit();
    });

    if (screen.name === "sections") {
        return (
            <ScreenShell title="Choose domain" subtitle="Server vs app locale JSON bundles" footer="Esc back · q quit">
                <Label>Translation domain</Label>
                <SelectInput
                    {...tuiSelectInputProps}
                    limit={menuLimit}
                    items={TRANSLATION_SECTIONS.map(s => ({ label: s.label, value: s.id }))}
                    onSelect={item => {
                        const sec = TRANSLATION_SECTIONS.find(s => s.id === item.value);
                        if (sec) setScreen({ name: "language_pick", section: sec });
                    }}
                />
            </ScreenShell>
        );
    }

    if (screen.name === "language_pick") {
        const { section, note } = screen;
        const map = indexLocaleFilesById(ld(section));
        const ids = [...map.keys()].sort((a, b) => {
            if (a === "en") return -1;
            if (b === "en") return 1;
            return a.localeCompare(b);
        });

        const workspaceActions = [
            { label: "Add new language", value: "add_lang" },
            { label: "Sync translations", value: "sync" },
            { label: "Show unused English keys", value: "unused" },
        ];

        const openUnused = () => {
            const en = readEn(section);
            const roots = sectionScanAbsPaths(repoRoot, section);
            const { unused, dynamicSites } = findUnusedEnglishKeys(Object.keys(en), roots, repoRoot);
            setScreen({ name: "unused", section, unused, dynamicSites, index: 0 });
        };

        const onWorkspaceOrLang = (value: string) => {
            if (value === LANG_MENU_SEPARATOR_VALUE) return;
            if (value === "add_lang") setScreen({ name: "add_lang", section, draft: "" });
            else if (value === "sync") setScreen({ name: "sync_confirm", section });
            else if (value === "unused") openUnused();
            else if (value === "back_domain") setScreen({ name: "sections" });
            else setScreen({ name: "hub", section, localeId: value });
        };

        if (ids.length === 0) {
            return (
                <ScreenShell
                    title={section.label}
                    subtitle={ld(section)}
                    tone="warning"
                    footer="Esc domain list · q quit"
                >
                    {note ? (
                        <Box
                            borderStyle="round"
                            borderColor={tuiTheme.colors.border.warning}
                            paddingX={1}
                            paddingY={1}
                            marginBottom={1}
                        >
                            <Text color={tuiTheme.colors.semantic.note} wrap="wrap">
                                {note}
                            </Text>
                        </Box>
                    ) : null}
                    <Text color={tuiTheme.colors.semantic.note}>No .json locale files in this folder yet.</Text>
                    <Label>Actions</Label>
                    <SelectInput
                        {...tuiSelectInputProps}
                        itemComponent={LanguagePickItem}
                        limit={menuLimit}
                        items={[...workspaceActions, { label: "Back to domain list", value: "back_domain" }]}
                        onSelect={item => onWorkspaceOrLang(item.value as string)}
                    />
                </ScreenShell>
            );
        }

        return (
            <ScreenShell title={section.label} subtitle={ld(section)} footer="Esc domain list · q quit">
                    {note ? (
                        <Box
                            borderStyle="round"
                            borderColor={tuiTheme.colors.border.warning}
                            paddingX={1}
                            paddingY={1}
                            marginBottom={1}
                        >
                            <Text color={tuiTheme.colors.semantic.note} wrap="wrap">
                                {note}
                            </Text>
                        </Box>
                    ) : null}
                    <Label>Workspace & languages</Label>
                <SelectInput
                    {...tuiSelectInputProps}
                    itemComponent={LanguagePickItem}
                    limit={menuLimit}
                    items={[
                        ...workspaceActions,
                        { label: LANG_MENU_SEPARATOR_LABEL, value: LANG_MENU_SEPARATOR_VALUE },
                        ...ids.map(id => ({
                            label: id === "en" ? `${id}  (source keys)` : id,
                            value: id,
                        })),
                    ]}
                    onSelect={item => onWorkspaceOrLang(item.value as string)}
                />
            </ScreenShell>
        );
    }

    if (screen.name === "hub") {
        const { section, localeId, note } = screen;
        const isEn = localeId === "en";
        const hubItems = [
            { label: "Browse / edit translations", value: "browse" },
            ...(isEn ? [{ label: "Add new translation", value: "add" }] : []),
            { label: "Back to domain list", value: "back_domain" },
        ];
        return (
            <ScreenShell
                title={`${section.label} · ${localeId}`}
                subtitle={ld(section)}
                footer="Esc language list · q quit"
            >
                {note ? (
                    <Box
                        borderStyle="round"
                        borderColor={tuiTheme.colors.border.warning}
                        paddingX={1}
                        paddingY={1}
                        marginBottom={1}
                    >
                        <Text color={tuiTheme.colors.semantic.note} wrap="wrap">
                            {note}
                        </Text>
                    </Box>
                ) : null}
                <Label>Actions</Label>
                <SelectInput
                    {...tuiSelectInputProps}
                    limit={menuLimit}
                    items={hubItems}
                    onSelect={item => {
                        if (item.value === "browse")
                            setScreen({
                                name: "browse",
                                section,
                                localeId,
                                index: 0,
                                mode: "list",
                                searchQuery: "",
                                untranslatedOnly: false,
                            });
                        else if (item.value === "add")
                            setScreen({ name: "add", section, step: "key", key: "", value: "" });
                        else if (item.value === "back_domain") setScreen({ name: "sections" });
                    }}
                />
            </ScreenShell>
        );
    }

    if (screen.name === "browse") {
        const { section, localeId, mode } = screen;
        const allKeys = keysList(section, localeId);
        const map = readLocaleMap(section, localeId);

        if (mode === "search") {
            const { searchDraft, listSearchQuery, untranslatedOnly } = screen;
            return (
                <ScreenShell
                    title={`Search · ${localeId}`}
                    subtitle={section.label}
                    footer="Enter apply filter · Esc cancel"
                >
                    <Label>Filter keys and values</Label>
                    <TextInput
                        value={searchDraft}
                        onChange={val =>
                            setScreen({
                                name: "browse",
                                section,
                                localeId,
                                mode: "search",
                                listSearchQuery,
                                searchDraft: val,
                                untranslatedOnly,
                            })
                        }
                        onSubmit={() => {
                            setScreen({
                                name: "browse",
                                section,
                                localeId,
                                index: 0,
                                mode: "list",
                                searchQuery: searchDraft.trim(),
                                untranslatedOnly,
                            });
                        }}
                    />
                </ScreenShell>
            );
        }

        const { index, searchQuery, untranslatedOnly } = screen;
        const filtered = filterBrowseKeys(allKeys, map, searchQuery, untranslatedOnly);
        const safeIdx = filtered.length === 0 ? 0 : Math.min(index, Math.max(0, filtered.length - 1));
        const key = filtered[safeIdx] ?? filtered[0];
        const innerCols = Math.max(48, columns - 8);
        const focusedPreviewLines =
            filtered.length > 0 && key
                ? 4 + estimatedWrappedLines(key, innerCols) + estimatedWrappedLines(displayValue(map[key]!), innerCols)
                : 0;
        const browseListLines = Math.max(4, rows - tuiTheme.layout.browseListRowsReserved - focusedPreviewLines);
        const page = Math.max(4, browseListLines);
        const start =
            filtered.length === 0
                ? 0
                : Math.max(0, Math.min(safeIdx - Math.floor(page / 2), Math.max(0, filtered.length - page)));
        const slice = filtered.slice(start, start + page);
        const keyW = Math.max(20, Math.floor(innerCols * 0.44));
        const valW = Math.max(16, innerCols - keyW - 5);

        if (mode === "edit") {
            const draft = screen.draft;
            return (
                <ScreenShell
                    title={`Edit · ${localeId}`}
                    subtitle={`${section.label} · ${key!}`}
                    footer="Enter save · Esc back to list"
                >
                    <Label>Value (JSON allowed for plurals)</Label>
                    <TextInput
                        value={draft}
                        onChange={val =>
                            setScreen({
                                name: "browse",
                                section,
                                localeId,
                                index,
                                mode: "edit",
                                draft: val,
                                searchQuery: screen.searchQuery,
                                untranslatedOnly: screen.untranslatedOnly,
                            })
                        }
                        onSubmit={() => {
                            try {
                                const val = parseTranslationValue(draft);
                                if (localeId === "en") {
                                    updateEnglishValue(ld(section), key!, val);
                                } else {
                                    updateLocaleValue(ld(section), localeId, key!, val);
                                }
                                bump();
                                setScreen({
                                    name: "browse",
                                    section,
                                    localeId,
                                    index: screen.index,
                                    mode: "list",
                                    searchQuery: screen.searchQuery,
                                    untranslatedOnly: screen.untranslatedOnly,
                                });
                            } catch (e) {
                                setScreen({
                                    name: "hub",
                                    section,
                                    localeId,
                                    note: e instanceof Error ? e.message : String(e),
                                });
                            }
                        }}
                    />
                </ScreenShell>
            );
        }

        const pos =
            filtered.length === 0
                ? "0 / 0"
                : `${safeIdx + 1} / ${filtered.length}${allKeys.length !== filtered.length ? ` (${allKeys.length} total)` : ""}`;

        return (
            <ScreenShell
                title={`Browse · ${localeId}`}
                subtitle={`${section.label} · ${ld(section)}`}
                footer={
                    localeId === "en"
                        ? "/ search · u untranslated · d delete · r rename · arrows · Enter edit · Esc language list"
                        : "/ search · u untranslated · arrows · Enter edit · Esc language list"
                }
            >
                <Box flexDirection="column" width="100%" flexGrow={1} minHeight={0} height="100%">
                    <Box flexShrink={0} flexDirection="column">
                        <Text>
                            <Text color={tuiTheme.colors.label}>Position </Text>
                            <Text bold color={tuiTheme.colors.accent}>
                                {pos}
                            </Text>
                        </Text>
                        <Text>
                            <Text color={tuiTheme.colors.label}>Filter </Text>
                            <Text
                                color={untranslatedOnly ? tuiTheme.colors.accent : tuiTheme.colors.title}
                                bold={untranslatedOnly}
                            >
                                {untranslatedOnly ? "untranslated only" : "all keys"}
                            </Text>
                            <Text dimColor> · </Text>
                            <Text dimColor>search: </Text>
                            <Text color={tuiTheme.colors.semantic.body}>
                                {searchQuery ? `"${trunc(searchQuery, Math.max(24, columns - 44))}"` : "—"}
                            </Text>
                        </Text>
                    </Box>
                    {filtered.length > 0 && key ? (
                        <Box
                            flexShrink={0}
                            flexDirection="column"
                            width="100%"
                            marginTop={1}
                            borderStyle="single"
                            borderDimColor
                            paddingX={1}
                            paddingY={1}
                        >
                            <Label>Focused key</Label>
                            <Text color={tuiTheme.colors.title} wrap="wrap">
                                {key}
                            </Text>
                            <Box marginTop={1} flexDirection="column">
                                <Label>Focused value</Label>
                                <Text
                                    color={tuiTheme.colors.semantic.body}
                                    italic={tuiTheme.typography.listValueItalicWhenIdle}
                                    wrap="wrap"
                                >
                                    {displayValue(map[key]!)}
                                </Text>
                            </Box>
                        </Box>
                    ) : null}
                    <Box
                        flexDirection="column"
                        flexGrow={2}
                        marginTop={1}
                        minHeight={0}
                        width="100%"
                        borderStyle="single"
                        borderDimColor
                        paddingX={1}
                        paddingY={1}
                    >
                        {allKeys.length === 0 ? (
                            <Text color={tuiTheme.colors.semantic.note}>No keys in this locale file.</Text>
                        ) : filtered.length === 0 ? (
                            <Text color={tuiTheme.colors.semantic.note}>
                                No matches — clear search (/) or toggle filter (u).
                            </Text>
                        ) : (
                            slice.map(k => {
                                const sel = k === key;
                                const line = `${sel ? " ▸ " : "   "}${trunc(k, keyW)} · ${trunc(displayValue(map[k]!), valW)}`;
                                if (sel) {
                                    return (
                                        <Text key={k} bold color={tuiTheme.colors.selection.fg} backgroundColor={tuiTheme.colors.selection.bg}>
                                            {line}
                                        </Text>
                                    );
                                }
                                return (
                                    <Text key={k}>
                                        <Text color={tuiTheme.colors.list.bulletIdle}>   </Text>
                                        <Text color={tuiTheme.colors.list.keyIdle}>{trunc(k, keyW)}</Text>
                                        <Text dimColor> · </Text>
                                        <Text dimColor italic={tuiTheme.typography.listValueItalicWhenIdle}>
                                            {trunc(displayValue(map[k]!), valW)}
                                        </Text>
                                    </Text>
                                );
                            })
                        )}
                    </Box>
                </Box>
            </ScreenShell>
        );
    }

    if (screen.name === "add") {
        const { section, step, key: k, value: v } = screen;
        const en = readEn(section);

        if (step === "similar" && screen.hits) {
            return (
                <ScreenShell
                    title="Similar strings"
                    subtitle="≥85% match — continue anyway?"
                    tone="warning"
                    footer="Choose an option below"
                >
                    <Box flexDirection="column" borderStyle="single" borderDimColor paddingX={1} paddingY={1} marginBottom={1}>
                        {screen.hits.slice(0, Math.max(6, rows - 18)).map(h => (
                            <Text key={`${h.entryKey}-${h.matched}-${h.candidate}-${h.similarity}`} dimColor>
                                <Text color={tuiTheme.colors.semantic.note}>{h.similarity}%</Text>
                                {" · "}
                                <Text color={tuiTheme.colors.semantic.body}>"{trunc(h.entryKey, 34)}"</Text>
                                {" "}
                                ({h.matched}) → {h.candidate}
                            </Text>
                        ))}
                    </Box>
                    <SelectInput
                        {...tuiSelectInputProps}
                        limit={menuLimit}
                        items={[
                            { label: "Save anyway", value: "yes" },
                            { label: "Cancel", value: "no" },
                        ]}
                        onSelect={item => {
                            if (item.value === "yes") {
                                try {
                                    addEnglishEntry(ld(section), k, v);
                                    bump();
                                    setScreen({ name: "hub", section, localeId: "en", note: `Added "${trunc(k, 40)}".` });
                                } catch (e) {
                                    setScreen({
                                        name: "hub",
                                        section,
                                        localeId: "en",
                                        note: e instanceof Error ? e.message : String(e),
                                    });
                                }
                            } else setScreen({ name: "add", section, step: "value", key: k, value: v });
                        }}
                    />
                </ScreenShell>
            );
        }

        if (step === "key") {
            return (
                <ScreenShell title="New key" subtitle={section.label} footer="Enter submit · Esc cancel">
                    <Label>New English key</Label>
                    <TextInput
                        value={k}
                        onChange={val => setScreen({ name: "add", section, step: "key", key: val, value: "" })}
                        onSubmit={() => {
                            const keyTrim = k.trim();
                            if (!isValidLocaleKey(keyTrim)) {
                                setScreen({
                                    name: "hub",
                                    section,
                                    localeId: "en",
                                    note: "Invalid key: use letters, digits, spaces, underscores only.",
                                });
                                return;
                            }
                            if (!isLocaleKeyWithinMaxLength(keyTrim)) {
                                setScreen({
                                    name: "hub",
                                    section,
                                    localeId: "en",
                                    note: `Key is too long (${keyTrim.length} chars). Maximum is ${MAX_LOCALE_KEY_LENGTH} characters.`,
                                });
                                return;
                            }
                            if (keyTrim in en) {
                                setScreen({
                                    name: "hub",
                                    section,
                                    localeId: "en",
                                    note: `Key already exists: ${trunc(keyTrim, 50)}`,
                                });
                                return;
                            }
                            setScreen({ name: "add", section, step: "value", key: keyTrim, value: "" });
                        }}
                    />
                </ScreenShell>
            );
        }

        return (
            <ScreenShell title="New value" subtitle={`Key: ${trunc(k, 64)}`} footer="Enter submit · Esc back">
                <Label>English string (or JSON for plurals)</Label>
                <TextInput
                    value={v}
                    onChange={val => setScreen({ name: "add", section, step: "value", key: k, value: val })}
                    onSubmit={() => {
                        const hits = findSimilarEntries(en, k, v);
                        if (hits.length > 0) setScreen({ name: "add", section, step: "similar", key: k, value: v, hits });
                        else {
                            try {
                                addEnglishEntry(ld(section), k, v);
                                bump();
                                setScreen({ name: "hub", section, localeId: "en", note: `Added "${trunc(k, 40)}".` });
                            } catch (e) {
                                setScreen({
                                    name: "hub",
                                    section,
                                    localeId: "en",
                                    note: e instanceof Error ? e.message : String(e),
                                });
                            }
                        }
                    }}
                />
            </ScreenShell>
        );
    }

    if (screen.name === "edit_rename") {
        const { section, oldKey, draft, browseIndex, searchQuery, untranslatedOnly } = screen;
        const en = readEn(section);
        return (
            <ScreenShell
                title="Rename key"
                subtitle={`From: ${trunc(oldKey, 56)} — other locales follow`}
                footer="Enter continue · Esc back to list"
            >
                <Label>New key name</Label>
                <TextInput
                    value={draft}
                    onChange={val =>
                        setScreen({
                            name: "edit_rename",
                            section,
                            oldKey,
                            draft: val,
                            browseIndex,
                            searchQuery,
                            untranslatedOnly,
                        })
                    }
                    onSubmit={() => {
                        const nk = draft.trim();
                        if (!isValidLocaleKey(nk)) {
                            setScreen({
                                name: "hub",
                                section,
                                localeId: "en",
                                note: "Invalid new key.",
                            });
                            return;
                        }
                        if (!isLocaleKeyWithinMaxLength(nk)) {
                            setScreen({
                                name: "hub",
                                section,
                                localeId: "en",
                                note: `New key is too long (${nk.length} chars). Maximum is ${MAX_LOCALE_KEY_LENGTH} characters.`,
                            });
                            return;
                        }
                        if (nk !== oldKey && nk in en) {
                            setScreen({
                                name: "hub",
                                section,
                                localeId: "en",
                                note: `English key already exists: ${trunc(nk, 40)}`,
                            });
                            return;
                        }
                        if (nk === oldKey) {
                            setScreen({
                                name: "browse",
                                section,
                                localeId: "en",
                                index: browseIndex,
                                mode: "list",
                                searchQuery,
                                untranslatedOnly,
                            });
                            return;
                        }
                        setScreen({
                            name: "edit_rename_confirm",
                            section,
                            oldKey,
                            newKey: nk,
                            browseIndex,
                            searchQuery,
                            untranslatedOnly,
                        });
                    }}
                />
            </ScreenShell>
        );
    }

    if (screen.name === "edit_rename_confirm") {
        const { section, oldKey, newKey, browseIndex, searchQuery, untranslatedOnly } = screen;
        return (
            <ScreenShell title="Confirm rename" tone="warning" footer="Esc back">
                <Box marginBottom={1} flexDirection="column">
                    <BodyText>Rename in English and all locale files?</BodyText>
                    <Text>
                        <Text color={tuiTheme.colors.semantic.danger} bold>
                            {trunc(oldKey, 42)}
                        </Text>
                        <Text dimColor> → </Text>
                        <Text color={tuiTheme.colors.semantic.success} bold>
                            {trunc(newKey, 42)}
                        </Text>
                    </Text>
                </Box>
                <SelectInput
                    {...tuiSelectInputProps}
                    limit={menuLimit}
                    items={[
                        { label: "Yes, rename everywhere", value: "yes" },
                        { label: "Cancel", value: "no" },
                    ]}
                    onSelect={item => {
                        if (item.value === "yes") {
                            try {
                                const en = readEn(section);
                                const val = en[oldKey];
                                if (val === undefined) throw new Error("Old key missing");
                                renameKeyAcrossLocales(ld(section), oldKey, newKey, val);
                                bump();
                                const allKeys = keysList(section, "en");
                                const map = readLocaleMap(section, "en");
                                const filtered = filterBrowseKeys(
                                    allKeys,
                                    map,
                                    searchQuery,
                                    untranslatedOnly,
                                );
                                const newIdx = filtered.indexOf(newKey);
                                const nextIdx =
                                    newIdx >= 0
                                        ? newIdx
                                        : Math.min(
                                              browseIndex,
                                              Math.max(0, filtered.length - 1),
                                          );
                                setScreen({
                                    name: "browse",
                                    section,
                                    localeId: "en",
                                    index: nextIdx,
                                    mode: "list",
                                    searchQuery,
                                    untranslatedOnly,
                                });
                            } catch (e) {
                                setScreen({
                                    name: "hub",
                                    section,
                                    localeId: "en",
                                    note: e instanceof Error ? e.message : String(e),
                                });
                            }
                        } else
                            setScreen({
                                name: "edit_rename",
                                section,
                                oldKey,
                                draft: newKey,
                                browseIndex,
                                searchQuery,
                                untranslatedOnly,
                            });
                    }}
                />
            </ScreenShell>
        );
    }

    if (screen.name === "delete_confirm") {
        const { section, key, browseIndex, searchQuery, untranslatedOnly } = screen;
        return (
            <ScreenShell title="Delete key" tone="danger" footer="Esc back">
                <Box marginBottom={1} flexDirection="column">
                    <Text color={tuiTheme.colors.semantic.danger} bold wrap="wrap">
                        Remove “{trunc(key, 58)}” from English and every other locale?
                    </Text>
                    <Text dimColor wrap="wrap">
                        Not reversible from the TUI — use git if needed.
                    </Text>
                </Box>
                <SelectInput
                    {...tuiSelectInputProps}
                    limit={menuLimit}
                    items={[
                        { label: "Yes, delete everywhere", value: "yes" },
                        { label: "Cancel", value: "no" },
                    ]}
                    onSelect={item => {
                        if (item.value === "yes") {
                            try {
                                deleteKeyAcrossLocales(ld(section), key);
                                bump();
                                const allKeys = keysList(section, "en");
                                const map = readLocaleMap(section, "en");
                                const filtered = filterBrowseKeys(
                                    allKeys,
                                    map,
                                    searchQuery,
                                    untranslatedOnly,
                                );
                                const nextLen = filtered.length;
                                const nextIdx =
                                    nextLen === 0 ? 0 : Math.min(browseIndex, Math.max(0, nextLen - 1));
                                setScreen({
                                    name: "browse",
                                    section,
                                    localeId: "en",
                                    index: nextIdx,
                                    mode: "list",
                                    searchQuery,
                                    untranslatedOnly,
                                });
                            } catch (e) {
                                setScreen({
                                    name: "hub",
                                    section,
                                    localeId: "en",
                                    note: e instanceof Error ? e.message : String(e),
                                });
                            }
                        } else {
                            setScreen({
                                name: "browse",
                                section,
                                localeId: "en",
                                index: browseIndex,
                                mode: "list",
                                searchQuery,
                                untranslatedOnly,
                            });
                        }
                    }}
                />
            </ScreenShell>
        );
    }

    if (screen.name === "sync_confirm") {
        const { section } = screen;
        return (
            <ScreenShell title="Sync from English" subtitle={section.label} footer="Esc cancel">
                <BodyText>
                    Fill missing, empty, or *…* placeholders from English into every other locale. Real translations stay as
                    they are.
                </BodyText>
                <SelectInput
                    {...tuiSelectInputProps}
                    limit={menuLimit}
                    items={[
                        { label: "Run sync", value: "yes" },
                        { label: "Cancel", value: "no" },
                    ]}
                    onSelect={item => {
                        if (item.value === "yes") {
                            const { results, errors } = syncMissingKeysFromEn(ld(section));
                            bump();
                            const parts = results.filter(r => r.keysFilled > 0).map(r => `${r.keysFilled} in ${r.file}`);
                            const msg = [
                                errors.length ? `Errors: ${errors.join("; ")}` : "",
                                parts.length ? `Filled: ${parts.join(", ")}` : "Nothing to fill (all keys translated or non-empty).",
                            ]
                                .filter(Boolean)
                                .join(" ");
                            setScreen({ name: "language_pick", section, note: msg });
                        } else setScreen({ name: "language_pick", section });
                    }}
                />
            </ScreenShell>
        );
    }

    if (screen.name === "add_lang") {
        const { section, draft } = screen;
        return (
            <ScreenShell title="New language file" subtitle={section.label} footer="Enter create · Esc cancel">
                <Label>Locale id (de, fr, pt-br …)</Label>
                <TextInput
                    value={draft}
                    onChange={val => setScreen({ name: "add_lang", section, draft: val })}
                    onSubmit={() => {
                        const r = addLanguageFile(ld(section), draft);
                        if ("error" in r) setScreen({ name: "language_pick", section, note: r.error });
                        else {
                            bump();
                            setScreen({ name: "language_pick", section, note: `Created ${r.path}` });
                        }
                    }}
                />
            </ScreenShell>
        );
    }

    if (screen.name === "unused") {
        const { section, unused: uList, dynamicSites, index } = screen;
        const { unusedListRowsReserved, unusedListMinVisible } = tuiTheme.layout;
        const safeIdx = uList.length === 0 ? 0 : Math.min(index, Math.max(0, uList.length - 1));
        const uKey = uList[safeIdx];
        const unusedKeyCol = Math.max(40, columns - 10);
        const unusedPreviewLines =
            uList.length > 0 && uKey ? 3 + estimatedWrappedLines(uKey, unusedKeyCol) : 0;
        const page = Math.max(4, Math.max(unusedListMinVisible, rows - unusedListRowsReserved) - unusedPreviewLines);
        const start =
            uList.length === 0
                ? 0
                : Math.max(0, Math.min(safeIdx - Math.floor(page / 2), Math.max(0, uList.length - page)));
        const slice = uList.slice(start, start + page);
        const keyCol = unusedKeyCol;
        const pos =
            uList.length === 0 ? "0 / 0" : `${safeIdx + 1} / ${uList.length}${uList.length > page ? ` (view ${start + 1}–${start + slice.length})` : ""}`;
        const dynCap = Math.min(8, Math.max(4, rows - page - 14));
        return (
            <ScreenShell
                title={`Unused keys (${uList.length})`}
                subtitle={'Not seen as static translate("…") in scan roots'}
                footer="↑↓ move · d delete key (all locales) · b / Esc language list · q quit"
            >
                <Box flexDirection="column" width="100%" flexGrow={1} minHeight={0} height="100%">
                    <Box flexShrink={0} flexDirection="column">
                        <Text dimColor wrap="wrap">
                            Dynamic translate() sites: {dynamicSites.length} — listed keys may still be used at runtime.
                        </Text>
                        <Text>
                            <Text color={tuiTheme.colors.label}>Position </Text>
                            <Text bold color={tuiTheme.colors.accent}>
                                {pos}
                            </Text>
                        </Text>
                    </Box>
                    {uList.length > 0 && uKey ? (
                        <Box
                            flexShrink={0}
                            flexDirection="column"
                            width="100%"
                            marginTop={1}
                            borderStyle="single"
                            borderDimColor
                            paddingX={1}
                            paddingY={1}
                        >
                            <Label>Focused key</Label>
                            <Text color={tuiTheme.colors.title} wrap="wrap">
                                {uKey}
                            </Text>
                        </Box>
                    ) : null}
                    <Box
                        marginTop={1}
                        flexDirection="column"
                        flexGrow={2}
                        minHeight={0}
                        width="100%"
                        borderStyle="single"
                        borderDimColor
                        paddingX={1}
                        paddingY={1}
                    >
                        {uList.length === 0 ? (
                            <Text color={tuiTheme.colors.semantic.note}>No unused keys reported.</Text>
                        ) : (
                            slice.map(k => {
                                const sel = k === uList[safeIdx];
                                const line = `${sel ? " ▸ " : " · "}${trunc(k, keyCol)}`;
                                if (sel) {
                                    return (
                                        <Text
                                            key={k}
                                            bold
                                            color={tuiTheme.colors.selection.fg}
                                            backgroundColor={tuiTheme.colors.selection.bg}
                                        >
                                            {line}
                                        </Text>
                                    );
                                }
                                return (
                                    <Text key={k} dimColor>
                                        <Text color={tuiTheme.colors.list.bulletIdle}> · </Text>
                                        {trunc(k, keyCol)}
                                    </Text>
                                );
                            })
                        )}
                    </Box>
                    {dynamicSites.slice(0, dynCap).map(d => (
                        <Text key={`${d.file}:${d.line}`} dimColor italic>
                            dyn {d.file}:{d.line}
                        </Text>
                    ))}
                </Box>
            </ScreenShell>
        );
    }

    if (screen.name === "unused_delete_confirm") {
        const { section, key, unusedIndex, unused: uList, dynamicSites } = screen;
        return (
            <ScreenShell title="Delete unused key" tone="danger" footer="Esc back">
                <Box marginBottom={1} flexDirection="column">
                    <Text color={tuiTheme.colors.semantic.danger} bold wrap="wrap">
                        Remove “{trunc(key, 58)}” from English and every locale file?
                    </Text>
                    <Text dimColor wrap="wrap">
                        Remove from JSON now; then remove or change translate("…") in code if it is truly unused.
                    </Text>
                </Box>
                <SelectInput
                    {...tuiSelectInputProps}
                    limit={menuLimit}
                    items={[
                        { label: "Yes, delete everywhere", value: "yes" },
                        { label: "Cancel", value: "no" },
                    ]}
                    onSelect={item => {
                        if (item.value === "yes") {
                            try {
                                deleteKeyAcrossLocales(ld(section), key);
                                bump();
                                const roots = sectionScanAbsPaths(repoRoot, section);
                                const enKeys = Object.keys(readEn(section));
                                const { unused: nu, dynamicSites: nd } = findUnusedEnglishKeys(enKeys, roots, repoRoot);
                                const nextIdx =
                                    nu.length === 0 ? 0 : Math.min(unusedIndex, Math.max(0, nu.length - 1));
                                setScreen({
                                    name: "unused",
                                    section,
                                    unused: nu,
                                    dynamicSites: nd,
                                    index: nextIdx,
                                });
                            } catch (e) {
                                setScreen({
                                    name: "language_pick",
                                    section,
                                    note: e instanceof Error ? e.message : String(e),
                                });
                            }
                        } else {
                            setScreen({
                                name: "unused",
                                section,
                                unused: uList,
                                dynamicSites,
                                index: unusedIndex,
                            });
                        }
                    }}
                />
            </ScreenShell>
        );
    }

    return (
        <ScreenShell title="Error" tone="danger">
            <Text color={tuiTheme.colors.semantic.danger} bold>
                Internal error: missing screen branch
            </Text>
        </ScreenShell>
    );
}

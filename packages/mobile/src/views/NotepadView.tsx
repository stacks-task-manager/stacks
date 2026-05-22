// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Box } from "@/components/ui/box";
import { Pressable } from "@/components/ui/pressable";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { RichText, Toolbar, useEditorBridge } from "@10play/tentap-editor";
import { useQuery } from "@tanstack/react-query";
import { useNavigation, useRouter } from "expo-router";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    useColorScheme,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { deleteDocument, fetchNotepad, updateNotepad } from "../api/endpoints";
import { confirmDelete } from "../components/ConfirmDelete";
import { queryClient } from "../state/queryClient";

/**
 * Left/right padding applied to the editor so text has breathing room on
 * both edges of the screen.
 */
const EDITOR_SIDE_PADDING = 20;
/** Matches the tentap default; kept as a constant so we can reserve room. */
const TOOLBAR_HEIGHT = 44;

const LIGHT_COLORS = {
    background: "#ffffff",
    toolbar: "#f2f2f7",
    toolbarBorder: "#d1d1d6",
};

const DARK_COLORS = {
    background: "#1c1c1e",
    toolbar: "#2c2c2e",
    toolbarBorder: "#3a3a3c",
};

function NotepadEditor({
    notepadId,
    initialHtml,
    title,
    onHeaderDelete,
}: {
    notepadId: string;
    initialHtml: string;
    title: string;
    onHeaderDelete: () => void;
}) {
    const navigation = useNavigation();
    const scheme = useColorScheme();
    const isDark = scheme === "dark";
    const colors = isDark ? DARK_COLORS : LIGHT_COLORS;
    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    /**
     * Theme override: give the toolbar a distinct surface color so it stands
     * apart from the editor, and make each icon button share the same
     * background (by default every button paints itself white which looks
     * striped on a tinted bar).
     */
    const editorTheme = useMemo(
        () => ({
            toolbar: {
                toolbarBody: {
                    backgroundColor: colors.toolbar,
                    borderTopColor: colors.toolbarBorder,
                    borderBottomColor: colors.toolbarBorder,
                },
                toolbarButton: {
                    backgroundColor: colors.toolbar,
                },
            },
            webview: {
                backgroundColor: colors.background,
            },
        }),
        [colors]
    );

    const editor = useEditorBridge({
        initialContent: initialHtml,
        avoidIosKeyboard: true,
        autofocus: false,
        theme: editorTheme,
    });

    /**
     * Inject CSS into the WebView document so the ProseMirror body has a
     * real 20 pt gutter on both sides (instead of padding the WebView
     * container itself, which on Android can make the native view clip
     * against the toolbar). The CSS is set via `textContent` on a
     * dedicated `<style>` node keyed by id so repeated runs don't stack.
     */
    useEffect(() => {
        const applyCss = () => {
            const ref = editor.webviewRef?.current;
            if (!ref) return;
            const css = `body, .ProseMirror { padding-left: ${EDITOR_SIDE_PADDING}px !important; padding-right: ${EDITOR_SIDE_PADDING}px !important; box-sizing: border-box; }`;
            ref.injectJavaScript(`
                (function () {
                    var id = 'tentap-side-padding';
                    var style = document.getElementById(id);
                    if (!style) {
                        style = document.createElement('style');
                        style.id = id;
                        document.head.appendChild(style);
                    }
                    style.textContent = ${JSON.stringify(css)};
                })();
                true;
            `);
        };
        const t = setTimeout(applyCss, 250);
        return () => clearTimeout(t);
    }, [editor]);

    const scheduleSave = useCallback(() => {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(async () => {
            const bridge = editor as unknown as { getHTML?: () => Promise<string> };
            const html = await bridge.getHTML?.();
            if (html != null) {
                await updateNotepad(notepadId, html);
            }
        }, 900);
    }, [editor, notepadId]);

    useEffect(() => {
        const unsub = editor._subscribeToContentUpdate(() => {
            scheduleSave();
        });
        return () => {
            unsub();
            if (saveTimer.current) clearTimeout(saveTimer.current);
        };
    }, [editor, scheduleSave]);

    useLayoutEffect(() => {
        navigation.setOptions({
            title: title || "Notepad",
            headerRight: () => (
                <Pressable onPress={onHeaderDelete} className="px-3">
                    <Text className="text-error-600">Delete</Text>
                </Pressable>
            ),
        });
    }, [navigation, onHeaderDelete, title]);

    const styles = useMemo(
        () =>
            StyleSheet.create({
                safe: { flex: 1, backgroundColor: colors.background },
                kav: { flex: 1 },
                editorArea: { flex: 1, backgroundColor: colors.background },
                // Reserve space for the toolbar so nothing paints over it.
                toolbarSlot: {
                    height: TOOLBAR_HEIGHT,
                    backgroundColor: colors.toolbar,
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: colors.toolbarBorder,
                    // Lift above the native WebView on Android; zIndex on iOS.
                    elevation: 8,
                    zIndex: 2,
                },
            }),
        [colors]
    );

    return (
        <SafeAreaView style={styles.safe} edges={["bottom"]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={styles.kav}
            >
                <View style={styles.editorArea}>
                    <RichText editor={editor} />
                </View>
                {/* hidden={false} keeps the bar on screen when focus is lost;
                    KeyboardAvoidingView's padding behavior on iOS shrinks the
                    flex column when the keyboard rises so the fixed-height
                    slot stays flush above the keyboard. Android relies on
                    the native adjustResize that Expo sets by default. */}
                <View style={styles.toolbarSlot}>
                    <Toolbar editor={editor} hidden={false} />
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

export function NotepadView({ notepadId, title }: { notepadId: string; title: string }) {
    const router = useRouter();

    const { data: notepad, isLoading } = useQuery({
        queryKey: ["notepad", notepadId],
        queryFn: () => fetchNotepad(notepadId),
    });

    const onHeaderDelete = useCallback(() => {
        confirmDelete("Delete notepad", `Delete “${title}”?`, async () => {
            await deleteDocument(notepadId);
            await queryClient.invalidateQueries({ queryKey: ["documents"] });
            router.replace("/(app)" as never);
        });
    }, [notepadId, router, title]);

    if (isLoading || !notepad) {
        return (
            <Box className="flex-1 justify-center items-center">
                <Spinner />
            </Box>
        );
    }

    return (
        <NotepadEditor
            key={notepadId}
            notepadId={notepadId}
            initialHtml={notepad.content ?? ""}
            title={title}
            onHeaderDelete={onHeaderDelete}
        />
    );
}

// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { TextInput } from "react-native";
import { WebView } from "react-native-webview";
import type { IProject } from "@stacks/types";

import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

import { fetchProject, updateProject } from "../../../src/api/endpoints";

/**
 * Project notes are stored as HTML (TipTap output on the web). When the
 * stored value looks like markup we render it read-only in a WebView;
 * otherwise fall back to plain text.
 */
function NotesContent({ html }: { html: string }) {
    if (!htmlHasTags(html)) {
        return (
            <Text className="text-typography-900 p-4" size="md">
                {html}
            </Text>
        );
    }
    return (
        <WebView
            originWhitelist={["*"]}
            source={{
                html: `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>
body { font-family: -apple-system, system-ui, sans-serif; padding: 16px; color: #1f2937; line-height: 1.6; }
img { max-width: 100%; height: auto; }
pre { background: #f3f4f6; padding: 8px; border-radius: 6px; overflow-x: auto; }
</style></head><body>${html}</body></html>`,
            }}
            style={{ flex: 1, backgroundColor: "transparent" }}
        />
    );
}

function htmlHasTags(s: string): boolean {
    return /<\/?[a-z][\s\S]*>/i.test(s);
}

export default function ProjectNotesScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const queryClient = useQueryClient();
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState("");

    const { data: project, isLoading, isError } = useQuery<IProject>({
        queryKey: ["project", id],
        queryFn: () => fetchProject(id),
    });

    const save = useMutation({
        mutationFn: (notes: string) => updateProject(id, { notes }),
        onSuccess: () => {
            setEditing(false);
            queryClient.invalidateQueries({ queryKey: ["project", id] });
        },
    });

    if (isLoading) {
        return (
            <Box className="flex-1 justify-center items-center">
                <Spinner />
            </Box>
        );
    }

    if (isError || !project) {
        return (
            <Box className="flex-1 items-center justify-center p-6">
                <Text className="text-typography-600">
                    {isError ? "Failed to load project notes." : "No notes available."}
                </Text>
            </Box>
        );
    }

    const notes = project.notes ?? "";
    const hasNotes = notes.trim().length > 0;

    if (editing) {
        return (
            <VStack className="flex-1 bg-background-0" space="sm">
                <TextInput
                    value={draft}
                    onChangeText={setDraft}
                    multiline
                    textAlignVertical="top"
                    placeholder="Write project notes…"
                    placeholderTextColor="#9ca3af"
                    className="flex-1 p-4 text-typography-900"
                    style={{ minHeight: 0 }}
                />
                <Box className="p-3 border-t border-outline-200">
                    <HStack space="sm">
                        <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onPress={() => {
                                setEditing(false);
                                setDraft("");
                            }}
                        >
                            <ButtonText>Cancel</ButtonText>
                        </Button>
                        <Button
                            size="sm"
                            className="flex-1"
                            onPress={() => save.mutate(draft)}
                            isDisabled={save.isPending}
                        >
                            <ButtonText>{save.isPending ? "Saving…" : "Save"}</ButtonText>
                        </Button>
                    </HStack>
                </Box>
            </VStack>
        );
    }

    return (
        <VStack className="flex-1 bg-background-0">
            <HStack className="items-center justify-between px-4 pt-3">
                <Text size="sm" className="text-typography-500 flex-1 mr-2">
                    {hasNotes ? "Project notes" : "No notes yet"}
                </Text>
                <Pressable
                    onPress={() => {
                        setDraft(notes);
                        setEditing(true);
                    }}
                    className="px-3 py-1"
                >
                    <Text className="text-primary-600 font-semibold">Edit</Text>
                </Pressable>
            </HStack>
            {hasNotes ? (
                <NotesContent html={notes} />
            ) : (
                <Box className="flex-1 items-center justify-center p-6">
                    <Text className="text-typography-600 text-center">
                        No project notes. Tap Edit to add some.
                    </Text>
                </Box>
            )}
        </VStack>
    );
}

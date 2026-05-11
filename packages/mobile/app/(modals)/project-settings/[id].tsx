// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useCallback, useLayoutEffect } from "react";
import { KeyboardAvoidingView, Platform, Pressable as RNPressable } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";

import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { ScrollView } from "@/components/ui/scroll-view";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";

import type { IProject } from "@stacks/types";

import {
    fetchDocuments,
    fetchProject,
    updateDocument,
    updateProject,
} from "../../../src/api/endpoints";
import { queryClient } from "../../../src/state/queryClient";
import { FieldRow, DebouncedTextField } from "../../../src/widgets";

/**
 * Lightweight settings sheet for a project. Users can rename the project
 * (which lives on the surrounding document record) and edit the project's
 * description / background image URL. More involved fields (budgets,
 * approvers, fields, …) exist on the web client and can be layered on here
 * later.
 */
export default function ProjectSettingsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const navigation = useNavigation();
    const headerHeight = useHeaderHeight();

    const { data: project, isLoading: loadingProject } = useQuery({
        queryKey: ["project", id],
        queryFn: () => fetchProject(id),
        enabled: !!id,
    });

    // The document record owns the display title. We look it up in the cached
    // tree (populated by the drawer) so we don't need a new single-document
    // endpoint; if it's missing we simply refetch the full tree.
    const { data: documentsData, isLoading: loadingDocs } = useQuery({
        queryKey: ["documents"],
        queryFn: fetchDocuments,
    });
    const documentNode = documentsData?.documents.find(d => d.id === id);

    const close = useCallback(() => {
        if (router.canGoBack()) {
            router.back();
            return;
        }
        router.replace(`/(app)/document/${id}` as never);
    }, [id, router]);

    useLayoutEffect(() => {
        navigation.setOptions({
            title: "Project settings",
            headerLeft: () => (
                <RNPressable
                    onPress={close}
                    hitSlop={10}
                    android_ripple={null}
                    style={{
                        paddingHorizontal: 12,
                        paddingVertical: 4,
                        backgroundColor: "transparent",
                        shadowColor: "transparent",
                        shadowOpacity: 0,
                        shadowRadius: 0,
                        shadowOffset: { width: 0, height: 0 },
                        elevation: 0,
                    }}
                >
                    <Text size="md" className="text-primary-600">
                        Close
                    </Text>
                </RNPressable>
            ),
            headerRight: undefined,
        });
    }, [close, navigation]);

    const invalidate = useCallback(async () => {
        await queryClient.invalidateQueries({ queryKey: ["project", id] });
        await queryClient.invalidateQueries({ queryKey: ["documents"] });
    }, [id]);

    const titleMutation = useMutation({
        mutationFn: (title: string) => updateDocument(id, { title }),
        onSettled: () => {
            void invalidate();
        },
    });

    const projectMutation = useMutation({
        mutationFn: (patch: Partial<IProject>) => updateProject(id, patch),
        onMutate: async patch => {
            await queryClient.cancelQueries({ queryKey: ["project", id] });
            const previous = queryClient.getQueryData<IProject>(["project", id]);
            if (previous) {
                queryClient.setQueryData(["project", id], { ...previous, ...patch });
            }
            return { previous };
        },
        onError: (_err, _patch, ctx) => {
            if (ctx?.previous) queryClient.setQueryData(["project", id], ctx.previous);
        },
        onSettled: () => {
            void invalidate();
        },
    });

    if (loadingProject || loadingDocs || !project) {
        return (
            <Box className="flex-1 justify-center items-center">
                <Spinner />
            </Box>
        );
    }

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={headerHeight}
        >
            <ScrollView
                className="flex-1 bg-background-0"
                contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
                keyboardShouldPersistTaps="handled"
            >
                <FieldRow label="Project name">
                    <DebouncedTextField
                        value={documentNode?.title ?? ""}
                        onChange={value => titleMutation.mutate(value)}
                        placeholder="Project name"
                        style={{ fontSize: 18, fontWeight: "600" }}
                    />
                </FieldRow>

                <FieldRow label="Description">
                    <DebouncedTextField
                        value={project.description}
                        onChange={value => projectMutation.mutate({ description: value })}
                        placeholder="What is this project about?"
                        multiline
                    />
                </FieldRow>

                <FieldRow label="Background image URL">
                    <DebouncedTextField
                        value={project.backgroundUrl ?? ""}
                        onChange={value =>
                            projectMutation.mutate({ backgroundUrl: value || undefined })
                        }
                        placeholder="https://…"
                    />
                </FieldRow>

                <HStack className="justify-end mt-2">
                    <Text size="xs" className="text-typography-500">
                        Changes save automatically
                    </Text>
                </HStack>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

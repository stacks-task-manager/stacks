// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Switch } from "@/components/ui/switch";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { ScrollView } from "@/components/ui/scroll-view";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useCallback, useEffect, useLayoutEffect } from "react";
import {
    BackHandler,
    KeyboardAvoidingView,
    Platform,
    Pressable as RNPressable,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";

import type { PRIORITY } from "@stacks/types";

import {
    archiveTask,
    deleteTask,
    fetchTask,
    unarchiveTask,
    updateTask,
    type TaskUpdate,
} from "../../../src/api/endpoints";
import { confirmDelete } from "../../../src/components/ConfirmDelete";
import { HeaderMenu, type HeaderMenuItem } from "../../../src/components/HeaderMenu";
import { QuickAction } from "../../../src/components/QuickAction";
import { queryClient } from "../../../src/state/queryClient";
import { useAuth } from "../../../src/state/AuthContext";
import {
    AssigneesSelect,
    DateField,
    DebouncedTextField,
    EstimateField,
    FieldRow,
    PrioritySelect,
    ProgressField,
    StackSelect,
    StatusSelect,
    TagsSelect,
    TintSelect,
} from "../../../src/widgets";

export default function TaskDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const navigation = useNavigation();
    const headerHeight = useHeaderHeight();
    const { userId } = useAuth();

    const { data: task, isLoading } = useQuery({
        queryKey: ["task", id],
        queryFn: () => fetchTask(id),
    });

    const invalidate = useCallback(async () => {
        await queryClient.invalidateQueries({ queryKey: ["task", id] });
        await queryClient.invalidateQueries({ queryKey: ["tasks"] });
        await queryClient.invalidateQueries({ queryKey: ["my-tasks", userId] });
    }, [id, userId]);

    /**
     * Optimistically mutate the `task` cache so each edit feels instant, then
     * invalidate the wider lists so stale counters/rows elsewhere catch up.
     */
    const mutation = useMutation({
        mutationFn: (patch: TaskUpdate) => updateTask(id, patch),
        onMutate: async patch => {
            await queryClient.cancelQueries({ queryKey: ["task", id] });
            const previous = queryClient.getQueryData<typeof task>(["task", id]);
            if (previous) {
                queryClient.setQueryData(["task", id], { ...previous, ...patch });
            }
            return { previous };
        },
        onError: (_err, _patch, ctx) => {
            if (ctx?.previous) queryClient.setQueryData(["task", id], ctx.previous);
        },
        onSettled: () => {
            void invalidate();
        },
    });

    const patch = (update: TaskUpdate) => mutation.mutate(update);

    /**
     * Dismiss the modal stack. When the modal was opened from any of the drawer
     * screens (my-tasks, inbox, project/…) `router.back()` just pops this modal
     * and reveals the origin untouched. `replace("/(app)")` is a safety net for
     * cold-start deep links where no back entry exists.
     */
    const goBack = useCallback(() => {
        if (router.canGoBack()) {
            router.back();
            return;
        }
        router.replace("/(app)" as never);
    }, [router]);

    useLayoutEffect(() => {
        const isArchived = task?.archived != null;

        /**
         * Header overflow menu. Hidden on archived tasks since the banner
         * already exposes Unarchive/Delete; for live tasks we surface the
         * three most common actions behind a single dots button.
         */
        const menuItems: HeaderMenuItem[] | null =
            task && !isArchived
                ? [
                      {
                          label: task.done ? "Mark as todo" : "Mark as done",
                          icon: task.done ? "circle" : "check-circle",
                          onPress: () => patch({ done: !task.done }),
                      },
                      { type: "divider" },
                      {
                          label: "Archive task",
                          icon: "archive",
                          onPress: () =>
                              confirmDelete(
                                  "Archive task",
                                  `Archive “${task.title}”? You can restore it from the board.`,
                                  async () => {
                                      await archiveTask(id);
                                      await invalidate();
                                      goBack();
                                  },
                                  "Archive"
                              ),
                      },
                      {
                          label: "Delete task",
                          icon: "trash",
                          tone: "danger",
                          onPress: () =>
                              confirmDelete(
                                  "Delete task",
                                  `Delete “${task.title}”? This cannot be undone.`,
                                  async () => {
                                      await deleteTask(id);
                                      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
                                      await queryClient.invalidateQueries({
                                          queryKey: ["my-tasks", userId],
                                      });
                                      goBack();
                                  }
                              ),
                      },
                  ]
                : null;

        navigation.setOptions({
            title: task?.title ?? "Task",
            headerLeft: () => (
                <RNPressable
                    onPress={goBack}
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
            headerRight: menuItems ? () => <HeaderMenu items={menuItems} /> : undefined,
        });
        // `patch` is a thin wrapper over `mutation.mutate` so depending on the
        // mutation identity would force header rebuilds after every keystroke.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [goBack, id, invalidate, navigation, task, userId]);

    useEffect(() => {
        const sub = BackHandler.addEventListener("hardwareBackPress", () => {
            goBack();
            return true;
        });
        return () => sub.remove();
    }, [goBack]);

    if (isLoading || !task) {
        return (
            <Box className="flex-1 justify-center items-center">
                <Spinner />
            </Box>
        );
    }

    const isArchived = task.archived != null;
    const disabled = isArchived;

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
                {isArchived ? (
                    <VStack
                        className="bg-warning-100 border-warning-300 border rounded-md p-3 mb-4"
                        space="sm"
                    >
                        <Text className="text-warning-700">
                            This task is archived.
                        </Text>
                        <HStack space="sm" className="flex-wrap">
                            <QuickAction
                                label="Unarchive"
                                icon="refresh-ccw-01"
                                onPress={async () => {
                                    await unarchiveTask(id);
                                    await invalidate();
                                }}
                            />
                            <QuickAction
                                label="Delete"
                                icon="trash"
                                tone="danger"
                                onPress={() =>
                                    confirmDelete(
                                        "Delete task",
                                        `Delete “${task.title}”? This cannot be undone.`,
                                        async () => {
                                            await deleteTask(id);
                                            await invalidate();
                                            goBack();
                                        }
                                    )
                                }
                            />
                        </HStack>
                    </VStack>
                ) : null}

                <FieldRow label="Title">
                    <DebouncedTextField
                        value={task.title}
                        onChange={value => patch({ title: value })}
                        placeholder="Task title"
                        disabled={disabled}
                        style={{ fontSize: 18, fontWeight: "600" }}
                    />
                </FieldRow>

                <FieldRow label="Description">
                    <DebouncedTextField
                        value={task.description}
                        onChange={value => patch({ description: value })}
                        placeholder="Describe this task…"
                        multiline
                        disabled={disabled}
                    />
                </FieldRow>

                <HStack space="md" className="items-start">
                    <Box className="flex-1">
                        <FieldRow label="Completed">
                            <HStack space="sm" className="items-center">
                                <Switch
                                    value={!!task.done}
                                    onValueChange={v => patch({ done: v })}
                                    disabled={disabled}
                                />
                            </HStack>
                        </FieldRow>
                    </Box>
                    <Box className="flex-1">
                        <FieldRow label="Status">
                            <StatusSelect
                                value={task.status}
                                onChange={value => patch({ status: value })}
                                disabled={disabled}
                            />
                        </FieldRow>
                    </Box>
                    <Box className="flex-1">
                        <FieldRow label="Priority">
                            <PrioritySelect
                                value={task.priority}
                                onChange={(value: PRIORITY) => patch({ priority: value })}
                                disabled={disabled}
                            />
                        </FieldRow>
                    </Box>
                </HStack>

                <FieldRow label="Tags">
                    <TagsSelect
                        value={task.tags ?? []}
                        onChange={value => patch({ tags: value })}
                        disabled={disabled}
                    />
                </FieldRow>

                <FieldRow label="Assignees">
                    <AssigneesSelect
                        value={task.assignees ?? []}
                        onChange={value => patch({ assignees: value })}
                        disabled={disabled}
                    />
                </FieldRow>

                <FieldRow label="Column">
                    <StackSelect
                        projectId={task.project}
                        value={task.stack}
                        onChange={value => patch({ stack: value })}
                        disabled={disabled}
                    />
                </FieldRow>

                <HStack space="md">
                    <Box className="flex-1">
                        <FieldRow label="Start date">
                            <DateField
                                value={task.startdate}
                                onChange={value => patch({ startdate: value })}
                                maximumDate={task.duedate ? new Date(task.duedate) : undefined}
                                disabled={disabled}
                            />
                        </FieldRow>
                    </Box>
                    <Box className="flex-1">
                        <FieldRow label="Due date">
                            <DateField
                                value={task.duedate}
                                onChange={value => patch({ duedate: value })}
                                minimumDate={task.startdate ? new Date(task.startdate) : undefined}
                                disabled={disabled}
                            />
                        </FieldRow>
                    </Box>
                </HStack>

                <FieldRow label="Do date">
                    <DateField
                        value={task.dodate}
                        onChange={value => patch({ dodate: value })}
                        minimumDate={task.startdate ? new Date(task.startdate) : undefined}
                        maximumDate={task.duedate ? new Date(task.duedate) : undefined}
                        disabled={disabled}
                    />
                </FieldRow>

                <FieldRow label="Progress">
                    <ProgressField
                        value={task.progress}
                        onChange={value => patch({ progress: value })}
                        disabled={disabled}
                    />
                </FieldRow>

                <FieldRow label="Estimate">
                    <EstimateField
                        value={task.estimate}
                        onChange={value => patch({ estimate: value })}
                        disabled={disabled}
                    />
                </FieldRow>

                <FieldRow label="Tint">
                    <TintSelect
                        value={task.tint}
                        onChange={value => patch({ tint: value })}
                        disabled={disabled}
                    />
                </FieldRow>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

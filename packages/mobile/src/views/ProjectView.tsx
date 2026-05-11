// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { useQuery } from "@tanstack/react-query";
import { useNavigation, useRouter } from "expo-router";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ScrollView as RNScrollView, useWindowDimensions } from "react-native";
import type { IStack, ITask } from "@stacks/types";

import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { ScrollView } from "@/components/ui/scroll-view";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

import {
    createStack,
    createTask,
    deleteDocument,
    fetchProject,
    fetchStacks,
    fetchTasksForProject,
    moveTask,
    updateProjectStacksOrder,
} from "../api/endpoints";
import { confirmDelete } from "../components/ConfirmDelete";
import { HeaderMenu, type HeaderMenuItem } from "../components/HeaderMenu";
import { MoveTaskModal } from "../components/MoveTaskModal";
import { NewStackModal } from "../components/NewStackModal";
import { NewTaskModal } from "../components/NewTaskModal";
import { queryClient } from "../state/queryClient";
import { TaskCard } from "../widgets";

/** Fraction of the viewport width each column should fill (85%). */
const COLUMN_WIDTH_RATIO = 0.95;
/** Gutter between columns; doubles as horizontal page padding. */
const COLUMN_GUTTER = 12;

function orderedTasksForStack(stack: IStack, tasks: ITask[]): ITask[] {
    const byId = new Map(tasks.filter(t => t.stack === stack.id).map(t => [t.id, t]));
    const order = stack.tasksOrder?.length ? stack.tasksOrder : Array.from(byId.keys());
    return order.map(id => byId.get(id)).filter((t): t is ITask => t != null);
}

export function ProjectView({
    projectId,
    title,
    allowDelete = true,
}: {
    projectId: string;
    title: string;
    /** When false, hides project delete (e.g. system inbox). */
    allowDelete?: boolean;
}) {
    const navigation = useNavigation();
    const router = useRouter();
    const { width: windowWidth } = useWindowDimensions();
    const scrollRef = useRef<RNScrollView>(null);
    const [taskModal, setTaskModal] = useState<{ stackId: string; stackTitle: string } | null>(null);
    const [stackModal, setStackModal] = useState(false);
    const [moveTarget, setMoveTarget] = useState<ITask | null>(null);
    const [boardHeight, setBoardHeight] = useState(0);

    /**
     * When non-null we're in "reorder columns" mode: the user long-pressed a
     * column header. `reorderId` is the stack being moved, and `draftOrder`
     * is a local copy of `stacksOrder` that the arrow buttons mutate until
     * the user confirms.
     */
    const [reorderId, setReorderId] = useState<string | null>(null);
    const [draftOrder, setDraftOrder] = useState<string[] | null>(null);

    const columnWidth = Math.round(windowWidth * COLUMN_WIDTH_RATIO);
    const snapInterval = columnWidth + COLUMN_GUTTER;

    const { data: project, isLoading: pLoading } = useQuery({
        queryKey: ["project", projectId],
        queryFn: () => fetchProject(projectId),
    });

    const { data: stacks = [], isLoading: sLoading } = useQuery({
        queryKey: ["stacks", projectId],
        queryFn: () => fetchStacks(projectId),
    });

    const { data: tasks = [], isLoading: tLoading } = useQuery({
        queryKey: ["tasks", projectId],
        queryFn: () => fetchTasksForProject(projectId),
    });

    const isReordering = reorderId != null && draftOrder != null;

    /**
     * Live column ordering. When reordering, we prefer the in-progress draft
     * so the user sees their arrow presses immediately; otherwise fall back
     * to the server-provided `stacksOrder` with the usual insertion-order
     * fallback.
     */
    const columns = useMemo(() => {
        const order = isReordering
            ? draftOrder!
            : project?.stacksOrder?.length
            ? project.stacksOrder
            : stacks.map(s => s.id);
        const map = new Map(stacks.map(s => [s.id, s]));
        return order.map(id => map.get(id)).filter((s): s is IStack => s != null);
    }, [draftOrder, isReordering, project?.stacksOrder, stacks]);

    const reorderIndex = useMemo(() => {
        if (!isReordering) return -1;
        return columns.findIndex(s => s.id === reorderId);
    }, [columns, isReordering, reorderId]);

    const exitReorder = useCallback(() => {
        setReorderId(null);
        setDraftOrder(null);
    }, []);

    const enterReorder = useCallback(
        (stackId: string) => {
            const current = project?.stacksOrder?.length ? project.stacksOrder : stacks.map(s => s.id);
            setDraftOrder([...current]);
            setReorderId(stackId);
        },
        [project?.stacksOrder, stacks]
    );

    const moveColumn = useCallback(
        (direction: -1 | 1) => {
            if (!isReordering) return;
            setDraftOrder(prev => {
                if (!prev || reorderId == null) return prev;
                const idx = prev.indexOf(reorderId);
                if (idx < 0) return prev;
                const target = idx + direction;
                if (target < 0 || target >= prev.length) return prev;
                const next = [...prev];
                const [removed] = next.splice(idx, 1);
                next.splice(target, 0, removed);
                return next;
            });
        },
        [isReordering, reorderId]
    );

    const confirmReorder = useCallback(async () => {
        if (!draftOrder) {
            exitReorder();
            return;
        }
        const serverOrder = project?.stacksOrder ?? [];
        const unchanged =
            serverOrder.length === draftOrder.length && serverOrder.every((id, i) => id === draftOrder[i]);
        if (unchanged) {
            exitReorder();
            return;
        }
        await updateProjectStacksOrder(projectId, draftOrder);
        await queryClient.invalidateQueries({ queryKey: ["project", projectId] });
        exitReorder();
    }, [draftOrder, exitReorder, project?.stacksOrder, projectId]);

    // Keep the column being reordered visible as it slides left/right.
    useEffect(() => {
        if (!isReordering || reorderIndex < 0) return;
        scrollRef.current?.scrollTo({
            x: reorderIndex * snapInterval,
            animated: true,
        });
    }, [isReordering, reorderIndex, snapInterval]);

    useLayoutEffect(() => {
        if (isReordering) {
            navigation.setOptions({
                title: "Reorder columns",
                headerLeft: () => (
                    <Pressable onPress={exitReorder} className="px-3 py-1">
                        <Text className="text-typography-600">
                            Cancel
                        </Text>
                    </Pressable>
                ),
                headerRight: () => (
                    <Pressable onPress={() => void confirmReorder()} className="px-3 py-1">
                        <Text className="text-primary-600 font-bold">
                            Done
                        </Text>
                    </Pressable>
                ),
            });
            return;
        }
        /**
         * Header overflow menu. "Project settings" opens the dedicated modal
         * and "Delete project" routes through the standard confirm dialog.
         * System projects (e.g. inbox) render with `allowDelete=false`, in
         * which case we skip the menu entirely since its only non-settings
         * entry would be disabled.
         */
        const menuItems: HeaderMenuItem[] | null = allowDelete
            ? [
                  {
                      label: "Project settings",
                      icon: "settings-02",
                      onPress: () =>
                          router.push(`/(modals)/project-settings/${projectId}` as never),
                  },
                  { type: "divider" },
                  {
                      label: "Delete project",
                      icon: "trash",
                      tone: "danger",
                      onPress: () =>
                          confirmDelete(
                              "Delete project",
                              `Delete “${title}” and its data?`,
                              async () => {
                                  await deleteDocument(projectId);
                                  await queryClient.invalidateQueries({
                                      queryKey: ["documents"],
                                  });
                                  router.replace("/(app)" as never);
                              }
                          ),
                  },
              ]
            : null;

        navigation.setOptions({
            title: title || "Project",
            headerLeft: undefined,
            headerRight: menuItems ? () => <HeaderMenu items={menuItems} /> : undefined,
        });
    }, [allowDelete, confirmReorder, exitReorder, isReordering, navigation, projectId, router, title]);

    const onCreateTask = useCallback(
        async (stackId: string, taskTitle: string) => {
            await createTask({
                title: taskTitle,
                project: projectId,
                stack: stackId,
            });
            await queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
        },
        [projectId]
    );

    const onMoveTask = useCallback(
        async (targetStackId: string) => {
            if (!moveTarget) return;
            const movingId = moveTarget.id;
            setMoveTarget(null);
            await moveTask({ task: movingId, stack: targetStackId, after: null });
            await queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
            await queryClient.invalidateQueries({ queryKey: ["stacks", projectId] });
        },
        [moveTarget, projectId]
    );

    const onCreateStack = useCallback(
        async (stackTitle: string) => {
            await createStack(projectId, stackTitle, columns.length);
            await queryClient.invalidateQueries({ queryKey: ["stacks", projectId] });
            await queryClient.invalidateQueries({ queryKey: ["project", projectId] });
        },
        [columns.length, projectId]
    );

    if (pLoading || sLoading || tLoading) {
        return (
            <Box className="flex-1 justify-center items-center">
                <Spinner />
            </Box>
        );
    }

    const columnHeight = Math.max(0, boardHeight - 16);

    return (
        <Box
            className="flex-1 bg-background-100"
            onLayout={e => setBoardHeight(e.nativeEvent.layout.height)}
        >
            <RNScrollView
                ref={scrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                snapToInterval={snapInterval}
                snapToAlignment="start"
                scrollEnabled={!isReordering}
                contentContainerStyle={{
                    paddingHorizontal: COLUMN_GUTTER / 2,
                    paddingVertical: 8,
                }}
                style={{ flex: 1 }}
            >
                {columns.map((stack, index) => {
                    const isActive = isReordering && stack.id === reorderId;
                    const isDimmed = isReordering && !isActive;
                    const stackTasks = orderedTasksForStack(stack, tasks);
                    const canMoveLeft = index > 0;
                    const canMoveRight = index < columns.length - 1;

                    return (
                        <VStack
                            key={stack.id}
                            style={{
                                width: columnWidth,
                                marginHorizontal: COLUMN_GUTTER / 2,
                                height: columnHeight || undefined,
                                opacity: isDimmed ? 0.35 : 1,
                                ...(isActive
                                    ? {
                                          shadowColor: "#000",
                                          shadowOpacity: 0.25,
                                          shadowRadius: 16,
                                          shadowOffset: { width: 0, height: 8 },
                                          elevation: 12,
                                          zIndex: 10,
                                          transform: [{ scale: 1.02 }],
                                      }
                                    : {}),
                            }}
                        >
                            <Box
                                className={`bg-background-200 rounded-lg p-2.5 overflow-hidden ${isActive ? "border-2 border-primary-500" : ""}`}
                                style={{
                                    flexGrow: 2,
                                    flexShrink: 1,
                                    flexBasis: 0,
                                }}
                            >
                                <Pressable
                                    onLongPress={isReordering ? undefined : () => enterReorder(stack.id)}
                                    delayLongPress={350}
                                    className="px-1 pb-2"
                                >
                                    <HStack className="items-center" space="xs">
                                        <Text
                                            size="sm"
                                            numberOfLines={1}
                                            className="flex-1 font-bold text-typography-800"
                                        >
                                            {stack.title}
                                        </Text>
                                        {isActive ? (
                                            <Text size="xs" className="text-typography-500">
                                                {index + 1}/{columns.length}
                                            </Text>
                                        ) : (
                                            <Text size="sm" className="text-typography-500">
                                                {stackTasks.length}
                                            </Text>
                                        )}
                                    </HStack>
                                </Pressable>

                                {isActive ? (
                                    <VStack className="flex-1 justify-center items-center" space="md">
                                        <Text
                                            size="xs"
                                            className="text-typography-500"
                                            style={{ textAlign: "center" }}
                                        >
                                            Use the arrows to move this column, then tap Done.
                                        </Text>
                                        <HStack className="items-center" space="lg">
                                            <ReorderArrow
                                                direction="left"
                                                disabled={!canMoveLeft}
                                                onPress={() => moveColumn(-1)}
                                            />
                                            <VStack className="items-center" style={{ minWidth: 80 }}>
                                                <Text size="2xs" className="text-typography-500">
                                                    Position
                                                </Text>
                                                <Text
                                                    size="xl"
                                                    className="font-bold text-typography-900"
                                                >
                                                    {index + 1}
                                                </Text>
                                            </VStack>
                                            <ReorderArrow
                                                direction="right"
                                                disabled={!canMoveRight}
                                                onPress={() => moveColumn(1)}
                                            />
                                        </HStack>
                                    </VStack>
                                ) : (
                                    <ScrollView
                                        className="flex-1"
                                        nestedScrollEnabled
                                        showsVerticalScrollIndicator={false}
                                        contentContainerStyle={{ paddingBottom: 4 }}
                                    >
                                        {stackTasks.map(item => (
                                            <TaskCard
                                                key={item.id}
                                                task={item}
                                                onPress={t =>
                                                    router.push(`/(modals)/task/${t.id}` as never)
                                                }
                                                onLongPress={t => setMoveTarget(t)}
                                            />
                                        ))}
                                    </ScrollView>
                                )}
                            </Box>

                            {!isActive ? (
                                <Pressable
                                    onPress={() =>
                                        setTaskModal({
                                            stackId: stack.id,
                                            stackTitle: stack.title,
                                        })
                                    }
                                    className="mt-2 py-2.5 rounded-md items-center border border-outline-300 active:opacity-70"
                                    style={{ borderStyle: "dashed" }}
                                >
                                    <Text className="text-primary-600 font-semibold">
                                        + Add task
                                    </Text>
                                </Pressable>
                            ) : null}
                        </VStack>
                    );
                })}

                {!isReordering ? (
                    <Pressable
                        onPress={() => setStackModal(true)}
                        className="border border-outline-300 rounded-lg items-center justify-center"
                        style={{
                            width: columnWidth,
                            marginHorizontal: COLUMN_GUTTER / 2,
                            borderStyle: "dashed",
                            height: columnHeight || undefined,
                        }}
                    >
                        <VStack className="items-center" space="xs">
                            <Text size="md" className="text-primary-600 font-semibold">
                                + Add column
                            </Text>
                        </VStack>
                    </Pressable>
                ) : null}
            </RNScrollView>

            <NewTaskModal
                visible={!!taskModal}
                stackTitle={taskModal?.stackTitle ?? ""}
                onClose={() => setTaskModal(null)}
                onCreate={t => (taskModal ? onCreateTask(taskModal.stackId, t) : Promise.resolve())}
            />
            <NewStackModal
                visible={stackModal}
                onClose={() => setStackModal(false)}
                onCreate={onCreateStack}
            />
            <MoveTaskModal
                task={moveTarget}
                stacks={columns}
                onClose={() => setMoveTarget(null)}
                onSelect={onMoveTask}
            />
        </Box>
    );
}

function ReorderArrow({
    direction,
    disabled,
    onPress,
}: {
    direction: "left" | "right";
    disabled?: boolean;
    onPress: () => void;
}) {
    return (
        <Pressable
            onPress={disabled ? undefined : onPress}
            disabled={disabled}
            className={`rounded-full items-center justify-center ${disabled ? "bg-background-200" : "bg-primary-500"} ${disabled ? "opacity-40" : "active:opacity-75"}`}
            style={{
                width: 56,
                height: 56,
                shadowColor: "#000",
                shadowOpacity: 0.15,
                shadowRadius: 6,
                shadowOffset: { width: 0, height: 2 },
                elevation: 3,
            }}
        >
            <Text size="2xl" className="font-bold text-white">
                {direction === "left" ? "‹" : "›"}
            </Text>
        </Pressable>
    );
}

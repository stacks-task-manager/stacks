// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import type { ITask } from "@stacks/types";

import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

import { TaskAssignees } from "./TaskAssignees";
import { TaskCover } from "./TaskCover";
import { TaskDate } from "./TaskDate";
import { TaskFooterCount } from "./TaskFooterCounts";
import { TaskPriority } from "./TaskPriority";
import { TaskProgress } from "./TaskProgress";
import { TaskStatusBar } from "./TaskStatusBar";
import { TaskTags } from "./TaskTags";

/**
 * Mobile port of the web `TaskCard`. Composes the same sub-widgets (status
 * bar, cover, title, tags, mid-section, footer) using gluestack primitives
 * styled to feel like the web card.
 */
export function TaskCard({
    task,
    onPress,
    onLongPress,
}: {
    task: ITask;
    onPress?: (task: ITask) => void;
    onLongPress?: (task: ITask) => void;
}) {
    const hasTint = Boolean(task.tint);
    const hasCover = Boolean(task.cover);
    const hasMid =
        (task.priority && task.priority !== "none") ||
        (task.progress ?? 0) > 0 ||
        task.startdate ||
        task.duedate;

    return (
        <Pressable
            onPress={onPress ? () => onPress(task) : undefined}
            onLongPress={onLongPress ? () => onLongPress(task) : undefined}
            delayLongPress={350}
            className={`relative mb-2.5 overflow-hidden rounded-md border border-outline-200 active:opacity-85 ${hasTint ? "" : "bg-background-0"} ${task.done ? "opacity-60" : ""}`}
            style={{
                ...(hasTint ? { backgroundColor: (task.tint as string) + "11" } : null),
                shadowColor: "#000",
                shadowOpacity: 0.04,
                shadowRadius: 3,
                shadowOffset: { width: 0, height: 1 },
                elevation: 1,
            }}
        >
            <TaskStatusBar status={task.status} />

            {hasCover ? <TaskCover url={task.cover as string} /> : null}

            <VStack className="p-2.5 pl-3.5" space="xs">
                <HStack className="items-start" space="xs">
                    <Text
                        size="sm"
                        className="flex-1 font-semibold text-typography-900"
                        style={{
                            textDecorationLine: task.done ? "line-through" : "none",
                        }}
                        numberOfLines={3}
                    >
                        {task.title}
                    </Text>
                    {task.done ? (
                        <Text size="xs" className="font-bold text-success-700">
                            ✓
                        </Text>
                    ) : null}
                </HStack>

                {task.tags?.length ? <TaskTags tags={task.tags} /> : null}

                {hasMid ? (
                    <HStack className="flex-wrap items-center" space="xs">
                        <TaskPriority priority={task.priority} />
                        <TaskProgress progress={task.progress} />
                        <TaskDate
                            startdate={task.startdate}
                            duedate={task.duedate}
                            done={task.done}
                        />
                    </HStack>
                ) : null}

                {task.assignees?.length || task.comments || task.attachments ? (
                    <HStack className="mt-1 items-center justify-between">
                        <TaskAssignees assignees={task.assignees ?? []} />
                        <HStack className="items-center" space="sm">
                            <TaskFooterCount glyph="💬" count={task.comments} />
                            <TaskFooterCount glyph="📎" count={task.attachments} />
                        </HStack>
                    </HStack>
                ) : null}
            </VStack>
        </Pressable>
    );
}

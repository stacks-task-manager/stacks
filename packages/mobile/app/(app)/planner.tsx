// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { ScrollView } from "react-native";
import type { ITask } from "@stacks/types";

import { Box } from "@/components/ui/box";
import { Heading } from "@/components/ui/heading";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

import { fetchTasks } from "../../src/api/endpoints";
import { TaskCard } from "../../src/widgets";

/** Coerce a serialized date (`string` or `Date`) into a real `Date`. */
function toDate(value: string | Date): Date {
    return value instanceof Date ? value : new Date(value);
}

/** Reset a date to local midnight (start of its calendar day). */
function startOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

/** Stable calendar-day key suitable for grouping (`toDateString` is locale-stable). */
function dayKey(date: Date): string {
    return startOfDay(date).toDateString();
}

/** Human-friendly day label, matching the timelogs screen formatting. */
function formatDay(date: Date): string {
    return date.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
    });
}

type DayGroup = { key: string; date: Date; tasks: ITask[] };

export default function PlannerScreen() {
    const router = useRouter();

    const { data: tasks = [], isLoading } = useQuery({
        queryKey: ["tasks", "planner", { open: true }],
        queryFn: () => fetchTasks({ open: true }),
    });

    const groups = useMemo<DayGroup[]>(() => {
        const today = startOfDay(new Date());
        const horizonEnd = startOfDay(new Date());
        horizonEnd.setDate(horizonEnd.getDate() + 13);

        const byDay = new Map<string, DayGroup>();
        for (const task of tasks) {
            if (!task.duedate) continue;
            const due = startOfDay(toDate(task.duedate));
            if (due < today || due > horizonEnd) continue;
            const key = dayKey(due);
            const existing = byDay.get(key);
            if (existing) {
                existing.tasks.push(task);
            } else {
                byDay.set(key, { key, date: due, tasks: [task] });
            }
        }
        return Array.from(byDay.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
    }, [tasks]);

    if (isLoading) {
        return (
            <Box className="flex-1 justify-center items-center">
                <Spinner />
            </Box>
        );
    }

    if (groups.length === 0) {
        return (
            <Box className="flex-1 items-center justify-center p-6">
                <Text className="text-typography-600">
                    No scheduled tasks in the next two weeks.
                </Text>
            </Box>
        );
    }

    return (
        <ScrollView
            className="flex-1 bg-background-0"
            contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
        >
            {groups.map(group => (
                <VStack key={group.key} space="xs" className="mb-5">
                    <Heading size="sm" className="px-1 mb-1 text-typography-700">
                        {formatDay(group.date)}
                    </Heading>
                    {group.tasks.map(task => (
                        <TaskCard
                            key={task.id}
                            task={task}
                            onPress={t => router.push(`/(modals)/task/${t.id}` as never)}
                        />
                    ))}
                </VStack>
            ))}
        </ScrollView>
    );
}
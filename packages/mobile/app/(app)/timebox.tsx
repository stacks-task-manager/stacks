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

import { fetchTasksForAssignee } from "../../src/api/endpoints";
import { useAuth } from "../../src/state/AuthContext";
import { TaskCard } from "../../src/widgets";

function startOfDay(d: Date): Date {
    const out = new Date(d);
    out.setHours(0, 0, 0, 0);
    return out;
}

function formatDay(d: Date): string {
    const today = startOfDay(new Date());
    const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export default function TimeboxScreen() {
    const router = useRouter();
    const { userId } = useAuth();

    const { data: tasks = [], isLoading } = useQuery({
        queryKey: ["timebox", userId],
        queryFn: () => fetchTasksForAssignee(userId!),
        enabled: !!userId,
    });

    const days = useMemo(() => {
        const byDay = new Map<number, ITask[]>();
        for (const task of tasks ?? []) {
            if (!task.startdate) continue; // timebox shows scheduled tasks
            const d = new Date(task.startdate);
            const dayKey = startOfDay(d).getTime();
            const list = byDay.get(dayKey) ?? [];
            list.push(task);
            byDay.set(dayKey, list);
        }
        return Array.from(byDay.entries())
            .map(([key, list]) => ({
                day: new Date(key),
                tasks: list.sort(
                    (a, b) =>
                        Number(Boolean(a.done)) - Number(Boolean(b.done)) ||
                        (a.startdate ? new Date(a.startdate).getTime() : 0) -
                            (b.startdate ? new Date(b.startdate).getTime() : 0)
                ),
            }))
            .sort((a, b) => a.day.getTime() - b.day.getTime());
    }, [tasks]);

    if (isLoading || !userId) {
        return (
            <Box className="flex-1 justify-center items-center">
                <Spinner />
            </Box>
        );
    }

    if (days.length === 0) {
        return (
            <Box className="flex-1 items-center justify-center p-6">
                <Text className="text-typography-600">No scheduled tasks.</Text>
            </Box>
        );
    }

    return (
        <ScrollView
            className="flex-1 bg-background-0"
            contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
        >
            <Heading size="sm" className="px-1 mb-2 text-typography-700">
                Scheduled tasks
            </Heading>
            {days.map(({ day, tasks: dayTasks }) => (
                <VStack key={day.getTime()} space="xs" className="mb-5">
                    <Heading size="sm" className="px-1 mb-1 text-typography-600">
                        {formatDay(day)}
                    </Heading>
                    {dayTasks.map(task => (
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

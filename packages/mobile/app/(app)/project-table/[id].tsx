// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView } from "react-native";
import type { ITask } from "@stacks/types";
import { PRIORITY } from "@stacks/types";

import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

import { fetchTasks } from "../../../src/api/endpoints";
import { usePeople, useTags } from "../../../src/widgets";

const PRIORITY_LABEL: Record<PRIORITY, string> = {
    [PRIORITY.NONE]: "NONE",
    [PRIORITY.LOW]: "LOW",
    [PRIORITY.MEDIUM]: "MEDIUM",
    [PRIORITY.HIGH]: "HIGH",
    [PRIORITY.CRITICAL]: "CRITICAL",
};

function priorityLabel(priority: ITask["priority"]): string {
    if (priority == null) return "NONE";
    return PRIORITY_LABEL[priority] ?? "NONE";
}

function formatDueDate(due: ITask["duedate"]): string {
    if (!due) return "—";
    const d = due instanceof Date ? due : new Date(due);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function ProjectTableScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const {
        data: tasks = [],
        isLoading,
        isError,
    } = useQuery<ITask[]>({
        queryKey: ["tasks", id],
        queryFn: () => fetchTasks({ project: id }),
    });

    // Resolve names for assignees + status without requiring a global store.
    usePeople();
    useTags();

    if (isLoading) {
        return (
            <Box className="flex-1 justify-center items-center">
                <Spinner />
            </Box>
        );
    }

    if (isError) {
        return (
            <Box className="flex-1 items-center justify-center p-6">
                <Text className="text-typography-600">Failed to load tasks.</Text>
            </Box>
        );
    }

    if (tasks.length === 0) {
        return (
            <Box className="flex-1 items-center justify-center p-6">
                <Text className="text-typography-600">No tasks.</Text>
            </Box>
        );
    }

    return (
        <ScrollView
            className="flex-1 bg-background-0"
            contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
        >
            <VStack space="xs">
                {tasks.map(task => {
                    const progress = Math.round(task.progress ?? 0);
                    return (
                        <Pressable
                            key={task.id}
                            onPress={() => router.push(`/(modals)/task/${task.id}` as never)}
                            className="bg-background-0 border border-outline-200 rounded-md p-3 active:bg-background-100"
                        >
                            <VStack space="xs">
                                <Text
                                    size="sm"
                                    className="font-semibold text-typography-900"
                                    numberOfLines={1}
                                >
                                    {task.title}
                                </Text>
                                <HStack className="items-center justify-between">
                                    <Text size="xs" className="text-typography-500">
                                        {priorityLabel(task.priority)}
                                    </Text>
                                    <Text size="xs" className="text-typography-500">
                                        {task.status ?? "—"}
                                    </Text>
                                    <Text size="xs" className="text-typography-500">
                                        {formatDueDate(task.duedate)}
                                    </Text>
                                    <Text size="xs" className="text-typography-700 font-semibold">
                                        {progress}%
                                    </Text>
                                </HStack>
                            </VStack>
                        </Pressable>
                    );
                })}
            </VStack>
        </ScrollView>
    );
}

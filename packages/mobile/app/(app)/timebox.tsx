// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { ScrollView } from "react-native";

import { Box } from "@/components/ui/box";
import { Heading } from "@/components/ui/heading";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

import { fetchTasks } from "../../src/api/endpoints";
import { TaskCard } from "../../src/widgets";

export default function TimeboxScreen() {
    const router = useRouter();

    const { data: tasks = [], isLoading } = useQuery({
        queryKey: ["tasks", "timebox", {}],
        queryFn: () => fetchTasks({}),
    });

    const unscheduled = useMemo(
        () => (tasks ?? []).filter(t => !t.startdate && !t.duedate),
        [tasks]
    );

    if (isLoading) {
        return (
            <Box className="flex-1 justify-center items-center">
                <Spinner />
            </Box>
        );
    }

    if (unscheduled.length === 0) {
        return (
            <Box className="flex-1 items-center justify-center p-6">
                <Text className="text-typography-600">No unscheduled tasks.</Text>
            </Box>
        );
    }

    return (
        <ScrollView
            className="flex-1 bg-background-0"
            contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
        >
            <Heading size="sm" className="px-1 mb-2 text-typography-700">
                Unscheduled tasks
            </Heading>
            <VStack space="xs">
                {unscheduled.map(task => (
                    <TaskCard
                        key={task.id}
                        task={task}
                        onPress={t => router.push(`/(modals)/task/${t.id}` as never)}
                    />
                ))}
            </VStack>
        </ScrollView>
    );
}
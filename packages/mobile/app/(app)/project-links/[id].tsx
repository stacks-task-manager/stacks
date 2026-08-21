// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import { Linking, ScrollView } from "react-native";
import type { ILink, ITask } from "@stacks/types";

import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

import { fetchTasksForProject } from "../../../src/api/endpoints";
import { Icon } from "../../../src/components/Icon";

interface ExtendedLink extends ILink {
    task: ITask;
}

export default function ProjectLinksScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();

    const {
        data: tasks = [],
        isLoading,
        isError,
    } = useQuery<ITask[]>({
        queryKey: ["tasks", id],
        queryFn: () => fetchTasksForProject(id),
    });

    const links = useMemo<ExtendedLink[]>(() => {
        const out: ExtendedLink[] = [];
        for (const task of tasks) {
            for (const link of task.links ?? []) {
                out.push({ ...link, task });
            }
        }
        return out.sort((a, b) => a.title.localeCompare(b.title));
    }, [tasks]);

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
                <Text className="text-typography-600">Failed to load project links.</Text>
            </Box>
        );
    }

    if (links.length === 0) {
        return (
            <Box className="flex-1 items-center justify-center p-6">
                <Text className="text-typography-600 text-center">
                    No links yet. Open a task and add a link there.
                </Text>
            </Box>
        );
    }

    return (
        <ScrollView
            className="flex-1 bg-background-0"
            contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
        >
            <VStack space="xs">
                {links.map(link => (
                    <Box key={link.id} className="bg-background-0 border border-outline-200 rounded-md p-3">
                        <Pressable
                            onPress={() => {
                                if (link.url) void Linking.openURL(link.url);
                            }}
                        >
                            <HStack className="items-center" space="sm">
                                <Box className="bg-background-100 rounded-md items-center justify-center p-2">
                                    <Icon icon={link.url.startsWith("http") ? "link-01" : "file"} size={16} />
                                </Box>
                                <VStack className="flex-1" space="xs">
                                    <Text
                                        size="sm"
                                        className="font-semibold text-typography-900"
                                        numberOfLines={1}
                                    >
                                        {link.title || link.url}
                                    </Text>
                                    <Text size="xs" className="text-typography-500" numberOfLines={1}>
                                        {link.url}
                                    </Text>
                                </VStack>
                            </HStack>
                        </Pressable>
                        <Pressable
                            onPress={() => router.push(`/(modals)/task/${link.task.id}` as never)}
                            className="mt-2"
                        >
                            <HStack className="items-center" space="xs">
                                <Icon icon="clipboard" size={12} />
                                <Text size="xs" className="text-primary-600" numberOfLines={1}>
                                    {link.task.title}
                                </Text>
                            </HStack>
                        </Pressable>
                    </Box>
                ))}
            </VStack>
        </ScrollView>
    );
}

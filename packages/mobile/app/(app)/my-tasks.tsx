// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { FlatList } from "react-native";

import { Box } from "@/components/ui/box";
import { Divider } from "@/components/ui/divider";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

import { deleteTask, fetchTasksForAssignee } from "../../src/api/endpoints";
import { confirmDelete } from "../../src/components/ConfirmDelete";
import { useAuth } from "../../src/state/AuthContext";
import { queryClient } from "../../src/state/queryClient";

export default function MyTasksScreen() {
    const router = useRouter();
    const { userId } = useAuth();

    const { data: tasks = [], isLoading } = useQuery({
        queryKey: ["my-tasks", userId],
        queryFn: () => fetchTasksForAssignee(userId!),
        enabled: !!userId,
    });

    if (isLoading || !userId) {
        return (
            <Box className="flex-1 justify-center items-center">
                <Spinner />
            </Box>
        );
    }

    return (
        <Box className="flex-1 bg-background-0">
            <FlatList
                data={tasks}
                keyExtractor={item => item.id}
                contentContainerStyle={{ paddingBottom: 24 }}
                ItemSeparatorComponent={Divider}
                renderItem={({ item }) => (
                    <HStack className="items-center">
                        <Pressable
                            className="flex-1 py-2.5 px-3"
                            onPress={() =>
                                router.push(`/(modals)/task/${item.id}` as never)
                            }
                        >
                            <VStack>
                                <Text size="md" className="text-typography-900">
                                    {item.title}
                                </Text>
                                <Text size="xs" className="text-typography-500">
                                    {item.projectInfo?.title ?? item.project} · {item.priority ?? "none"}
                                </Text>
                            </VStack>
                        </Pressable>
                        <Pressable
                            onPress={() =>
                                confirmDelete("Delete task", `Delete “${item.title}”?`, async () => {
                                    await deleteTask(item.id);
                                    await queryClient.invalidateQueries({
                                        queryKey: ["my-tasks", userId],
                                    });
                                })
                            }
                            className="p-3"
                        >
                            <Text className="text-error-600">Delete</Text>
                        </Pressable>
                    </HStack>
                )}
                ListEmptyComponent={
                    <Text className="p-4 text-typography-500">
                        No tasks assigned to you
                    </Text>
                }
            />
        </Box>
    );
}

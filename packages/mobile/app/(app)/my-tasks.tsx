// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { ScrollView } from "react-native";
import type { ITask, TreeNode } from "@stacks/types";
import { RECORDTYPE } from "@stacks/types";

import { Box } from "@/components/ui/box";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

import { fetchDocuments, fetchTasksForAssignee } from "../../src/api/endpoints";
import { useAuth } from "../../src/state/AuthContext";
import { TaskCard } from "../../src/widgets";

/** Group tasks by their project, ordered by the document tree order. */
function groupByProject(tasks: ITask[], projects: TreeNode[]): { project: TreeNode; tasks: ITask[] }[] {
    const byProject = new Map<string, ITask[]>();
    for (const t of tasks) {
        const list = byProject.get(t.project) ?? [];
        list.push(t);
        byProject.set(t.project, list);
    }
    const visible = projects.filter(p => p.type === RECORDTYPE.PROJECT);
    const groups: { project: TreeNode; tasks: ITask[] }[] = [];
    for (const project of visible) {
        const list = byProject.get(project.id);
        if (list && list.length) {
            groups.push({ project, tasks: list });
        }
    }
    // Include any projects present in the tasks but absent from the tree.
    for (const [pid, list] of byProject) {
        if (!groups.some(g => g.project.id === pid)) {
            groups.push({
                project: { id: pid, title: list[0]?.projectInfo?.title ?? "Unknown project" } as TreeNode,
                tasks: list,
            });
        }
    }
    return groups;
}

export default function MyTasksScreen() {
    const router = useRouter();
    const { userId } = useAuth();

    const { data: tasks = [], isLoading } = useQuery({
        queryKey: ["my-tasks", userId],
        queryFn: () => fetchTasksForAssignee(userId!),
        enabled: !!userId,
    });

    const { data: documents } = useQuery({
        queryKey: ["documents"],
        queryFn: fetchDocuments,
    });

    const groups = useMemo(() => {
        if (!documents) return [];
        return groupByProject(tasks, documents.documents);
    }, [tasks, documents]);

    if (isLoading || !userId) {
        return (
            <Box className="flex-1 justify-center items-center">
                <Spinner />
            </Box>
        );
    }

    if (tasks.length === 0) {
        return (
            <Box className="flex-1 items-center justify-center p-6">
                <Text className="text-typography-600">No tasks assigned to you.</Text>
            </Box>
        );
    }

    return (
        <ScrollView className="flex-1 bg-background-0" contentContainerStyle={{ padding: 12, paddingBottom: 40 }}>
            {groups.map(group => (
                <VStack key={group.project.id} space="xs" className="mb-5">
                    <HStack className="items-center px-1 mb-1" space="sm">
                        {group.project.tint ? (
                            <Box
                                style={{ backgroundColor: group.project.tint }}
                                className="w-2.5 h-2.5 rounded-sm"
                            />
                        ) : null}
                        <Heading size="sm" numberOfLines={1} className="flex-1 text-typography-800">
                            {group.project.title}
                        </Heading>
                        <Text size="xs" className="text-typography-500">
                            {group.tasks.length}
                        </Text>
                    </HStack>
                    {group.tasks.map(task => (
                        <TaskCard
                            key={task.id}
                            task={task}
                            onPress={t =>
                                router.push(`/(modals)/task/${t.id}` as never)
                            }
                        />
                    ))}
                </VStack>
            ))}
        </ScrollView>
    );
}

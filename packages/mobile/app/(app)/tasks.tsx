// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ScrollView } from "react-native";
import type { TreeNode } from "@stacks/types";
import { PRIORITY, RECORDTYPE } from "@stacks/types";

import { Box } from "@/components/ui/box";
import { Divider } from "@/components/ui/divider";
import { HStack } from "@/components/ui/hstack";
import { Input, InputField, InputSlot } from "@/components/ui/input";
import { Pressable } from "@/components/ui/pressable";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

import { fetchDocuments, fetchTasks, type TaskLoadParams } from "../../src/api/endpoints";
import { Icon } from "../../src/components/Icon/Icon";
import { useAuth } from "../../src/state/AuthContext";
import { TaskCard } from "../../src/widgets";

type StatusFilter = "all" | "open" | "done";
const PRIORITY_OPTIONS: { value: PRIORITY | null; label: string }[] = [
    { value: null, label: "Any" },
    { value: PRIORITY.NONE, label: "None" },
    { value: PRIORITY.LOW, label: "Low" },
    { value: PRIORITY.MEDIUM, label: "Med" },
    { value: PRIORITY.HIGH, label: "High" },
    { value: PRIORITY.CRITICAL, label: "Crit" },
];

function useDebouncedValue<T>(value: T, delay: number): T {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
    return debounced;
}

function Chip({
    label,
    active,
    onPress,
}: {
    label: string;
    active: boolean;
    onPress: () => void;
}) {
    return (
        <Pressable
            onPress={onPress}
            className={`px-3 py-1.5 rounded-full border ${
                active ? "bg-primary-600 border-primary-600" : "bg-background-0 border-outline-200"
            }`}
        >
            <Text size="sm" className={active ? "text-white" : "text-typography-700"}>
                {label}
            </Text>
        </Pressable>
    );
}

export default function TasksScreen() {
    const router = useRouter();
    const { userId } = useAuth();

    const [query, setQuery] = useState("");
    const debouncedQuery = useDebouncedValue(query, 350);
    const [status, setStatus] = useState<StatusFilter>("open");
    const [project, setProject] = useState<string | null>(null);
    const [meOnly, setMeOnly] = useState(false);
    const [priority, setPriority] = useState<PRIORITY | null>(null);

    const { data: documents } = useQuery({
        queryKey: ["documents"],
        queryFn: fetchDocuments,
    });
    const projects = useMemo(
        () => (documents?.documents ?? []).filter(d => d.type === RECORDTYPE.PROJECT),
        [documents]
    );

    const params = useMemo<TaskLoadParams>(() => {
        const p: TaskLoadParams = {
            ...(debouncedQuery.trim() ? { query: debouncedQuery.trim() } : {}),
            ...(status === "open" ? { open: true } : {}),
            ...(status === "done" ? { completed: true } : {}),
            ...(project ? { project } : {}),
            ...(meOnly && userId ? { assignees: [userId] } : {}),
        };
        return p;
    }, [debouncedQuery, status, project, meOnly, userId]);

    const { data: tasks, isLoading } = useQuery({
        queryKey: ["tasks", "global", params],
        queryFn: () => fetchTasks(params),
    });

    const filtered = useMemo(() => {
        if (!priority) return tasks ?? [];
        return (tasks ?? []).filter(t => t.priority === priority);
    }, [tasks, priority]);

    const selectedProject = projects.find(p => p.id === project);

    return (
        <Box className="flex-1 bg-background-0">
            <VStack className="px-3 pt-2" space="sm">
                <Input variant="rounded" size="sm">
                    <InputSlot className="pl-3">
                        <Icon icon="search" size={16} color="#64748b" />
                    </InputSlot>
                    <InputField
                        placeholder="Search tasks"
                        value={query}
                        onChangeText={setQuery}
                        autoCapitalize="none"
                    />
                </Input>

                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <HStack space="xs">
                        <Chip label="Open" active={status === "open"} onPress={() => setStatus("open")} />
                        <Chip label="Done" active={status === "done"} onPress={() => setStatus("done")} />
                        <Chip label="All" active={status === "all"} onPress={() => setStatus("all")} />
                        <Divider className="mx-1" />
                        {PRIORITY_OPTIONS.map(o => (
                            <Chip
                                key={o.label}
                                label={o.label}
                                active={priority === o.value}
                                onPress={() => setPriority(o.value)}
                            />
                        ))}
                    </HStack>
                </ScrollView>

                <HStack space="sm" className="items-center justify-between">
                    <Pressable
                        onPress={() => setProject(null)}
                        className="flex-row items-center flex-1 border border-outline-200 rounded-md px-3 py-2"
                    >
                        <Icon icon="folder" size={16} color="#64748b" />
                        <Text size="sm" numberOfLines={1} className="ml-2 text-typography-800 flex-1">
                            {selectedProject ? selectedProject.title : "All projects"}
                        </Text>
                        {project ? <Icon icon="x-close" size={14} color="#64748b" /> : null}
                    </Pressable>
                    <HStack space="sm" className="items-center">
                        <Text size="sm" className="text-typography-700">
                            Mine
                        </Text>
                        <Switch value={meOnly} onValueChange={setMeOnly} />
                    </HStack>
                </HStack>

                {projects.length > 0 && !project ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <HStack space="xs">
                            {projects.map(p => (
                                <Chip
                                    key={p.id}
                                    label={p.title}
                                    active={project === p.id}
                                    onPress={() => setProject(p.id)}
                                />
                            ))}
                        </HStack>
                    </ScrollView>
                ) : null}
            </VStack>

            <Divider className="mt-3" />

            {isLoading ? (
                <Box className="flex-1 justify-center items-center">
                    <Spinner />
                </Box>
            ) : filtered.length === 0 ? (
                <Box className="flex-1 items-center justify-center p-6">
                    <Text className="text-typography-600">No tasks match your filters.</Text>
                </Box>
            ) : (
                <ScrollView className="flex-1" contentContainerStyle={{ padding: 12, paddingBottom: 40 }}>
                    {filtered.map(task => (
                        <TaskCard
                            key={task.id}
                            task={task}
                            onPress={t => router.push(`/(modals)/task/${t.id}` as never)}
                        />
                    ))}
                </ScrollView>
            )}
        </Box>
    );
}

// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { useQuery } from "@tanstack/react-query";
import type { IActivity } from "@stacks/types";
import { ACTIVITYTYPE } from "@stacks/types";

import { Box } from "@/components/ui/box";
import { Divider } from "@/components/ui/divider";
import { HStack } from "@/components/ui/hstack";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

import { fetchActivities } from "../../api/endpoints";
import { findPerson, usePeople } from "../hooks";

function formatTime(iso: Date | string): string {
    const d = iso instanceof Date ? iso : new Date(iso);
    return d.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function ActivityRow({ activity, name }: { activity: IActivity; name?: string }) {
    const isLog = activity.type === ACTIVITYTYPE.LOG;
    return (
        <HStack space="sm" className="items-start px-1 py-2">
            <Box className="w-1.5 h-1.5 mt-2 rounded-full bg-outline-300" />
            <VStack className="flex-1" space="xs">
                <HStack space="sm" className="items-center justify-between">
                    <Text size="xs" className="text-typography-500">
                        {name ?? "Someone"}
                    </Text>
                    <Text size="xs" className="text-typography-400">
                        {formatTime(activity.created)}
                    </Text>
                </HStack>
                {isLog ? (
                    <Text size="sm" className="text-typography-700">
                        {activity.content}
                        {activity.change ? (
                            <Text size="sm" className="text-typography-500">
                                {" "}
                                · {activity.change.field}: {String(activity.change.before ?? "—")} →{" "}
                                {String(activity.change.after ?? "—")}
                            </Text>
                        ) : null}
                    </Text>
                ) : (
                    <Text size="sm" className="text-typography-800">
                        {activity.content}
                    </Text>
                )}
            </VStack>
        </HStack>
    );
}

/**
 * Read-only activity timeline for a task. Mirrors the web task activity feed
 * (comments + change logs) at L1 detail — no comment posting yet.
 */
export function TaskActivity({ taskId }: { taskId: string }) {
    const { data: activities, isLoading } = useQuery({
        queryKey: ["activities", taskId],
        queryFn: () => fetchActivities(taskId),
    });

    const { data: people } = usePeople();

    if (isLoading) {
        return <Spinner className="my-3" />;
    }

    if (!activities || activities.length === 0) {
        return <Text className="text-typography-500 py-1">No activity yet.</Text>;
    }

    return (
        <VStack>
            {activities.map((entry, i) => (
                <Box key={entry.id}>
                    {i > 0 ? <Divider /> : null}
                    <ActivityRow
                        activity={entry}
                        name={entry.person ? findPerson(people, entry.person)?.email : undefined}
                    />
                </Box>
            ))}
        </VStack>
    );
}

// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { FlatList } from "react-native";
import type { INotification } from "@stacks/types";
import { NOTIFICATION_RECORD_TYPE } from "@stacks/types";

import { Box } from "@/components/ui/box";
import { Divider } from "@/components/ui/divider";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

import { deleteNotification, fetchNotifications, readNotification } from "../../src/api/endpoints";
import { Icon } from "../../src/components/Icon/Icon";
import { queryClient } from "../../src/state/queryClient";

function formatTime(iso?: string): string {
    if (!iso) return "";
    const d = new Date(iso);
    const now = Date.now();
    const diff = now - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    return d.toLocaleDateString();
}

function notificationPath(n: INotification): string | null {
    if (!n.recordId) return null;
    switch (n.recordType) {
        case NOTIFICATION_RECORD_TYPE.TASK:
            return `/(modals)/task/${n.recordId}`;
        case NOTIFICATION_RECORD_TYPE.PERSON:
            return `/(modals)/people/${n.recordId}`;
        case NOTIFICATION_RECORD_TYPE.NOTEPAD:
        case NOTIFICATION_RECORD_TYPE.PROJECT:
            return `/(app)/document/${n.recordId}`;
        default:
            return null;
    }
}

export default function NotificationsScreen() {
    const router = useRouter();

    const { data: notifications = [], isLoading } = useQuery({
        queryKey: ["notifications"],
        queryFn: fetchNotifications,
    });

    const invalidate = () => queryClient.invalidateQueries({ queryKey: ["notifications"] });

    const markRead = async (n: INotification) => {
        if (n.read) return;
        await readNotification(n.id);
        await invalidate();
    };

    const onPress = async (n: INotification) => {
        await markRead(n);
        const path = notificationPath(n);
        if (path) router.push(path as never);
    };

    const remove = async (n: INotification) => {
        await deleteNotification(n.id);
        await invalidate();
    };

    if (isLoading) {
        return (
            <Box className="flex-1 justify-center items-center">
                <Spinner />
            </Box>
        );
    }

    return (
        <Box className="flex-1 bg-background-0">
            <FlatList
                data={notifications}
                keyExtractor={n => n.id}
                contentContainerStyle={{ paddingBottom: 24 }}
                ItemSeparatorComponent={Divider}
                renderItem={({ item }) => (
                    <HStack className={`items-center ${item.read ? "opacity-60" : ""}`}>
                        <Pressable className="flex-1 py-3 px-3" onPress={() => void onPress(item)}>
                            <HStack space="sm" className="items-start">
                                {!item.read ? (
                                    <Box className="w-2 h-2 mt-1.5 rounded-full bg-primary-600" />
                                ) : null}
                                <VStack className="flex-1" space="xs">
                                    <HStack space="sm" className="items-center justify-between">
                                        <Text
                                            size="sm"
                                            className="font-semibold text-typography-900 flex-1"
                                            numberOfLines={1}
                                        >
                                            {item.subject}
                                        </Text>
                                        <Text size="xs" className="text-typography-500">
                                            {formatTime(item.created as unknown as string)}
                                        </Text>
                                    </HStack>
                                    <Text size="sm" className="text-typography-700" numberOfLines={2}>
                                        {item.message}
                                    </Text>
                                </VStack>
                            </HStack>
                        </Pressable>
                        <Pressable onPress={() => void remove(item)} className="p-3">
                            <Icon icon="x-close" size={16} color="#64748b" />
                        </Pressable>
                    </HStack>
                )}
                ListEmptyComponent={
                    <Text className="p-6 text-center text-typography-500">No notifications.</Text>
                }
            />
        </Box>
    );
}

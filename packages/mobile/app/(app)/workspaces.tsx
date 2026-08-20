// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { useQuery } from "@tanstack/react-query";
import { useMemo, type ReactNode } from "react";
import { ScrollView } from "react-native";

import { Box } from "@/components/ui/box";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

import { fetchPerson } from "../../src/api/endpoints";
import { useRealtime } from "../../src/realtime/RealtimeContext";
import { useAuth } from "../../src/state/AuthContext";

function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <VStack space="xs" className="mb-4">
            <Heading size="xs" className="px-1 text-typography-500">
                {title}
            </Heading>
            {children}
        </VStack>
    );
}

export default function WorkspacesScreen() {
    const { serverUrl, userId, logout } = useAuth();
    const { status } = useRealtime();

    const { data: person, isLoading } = useQuery({
        queryKey: ["person", userId],
        queryFn: () => fetchPerson(userId!),
        enabled: Boolean(userId),
    });

    const fullName = useMemo(() => {
        const first = person?.firstName ?? "";
        const last = person?.lastName ?? "";
        return [first, last].filter(Boolean).join(" ").trim();
    }, [person]);

    const initial = useMemo(() => {
        const base = (person?.firstName ?? person?.lastName ?? person?.email ?? "").trim();
        return base.charAt(0).toUpperCase() || "?";
    }, [person]);

    const connected = status.isConnected;

    return (
        <ScrollView
            className="flex-1 bg-background-0"
            contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
        >
            <Section title="Connection">
                <Box className="bg-background-0 border border-outline-200 rounded-md p-3">
                    <HStack className="items-center justify-between">
                        <Text className="text-typography-800">Status</Text>
                        <Text
                            className="font-semibold"
                            style={{ color: connected ? "#16a34a" : "#dc2626" }}
                        >
                            {connected ? "Connected" : "Disconnected"}
                        </Text>
                    </HStack>
                </Box>
            </Section>

            <Section title="Account">
                <Box className="bg-background-0 border border-outline-200 rounded-md p-3">
                    {isLoading ? (
                        <HStack className="items-center" space="sm">
                            <Spinner size="small" />
                            <Text className="text-typography-600">Loading account…</Text>
                        </HStack>
                    ) : (
                        <HStack className="items-center" space="md">
                            <Box className="h-10 w-10 rounded-full bg-primary-100 items-center justify-center">
                                <Text className="font-semibold text-primary-700">{initial}</Text>
                            </Box>
                            <VStack className="flex-1" space="xs">
                                <Text className="font-semibold text-typography-900" numberOfLines={1}>
                                    {fullName || "Unknown user"}
                                </Text>
                                <Text className="text-typography-500" numberOfLines={1}>
                                    {person?.email ?? ""}
                                </Text>
                            </VStack>
                        </HStack>
                    )}
                </Box>
            </Section>

            <Section title="Server">
                <Box className="bg-background-0 border border-outline-200 rounded-md p-3">
                    <Text className="text-typography-800" numberOfLines={1}>
                        {serverUrl ?? "Not configured"}
                    </Text>
                </Box>
            </Section>

            <Pressable
                onPress={() => {
                    void logout();
                }}
                className="bg-error-500 active:bg-error-600 rounded-md py-3 items-center justify-center"
            >
                <Text className="font-semibold text-white">Log out</Text>
            </Pressable>
        </ScrollView>
    );
}
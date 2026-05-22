// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { FlatList } from "react-native";

import type { ICompany, IPerson } from "@stacks/types";

import { Box } from "@/components/ui/box";
import { Divider } from "@/components/ui/divider";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

import { fetchCompanies, fetchPeople } from "../../src/api/endpoints";

type PeopleTab = "people" | "companies";

function displayName(p: IPerson): string {
    const parts = [p.firstName, p.lastName].filter(Boolean).join(" ").trim();
    return parts || p.nickname || p.email;
}

function initials(p: IPerson): string {
    const first = (p.firstName || p.nickname || p.email || "?").trim().charAt(0);
    const last = (p.lastName || "").trim().charAt(0);
    return (first + last).toUpperCase() || "?";
}

function companySubtitle(c: ICompany): string {
    const parts = [c.industry, c.city].filter(Boolean);
    return parts.join(" · ") || c.email || "";
}

function TabBar({ active, onChange }: { active: PeopleTab; onChange: (t: PeopleTab) => void }) {
    const pill = (tab: PeopleTab, label: string) => {
        const selected = active === tab;
        return (
            <Pressable
                onPress={() => onChange(tab)}
                className={`flex-1 py-2 rounded-md items-center ${selected ? "bg-background-0 shadow-sm" : ""}`}
            >
                <Text
                    size="sm"
                    className={`font-medium ${selected ? "text-typography-900" : "text-typography-500"}`}
                >
                    {label}
                </Text>
            </Pressable>
        );
    };

    return (
        <HStack className="mx-3 mt-2 mb-2 p-1 rounded-xl bg-background-100" space="xs">
            {pill("people", "People")}
            {pill("companies", "Companies")}
        </HStack>
    );
}

export default function PeopleScreen() {
    const router = useRouter();
    const [tab, setTab] = useState<PeopleTab>("people");

    const { data: people = [], isLoading: peopleLoading } = useQuery({
        queryKey: ["people"],
        queryFn: fetchPeople,
        enabled: tab === "people",
    });

    const { data: companies = [], isLoading: companiesLoading } = useQuery({
        queryKey: ["companies"],
        queryFn: fetchCompanies,
        enabled: tab === "companies",
    });

    const listLoading = tab === "people" ? peopleLoading : companiesLoading;

    return (
        <Box className="flex-1 bg-background-0">
            <TabBar active={tab} onChange={setTab} />
            {listLoading ? (
                <Box className="flex-1 justify-center items-center">
                    <Spinner />
                </Box>
            ) : tab === "people" ? (
                <FlatList
                    data={people}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{ paddingBottom: 24 }}
                    ItemSeparatorComponent={Divider}
                    renderItem={({ item }) => (
                        <Pressable
                            onPress={() => router.push(`/(modals)/people/${item.id}` as never)}
                            className="active:bg-background-100"
                        >
                            <HStack className="items-center px-3 py-2.5" space="md">
                                <Box className="w-10 h-10 rounded-full bg-background-200 items-center justify-center">
                                    <Text
                                        size="sm"
                                        className="font-bold text-typography-800"
                                    >
                                        {initials(item)}
                                    </Text>
                                </Box>
                                <VStack className="flex-1">
                                    <Text size="md" className="text-typography-900">
                                        {displayName(item)}
                                    </Text>
                                    <Text size="xs" className="text-typography-500">
                                        {item.jobTitle || item.email}
                                    </Text>
                                </VStack>
                                <Text size="lg" className="text-typography-400">
                                    ›
                                </Text>
                            </HStack>
                        </Pressable>
                    )}
                    ListEmptyComponent={
                        <Text className="p-4 text-typography-500">
                            No people
                        </Text>
                    }
                />
            ) : (
                <FlatList
                    data={companies}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{ paddingBottom: 24 }}
                    ItemSeparatorComponent={Divider}
                    renderItem={({ item }) => {
                        const sub = companySubtitle(item);
                        return (
                            <Pressable
                                onPress={() => router.push(`/(modals)/company/${item.id}` as never)}
                                className="active:bg-background-100"
                            >
                                <HStack className="items-center px-3 py-2.5" space="md">
                                    <Box className="w-10 h-10 rounded-md bg-background-200 items-center justify-center overflow-hidden">
                                        <Text size="xs" className="font-bold text-typography-700">
                                            {(item.title || "?").trim().charAt(0).toUpperCase()}
                                        </Text>
                                    </Box>
                                    <VStack className="flex-1">
                                        <Text size="md" className="text-typography-900">
                                            {item.title}
                                        </Text>
                                        {sub ? (
                                            <Text size="xs" className="text-typography-500">
                                                {sub}
                                            </Text>
                                        ) : null}
                                    </VStack>
                                    <Text size="lg" className="text-typography-400">
                                        ›
                                    </Text>
                                </HStack>
                            </Pressable>
                        );
                    }}
                    ListEmptyComponent={
                        <Text className="p-4 text-typography-500">
                            No companies
                        </Text>
                    }
                />
            )}
        </Box>
    );
}

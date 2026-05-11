// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import type { DrawerContentComponentProps } from "@react-navigation/drawer";
import { RECORDTYPE, type ISearchResult } from "@stacks/types";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Box } from "@/components/ui/box";
import { Divider } from "@/components/ui/divider";
import { HStack } from "@/components/ui/hstack";
import { Input, InputField, InputSlot } from "@/components/ui/input";
import { Pressable } from "@/components/ui/pressable";
import { ScrollView } from "@/components/ui/scroll-view";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";

import { fetchDocuments, fetchPerson, search } from "../api/endpoints";
import { useAuth } from "../state/AuthContext";
import { queryClient } from "../state/queryClient";
import { buildDocumentTree, DocumentTree, type DocTreeNode } from "./DocumentTree";
import { Icon, type IconName } from "./Icon/Icon";
import { NewDocumentModal } from "./NewDocumentModal";
import { UserAvatar } from "./UserAvatar";

function useDebouncedValue<T>(value: T, delay: number): T {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return debounced;
}

/** Only these record types are navigable/creatable from the mobile drawer. */
const VISIBLE_TYPES = new Set<RECORDTYPE>([RECORDTYPE.FOLDER, RECORDTYPE.PROJECT, RECORDTYPE.NOTEPAD]);

function GeneralRow({
    icon,
    title,
    onPress,
}: {
    icon: IconName;
    title: string;
    onPress: () => void;
}) {
    return (
        <HStack className="items-center pr-2 border-b border-outline-100">
            <Pressable
                onPress={onPress}
                style={{ paddingLeft: 8 }}
                className="flex-1 py-2.5 active:bg-background-100"
            >
                <HStack space="sm" className="items-center">
                    <Box className="w-5 items-center">
                        <Icon icon={icon} size={18} color="#64748b" />
                    </Box>
                    <Text
                        size="md"
                        numberOfLines={1}
                        className="flex-1 text-typography-900"
                    >
                        {title}
                    </Text>
                </HStack>
            </Pressable>
        </HStack>
    );
}

function IconButton({ icon, onPress }: { icon: IconName; onPress: () => void }) {
    return (
        <Pressable
            onPress={onPress}
            style={{ width: 36, height: 36 }}
            className="rounded-full items-center justify-center active:bg-background-100"
        >
            <Icon icon={icon} size={20} color="#475569" />
        </Pressable>
    );
}

export function DrawerContent(props: DrawerContentComponentProps) {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { userId } = useAuth();
    const [searchText, setSearchText] = useState("");
    const debouncedSearch = useDebouncedValue(searchText, 350);
    const [newDocOpen, setNewDocOpen] = useState(false);
    /** When set, NewDocumentModal creates the document inside this folder. */
    const [newDocParent, setNewDocParent] = useState<{ id: string; title: string } | null>(null);
    const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

    const { data: documentsData, isLoading: docsLoading } = useQuery({
        queryKey: ["documents"],
        queryFn: fetchDocuments,
    });

    const { data: me } = useQuery({
        queryKey: ["person", userId],
        queryFn: () => fetchPerson(userId!),
        enabled: !!userId,
    });

    const { data: searchResults, isFetching: searchBusy } = useQuery({
        queryKey: ["search", debouncedSearch],
        queryFn: () => search(debouncedSearch),
        enabled: debouncedSearch.trim().length >= 2,
    });

    const tree = useMemo<DocTreeNode[]>(() => {
        const docs = (documentsData?.documents ?? []).filter(d => VISIBLE_TYPES.has(d.type));
        return buildDocumentTree(docs);
    }, [documentsData]);

    const toggleExpanded = useCallback((id: string) => {
        setExpanded(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const go = useCallback(
        (path: string) => {
            props.navigation.closeDrawer();
            router.push(path as never);
        },
        [props.navigation, router]
    );

    const onSearchResultPress = useCallback(
        (r: ISearchResult) => {
            props.navigation.closeDrawer();
            if (r.type === RECORDTYPE.TASK) {
                router.push(`/(modals)/task/${r.id}` as never);
            } else {
                router.push(`/(app)/document/${r.id}` as never);
            }
        },
        [props.navigation, router]
    );

    const onDocPress = useCallback(
        (node: DocTreeNode) => {
            props.navigation.closeDrawer();
            router.push(`/(app)/document/${node.id}` as never);
        },
        [props.navigation, router]
    );

    const onAddChild = useCallback((node: DocTreeNode) => {
        setNewDocParent({ id: node.id, title: node.title });
        setNewDocOpen(true);
        setExpanded(prev => {
            if (prev.has(node.id)) return prev;
            const next = new Set(prev);
            next.add(node.id);
            return next;
        });
    }, []);

    const displayName = me ? [me.firstName, me.lastName].filter(Boolean).join(" ") || me.email : "…";
    const userInitials = (() => {
        const first = me?.firstName?.trim()?.[0] ?? "";
        const last = me?.lastName?.trim()?.[0] ?? "";
        const joined = `${first}${last}`.toUpperCase();
        if (joined) return joined;
        return (me?.email?.[0] ?? "?").toUpperCase();
    })();

    return (
        <Box
            style={{ paddingTop: insets.top }}
            className="flex-1 bg-background-0"
        >
            <Box className="px-3 mb-3">
                <Input variant="rounded" size="sm">
                    <InputSlot className="pl-3">
                        <Icon icon="search" size={16} color="#64748b" />
                    </InputSlot>
                    <InputField
                        placeholder="Search"
                        value={searchText}
                        onChangeText={setSearchText}
                        autoCapitalize="none"
                    />
                </Input>
                {searchBusy ? <Spinner className="mt-2" /> : null}
                {debouncedSearch.trim().length >= 2 && searchResults?.length === 0 ? (
                    <Text className="mt-2 text-typography-500">
                        No results
                    </Text>
                ) : null}
                {(searchResults ?? []).slice(0, 20).map(r => (
                    <Pressable
                        key={`${r.type}-${r.id}`}
                        onPress={() => onSearchResultPress(r)}
                        className="py-2 border-b border-outline-100"
                    >
                        <Text size="sm">{r.title}</Text>
                        <Text size="xs" className="text-typography-500">
                            {r.type} · {r.parentTitle}
                        </Text>
                    </Pressable>
                ))}
            </Box>

            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }}>
                <Text className="px-3 font-semibold mb-1">
                    General
                </Text>
                <Box className="mb-2">
                    <GeneralRow icon="users" title="People" onPress={() => go("/(app)/people")} />
                    <GeneralRow icon="inbox-01" title="Inbox" onPress={() => go("/(app)/inbox")} />
                    <GeneralRow
                        icon="check-circle"
                        title="My tasks"
                        onPress={() => go("/(app)/my-tasks")}
                    />
                </Box>

                <Text className="px-3 font-semibold mb-1 mt-4">
                    Documents
                </Text>
                {docsLoading ? <Spinner className="mt-2" /> : null}
                <DocumentTree
                    nodes={tree}
                    expanded={expanded}
                    onToggle={toggleExpanded}
                    onPress={onDocPress}
                    onAddChild={onAddChild}
                />
                {!docsLoading && tree.length === 0 ? (
                    <Text className="px-3 py-2 text-typography-500">
                        No documents yet.
                    </Text>
                ) : null}
            </ScrollView>

            <Divider />

            <HStack
                space="sm"
                style={{ paddingBottom: insets.bottom + 12 }}
                className="px-3 pt-3 items-center"
            >
                <HStack space="sm" className="flex-1 items-center">
                    {me ? (
                        <UserAvatar id={me.id} avatar={me.avatar} initials={userInitials} />
                    ) : (
                        <UserAvatar id="pending" initials="…" />
                    )}
                    <Text
                        size="sm"
                        numberOfLines={1}
                        className="flex-1 font-semibold text-typography-900"
                    >
                        {displayName}
                    </Text>
                </HStack>
                <HStack space="xs">
                    <IconButton
                        icon="plus"
                        onPress={() => {
                            setNewDocParent(null);
                            setNewDocOpen(true);
                        }}
                    />
                    <IconButton icon="settings-02" onPress={() => go("/(app)/preferences")} />
                </HStack>
            </HStack>

            <NewDocumentModal
                visible={newDocOpen}
                parentId={newDocParent?.id ?? null}
                parentTitle={newDocParent?.title ?? null}
                onClose={() => {
                    setNewDocOpen(false);
                    setNewDocParent(null);
                }}
                onCreated={() => void queryClient.invalidateQueries({ queryKey: ["documents"] })}
            />
        </Box>
    );
}

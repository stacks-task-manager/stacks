// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, ScrollView } from "react-native";

import type { ICompany, IPerson, IRole, IRoleAccess, ITimeLog } from "@stacks/types";
import { TIMELOG_STATUS, ROLE_ACTIONS, ROLE_SECTIONS } from "@stacks/types";

import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Input, InputField } from "@/components/ui/input";
import {
    Modal,
    ModalBackdrop,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
} from "@/components/ui/modal";
import { Pressable } from "@/components/ui/pressable";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

import {
    createRole,
    fetchCompanies,
    fetchPeople,
    fetchRoles,
    fetchTimelogs,
    updateRole,
} from "../../src/api/endpoints";
import { Icon, type IconName } from "../../src/components/Icon/Icon";
import { useAuth } from "../../src/state/AuthContext";
import { queryClient } from "../../src/state/queryClient";
import { findPerson, usePeople } from "../../src/widgets";

type PeopleTab = "people" | "companies" | "roles" | "approvals" | "timesheet";

const TAB_META: { tab: PeopleTab; label: string; icon: IconName }[] = [
    { tab: "people", label: "People", icon: "users" },
    { tab: "companies", label: "Companies", icon: "building-05" },
    { tab: "roles", label: "Roles", icon: "key-01" },
    { tab: "approvals", label: "Approvals", icon: "shield-tick" },
    { tab: "timesheet", label: "Timesheet", icon: "clock" },
];

const SECTIONS = Object.values(ROLE_SECTIONS);

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

/** Duration stored in seconds; render as h:mm. */
function formatDuration(seconds: number): string {
    const total = Math.max(0, Math.round(seconds));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    return `${h}h ${m}m`;
}

function emptyAccess(): IRoleAccess {
    const access: IRoleAccess = {};
    for (const section of SECTIONS) {
        access[section] = {};
    }
    return access;
}

/** Read-only summary of a role's access map: section count + names. */
function accessSummary(role: IRole): string {
    const sections = Object.keys(role.access ?? {}).filter(
        s => (role.access?.[s as ROLE_SECTIONS]?.read ?? false) === true
    );
    if (sections.length === 0) return "No access";
    return `${sections.length} sections · ${sections.join(", ")}`;
}

function TabBar({ active, onChange }: { active: PeopleTab; onChange: (t: PeopleTab) => void }) {
    return (
        <HStack className="mx-3 mt-2 mb-2 p-1 rounded-xl bg-background-100" space="xs">
            {TAB_META.map(({ tab, label, icon }) => {
                const selected = active === tab;
                return (
                    <Pressable
                        key={tab}
                        onPress={() => onChange(tab)}
                        accessibilityRole="tab"
                        accessibilityLabel={label}
                        accessibilityState={{ selected }}
                        className={`flex-1 py-2 rounded-md items-center justify-center ${
                            selected ? "bg-background-0 shadow-sm" : ""
                        }`}
                    >
                        <Icon icon={icon} size={18} color={selected ? "#334155" : "#94a3b8"} />
                    </Pressable>
                );
            })}
        </HStack>
    );
}

function PeopleTabContent({ people, loading }: { people: IPerson[]; loading: boolean }) {
    const router = useRouter();
    if (loading) {
        return (
            <Box className="flex-1 justify-center items-center">
                <Spinner />
            </Box>
        );
    }
    return (
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
                            <Text size="sm" className="font-bold text-typography-800">
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
            ListEmptyComponent={<Text className="p-4 text-typography-500">No people</Text>}
        />
    );
}

function CompaniesTabContent({ companies, loading }: { companies: ICompany[]; loading: boolean }) {
    const router = useRouter();
    if (loading) {
        return (
            <Box className="flex-1 justify-center items-center">
                <Spinner />
            </Box>
        );
    }
    return (
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
            ListEmptyComponent={<Text className="p-4 text-typography-500">No companies</Text>}
        />
    );
}

interface RoleDraft {
    id?: string;
    title: string;
    description: string;
    access: IRoleAccess;
}

function RolesTabContent() {
    const { data: roles = [], isLoading } = useQuery<IRole[]>({
        queryKey: ["roles"],
        queryFn: fetchRoles,
    });
    const [draft, setDraft] = useState<RoleDraft | null>(null);
    const [modalOpen, setModalOpen] = useState(false);

    const openCreate = () => {
        setDraft({ title: "", description: "", access: emptyAccess() });
        setModalOpen(true);
    };

    const openEdit = (role: IRole) => {
        setDraft({
            id: role.id,
            title: role.title,
            description: role.description ?? "",
            access: { ...(role.access ?? emptyAccess()) },
        });
        setModalOpen(true);
    };

    return (
        <Box className="flex-1 bg-background-0">
            <HStack className="items-center justify-between px-4 pt-3 pb-2">
                <Heading size="sm" className="text-typography-700">
                    Roles
                </Heading>
                <Button size="xs" onPress={openCreate}>
                    <ButtonText>+ New role</ButtonText>
                </Button>
            </HStack>
            <ScrollView className="flex-1" contentContainerStyle={{ padding: 12, paddingBottom: 40 }}>
                {isLoading ? (
                    <Box className="flex-1 justify-center items-center py-16">
                        <Spinner />
                    </Box>
                ) : roles.length === 0 ? (
                    <Box className="items-center justify-center py-16">
                        <Text className="text-typography-600">No roles.</Text>
                    </Box>
                ) : (
                    <VStack space="xs">
                        {roles.map(role => (
                            <Pressable
                                key={role.id}
                                onPress={() => openEdit(role)}
                                className="bg-background-0 border border-outline-200 rounded-md p-3"
                            >
                                <HStack className="items-center justify-between">
                                    <VStack className="flex-1 mr-2" space="xs">
                                        <Text size="sm" className="font-semibold text-typography-900">
                                            {role.title}
                                        </Text>
                                        {role.description ? (
                                            <Text size="sm" className="text-typography-700" numberOfLines={2}>
                                                {role.description}
                                            </Text>
                                        ) : null}
                                        <Text size="xs" className="text-typography-500">
                                            {accessSummary(role)}
                                        </Text>
                                    </VStack>
                                    <Text size="xs" className="text-primary-600">
                                        Edit
                                    </Text>
                                </HStack>
                            </Pressable>
                        ))}
                    </VStack>
                )}
            </ScrollView>

            {draft && (
                <RoleEditorModal
                    open={modalOpen}
                    draft={draft}
                    onChange={setDraft}
                    onClose={() => setModalOpen(false)}
                />
            )}
        </Box>
    );
}

function RoleEditorModal({
    open,
    draft,
    onChange,
    onClose,
}: {
    open: boolean;
    draft: RoleDraft;
    onChange: (d: RoleDraft) => void;
    onClose: () => void;
}) {
    const qc = queryClient;
    const save = useMutation({
        mutationFn: async () => {
            const payload = {
                title: draft.title.trim(),
                description: draft.description.trim() || undefined,
                access: draft.access,
            };
            if (draft.id) {
                await updateRole(draft.id, payload);
            } else {
                await createRole(payload);
            }
        },
        onSuccess: () => {
            onClose();
            qc.invalidateQueries({ queryKey: ["roles"] });
        },
    });

    const setSection = (section: ROLE_SECTIONS, action: ROLE_ACTIONS, value: boolean) => {
        const next: IRoleAccess = { ...draft.access };
        const current = { ...(next[section] ?? {}) };
        current[action] = value;
        // Reading a section grants implicit read of everything underneath; a
        // role with read=false can't write, mirroring the web editor.
        if (action === ROLE_ACTIONS.READ && !value) {
            current[ROLE_ACTIONS.WRITE] = false;
        }
        next[section] = current;
        onChange({ ...draft, access: next });
    };

    const toggle = (section: ROLE_SECTIONS, action: ROLE_ACTIONS) => {
        const current = draft.access[section]?.[action] ?? false;
        setSection(section, action, !current);
    };

    return (
        <Modal isOpen={open} onClose={onClose} size="lg">
            <ModalBackdrop />
            <ModalContent>
                <ModalHeader>
                    <Heading size="sm" className="text-typography-800">
                        {draft.id ? "Edit role" : "New role"}
                    </Heading>
                </ModalHeader>
                <ModalBody>
                    <VStack space="md">
                        <VStack space="xs">
                            <Text size="sm" className="text-typography-700">
                                Role title
                            </Text>
                            <Input size="md">
                                <InputField
                                    value={draft.title}
                                    onChangeText={t => onChange({ ...draft, title: t })}
                                    placeholder="A role title"
                                />
                            </Input>
                        </VStack>
                        <VStack space="xs">
                            <Text size="sm" className="text-typography-700">
                                Description
                            </Text>
                            <Input size="md">
                                <InputField
                                    value={draft.description}
                                    onChangeText={d => onChange({ ...draft, description: d })}
                                    placeholder="A role description"
                                />
                            </Input>
                        </VStack>

                        <VStack space="xs">
                            <Text size="sm" className="font-semibold text-typography-800">
                                Access rights
                            </Text>
                            {SECTIONS.map(section => {
                                const actions = draft.access[section] ?? {};
                                return (
                                    <HStack
                                        key={section}
                                        className="items-center justify-between py-1.5 border-b border-outline-100"
                                        space="sm"
                                    >
                                        <Text size="sm" className="flex-1 text-typography-800 capitalize">
                                            {section.replace(/_/g, " ")}
                                        </Text>
                                        <HStack className="items-center" space="sm">
                                            <HStack className="items-center" space="xs">
                                                <Text size="xs" className="text-typography-600">
                                                    Read
                                                </Text>
                                                <Switch
                                                    size="sm"
                                                    value={actions.read ?? false}
                                                    onValueChange={v =>
                                                        setSection(section, ROLE_ACTIONS.READ, v)
                                                    }
                                                />
                                            </HStack>
                                            <HStack className="items-center" space="xs">
                                                <Text size="xs" className="text-typography-600">
                                                    Write
                                                </Text>
                                                <Switch
                                                    size="sm"
                                                    value={actions.write ?? false}
                                                    disabled={!actions.read}
                                                    onValueChange={v =>
                                                        setSection(section, ROLE_ACTIONS.WRITE, v)
                                                    }
                                                />
                                            </HStack>
                                        </HStack>
                                    </HStack>
                                );
                            })}
                        </VStack>
                    </VStack>
                </ModalBody>
                <ModalFooter>
                    <Button size="sm" variant="outline" onPress={onClose}>
                        <ButtonText>Cancel</ButtonText>
                    </Button>
                    <Button
                        size="sm"
                        onPress={() => save.mutate()}
                        isDisabled={!draft.title.trim() || save.isPending}
                    >
                        <ButtonText>{save.isPending ? "Saving…" : "Save"}</ButtonText>
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

function ApprovalsTabContent() {
    const { data: logs = [], isLoading } = useQuery<ITimeLog[]>({
        queryKey: ["approvals"],
        queryFn: () => fetchTimelogs({ status: TIMELOG_STATUS.PENDING }),
    });

    const { data: people } = usePeople();

    if (isLoading) {
        return (
            <Box className="flex-1 justify-center items-center">
                <Spinner />
            </Box>
        );
    }

    if (logs.length === 0) {
        return (
            <Box className="flex-1 items-center justify-center p-6">
                <Text className="text-typography-600">No pending approvals.</Text>
            </Box>
        );
    }

    return (
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 12, paddingBottom: 40 }}>
            <VStack space="xs" className="mb-5">
                <Heading size="sm" className="px-1 mb-1 text-typography-700">
                    Pending approvals
                </Heading>
                {logs.map(log => {
                    const person = findPerson(people, log.person);
                    const personLabel = person ? `${person.email}` : log.person;
                    return (
                        <Box
                            key={log.id}
                            className="bg-background-0 border border-outline-200 rounded-md p-3"
                        >
                            <HStack className="items-start justify-between">
                                <VStack className="flex-1 mr-2" space="xs">
                                    <Text
                                        size="sm"
                                        className="font-semibold text-typography-900"
                                        numberOfLines={1}
                                    >
                                        {log.taskInfo?.title ?? log.task}
                                    </Text>
                                    <Text size="xs" className="text-typography-500" numberOfLines={1}>
                                        {log.documentInfo?.title ?? log.project}
                                    </Text>
                                    {log.description ? (
                                        <Text size="sm" className="text-typography-700" numberOfLines={2}>
                                            {log.description}
                                        </Text>
                                    ) : null}
                                    <Text size="xs" className="text-typography-500" numberOfLines={1}>
                                        {personLabel}
                                    </Text>
                                </VStack>
                                <Text size="sm" className="font-semibold text-typography-900">
                                    {formatDuration(log.duration)}
                                </Text>
                            </HStack>
                        </Box>
                    );
                })}
            </VStack>
        </ScrollView>
    );
}

function formatDate(iso?: string | Date): string {
    if (!iso) return "";
    const d = iso instanceof Date ? iso : new Date(iso as string);
    return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function TimesheetTabContent() {
    const { userId } = useAuth();

    const { data: logs = [], isLoading } = useQuery<ITimeLog[]>({
        queryKey: ["timesheet", userId],
        queryFn: () => fetchTimelogs({}),
        enabled: Boolean(userId),
    });

    const groups = useMemo(() => {
        const mine = (logs ?? []).filter(log => log.person === userId);
        const byDate = new Map<string, ITimeLog[]>();
        for (const log of mine) {
            const key = log.date ? new Date(log.date).toDateString() : "Other";
            const list = byDate.get(key) ?? [];
            list.push(log);
            byDate.set(key, list);
        }
        return Array.from(byDate.entries()).map(([date, dayLogs]) => {
            const total = dayLogs.reduce((sum, l) => sum + (l.duration ?? 0), 0);
            return { date, dayLogs, total };
        });
    }, [logs, userId]);

    if (isLoading) {
        return (
            <Box className="flex-1 justify-center items-center">
                <Spinner />
            </Box>
        );
    }

    if (groups.length === 0) {
        return (
            <Box className="flex-1 items-center justify-center p-6">
                <Text className="text-typography-600">No logged time.</Text>
            </Box>
        );
    }

    return (
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 12, paddingBottom: 40 }}>
            {groups.map(({ date, dayLogs, total }) => (
                <VStack key={date} space="xs" className="mb-5">
                    <HStack className="items-baseline justify-between px-1 mb-1">
                        <Heading size="sm" className="text-typography-700">
                            {formatDate(date)}
                        </Heading>
                        <Text size="xs" className="text-typography-500">
                            {formatDuration(total)}
                        </Text>
                    </HStack>
                    {dayLogs.map(log => (
                        <Box
                            key={log.id}
                            className="bg-background-0 border border-outline-200 rounded-md p-3"
                        >
                            <HStack className="items-start justify-between">
                                <VStack className="flex-1 mr-2" space="xs">
                                    <Text
                                        size="sm"
                                        className="font-semibold text-typography-900"
                                        numberOfLines={1}
                                    >
                                        {log.taskInfo?.title ?? log.task}
                                    </Text>
                                    <Text size="xs" className="text-typography-500" numberOfLines={1}>
                                        {log.documentInfo?.title ?? log.project}
                                    </Text>
                                    {log.description ? (
                                        <Text size="sm" className="text-typography-700" numberOfLines={2}>
                                            {log.description}
                                        </Text>
                                    ) : null}
                                </VStack>
                                <Text size="sm" className="font-semibold text-typography-900">
                                    {formatDuration(log.duration)}
                                </Text>
                            </HStack>
                        </Box>
                    ))}
                </VStack>
            ))}
        </ScrollView>
    );
}

export default function PeopleScreen() {
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
    return (
        <Box className="flex-1 bg-background-0">
            <TabBar active={tab} onChange={setTab} />
            {tab === "people" ? (
                <PeopleTabContent people={people} loading={peopleLoading} />
            ) : tab === "companies" ? (
                <CompaniesTabContent companies={companies} loading={companiesLoading} />
            ) : tab === "roles" ? (
                <RolesTabContent />
            ) : tab === "approvals" ? (
                <ApprovalsTabContent />
            ) : (
                <TimesheetTabContent />
            )}
        </Box>
    );
}

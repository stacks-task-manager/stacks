// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ScrollView } from "react-native";
import {
    IRole,
    IRoleAccess,
    ROLE_ACTIONS,
    ROLE_SECTIONS,
} from "@stacks/types";

import { Box } from "@/components/ui/box";
import { Button } from "@/components/ui/button";
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

import { createRole, fetchRoles, updateRole } from "../../src/api/endpoints";
import { queryClient } from "../../src/state/queryClient";

const SECTIONS = Object.values(ROLE_SECTIONS);

interface RoleDraft {
    id?: string;
    title: string;
    description: string;
    access: IRoleAccess;
}

function emptyAccess(): IRoleAccess {
    const access: IRoleAccess = {};
    for (const section of SECTIONS) {
        access[section] = {};
    }
    return access;
}

export default function RolesScreen() {
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
                    + New role
                </Button>
            </HStack>
            <ScrollView
                className="flex-1"
                contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
            >
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
                                        <Text
                                            size="sm"
                                            className="font-semibold text-typography-900"
                                        >
                                            {role.title}
                                        </Text>
                                        {role.description ? (
                                            <Text
                                                size="sm"
                                                className="text-typography-700"
                                                numberOfLines={2}
                                            >
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
                                        <Text
                                            size="sm"
                                            className="flex-1 text-typography-800 capitalize"
                                        >
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
                        Cancel
                    </Button>
                    <Button
                        size="sm"
                        onPress={() => save.mutate()}
                        isDisabled={!draft.title.trim() || save.isPending}
                    >
                        {save.isPending ? "Saving…" : "Save"}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

/** Read-only summary of a role's access map: section count + names. */
function accessSummary(role: IRole): string {
    const sections = Object.keys(role.access ?? {}).filter(
        s => (role.access?.[s as ROLE_SECTIONS]?.read ?? false) === true
    );
    if (sections.length === 0) return "No access";
    return `${sections.length} sections · ${sections.join(", ")}`;
}

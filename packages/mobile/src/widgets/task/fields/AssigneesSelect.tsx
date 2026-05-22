// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { useMemo, useState } from "react";

import type { IPerson } from "@stacks/types";

import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";

import { usePeople } from "../../hooks";
import { OptionsModal } from "./OptionsModal";

function fullName(p: IPerson): string {
    const parts = [p.firstName, p.lastName].filter(Boolean);
    const name = parts.join(" ").trim();
    return name || p.nickname || p.email || "Unnamed";
}

function initials(p: IPerson): string {
    const first = (p.firstName || p.nickname || p.email || "?").trim().charAt(0);
    const last = (p.lastName || "").trim().charAt(0);
    return (first + last).toUpperCase() || "?";
}

export function AssigneesSelect({
    value,
    onChange,
    disabled,
}: {
    value: string[];
    onChange: (value: string[]) => void;
    disabled?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const { data: people } = usePeople();

    const selected = useMemo(
        () =>
            value
                .map(id => (people ?? []).find(p => p.id === id))
                .filter(Boolean) as IPerson[],
        [people, value]
    );

    const toggle = (id: string) => {
        onChange(value.includes(id) ? value.filter(v => v !== id) : [...value, id]);
    };

    return (
        <>
            <Pressable
                onPress={() => setOpen(true)}
                disabled={disabled}
                className="active:opacity-75"
            >
                <HStack className="items-center flex-wrap" space="xs">
                    {selected.length === 0 ? (
                        <Text size="sm" className="text-typography-400">
                            Unassigned
                        </Text>
                    ) : (
                        selected.map(p => (
                            <HStack
                                key={p.id}
                                className="items-center bg-background-100 rounded-full px-2 py-0.5"
                                space="xs"
                            >
                                <Box
                                    className="rounded-full bg-background-300 items-center justify-center"
                                    style={{ width: 20, height: 20 }}
                                >
                                    <Text
                                        size="2xs"
                                        className="font-bold text-typography-800"
                                    >
                                        {initials(p)}
                                    </Text>
                                </Box>
                                <Text size="xs" className="text-typography-900">
                                    {fullName(p)}
                                </Text>
                            </HStack>
                        ))
                    )}
                </HStack>
            </Pressable>
            <OptionsModal
                visible={open}
                title="Assignees"
                multi
                selectedIds={value}
                options={(people ?? [])
                    .filter(p => p.real)
                    .map(p => ({
                        id: p.id,
                        label: fullName(p),
                        subtitle: p.email,
                    }))}
                onToggle={toggle}
                onClose={() => setOpen(false)}
            />
        </>
    );
}

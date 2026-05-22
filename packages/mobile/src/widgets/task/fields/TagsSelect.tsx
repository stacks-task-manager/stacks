// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { useMemo, useState } from "react";

import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { TAGTYPE } from "@stacks/types";

import { useTags } from "../../hooks";
import { OptionsModal } from "./OptionsModal";

export function TagsSelect({
    value,
    onChange,
    disabled,
}: {
    value: string[];
    onChange: (value: string[]) => void;
    disabled?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const { data: tags } = useTags();

    const tagOptions = useMemo(
        () => (tags ?? []).filter(t => t.type === TAGTYPE.TAG),
        [tags]
    );
    const selected = useMemo(
        () =>
            value
                .map(id => tagOptions.find(t => t.id === id))
                .filter(Boolean) as NonNullable<(typeof tagOptions)[number]>[],
        [tagOptions, value]
    );

    const toggle = (id: string) => {
        onChange(value.includes(id) ? value.filter(v => v !== id) : [...value, id]);
    };

    return (
        <>
            <Pressable
                onPress={() => setOpen(true)}
                disabled={disabled}
                className="py-1 active:opacity-75"
            >
                <HStack space="xs" className="flex-wrap items-center">
                    {selected.length === 0 ? (
                        <Text size="sm" className="text-typography-400">
                            Add tags
                        </Text>
                    ) : (
                        selected.map(tag => (
                            <Box
                                key={tag.id}
                                style={{
                                    backgroundColor: (tag.color || "#888") + "22",
                                    borderColor: tag.color || "#dcdfe4",
                                }}
                                className="px-2.5 py-1 rounded-full border"
                            >
                                <Text size="xs" className="text-typography-900">
                                    {tag.title}
                                </Text>
                            </Box>
                        ))
                    )}
                </HStack>
            </Pressable>
            <OptionsModal
                visible={open}
                title="Tags"
                multi
                selectedIds={value}
                options={tagOptions.map(t => ({ id: t.id, label: t.title, color: t.color }))}
                onToggle={toggle}
                onClose={() => setOpen(false)}
            />
        </>
    );
}

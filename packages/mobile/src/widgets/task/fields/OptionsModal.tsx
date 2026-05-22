// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Box } from "@/components/ui/box";
import { Divider } from "@/components/ui/divider";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { ScrollView } from "@/components/ui/scroll-view";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { Modal as RNModal } from "react-native";

/**
 * A single reusable bottom-sheet style modal used by most task fields
 * (priority, status, stack, tags, assignees, tint, …).
 *
 * `multi` controls behaviour:
 *  - single: tapping a row fires `onSelect(id)` and closes the modal
 *  - multi:  tapping a row fires `onToggle(id)`; the list stays open
 *            until the user taps "Done"
 */
export type OptionItem = {
    id: string;
    label: string;
    color?: string;
    subtitle?: string;
};

export function OptionsModal({
    visible,
    title,
    options,
    multi,
    selectedIds,
    canClear,
    onSelect,
    onToggle,
    onClear,
    onClose,
}: {
    visible: boolean;
    title: string;
    options: OptionItem[];
    multi?: boolean;
    selectedIds: string[];
    /** Shows a "Clear" action that sends null; single-select only. */
    canClear?: boolean;
    onSelect?: (id: string) => void;
    onToggle?: (id: string) => void;
    onClear?: () => void;
    onClose: () => void;
}) {
    return (
        <RNModal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
            <Pressable
                className="flex-1 justify-end"
                style={{ backgroundColor: "#00000066" }}
                onPress={onClose}
            >
                <Pressable
                    onPress={() => {
                        /* swallow presses so tapping the sheet doesn't close it */
                    }}
                    className="bg-background-0 rounded-t-xl pt-3 pb-5"
                    style={{ maxHeight: "80%" }}
                >
                    <HStack className="items-center justify-between px-4 pb-2.5">
                        <Text size="lg" className="font-bold">
                            {title}
                        </Text>
                        <HStack space="md">
                            {canClear && !multi ? (
                                <Pressable onPress={onClear} hitSlop={8}>
                                    <Text className="text-error-600 font-semibold">
                                        Clear
                                    </Text>
                                </Pressable>
                            ) : null}
                            <Pressable onPress={onClose} hitSlop={8}>
                                <Text className="text-primary-600 font-semibold">
                                    Done
                                </Text>
                            </Pressable>
                        </HStack>
                    </HStack>
                    <Divider />

                    <ScrollView style={{ maxHeight: 520 }}>
                        {options.length === 0 ? (
                            <Text className="p-4 text-typography-500">
                                No options available.
                            </Text>
                        ) : (
                            <VStack>
                                {options.map(opt => {
                                    const selected = selectedIds.includes(opt.id);
                                    return (
                                        <Pressable
                                            key={opt.id}
                                            onPress={() =>
                                                multi ? onToggle?.(opt.id) : onSelect?.(opt.id)
                                            }
                                            className="px-4 py-3 active:bg-background-100"
                                        >
                                            <HStack space="sm" className="items-center">
                                                {opt.color ? (
                                                    <Box
                                                        className="rounded-full"
                                                        style={{
                                                            width: 10,
                                                            height: 10,
                                                            backgroundColor: opt.color,
                                                        }}
                                                    />
                                                ) : null}
                                                <VStack className="flex-1">
                                                    <Text
                                                        size="md"
                                                        className="text-typography-900"
                                                    >
                                                        {opt.label}
                                                    </Text>
                                                    {opt.subtitle ? (
                                                        <Text
                                                            size="xs"
                                                            className="text-typography-500"
                                                        >
                                                            {opt.subtitle}
                                                        </Text>
                                                    ) : null}
                                                </VStack>
                                                {selected ? (
                                                    <Text className="text-primary-600" size="lg">
                                                        ✓
                                                    </Text>
                                                ) : null}
                                            </HStack>
                                        </Pressable>
                                    );
                                })}
                            </VStack>
                        )}
                    </ScrollView>
                </Pressable>
            </Pressable>
        </RNModal>
    );
}

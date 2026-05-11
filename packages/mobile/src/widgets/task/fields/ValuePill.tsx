// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";

/**
 * Rounded pill used as the tappable value for most fields. Mirrors the
 * "pill button" look from the web task details (colored background with a
 * subtle border) while remaining friendly for fingers.
 */
export function ValuePill({
    label,
    color,
    placeholder,
    onPress,
    disabled,
}: {
    label: string | null | undefined;
    color?: string;
    placeholder?: string;
    onPress?: () => void;
    disabled?: boolean;
}) {
    const hasValue = !!label;
    const bg = color ? color + "22" : undefined;
    const borderColor = color ?? undefined;

    return (
        <Pressable
            onPress={onPress}
            disabled={disabled || !onPress}
            style={{
                alignSelf: "flex-start",
                ...(bg ? { backgroundColor: bg } : null),
                ...(borderColor ? { borderColor } : null),
            }}
            className={`border rounded-full px-3 py-1.5 active:opacity-75 ${bg ? "" : "bg-background-100"} ${borderColor ? "" : "border-outline-300"}`}
        >
            <HStack className="items-center" space="xs">
                {color ? (
                    <Box
                        style={{ width: 8, height: 8, backgroundColor: color }}
                        className="rounded-full"
                    />
                ) : null}
                <Text
                    size="sm"
                    className={`font-medium ${hasValue ? "text-typography-900" : "text-typography-400"}`}
                >
                    {hasValue ? label : placeholder ?? "—"}
                </Text>
            </HStack>
        </Pressable>
    );
}

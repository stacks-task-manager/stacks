// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";

/** Preset palette that roughly mirrors the web "tint" swatch options. */
const TINTS = [
    "",
    "#d9534f",
    "#d9822b",
    "#d9c72b",
    "#2d7a46",
    "#0050b3",
    "#6e4fc7",
    "#b3309e",
    "#7a7a7a",
];

export function TintSelect({
    value,
    onChange,
    disabled,
}: {
    value: string | null | undefined;
    onChange: (value: string) => void;
    disabled?: boolean;
}) {
    return (
        <HStack space="sm" className="flex-wrap">
            {TINTS.map(c => {
                const selected = (value ?? "") === c;
                const empty = c === "";
                return (
                    <Pressable
                        key={c || "none"}
                        onPress={() => onChange(c)}
                        disabled={disabled}
                        style={{ width: 30, height: 30, backgroundColor: empty ? undefined : c }}
                        className={`rounded-full items-center justify-center active:opacity-75 ${
                            empty ? "bg-background-0" : ""
                        } ${
                            selected
                                ? "border-2 border-typography-900"
                                : "border border-outline-300"
                        }`}
                    >
                        {empty ? (
                            <Text size="md" className="text-typography-500">
                                ⦸
                            </Text>
                        ) : null}
                    </Pressable>
                );
            })}
        </HStack>
    );
}

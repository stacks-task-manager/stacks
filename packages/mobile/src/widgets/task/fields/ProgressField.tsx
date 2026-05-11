// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";

const STEPS = [0, 25, 50, 75, 100];

/**
 * Compact stepper that lets the user set the task's progress to one of a few
 * preset values (0 / 25 / 50 / 75 / 100). Matches the percentage chip from
 * the web's TaskDetailsProgress without depending on a slider package.
 */
export function ProgressField({
    value,
    onChange,
    disabled,
}: {
    value: number | null | undefined;
    onChange: (progress: number) => void;
    disabled?: boolean;
}) {
    const current = value ?? 0;
    return (
        <HStack space="xs" className="items-center flex-wrap">
            {STEPS.map(step => {
                const selected = current === step;
                return (
                    <Pressable
                        key={step}
                        onPress={() => onChange(step)}
                        disabled={disabled}
                        style={{ minWidth: 50 }}
                        className={`py-1.5 px-2.5 items-center rounded-full border active:opacity-75 ${
                            selected
                                ? "border-primary-500 bg-primary-50"
                                : "border-outline-300 bg-background-0"
                        }`}
                    >
                        <Text
                            size="xs"
                            className={`font-semibold ${
                                selected ? "text-primary-700" : "text-typography-700"
                            }`}
                        >
                            {step}%
                        </Text>
                    </Pressable>
                );
            })}
        </HStack>
    );
}

// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

/**
 * A labeled row used throughout the task details screen. The label is shown
 * on top in muted gray; the children render the actual control (pill, input,
 * chips, …). Keeps spacing consistent between every editable property.
 */
export function FieldRow({
    label,
    children,
    right,
}: {
    label: string;
    children: React.ReactNode;
    /** Optional node rendered on the right side of the label. */
    right?: React.ReactNode;
}) {
    return (
        <VStack className="mb-4" space="xs">
            <HStack className="items-center justify-between">
                <Text
                    size="xs"
                    className="font-semibold text-typography-500"
                    style={{ letterSpacing: 0.5 }}
                >
                    {label.toUpperCase()}
                </Text>
                {right}
            </HStack>
            {children}
        </VStack>
    );
}

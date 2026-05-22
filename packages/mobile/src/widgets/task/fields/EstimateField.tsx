// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { HStack } from "@/components/ui/hstack";
import { Input, InputField } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { useEffect, useRef, useState } from "react";

/**
 * Estimate is stored in minutes on the task record. This field accepts a free
 * minutes number and debounces commit so typing doesn't spam the server.
 */
export function EstimateField({
    value,
    onChange,
    disabled,
}: {
    value: number | null | undefined;
    onChange: (minutes: number | null) => void;
    disabled?: boolean;
}) {
    const [text, setText] = useState(value != null ? String(value) : "");
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const firstRender = useRef(true);

    useEffect(() => {
        setText(value != null ? String(value) : "");
    }, [value]);

    useEffect(() => {
        if (firstRender.current) {
            firstRender.current = false;
            return;
        }
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => {
            const trimmed = text.trim();
            if (trimmed === "") {
                if (value != null) onChange(null);
                return;
            }
            const n = Number(trimmed);
            if (!Number.isFinite(n) || n < 0) return;
            if (n !== value) onChange(n);
        }, 500);
        return () => {
            if (timer.current) clearTimeout(timer.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [text]);

    return (
        <HStack className="items-center self-start min-w-[160px]" space="xs">
            <Input variant="outline" size="md" className="flex-1" isDisabled={disabled}>
                <InputField
                    value={text}
                    onChangeText={setText}
                    keyboardType="numeric"
                    placeholder="0"
                />
            </Input>
            <Text className="text-typography-500" size="sm">
                min
            </Text>
        </HStack>
    );
}

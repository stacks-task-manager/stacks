// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Input, InputField } from "@/components/ui/input";
import { useEffect, useRef, useState } from "react";
import type { TextStyle } from "react-native";

/**
 * Generic debounced text input used for title and description. It commits the
 * new value to the server ~500 ms after the user stops typing, and syncs from
 * the prop when the upstream value changes (e.g. a realtime update).
 */
export function DebouncedTextField({
    value,
    onChange,
    placeholder,
    multiline,
    disabled,
    style,
}: {
    value: string | null | undefined;
    onChange: (value: string) => void;
    placeholder?: string;
    multiline?: boolean;
    disabled?: boolean;
    style?: TextStyle;
}) {
    const [text, setText] = useState(value ?? "");
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const firstRender = useRef(true);

    useEffect(() => {
        setText(value ?? "");
    }, [value]);

    useEffect(() => {
        if (firstRender.current) {
            firstRender.current = false;
            return;
        }
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => {
            if (text !== (value ?? "")) onChange(text);
        }, 500);
        return () => {
            if (timer.current) clearTimeout(timer.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [text]);

    return (
        <Input
            variant="outline"
            size="md"
            isDisabled={disabled}
            style={multiline ? { minHeight: 90 } : undefined}
            className={multiline ? "items-start" : "items-center"}
        >
            <InputField
                value={text}
                onChangeText={setText}
                placeholder={placeholder}
                multiline={multiline}
                textAlignVertical={multiline ? "top" : "center"}
                style={style}
            />
        </Input>
    );
}

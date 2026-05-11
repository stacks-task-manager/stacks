// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { useMemo, type ReactNode } from "react";
import { Alert, Linking, Platform } from "react-native";

import { Divider } from "@/components/ui/divider";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

export function openUrl(url: string) {
    void Linking.openURL(url).catch(err => {
        Alert.alert("Could not open", err instanceof Error ? err.message : String(err));
    });
}

export function openEmail(email: string) {
    openUrl(`mailto:${email}`);
}

export function openPhone(number: string) {
    const cleaned = number.replace(/[^+\d]/g, "");
    openUrl(`${Platform.OS === "ios" ? "telprompt" : "tel"}:${cleaned}`);
}

export function openWebsite(raw: string) {
    const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    openUrl(url);
}

/**
 * Small labeled row used throughout entity profiles. The left label column
 * stays a fixed width so values line up vertically across the card.
 */
export function InfoRow({
    label,
    value,
    onPress,
}: {
    label: string;
    value: string | null | undefined;
    onPress?: () => void;
}) {
    if (!value) return null;
    const body = (
        <HStack className="items-start py-2" space="md">
            <Text
                size="xs"
                className="font-semibold text-typography-500"
                style={{ width: 100, letterSpacing: 0.5 }}
            >
                {label.toUpperCase()}
            </Text>
            <Text
                size="sm"
                className={`flex-1 ${onPress ? "text-primary-600" : "text-typography-900"}`}
            >
                {value}
            </Text>
        </HStack>
    );
    if (onPress) {
        return (
            <Pressable onPress={onPress} className="active:opacity-60">
                {body}
            </Pressable>
        );
    }
    return body;
}

export function Section({
    title,
    children,
}: {
    title: string;
    children: ReactNode;
}) {
    const hasContent = useMemo(() => {
        const arr = Array.isArray(children) ? children : [children];
        return arr.some(c => c != null && c !== false);
    }, [children]);
    if (!hasContent) return null;
    return (
        <VStack className="mt-5">
            <Text
                size="xs"
                className="font-bold text-typography-500 mb-1"
                style={{ letterSpacing: 1 }}
            >
                {title.toUpperCase()}
            </Text>
            <Divider className="mb-1" />
            {children}
        </VStack>
    );
}

/** Join non-empty address parts into display lines. */
export function formatAddressLines(parts: (string | null | undefined)[]): string | null {
    const lines = parts
        .map(p => (typeof p === "string" ? p.trim() : ""))
        .filter(Boolean);
    return lines.length ? lines.join("\n") : null;
}

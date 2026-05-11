// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";

import { Icon, type IconName } from "./Icon";

export type QuickActionTone = "primary" | "danger" | "warning" | "secondary";

const TONE_CLASSES: Record<
    QuickActionTone,
    { bg: string; text: string; border?: string }
> = {
    primary: {
        bg: "bg-primary-500",
        text: "text-white",
    },
    danger: {
        bg: "bg-error-600 dark:bg-error-500",
        text: "text-white",
    },
    warning: {
        bg: "bg-warning-500",
        text: "text-white",
    },
    secondary: {
        bg: "bg-background-0",
        text: "text-typography-900",
        border: "border-outline-300",
    },
};

export interface QuickActionProps {
    label: string;
    /** Optional icon name from the shared sprite. Rendered left of the label. */
    icon?: IconName | string;
    tone?: QuickActionTone;
    onPress: () => void;
    disabled?: boolean;
    /** If true the pill stretches to fill the parent `HStack` row. */
    fill?: boolean;
}

export function QuickAction({
    label,
    icon,
    tone = "primary",
    onPress,
    disabled,
    fill,
}: QuickActionProps) {
    const classes = TONE_CLASSES[tone];
    const isOutlined = tone === "secondary";
    return (
        <Pressable
            onPress={disabled ? undefined : onPress}
            disabled={disabled}
            className={`items-center justify-center px-4 py-2.5 rounded-full active:opacity-75 ${classes.bg} ${
                fill ? "flex-1" : ""
            } ${isOutlined ? `border ${classes.border ?? ""}` : ""}`}
        >
            <HStack space="xs" className="items-center">
                {icon ? (
                    <Icon
                        icon={icon}
                        size={16}
                        color={isOutlined ? undefined : "white"}
                    />
                ) : null}
                <Text
                    size="sm"
                    className={`font-semibold ${classes.text}`}
                >
                    {label}
                </Text>
            </HStack>
        </Pressable>
    );
}

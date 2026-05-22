// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Box } from "@/components/ui/box";
import { Divider } from "@/components/ui/divider";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useState } from "react";
import { Modal as RNModal, StatusBar } from "react-native";

import { Icon, type IconName } from "./Icon";

export type HeaderMenuItem =
    | { type: "divider" }
    | {
          type?: "item";
          label: string;
          /** Optional leading icon from the shared sprite. */
          icon?: IconName | string;
          /** `"danger"` renders the label in the error color. */
          tone?: "default" | "danger";
          onPress: () => void;
          disabled?: boolean;
      };

/**
 * Three-dots header action that opens a small dropdown anchored to the
 * top-right of the screen. Used in the task detail modal to collapse the
 * per-task actions (mark done, archive, delete) behind a single button.
 */
export function HeaderMenu({
    items,
    accessibilityLabel = "More options",
}: {
    items: HeaderMenuItem[];
    accessibilityLabel?: string;
}) {
    const [open, setOpen] = useState(false);

    // Offset the dropdown below the status bar + a rough header height. We
    // intentionally don't measure the real header with `useHeaderHeight`
    // because the Modal renders into a root view that bypasses the header
    // insets — a fixed padding from the top edge keeps the menu visually
    // tucked under the ellipsis button without jumping on screen rotations.
    const topOffset = (StatusBar.currentHeight ?? 0) + 52;

    const handleSelect = (fn: () => void) => {
        setOpen(false);
        // Defer the action one frame so the modal's dismiss animation begins
        // before the screen underneath potentially navigates away.
        requestAnimationFrame(fn);
    };

    return (
        <>
            <Pressable
                onPress={() => setOpen(true)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={accessibilityLabel}
                className="px-3 py-1"
            >
                <Icon icon="dots-vertical" size={22} />
            </Pressable>

            <RNModal
                visible={open}
                animationType="fade"
                transparent
                onRequestClose={() => setOpen(false)}
            >
                <Pressable
                    onPress={() => setOpen(false)}
                    className="flex-1"
                    style={{ backgroundColor: "#00000033" }}
                >
                    <Box
                        className="absolute rounded-lg bg-background-0 border border-outline-200 py-1"
                        style={{
                            top: topOffset,
                            right: 8,
                            minWidth: 220,
                            shadowColor: "#000",
                            shadowOpacity: 0.18,
                            shadowRadius: 16,
                            shadowOffset: { width: 0, height: 8 },
                            elevation: 12,
                        }}
                        onStartShouldSetResponder={() => true}
                    >
                        <VStack>
                            {items.map((item, idx) => {
                                if (item.type === "divider") {
                                    return (
                                        <Divider
                                            key={`d-${idx}`}
                                            className="my-1 bg-outline-200"
                                        />
                                    );
                                }
                                const danger = item.tone === "danger";
                                return (
                                    <Pressable
                                        key={`i-${idx}`}
                                        onPress={
                                            item.disabled
                                                ? undefined
                                                : () => handleSelect(item.onPress)
                                        }
                                        disabled={item.disabled}
                                        className={`px-4 py-3 active:bg-background-100 ${item.disabled ? "opacity-50" : ""}`}
                                    >
                                        <HStack className="items-center" space="md">
                                            {item.icon ? (
                                                <Icon
                                                    icon={item.icon}
                                                    size={18}
                                                    color={danger ? "#dc2626" : undefined}
                                                />
                                            ) : null}
                                            <Text
                                                size="md"
                                                className={`font-medium ${danger ? "text-error-600" : "text-typography-900"}`}
                                            >
                                                {item.label}
                                            </Text>
                                        </HStack>
                                    </Pressable>
                                );
                            })}
                        </VStack>
                    </Box>
                </Pressable>
            </RNModal>
        </>
    );
}

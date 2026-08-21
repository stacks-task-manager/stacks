// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { useCallback, useRef, useState } from "react";
import { PanResponder, View } from "react-native";

import { Text } from "@/components/ui/text";

const STEPS = [0, 25, 50, 75, 100];

function snapToStep(raw: number): number {
    const clamped = Math.max(0, Math.min(100, raw));
    let nearest = STEPS[0];
    let nearestDist = Infinity;
    for (const step of STEPS) {
        const d = Math.abs(step - clamped);
        if (d < nearestDist) {
            nearest = step;
            nearestDist = d;
        }
    }
    return nearest;
}

/**
 * Slider that lets the user set the task's progress to one of a few
 * intermittent steps (0 / 25 / 50 / 75 / 100). The thumb drags continuously
 * but snaps to the nearest step, and the markers are labeled so the current
 * value stays obvious. Built on core React Native (no slider package).
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
    const current = snapToStep(value ?? 0);
    const [dragValue, setDragValue] = useState<number | null>(null);

    const widthRef = useRef(0);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    const valueFromX = useCallback((x: number): number => {
        const w = widthRef.current;
        if (w <= 0) return 0;
        return snapToStep(Math.max(0, Math.min(100, (x / w) * 100)));
    }, []);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => !disabled,
            onMoveShouldSetPanResponder: () => !disabled,
            onPanResponderGrant: evt => {
                const next = valueFromX(evt.nativeEvent.locationX);
                setDragValue(next);
                onChangeRef.current(next);
            },
            onPanResponderMove: evt => {
                const next = valueFromX(evt.nativeEvent.locationX);
                setDragValue(next);
            },
            onPanResponderRelease: evt => {
                const next = valueFromX(evt.nativeEvent.locationX);
                onChangeRef.current(next);
                setDragValue(null);
            },
            onPanResponderTerminate: evt => {
                const next = valueFromX(evt.nativeEvent.locationX);
                onChangeRef.current(next);
                setDragValue(null);
            },
        })
    ).current;

    const shown = dragValue ?? current;
    const pct = `${shown}%`;

    return (
        <View style={{ width: "100%" }} {...panResponder.panHandlers}>
            <View
                onLayout={e => (widthRef.current = e.nativeEvent.layout.width)}
                style={{ height: 6, borderRadius: 3, backgroundColor: "#e2e8f0", overflow: "hidden" }}
            >
                <View
                    style={{
                        width: `${shown}%`,
                        height: "100%",
                        backgroundColor: disabled ? "#94a3b8" : "#3b82f6",
                    }}
                />
            </View>

            {/* Step markers */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
                {STEPS.map(step => (
                    <View key={step} style={{ alignItems: "center", width: 36 }}>
                        <View
                            style={{
                                width: 8,
                                height: 8,
                                borderRadius: 4,
                                marginBottom: 2,
                                backgroundColor:
                                    shown >= step ? (disabled ? "#94a3b8" : "#3b82f6") : "#cbd5e1",
                            }}
                        />
                        <Text
                            size="xs"
                            className={
                                shown === step ? "font-semibold text-primary-700" : "text-typography-500"
                            }
                        >
                            {step}
                        </Text>
                    </View>
                ))}
            </View>

            <Text size="sm" className="font-medium text-typography-800 mt-1">
                {pct}
            </Text>
        </View>
    );
}

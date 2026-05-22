// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, View, type ViewStyle } from "react-native";
import { SvgXml } from "react-native-svg";

import { ICON_SPRITE, type IconName } from "./generated";

export type { IconName } from "./generated";

export interface IIconProps {
    /** Name of the icon in the sprite (e.g. `"alert-circle"`). */
    icon?: IconName | string;
    /** Foreground color; replaces `currentColor` in the sprite. */
    color?: string;
    /** Stroke color; overrides `stroke="currentColor"` on paths. */
    stroke?: string;
    /** Square size shortcut; sets both width and height. */
    size?: number;
    width?: number;
    height?: number;
    /** Rotate continuously, 1 full revolution per ~1s. */
    spin?: boolean;
    /** Adds a press-friendly cursor style (web only; kept for API parity). */
    interactive?: boolean;
    /** Extra style applied to the wrapping `View`. */
    style?: ViewStyle;
    /** Accessibility label for screen readers. */
    accessibilityLabel?: string;
    /** Testing hook. */
    testID?: string;
}

/**
 * Wrap the sprite `inner` in a standalone `<svg>` envelope so `SvgXml`
 * has a valid document to parse. We also accept an optional `stroke`
 * override so callers can force a stroke color different from `color`.
 */
function wrapSvg(entry: { viewBox: string; inner: string }, stroke?: string): string {
    const strokeAttr = stroke ? ` stroke="${stroke}"` : "";
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${entry.viewBox}"${strokeAttr}>${entry.inner}</svg>`;
}

/**
 * React Native counterpart of the web `Icon` component. Renders symbols
 * from the shared sprite via `react-native-svg`'s `SvgXml` so callers can
 * reference icons by the same string id used on the web.
 */
export function Icon({
    icon,
    color,
    stroke,
    size,
    width,
    height,
    spin,
    style,
    accessibilityLabel,
    testID,
}: IIconProps) {
    const entry = icon ? ICON_SPRITE[icon] : undefined;
    const finalWidth = width ?? size ?? 16;
    const finalHeight = height ?? size ?? 16;

    const svgString = useMemo(() => (entry ? wrapSvg(entry, stroke) : null), [entry, stroke]);

    const spinValue = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        if (!spin) {
            spinValue.stopAnimation();
            spinValue.setValue(0);
            return;
        }
        const loop = Animated.loop(
            Animated.timing(spinValue, {
                toValue: 1,
                duration: 1000,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        );
        loop.start();
        return () => loop.stop();
    }, [spin, spinValue]);

    if (!entry || !svgString) return null;

    const svg = (
        <SvgXml
            xml={svgString}
            width={finalWidth}
            height={finalHeight}
            color={color}
        />
    );

    if (spin) {
        const rotate = spinValue.interpolate({
            inputRange: [0, 1],
            outputRange: ["0deg", "360deg"],
        });
        return (
            <Animated.View
                style={[
                    { width: finalWidth, height: finalHeight, transform: [{ rotate }] },
                    style,
                ]}
                accessibilityLabel={accessibilityLabel}
                testID={testID}
            >
                {svg}
            </Animated.View>
        );
    }

    return (
        <View
            style={[{ width: finalWidth, height: finalHeight }, style]}
            accessibilityLabel={accessibilityLabel}
            testID={testID}
        >
            {svg}
        </View>
    );
}

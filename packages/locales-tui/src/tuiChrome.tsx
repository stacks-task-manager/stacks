// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { Box, Text, useStdout } from "ink";
import type { FC } from "react";
import { menuLimitForRows, tuiTheme } from "./tuiOptions.js";

export type TuiViewport = { rows: number; columns: number };

export { menuLimitForRows, tuiTheme };

const ViewportContext = createContext<TuiViewport>({ rows: 24, columns: 80 });

function readViewport(stdout: NodeJS.WriteStream): TuiViewport {
    return {
        columns: Math.max(40, stdout.columns ?? 80),
        rows: Math.max(12, stdout.rows ?? 24),
    };
}

export function useTerminalSize(): TuiViewport {
    const { stdout } = useStdout();
    const [size, setSize] = useState(() => readViewport(stdout));
    useEffect(() => {
        const onResize = () => setSize(readViewport(stdout));
        stdout.on("resize", onResize);
        return () => {
            stdout.off("resize", onResize);
        };
    }, [stdout]);
    return size;
}

export function TuiViewportProvider({ children }: { children: ReactNode }): React.ReactElement {
    const v = useTerminalSize();
    return (
        <ViewportContext.Provider value={v}>
            <Box flexDirection="column" width={v.columns} height={v.rows}>
                {children}
            </Box>
        </ViewportContext.Provider>
    );
}

export function useViewport(): TuiViewport {
    return useContext(ViewportContext);
}

export const TuiSelectIndicator: FC<{ isSelected?: boolean }> = ({ isSelected }) => {
    const { menu } = tuiTheme.colors;
    return (
        <Text
            bold={!!isSelected}
            color={isSelected ? menu.indicatorSelectedFg : menu.indicatorIdleFg}
            backgroundColor={isSelected ? menu.indicatorSelectedBg : undefined}
        >
            {isSelected ? " ❯ " : "   "}
        </Text>
    );
};

export const TuiSelectItem: FC<{ isSelected?: boolean; label: string }> = ({ isSelected, label }) =>
    isSelected ? (
        <Text bold color={tuiTheme.colors.menu.selectedFg} backgroundColor={tuiTheme.colors.menu.selectedBg}>
            {label}
        </Text>
    ) : (
        <Text dimColor>{label}</Text>
    );

export const tuiSelectInputProps = {
    indicatorComponent: TuiSelectIndicator,
    itemComponent: TuiSelectItem,
} as const;

/** @deprecated Use menuLimitForRows from tuiOptions */
export const MENU_LIMIT = 14;

type ScreenShellProps = {
    title: string;
    subtitle?: string;
    children: ReactNode;
    footer?: string;
    tone?: "default" | "warning" | "danger";
};

export function ScreenShell({ title, subtitle, children, footer, tone = "default" }: ScreenShellProps): React.ReactElement {
    const b = tuiTheme.colors.border;
    const borderColor = tone === "warning" ? b.warning : tone === "danger" ? b.danger : b.default;
    return (
        <Box flexDirection="column" width="100%" height="100%" flexGrow={1} minHeight={0}>
            <Box
                borderStyle="round"
                borderColor={borderColor}
                paddingX={2}
                paddingY={1}
                flexDirection="column"
                flexGrow={1}
                width="100%"
                height="100%"
                minHeight={0}
            >
                <Box flexDirection="column" flexShrink={0}>
                    <Text>
                        <Text color={tuiTheme.colors.brand} bold={tuiTheme.typography.titleBold}>
                            locales
                        </Text>
                        <Text dimColor> · </Text>
                        <Text bold={tuiTheme.typography.titleBold} color={tuiTheme.colors.title}>
                            {title}
                        </Text>
                    </Text>
                    {subtitle ? (
                        <Text dimColor wrap="wrap">
                            {subtitle}
                        </Text>
                    ) : null}
                </Box>
                <Box flexDirection="column" flexGrow={2} rowGap={1} minHeight={0} marginTop={1}>
                    {children}
                </Box>
                {footer ? (
                    <Box flexShrink={0} marginTop={1} flexDirection="column">
                        <Text dimColor wrap="wrap">
                            {footer}
                        </Text>
                    </Box>
                ) : null}
            </Box>
        </Box>
    );
}

export function BodyText({ children }: { children: ReactNode }): React.ReactElement {
    return (
        <Text color={tuiTheme.colors.semantic.body} wrap="wrap">
            {children}
        </Text>
    );
}

export function Label({ children }: { children: ReactNode }): React.ReactElement {
    return (
        <Text>
            <Text color={tuiTheme.colors.label}>▸ </Text>
            <Text bold={tuiTheme.typography.labelBold} color={tuiTheme.colors.label}>
                {children}
            </Text>
        </Text>
    );
}

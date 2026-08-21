// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { createContext, useContext } from "react";
import { Pressable, Text, type PressableProps, type TextProps } from "react-native";

import { cn } from "../lib/cn";

const BUTTON_SCOPE = Symbol("BUTTON");

type ButtonContextValue = {
    variant: "solid" | "outline" | "link";
    action: "primary" | "secondary" | "positive" | "negative";
    size: "xs" | "sm" | "md" | "lg" | "xl";
    isDisabled: boolean;
};

const ButtonContext = createContext<ButtonContextValue>({
    variant: "solid",
    action: "primary",
    size: "md",
    isDisabled: false,
});

const BUTTON_SIZE_HEIGHT: Record<string, string> = {
    xs: "h-7 px-2.5",
    sm: "h-9 px-3",
    md: "h-11 px-4",
    lg: "h-12 px-5",
    xl: "h-14 px-6",
};

const BUTTON_VARIANT_CLASS: Record<string, string> = {
    solid: "bg-primary-500",
    outline: "border border-primary-300 bg-transparent",
    link: "bg-transparent",
};

const BUTTON_ACTION_CLASS: Record<string, string> = {
    primary: "",
    secondary: "",
    positive: "bg-success-500 border-success-500",
    negative: "bg-error-500 border-error-500",
};

const BUTTON_TEXT_ACTION_CLASS: Record<string, string> = {
    primary: "text-typography-0",
    secondary: "text-typography-500",
    positive: "text-typography-0",
    negative: "text-typography-0",
};

/** Text color for outline/link variants: solid surface is transparent, so the
 *  label must be a readable dark color rather than the light-on-solid tone. */
const BUTTON_TEXT_VARIANT_CLASS: Record<string, string> = {
    solid: "",
    outline: "text-primary-600",
    link: "text-primary-600",
};

const BUTTON_TEXT_SIZE_CLASS: Record<string, string> = {
    xs: "text-xs",
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
    xl: "text-xl",
};

type IButtonProps = PressableProps & {
    className?: string;
    variant?: "solid" | "outline" | "link";
    action?: "primary" | "secondary" | "positive" | "negative";
    size?: "xs" | "sm" | "md" | "lg" | "xl";
    isDisabled?: boolean;
};

const Button = React.forwardRef<React.ComponentRef<typeof Pressable>, IButtonProps>(function Button(
    { className, variant = "solid", action = "primary", size = "md", disabled, isDisabled, ...props },
    ref
) {
    const effectiveDisabled = disabled ?? isDisabled;
    return (
        <ButtonContext.Provider value={{ variant, action, size, isDisabled: !!effectiveDisabled }}>
            <Pressable
                ref={ref}
                {...props}
                disabled={effectiveDisabled}
                className={cn(
                    "flex-row items-center justify-center rounded",
                    BUTTON_SIZE_HEIGHT[size],
                    BUTTON_VARIANT_CLASS[variant],
                    action === "positive" || action === "negative" ? BUTTON_ACTION_CLASS[action] : "",
                    disabled && "opacity-40",
                    className
                )}
            />
        </ButtonContext.Provider>
    );
});

type IButtonTextProps = TextProps & { className?: string };

const ButtonText = React.forwardRef<React.ComponentRef<typeof Text>, IButtonTextProps>(function ButtonText(
    { className, ...props },
    ref
) {
    const { action, variant, size } = useContext(ButtonContext);
    return (
        <Text
            ref={ref}
            {...props}
            className={cn(
                "font-semibold",
                BUTTON_TEXT_ACTION_CLASS[action],
                BUTTON_TEXT_VARIANT_CLASS[variant],
                BUTTON_TEXT_SIZE_CLASS[size],
                className
            )}
        />
    );
});

Button.displayName = "Button";
ButtonText.displayName = "ButtonText";
void BUTTON_SCOPE;

export { Button, ButtonText };

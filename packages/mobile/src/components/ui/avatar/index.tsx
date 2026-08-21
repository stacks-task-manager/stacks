// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { createContext, useContext } from "react";
import { Image, Text, View, type ImageProps, type TextProps, type ViewProps } from "react-native";

import { cn } from "../lib/cn";

const AVATAR_SCOPE = Symbol("AVATAR");

const AvatarContext = createContext<"xs" | "sm" | "md" | "lg" | "xl" | "2xl">("md");

const AVATAR_SIZE_CLASS: Record<string, string> = {
    xs: "w-6 h-6",
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
    xl: "w-24 h-24",
    "2xl": "w-32 h-32",
};

const AVATAR_FALLBACK_SIZE_CLASS: Record<string, string> = {
    xs: "text-2xs",
    sm: "text-xs",
    md: "text-base",
    lg: "text-xl",
    xl: "text-3xl",
    "2xl": "text-5xl",
};

type IAvatarProps = ViewProps & {
    className?: string;
    size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
};

const Avatar = React.forwardRef<React.ComponentRef<typeof View>, IAvatarProps>(function Avatar(
    { className, size = "md", ...props },
    ref
) {
    return (
        <AvatarContext.Provider value={size}>
            <View
                ref={ref}
                {...props}
                className={cn(
                    "rounded-full justify-center items-center relative bg-primary-600 overflow-hidden",
                    AVATAR_SIZE_CLASS[size],
                    className
                )}
            />
        </AvatarContext.Provider>
    );
});

type IAvatarFallbackTextProps = TextProps & { className?: string };

const AvatarFallbackText = React.forwardRef<React.ComponentRef<typeof Text>, IAvatarFallbackTextProps>(
    function AvatarFallbackText({ className, ...props }, ref) {
        const size = useContext(AvatarContext);
        return (
            <Text
                ref={ref}
                {...props}
                className={cn(
                    "text-typography-0 font-semibold uppercase",
                    AVATAR_FALLBACK_SIZE_CLASS[size],
                    className
                )}
            />
        );
    }
);

type IAvatarImageProps = ImageProps & { className?: string };

const AvatarImage = React.forwardRef<React.ComponentRef<typeof Image>, IAvatarImageProps>(
    function AvatarImage({ className, ...props }, ref) {
        return (
            <Image ref={ref} {...props} className={cn("h-full w-full rounded-full absolute", className)} />
        );
    }
);

Avatar.displayName = "Avatar";
AvatarFallbackText.displayName = "AvatarFallbackText";
AvatarImage.displayName = "AvatarImage";
void AVATAR_SCOPE;

export { Avatar, AvatarFallbackText, AvatarImage };

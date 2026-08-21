// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React from "react";
import { Text as RNText, type TextProps } from "react-native";

import { cn, SIZE_TO_TEXT } from "../lib/cn";

type ITextProps = TextProps & {
    className?: string;
    isTruncated?: boolean;
    bold?: boolean;
    underline?: boolean;
    strikeThrough?: boolean;
    size?: "2xs" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl";
    sub?: boolean;
    italic?: boolean;
    highlight?: boolean;
};

const Text = React.forwardRef<React.ComponentRef<typeof RNText>, ITextProps>(function Text(
    { className, isTruncated, bold, underline, strikeThrough, size = "md", sub, italic, highlight, ...props },
    ref
) {
    return (
        <RNText
            ref={ref}
            {...props}
            className={cn(
                "text-typography-700 font-body",
                SIZE_TO_TEXT[sub ? "xs" : size],
                isTruncated && "truncate",
                bold && "font-bold",
                underline && "underline",
                strikeThrough && "line-through",
                italic && "italic",
                highlight && "bg-yellow-500",
                className
            )}
        />
    );
});

Text.displayName = "Text";

export { Text };

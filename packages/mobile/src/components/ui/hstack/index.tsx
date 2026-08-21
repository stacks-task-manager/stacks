// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React from "react";
import { View, type ViewProps } from "react-native";

import { cn, SPACE_TO_GAP } from "../lib/cn";

type IHStackProps = ViewProps & {
    className?: string;
    space?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl";
    reversed?: boolean;
};

const HStack = React.forwardRef<React.ComponentRef<typeof View>, IHStackProps>(function HStack(
    { className, space, reversed, ...props },
    ref
) {
    return (
        <View
            ref={ref}
            {...props}
            className={cn(
                "flex-row",
                space && SPACE_TO_GAP[space],
                reversed && "flex-row-reverse",
                className
            )}
        />
    );
});

HStack.displayName = "HStack";

export { HStack };

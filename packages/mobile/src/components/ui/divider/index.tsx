// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React from "react";
import { Platform, View, type ViewProps } from "react-native";

import { cn } from "../lib/cn";

type IDividerProps = ViewProps & {
    className?: string;
    orientation?: "vertical" | "horizontal";
};

const Divider = React.forwardRef<React.ComponentRef<typeof View>, IDividerProps>(function Divider(
    { className, orientation = "horizontal", ...props },
    ref
) {
    return (
        <View
            ref={ref}
            {...props}
            aria-orientation={orientation}
            role={Platform.OS === "web" ? "separator" : undefined}
            className={cn(
                "bg-background-200",
                orientation === "vertical" ? "w-px h-full" : "h-px w-full",
                className
            )}
        />
    );
});

Divider.displayName = "Divider";

export { Divider };

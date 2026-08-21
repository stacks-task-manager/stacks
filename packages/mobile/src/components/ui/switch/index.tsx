// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React from "react";
import { Switch as RNSwitch, type SwitchProps } from "react-native";

type ISwitchProps = SwitchProps & {
    className?: string;
    size?: "sm" | "md" | "lg";
};

const Switch = React.forwardRef<React.ComponentRef<typeof RNSwitch>, ISwitchProps>(function Switch(
    { size = "md", ...props },
    ref
) {
    const scale = size === "sm" ? 0.75 : size === "lg" ? 1.25 : 1;
    return <RNSwitch ref={ref} {...props} style={[{ transform: [{ scale }] }, props.style]} />;
});

Switch.displayName = "Switch";
export { Switch };

// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Colors } from "@blueprintjs/core";
import React, { useMemo } from "react";

export const CircularProgress = ({ progress = 75, size = 18, strokeWidth = 3 }) => {
    // Calculate the circle's properties
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - (progress / 100) * circumference;
    const color = useMemo(() => {
        if (progress > 90) return Colors.GREEN3;
        if (progress > 70) return Colors.BLUE3;
        if (progress > 30) return Colors.ORANGE3;
        if (progress > 10) return Colors.RED3;
        return Colors.VERMILION3;
    }, [progress]);

    return (
        <div className="circular-progress">
            <svg className="absolute transform -rotate-90" width={size} height={size}>
                <circle
                    className="outer-progress"
                    stroke={Colors.LIGHT_GRAY1}
                    fill="transparent"
                    strokeWidth={strokeWidth}
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
                <circle
                    stroke={color}
                    fill="transparent"
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    style={{ strokeDashoffset }}
                    strokeLinecap="round"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
            </svg>

            <span>{progress}%</span>
        </div>
    );
};

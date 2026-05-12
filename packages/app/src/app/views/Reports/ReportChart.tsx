// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Colors } from "@blueprintjs/core";
import React, { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const SAMPLE = [
    { year: 2010, count: 10 },
    { year: 2011, count: 20 },
    { year: 2012, count: 15 },
    { year: 2013, count: 25 },
    { year: 2014, count: 22 },
    { year: 2015, count: 30 },
    { year: 2016, count: 28 },
];

export const ReportChart = () => {
    const data = useMemo(
        () =>
            SAMPLE.map((row, i) => ({
                year: String(row.year),
                count: [65, 59, 80, 281, 56, 55, 40][i] ?? row.count,
            })),
        []
    );

    return (
        <ResponsiveContainer width="100%" height={320}>
            <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={Colors.LIGHT_GRAY2} />
                <XAxis dataKey="year" stroke={Colors.GRAY1} />
                <YAxis stroke={Colors.GRAY1} />
                <Tooltip />
                <Bar dataKey="count" fill={Colors.BLUE3} radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
};

// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
export const clone = (data: any) => {
    return JSON.parse(JSON.stringify(data));
};

export const fillObject = <T extends object>(from: T, to: T) => {
    for (const key in from) {
        if (from && from.hasOwnProperty(key)) {
            if (!to.hasOwnProperty(key)) {
                to[key] = from[key];
            }
        }
    }
};

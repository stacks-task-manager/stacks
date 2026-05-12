// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { IToaster } from "@blueprintjs/core";
import { ILicense, IPreferences } from "@stacks/types";
import { UpdatePoller } from "../app/utils/polling";

export interface ICurrency {
    symbol: string;
    name: string;
    symbol_native: string;
    decimal_digits: number;
    rounding: number;
    code: string;
    name_plural: string;
}

interface ICurrencies {
    [id: string]: ICurrency;
}

interface Intervals {
    [key: string]: NodeJS.Timeout;
}

interface IntervalCallbacks {
    [key: string]: (() => void)[];
}
export declare global {
    interface Window {
        currencies: ICurrencies;
        updatePoller: UpdatePoller;
        license: ILicense;
        toaster: IToaster;
        platform: string;
        isRemote: boolean;
        isLocal: boolean;
        workspaceId: string;
        preferences: IPreferences;
        intervalRefs: Intervals;
        intervalCallbacks: IntervalCallbacks;
        getPathForFile: (file: File) => string;
        requestIdleCallback: (cb: () => void, obj: object) => void;
    }

    interface DateConstructor {
        from: (date?: string, defaultDate?: Date) => Date | undefined;
        toJSON: (date?: Date | null) => string | undefined;
    }

    interface Date {
        allDay?: boolean;
        setAllDay: (allDay: boolean) => Date;
    }
}

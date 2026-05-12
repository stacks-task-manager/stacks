// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Event hooks and selectors.
 */
import { useEffect, useRef } from "react";

type ISubscription = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [id: string]: (args: any) => void;
};

type ISubscriptions = {
    [type: string]: ISubscription;
};

const subscriptions: ISubscriptions = {};

const getIdGenerator = () => {
    let lastId = 0;
    const getNextUniqueId = () => {
        lastId += 1;
        return lastId;
    };
    return getNextUniqueId;
};
const getNextUniqueId = getIdGenerator();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const subscribe = <T>(eventType: string, callback: (args: T) => void) => {
    const id = getNextUniqueId();

    if (!subscriptions[eventType]) subscriptions[eventType] = {};

    subscriptions[eventType][id] = callback;

    return {
        unsubscribe: () => {
            delete subscriptions[eventType][id];
            if (Object.keys(subscriptions[eventType]).length === 0) delete subscriptions[eventType];
        },
    };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const publish = (eventType: string, arg?: any) => {
    if (!subscriptions[eventType]) return;
    Object.keys(subscriptions[eventType]).forEach(key => subscriptions[eventType][key](arg));
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const useSubscribe = (eventType: string, callback: (args: any) => void) => {
    const callbackRef = useRef(callback);
    callbackRef.current = callback;

    useEffect(() => {
        const listener = subscribe(eventType, args => callbackRef.current(args));

        return () => {
            listener.unsubscribe();
        };
    }, [eventType]);
};

export default { publish, subscribe, useSubscribe };

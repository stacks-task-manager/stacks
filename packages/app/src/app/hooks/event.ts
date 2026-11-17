// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Event hooks and selectors.
 */
import { useEffect, useRef } from "react";

type ISubscription = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [id: string]: (args: any) => void;
};

type IEventSubscriptions = {
    all: ISubscription;
    byResource: Record<string, ISubscription>;
};

const subscriptions: Record<string, IEventSubscriptions> = {};

const getIdGenerator = () => {
    let lastId = 0;
    const getNextUniqueId = () => {
        lastId += 1;
        return lastId;
    };
    return getNextUniqueId;
};
const getNextUniqueId = getIdGenerator();

const getEventSubscriptions = (eventType: string) => {
    if (!subscriptions[eventType]) subscriptions[eventType] = { all: {}, byResource: {} };
    return subscriptions[eventType];
};

const removeSubscription = (eventType: string, resourceId: string | undefined, id: number) => {
    const eventSubscriptions = subscriptions[eventType];
    if (!eventSubscriptions) return;

    if (resourceId == null) {
        delete eventSubscriptions.all[id];
    } else {
        const resourceSubscriptions = eventSubscriptions.byResource[resourceId];
        if (resourceSubscriptions) delete resourceSubscriptions[id];
        if (resourceSubscriptions && Object.keys(resourceSubscriptions).length === 0) {
            delete eventSubscriptions.byResource[resourceId];
        }
    }

    if (
        Object.keys(eventSubscriptions.all).length === 0 &&
        Object.keys(eventSubscriptions.byResource).length === 0
    ) {
        delete subscriptions[eventType];
    }
};

/**
 * Subscribes a callback to an event type.
 * @template T The type of the argument passed to the callback.
 * @param {string} eventType The type of event to subscribe to.
 * @param {(args: T) => void} callback The callback invoked when the event is published.
 * @param {string} [resourceId] Optional resource id for targeted events.
 * @returns {object} An object with an `unsubscribe` function to remove the subscription.
 */
export const subscribe = <T>(eventType: string, callback: (args: T) => void, resourceId?: string) => {
    const id = getNextUniqueId();
    const eventSubscriptions = getEventSubscriptions(eventType);
    const target =
        resourceId == null ? eventSubscriptions.all : (eventSubscriptions.byResource[resourceId] ??= {});

    target[id] = callback;

    return {
        unsubscribe: () => removeSubscription(eventType, resourceId, id),
    };
};

const notify = (subscriptionsForEvent: ISubscription | undefined, arg: unknown) => {
    if (!subscriptionsForEvent) return;
    for (const callback of Object.values(subscriptionsForEvent)) callback(arg);
};

/**
 * Publishes an event of the given type, invoking every subscribed callback.
 * @param {string} eventType The type of event to publish.
 * @param {*} arg The argument to pass to the subscribed callbacks.
 * @returns {void}
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const publish = (eventType: string, arg?: any) => {
    const eventSubscriptions = subscriptions[eventType];
    if (!eventSubscriptions) return;

    notify(eventSubscriptions.all, arg);

    const resourceId = arg?.taskId ?? arg?.resourceId ?? arg?.id;
    if (resourceId != null) notify(eventSubscriptions.byResource[resourceId], arg);
};

/**
 * Subscribes a callback to an event type for the lifetime of the component.
 * @param {string} eventType The type of event to subscribe to.
 * @param {(args: any) => void} callback The callback invoked when the event is published.
 * @param {string} [resourceId] Optional resource id for targeted events.
 * @returns {void}
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const useSubscribe = (eventType: string, callback: (args: any) => void, resourceId?: string) => {
    const callbackRef = useRef(callback);
    callbackRef.current = callback;

    useEffect(() => {
        const listener = subscribe(eventType, args => callbackRef.current(args), resourceId);
        return () => listener.unsubscribe();
    }, [eventType, resourceId]);
};

export default { publish, subscribe, useSubscribe };

// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React from "react";
import { act, render } from "@testing-library/react";

import { publish, subscribe, useSubscribe } from "app/hooks/event";

it("routes resource subscriptions only to the matching resource", () => {
    const matching = jest.fn();
    const other = jest.fn();
    const all = jest.fn();
    const eventType = "resource-event";

    const matchingSubscription = subscribe(eventType, matching, "task-1");
    const otherSubscription = subscribe(eventType, other, "task-2");
    const allSubscription = subscribe(eventType, all);

    publish(eventType, { taskId: "task-1", value: 1 });

    expect(matching).toHaveBeenCalledTimes(1);
    expect(other).not.toHaveBeenCalled();
    expect(all).toHaveBeenCalledTimes(1);

    matchingSubscription.unsubscribe();
    otherSubscription.unsubscribe();
    allSubscription.unsubscribe();
});

it("uses the latest callback without resubscribing", () => {
    const eventType = "latest-callback-event";
    const first = jest.fn();
    const second = jest.fn();

    const Harness = ({ callback }: { callback: (args: unknown) => void }) => {
        useSubscribe(eventType, callback);
        return null;
    };
    const { rerender, unmount } = render(<Harness callback={first} />);

    rerender(<Harness callback={second} />);
    act(() => publish(eventType, { value: 2 }));

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith({ value: 2 });

    unmount();
    act(() => publish(eventType, { value: 3 }));
    expect(second).toHaveBeenCalledTimes(1);
});

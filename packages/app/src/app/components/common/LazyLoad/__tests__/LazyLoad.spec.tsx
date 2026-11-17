// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React from "react";
import { render } from "@testing-library/react";

import { Lazy } from "app/components/common/LazyLoad/LazyLoad";

class MockIntersectionObserver {
    static instances: MockIntersectionObserver[] = [];

    callback: IntersectionObserverCallback;
    observe = jest.fn();
    unobserve = jest.fn();
    disconnect = jest.fn();

    constructor(callback: IntersectionObserverCallback) {
        this.callback = callback;
        MockIntersectionObserver.instances.push(this);
    }
}

describe("Lazy observer lifecycle", () => {
    const originalObserver = global.IntersectionObserver;

    beforeEach(() => {
        MockIntersectionObserver.instances = [];
        global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
    });

    afterAll(() => {
        global.IntersectionObserver = originalObserver;
    });

    it("disconnects a shared observer after its final row unmounts", () => {
        const { unmount } = render(
            <Lazy rootElement="div" loadingElement={<span>loading</span>}>
                <span>row</span>
            </Lazy>
        );

        expect(MockIntersectionObserver.instances).toHaveLength(1);
        const observer = MockIntersectionObserver.instances[0];

        unmount();

        expect(observer.disconnect).toHaveBeenCalledTimes(1);
    });
});

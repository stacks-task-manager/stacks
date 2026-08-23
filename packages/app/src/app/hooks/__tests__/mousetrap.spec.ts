// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { renderHook } from "@testing-library/react";
import type { ExtendedKeyboardEvent } from "mousetrap";

jest.mock("mousetrap", () => ({
    __esModule: true,
    default: {
        bind: jest.fn(),
        unbind: jest.fn(),
    },
}));

import mousetrap from "mousetrap";
import { useMousetrap } from "app/hooks/mousetrap";

const bind = mousetrap.bind as jest.Mock;
const unbind = mousetrap.unbind as jest.Mock;

describe("useMousetrap", () => {
    beforeEach(() => jest.clearAllMocks());

    it("binds on mount and unbinds the same keys and event type on unmount", () => {
        const keys = ["ctrl+k", "command+k"];
        const { unmount } = renderHook(() => useMousetrap(keys, jest.fn(), "keydown"));

        expect(bind).toHaveBeenCalledWith(keys, expect.any(Function), "keydown");

        unmount();
        expect(unbind).toHaveBeenCalledWith(keys, "keydown");
    });

    it("uses the latest callback without rebinding equivalent key arrays", () => {
        const firstCallback = jest.fn();
        const secondCallback = jest.fn();
        const { rerender } = renderHook(({ callback }) => useMousetrap(["ctrl+k", "command+k"], callback), {
            initialProps: { callback: firstCallback },
        });
        const boundHandler = bind.mock.calls[0][1] as (event: ExtendedKeyboardEvent, combo: string) => void;

        rerender({ callback: secondCallback });
        boundHandler({} as ExtendedKeyboardEvent, "ctrl+k");

        expect(bind).toHaveBeenCalledTimes(1);
        expect(firstCallback).not.toHaveBeenCalled();
        expect(secondCallback).toHaveBeenCalledWith({}, "ctrl+k");
    });

    it("rebinds when the key combination or event type changes", () => {
        const callback = jest.fn();
        const { rerender } = renderHook(
            ({ handlerKey, eventType }) => useMousetrap(handlerKey, callback, eventType),
            {
                initialProps: {
                    handlerKey: "ctrl+k",
                    eventType: "keydown" as "keydown" | "keyup",
                },
            }
        );

        rerender({ handlerKey: "ctrl+l", eventType: "keyup" });

        expect(unbind).toHaveBeenCalledWith("ctrl+k", "keydown");
        expect(bind).toHaveBeenLastCalledWith("ctrl+l", expect.any(Function), "keyup");
    });
});

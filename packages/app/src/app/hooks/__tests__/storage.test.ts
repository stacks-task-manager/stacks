// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { renderHook, act } from "@testing-library/react";
import { useStorage } from "../storage";
import Storage from "app/utils/storage";

// Mock the Storage utility
jest.mock("app/utils/storage", () => ({
    get: jest.fn(),
    set: jest.fn(),
}));

describe("useStorage", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should initialize with the stored value if it exists", () => {
        (Storage.get as jest.Mock).mockReturnValue("stored-value");
        const { result } = renderHook(() => useStorage("test-key", false, "default-value"));
        
        expect(result.current[0]).toBe("stored-value");
        expect(Storage.get).toHaveBeenCalledWith("test-key", false, "default-value", undefined);
    });

    it("should initialize with the default value if storage returns null/undefined", () => {
        // Simulating Storage.get returning null (or whatever default behavior when not found)
        (Storage.get as jest.Mock).mockReturnValue(null);
        
        const { result } = renderHook(() => useStorage("test-key", false, "default-value"));
        
        expect(result.current[0]).toBe("default-value");
    });

    it("should update the value and storage when setValue is called", () => {
        (Storage.get as jest.Mock).mockReturnValue("initial");
        const { result } = renderHook(() => useStorage("test-key", false, "default"));

        act(() => {
            result.current[1]("new-value");
        });

        expect(result.current[0]).toBe("new-value");
        expect(Storage.set).toHaveBeenCalledWith("test-key", "new-value", undefined);
    });

    it("should pass prefix to Storage.get and Storage.set", () => {
        (Storage.get as jest.Mock).mockReturnValue("initial");
        const { result } = renderHook(() => useStorage("test-key", false, "default", "prefix"));

        expect(Storage.get).toHaveBeenCalledWith("test-key", false, "default", "prefix");

        act(() => {
            result.current[1]("new-value");
        });

        expect(Storage.set).toHaveBeenCalledWith("test-key", "new-value", "prefix");
    });

    it("should handle parsing function", () => {
        const parseFn = (val: string) => JSON.parse(val);
        (Storage.get as jest.Mock).mockReturnValue({ foo: "bar" });
        
        const { result } = renderHook(() => useStorage("test-key", parseFn, { foo: "default" }));

        expect(Storage.get).toHaveBeenCalledWith("test-key", parseFn, { foo: "default" }, undefined);
        expect(result.current[0]).toEqual({ foo: "bar" });
    });
});

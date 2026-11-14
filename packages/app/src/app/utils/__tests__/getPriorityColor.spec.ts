// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Colors } from "@blueprintjs/core";
import { PRIORITY } from "@stacks/types";

import { getPriorityColor } from "../colors";

describe("getPriorityColor", () => {
    it.each([
        [PRIORITY.LOW, Colors.GREEN3],
        [PRIORITY.MEDIUM, Colors.ORANGE3],
        [PRIORITY.HIGH, Colors.RED3],
        [PRIORITY.CRITICAL, Colors.VERMILION3],
    ])("maps %s to its display color", (priority, expected) => {
        expect(getPriorityColor(priority)).toBe(expected);
    });

    it("falls back to a neutral color for unknown priorities", () => {
        expect(getPriorityColor(null)).toBe(Colors.GRAY3);
        expect(getPriorityColor(undefined)).toBe(Colors.GRAY3);
    });
});

// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React from "react";
import { render } from "@testing-library/react";

import { flattenTree } from "app/utils/array";
import { TableLevelIndicator } from "../TableLevelIndicator";

describe("TableLevelIndicator", () => {
    it("keeps ancestor connectors when a later sibling branch continues", () => {
        const grandchild = flattenTree([
            {
                id: "root",
                children: [
                    {
                        id: "child-a",
                        children: [{ id: "grandchild-a" }],
                    },
                    { id: "child-b" },
                ],
            },
        ]).find(item => item.id === "grandchild-a")!;

        const { container } = render(
            <TableLevelIndicator
                level={grandchild.level}
                isParent={false}
                lastAtDepth={grandchild.lastAtDepth}
            />
        );
        const items = container.querySelectorAll(".table-level-indicator-item");

        expect(items).toHaveLength(2);
        expect(items[0]).not.toHaveClass("is-last");
        expect(items[1]).toHaveClass("is-current", "is-last");
    });

    it("marks intermediate ancestors as last without marking the child branch", () => {
        const { container } = render(
            <TableLevelIndicator level={3} isParent lastAtDepth={[false, true, false, true]} />
        );
        const items = container.querySelectorAll(".table-level-indicator-item");

        expect(items).toHaveLength(4);
        expect(items[0]).toHaveClass("is-last");
        expect(items[1]).not.toHaveClass("is-last");
        expect(items[2]).toHaveClass("is-current", "is-last");
        expect(items[3]).not.toHaveClass("is-last", "is-current");
    });
});

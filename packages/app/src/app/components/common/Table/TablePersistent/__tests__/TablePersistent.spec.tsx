// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React from "react";
import { render, screen } from "@testing-library/react";
import { ITableColumns } from "@stacks/types";
import {
    TablePersistent,
    TablePersistentGroupData,
} from "app/components/common/Table/TablePersistent/TablePersistent";

jest.mock("app/hooks", () => ({ useStorage: () => [[], jest.fn()] }));
jest.mock("app/components/common", () => ({ Icon: () => null, BlankSlate: () => null }));
jest.mock("react-intersection-observer", () => ({
    useInView: () => ({ ref: jest.fn(), inView: true }),
}));
jest.mock("app/components/common/Table/TableColumnPicker/TableColumnPicker", () => ({
    TableColumnPicker: () => null,
}));
jest.mock("app/components/common/Table/TablePersistent/store", () => ({
    TablePersistentStore: () => ({
        store: {
            use: () => ({
                visibleColumns: ["title"],
                columnsOrder: ["title"],
                columnWidths: {},
                sortBy: "title",
                sortDesc: false,
            }),
        },
    }),
}));

interface Row {
    id: string;
    title: string;
}

const columns: ITableColumns<Row> = {
    title: { title: "Title", isSortable: true, width: 200, minWidth: 100 },
};

describe("TablePersistent invalid rows", () => {
    it.each(["automatic", "custom", "none"])("filters invalid rows with %s sorting", sorting => {
        const data = [
            false,
            null,
            undefined,
            0,
            "invalid",
            [],
            { id: "z", title: "Zebra" },
            { id: "a", title: "Alpha" },
        ] as unknown as Row[];

        render(
            <TablePersistent<Row>
                id="test"
                columns={{ title: { ...columns.title, isSortable: sorting !== "none" } }}
                data={data}
                onSort={sorting === "custom" ? (a, b) => a.title.localeCompare(b.title) : undefined}
                enableReorder={false}
            />
        );

        const rows = screen.getAllByTestId(/^table-test-row-/);
        expect(rows.map(row => row.textContent?.trim())).toEqual(
            sorting === "none" ? ["Zebra", "Alpha"] : ["Alpha", "Zebra"]
        );
        expect(data).toHaveLength(8);
    });

    it("detects grouped data after skipping a false first entry", () => {
        const group: TablePersistentGroupData<Row> = {
            groupId: "group",
            title: "Contacts",
            defaultExpanded: true,
            data: [{ id: "a", title: "Alpha" }],
        };

        render(
            <TablePersistent<Row>
                id="test"
                columns={columns}
                data={[false, group] as unknown as TablePersistentGroupData<Row>[]}
                enableReorder={false}
            />
        );

        expect(screen.getByText("Contacts")).toBeInTheDocument();
        expect(screen.getByText("Alpha")).toBeInTheDocument();
    });

    it("renders an empty table when every entry is invalid", () => {
        const { container } = render(
            <TablePersistent<Row>
                id="test"
                columns={columns}
                data={[false, null] as unknown as Row[]}
                enableReorder={false}
            />
        );

        expect(container.querySelectorAll("tbody tr")).toHaveLength(0);
    });
});

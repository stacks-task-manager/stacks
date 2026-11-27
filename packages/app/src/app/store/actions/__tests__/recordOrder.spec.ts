// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { produce } from "immer";

import { RECORDTYPE, TreeNode } from "@stacks/types";
import { DocumentsAPI } from "app/api";
import { RecordActions } from "app/store/actions";
import { RecordsStore } from "app/store/records";

jest.mock("app/api", () => ({
    __esModule: true,
    default: jest.fn(),
    DocumentsAPI: { update: jest.fn() },
}));

const ROOT = "00000000-0000-0000-0000-000000000000";

const doc = (id: string, order: number, over: Partial<TreeNode> = {}): TreeNode =>
    ({
        ...({} as TreeNode),
        id,
        parent: ROOT,
        title: id,
        type: RECORDTYPE.NOTEPAD,
        order,
        archived: null,
        droppable: false,
        ...over,
    }) as TreeNode;

const setDocuments = (documents: TreeNode[], ids: string[]) => {
    // The store is what the sidebar renders, so seed it in document order.
    RecordsStore.set(
        produce(state => {
            state.documents = ids.map(id => documents.find(document => document.id === id)!);
        })
    );
};

const visibleOrder = () =>
    RecordsStore.get()
        .documents.filter(document => document.archived === null)
        .sort((a, b) => a.order - b.order)
        .map(document => document.id);

const storedOrder = () => RecordsStore.get().documents.map(document => `${document.id}:${document.order}`);

describe("RecordActions.setDocuments", () => {
    beforeEach(() => {
        (DocumentsAPI.update as jest.Mock).mockReset();
        (DocumentsAPI.update as jest.Mock).mockResolvedValue({});
    });

    it("resolves the dropped slot against the visible children, not the stored order values", async () => {
        // Root sequence with hidden children (archived rows keep their order): b and c are not
        // rendered by the sidebar, so its slot "1" means "before d", which is order 5.
        const documents = [
            doc("a", 0),
            doc("b", 1, { archived: "2026-01-01" }),
            doc("c", 2, { archived: "2026-01-01" }),
            doc("d", 5),
            doc("e", 9),
        ];
        setDocuments(documents, ["a", "b", "c", "d", "e"]);

        await RecordActions.setDocuments("e", ROOT, 1);

        expect(visibleOrder()).toEqual(["a", "e", "d"]);
        // Every sibling of the parent is renumbered densely, hidden ones included.
        expect(storedOrder()).toEqual(["a:0", "b:1", "c:2", "e:3", "d:4"]);
        expect(DocumentsAPI.update).toHaveBeenCalledTimes(1);
        expect(DocumentsAPI.update).toHaveBeenCalledWith("e", { order: 3, parent: ROOT });
    });

    it("appends after the last visible child when dropped past the end", async () => {
        const documents = [doc("a", 0), doc("b", 1), doc("hidden", 2, { archived: "2026-01-01" })];
        setDocuments(documents, ["a", "b", "hidden"]);

        await RecordActions.setDocuments("a", ROOT, 2);

        expect(visibleOrder()).toEqual(["b", "a"]);
        expect(DocumentsAPI.update).toHaveBeenCalledWith("a", { order: 2, parent: ROOT });
    });

    it("shifts a downward slot past the row that is still rendered while dragging", async () => {
        // Rendered rows are [a, b, c] and the tree's slot counts the dragged row, so "below c" is
        // slot 3. Dropping a must land last, not one row lower than that.
        setDocuments([doc("a", 0), doc("b", 1), doc("c", 2)], ["a", "b", "c"]);

        await RecordActions.setDocuments("a", ROOT, 3);
        expect(visibleOrder()).toEqual(["b", "c", "a"]);

        // One row down: rendered rows are [a, b, c] and slot 2 is the line below b, so a must land
        // between b and c rather than after c.
        setDocuments([doc("a", 0), doc("b", 1), doc("c", 2)], ["a", "b", "c"]);
        await RecordActions.setDocuments("a", ROOT, 2);
        expect(visibleOrder()).toEqual(["b", "a", "c"]);

        // Upward from the bottom: rendered rows are [b, c, a], slot 1 is the line above c, so the row
        // lands between b and c (no dragged-row shift).
        setDocuments([doc("b", 0), doc("c", 1), doc("a", 2)], ["b", "c", "a"]);
        await RecordActions.setDocuments("a", ROOT, 1);
        expect(visibleOrder()).toEqual(["b", "a", "c"]);
    });

    it("combines the dragged-row shift with hidden siblings", async () => {
        // Root: a, hidden, b, c. Rendered rows are [a, b, c]; dropping a below b is slot 2, which
        // must land after b even though the hidden row sits between them.
        setDocuments(
            [doc("a", 0), doc("hidden", 1, { archived: "2026-01-01" }), doc("b", 2), doc("c", 3)],
            ["a", "hidden", "b", "c"]
        );

        await RecordActions.setDocuments("a", ROOT, 2);

        expect(visibleOrder()).toEqual(["b", "a", "c"]);
        expect(DocumentsAPI.update).toHaveBeenCalledWith("a", { order: 2, parent: ROOT });
    });

    it("closes the gap in the source parent when the row changes parent", async () => {
        const documents = [doc("a", 0), doc("moved", 3), doc("folder", 1, { droppable: true })];
        setDocuments(documents, ["a", "folder", "moved"]);

        await RecordActions.setDocuments("moved", "folder", 0);

        const children = (parent: string) =>
            RecordsStore.get()
                .documents.filter(document => document.parent === parent)
                .sort((a, b) => a.order - b.order)
                .map(document => `${document.id}:${document.order}`);
        expect(children(ROOT)).toEqual(["a:0", "folder:1"]);
        expect(children("folder")).toEqual(["moved:0"]);
        expect(DocumentsAPI.update).toHaveBeenCalledWith("moved", { order: 0, parent: "folder" });
    });

    it("does nothing when the row is dropped on the slot it already occupies", async () => {
        const documents = [doc("a", 0), doc("b", 1), doc("c", 2)];
        setDocuments(documents, ["a", "b", "c"]);

        await RecordActions.setDocuments("b", ROOT, 1);

        expect(DocumentsAPI.update).not.toHaveBeenCalled();
    });
});

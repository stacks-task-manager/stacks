import { Classes } from "@blueprintjs/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { ITag, TAGSECTION, TAGTYPE } from "@stacks/types";
import React from "react";

import { TagChip } from "../TagChip";

const mockConfirm = jest.fn();

jest.mock("@stacks/translations", () => ({ translate: (key: string) => key }));
jest.mock("app/utils/dialog", () => ({
    __esModule: true,
    default: { confirm: (...args: unknown[]) => mockConfirm(...args) },
}));
jest.mock("app/widgets/common/TagEditPopover/TagEditPopover", () => ({
    TagEditPopover: ({ children }: any) => <>{children}</>,
}));
jest.mock("app/components/common/Icon/Icon", () => ({ Icon: ({ icon }: any) => <span>{icon}</span> }));

const tag: ITag = {
    id: "tag-1",
    title: "Customer",
    color: "#3366ff",
    section: TAGSECTION.PROJECTS,
    type: TAGTYPE.TAG,
    parent: null,
};

const status: ITag = { ...tag, id: "status-1", title: "In progress", type: TAGTYPE.STATUS };

describe("tag/status chip characterization", () => {
    beforeEach(() => mockConfirm.mockReset());

    it("removes a tag", () => {
        const onRemove = jest.fn();
        render(<TagChip tag={tag} onRemove={onRemove} />);

        fireEvent.click(screen.getByRole("button"));
        expect(onRemove).toHaveBeenCalledWith("tag-1");
    });

    it("confirms status removal with status-specific copy", async () => {
        mockConfirm.mockResolvedValue(true);
        const onRemove = jest.fn();
        render(<TagChip variant="status" tag={status} confirmRemove onRemove={onRemove} />);

        fireEvent.click(screen.getByRole("button"));
        expect(mockConfirm).toHaveBeenCalledWith(
            "Delete status",
            expect.stringMatching(/delete this status/i)
        );
        await screen.findByText("In progress");
        expect(onRemove).toHaveBeenCalledWith("status-1");
    });

    it("preserves status disabled and stable test IDs", () => {
        render(
            <TagChip variant="status" tag={status} disabled tagId="status-trigger" testId="status-chip" />
        );

        expect(screen.getByTestId("status-chip")).toHaveAttribute("id", "status-trigger");
        expect(screen.getByTestId("status-chip")).not.toHaveClass(Classes.INTERACTIVE);
    });
});

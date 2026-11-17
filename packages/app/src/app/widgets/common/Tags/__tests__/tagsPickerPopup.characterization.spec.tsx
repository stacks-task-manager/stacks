import { fireEvent, render, screen } from "@testing-library/react";
import { ITag, TAGSECTION, TAGTYPE } from "@stacks/types";
import React from "react";

import { TagsPickerPopup } from "../TagsPickerPopup";

const mockTag: ITag = {
    id: "tag-1",
    title: "Customer",
    color: "#3366ff",
    section: TAGSECTION.PROJECTS,
    type: TAGTYPE.TAG,
    parent: null,
};

jest.mock("@blueprintjs/core", () => {
    const ReactModule = jest.requireActual("react");
    return {
        Popover: ({ children, content, onOpening, onClosing }: any) => {
            const [open, setOpen] = ReactModule.useState(false);
            return (
                <>
                    <button
                        data-testid="popover-target"
                        onClick={() => {
                            onOpening?.();
                            setOpen(true);
                        }}
                    >
                        {children}
                    </button>
                    {open ? (
                        <div>
                            {content}
                            <button
                                data-testid="popover-close"
                                onClick={() => {
                                    setOpen(false);
                                    onClosing?.();
                                }}
                            />
                        </div>
                    ) : null}
                </>
            );
        },
    };
});

jest.mock("app/components/project", () => ({
    TagsPicker: ({ onToggle }: any) => (
        <button data-testid="toggle-tag" onClick={() => onToggle(mockTag)}>
            toggle
        </button>
    ),
}));

describe("tags picker popup characterization", () => {
    it("calls immediately for the default popup", () => {
        const onToggle = jest.fn();
        render(
            <TagsPickerPopup value={[]} section={TAGSECTION.PROJECTS} type={TAGTYPE.TAG} onToggle={onToggle}>
                target
            </TagsPickerPopup>
        );

        fireEvent.click(screen.getByTestId("popover-target"));
        fireEvent.click(screen.getByTestId("toggle-tag"));
        expect(onToggle).toHaveBeenCalledWith(mockTag);
    });

    it("preserves an open draft across parent rerenders", () => {
        const onToggle = jest.fn();
        const popup = (value: string[]) => (
            <TagsPickerPopup
                commitMode="onClose"
                value={value}
                section={TAGSECTION.PROJECTS}
                type={TAGTYPE.TAG}
                onToggle={onToggle}
            >
                target
            </TagsPickerPopup>
        );
        const { rerender } = render(popup([]));

        fireEvent.click(screen.getByTestId("popover-target"));
        fireEvent.click(screen.getByTestId("toggle-tag"));
        rerender(popup([]));
        fireEvent.click(screen.getByTestId("popover-close"));

        expect(onToggle).toHaveBeenCalledWith(["tag-1"]);
    });

    it("batches selection until close for the sync popup", () => {
        const onToggle = jest.fn();
        render(
            <TagsPickerPopup
                commitMode="onClose"
                value={[]}
                section={TAGSECTION.PROJECTS}
                type={TAGTYPE.TAG}
                onToggle={onToggle}
            >
                target
            </TagsPickerPopup>
        );

        fireEvent.click(screen.getByTestId("popover-target"));
        fireEvent.click(screen.getByTestId("toggle-tag"));
        expect(onToggle).not.toHaveBeenCalled();
        fireEvent.click(screen.getByTestId("popover-close"));
        expect(onToggle).toHaveBeenCalledWith(["tag-1"]);
    });
});

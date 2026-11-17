// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { render, screen } from "@testing-library/react";
import React from "react";

import { ToolbarViewButton } from "app/components/common/ToolbarButtons/ToolbarButtons";

describe("ToolbarViewButton", () => {
    it("renders a view type button with icon and label", () => {
        render(<ToolbarViewButton icon="list" label="List" data-testid="view-button" />);

        const button = screen.getByTestId("view-button");

        expect(button).toHaveClass("view-type-button");
        expect(button).not.toHaveClass("active");
        expect(button).toHaveAttribute("type", "button");
        expect(button).toHaveTextContent("List");
        expect(button.querySelector(".icon-list")).toBeInTheDocument();
    });

    it("applies active and views state classes", () => {
        render(<ToolbarViewButton icon="plus" label="Views" active views data-testid="view-button" />);

        expect(screen.getByTestId("view-button")).toHaveClass("view-type-button", "active", "views");
    });

    it("forwards native button attributes and children", () => {
        const onClick = jest.fn();

        render(
            <ToolbarViewButton
                role="tab"
                aria-selected={false}
                className="custom"
                data-testid="view-button"
                data-active={false}
                onClick={onClick}
            >
                Beta
            </ToolbarViewButton>
        );

        const button = screen.getByTestId("view-button");

        expect(button).toHaveAttribute("role", "tab");
        expect(button).toHaveAttribute("aria-selected", "false");
        expect(button).toHaveAttribute("data-active", "false");
        expect(button).toHaveClass("custom");
        expect(button).toHaveTextContent("Beta");

        button.click();
        expect(onClick).toHaveBeenCalledTimes(1);
    });
});

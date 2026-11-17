// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { render } from "@testing-library/react";
import React, { createRef } from "react";

import {
    MainToolbar,
    SectionToolbar,
    SectionToolbarDivider,
    SectionToolbarOptions,
    SectionToolbarSide,
    SectionToolbarTitle,
} from "../ToolbarLayout";

describe("ToolbarLayout", () => {
    it("preserves the toolbar DOM and class contract", () => {
        const { container, getByTestId } = render(
            <MainToolbar single className="custom-toolbar" data-testid="main-toolbar">
                <SectionToolbar>
                    <SectionToolbarSide side fixed padded centered role="tablist" aria-label="Toolbar views">
                        <SectionToolbarTitle>Title</SectionToolbarTitle>
                        <SectionToolbarOptions>Options</SectionToolbarOptions>
                    </SectionToolbarSide>
                    <SectionToolbarDivider />
                </SectionToolbar>
            </MainToolbar>
        );

        const mainToolbar = getByTestId("main-toolbar");
        const side = container.querySelector(".section-toolbar-side");
        const divider = container.querySelector(".section-toolbar-divider");

        expect(mainToolbar).toHaveClass("main-toolbar", "single", "custom-toolbar");
        expect(container.querySelector(".section-toolbar")).toBeInTheDocument();
        expect(container.querySelector(".section-toolbar-title")).toHaveTextContent("Title");
        expect(container.querySelector(".section-toolbar-options")).toHaveTextContent("Options");
        expect(side).toHaveClass("section-toolbar-side", "side", "fixed", "padded", "centered");
        expect(side).toHaveAttribute("role", "tablist");
        expect(side).toHaveAttribute("aria-label", "Toolbar views");
        expect(divider?.tagName).toBe("SPAN");
    });

    it("forwards a ref to the main toolbar element", () => {
        const ref = createRef<HTMLDivElement>();

        render(<MainToolbar ref={ref} />);

        expect(ref.current).toBeInstanceOf(HTMLDivElement);
        expect(ref.current).toHaveClass("main-toolbar");
    });
});

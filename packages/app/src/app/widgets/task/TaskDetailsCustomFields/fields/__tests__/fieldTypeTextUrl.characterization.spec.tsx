import { fireEvent, render, screen } from "@testing-library/react";
import { FIELDTYPE } from "@stacks/types";
import React from "react";

import { FieldTypeText } from "../FieldTypeText";

const mockOpenInNewTab = jest.fn();

jest.mock("app/components/project", () => ({
    TaskDetailsSection: ({ children, title }: any) => (
        <section>
            <h3>{title}</h3>
            {children}
        </section>
    ),
}));
jest.mock("app/components/common", () => ({ Icon: () => null }));
jest.mock("app/utils/browser", () => ({ openInNewTab: (...args: unknown[]) => mockOpenInNewTab(...args) }));
jest.mock("../FieldTooltip", () => ({ FieldTooltip: () => null }));

const field = {
    id: "field-1",
    title: "Field",
    type: FIELDTYPE.TEXT,
    options: {},
    description: "",
};

describe("text and URL field characterization", () => {
    beforeEach(() => mockOpenInNewTab.mockClear());

    it("commits changed text on blur and skips unchanged values", () => {
        const onChange = jest.fn();
        render(<FieldTypeText {...(field as any)} value="old" onChange={onChange} />);
        const input = screen.getByDisplayValue("old");
        fireEvent.blur(input);
        expect(onChange).not.toHaveBeenCalled();

        fireEvent.change(input, { target: { value: "new" } });
        fireEvent.blur(input);
        expect(onChange).toHaveBeenCalledWith("field-1", "new");
    });

    it("validates URL input and opens valid values", () => {
        const onChange = jest.fn();
        render(
            <FieldTypeText
                {...({ ...field, type: FIELDTYPE.URL } as any)}
                value="https://example.com"
                onChange={onChange}
            />
        );

        fireEvent.click(screen.getByRole("button"));
        expect(mockOpenInNewTab).toHaveBeenCalledWith("https://example.com");
    });
});

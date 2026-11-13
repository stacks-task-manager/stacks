import { Classes } from "@blueprintjs/core";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";

import { CountryPicker } from "../CountryPicker/CountryPicker";
import { IndustryPicker } from "../../people/IndustryPicker/IndustryPicker";
import { CompanyPicker } from "../../people/CompanyPicker/CompanyPicker";

const companies = [
    { id: "company-2", title: "Zeta" },
    { id: "company-1", title: "Acme" },
];

jest.mock("app/store/people", () => ({
    PeopleStore: { use: () => ({ companies }) },
}));

describe("select picker characterization", () => {
    it("renders country options and reports the selected value event", () => {
        const onChange = jest.fn();
        const { container } = render(<CountryPicker onChange={onChange} />);

        expect(container.querySelector(`.${Classes.HTML_SELECT}`)).toHaveClass(Classes.FILL);
        const select = screen.getByRole("combobox");
        expect(select).toHaveDisplayValue("Choose country");
        fireEvent.change(select, { target: { value: "Italy" } });
        expect(onChange).toHaveBeenCalledWith("Italy");
    });

    it("renders industry options and reports the selected value", () => {
        const onChange = jest.fn();
        render(<IndustryPicker defaultValue={null} onChange={onChange} />);

        const select = screen.getByRole("combobox");
        expect(select).toHaveDisplayValue("Choose industry");
        expect(screen.getByRole("option", { name: "Computer Software/Engineering" })).toBeInTheDocument();

        fireEvent.change(select, { target: { value: "Computer Software/Engineering" } });
        expect(onChange).toHaveBeenCalledWith("Computer Software/Engineering");
    });

    it("sorts company options, retains the empty option, and normalizes selection", () => {
        const onChange = jest.fn();
        render(<CompanyPicker onChange={onChange} />);

        const options = screen.getAllByRole("option").map(option => option.textContent);
        expect(options).toEqual(["None", "__________", "Acme", "Zeta"]);

        fireEvent.change(screen.getByRole("combobox"), { target: { value: "company-1" } });
        expect(onChange).toHaveBeenCalledWith("company-1");
    });
});

// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { fireEvent, render, screen } from "@testing-library/react";
import { FeeInput, FeeInputPopup } from "../FeeInput";

// The Icon barrel re-exports the whole widgets tree (ESM-only nanoid breaks jest) — stub it.
jest.mock("app/components/common", () => ({
    Icon: () => null,
}));

const makeCurrency = (code: string, symbol: string, name: string) => ({
    code,
    symbol,
    name,
    symbol_native: symbol,
    decimal_digits: 2,
    rounding: 0,
    name_plural: name,
});

describe("FeeInput", () => {
    beforeEach(() => {
        window.currencies = {
            USD: makeCurrency("USD", "$", "US Dollar"),
            EUR: makeCurrency("EUR", "€", "Euro"),
        };
    });

    it("keeps typed characters in the input and commits on Enter", () => {
        const onChange = jest.fn();
        render(
            <FeeInputPopup value={50} currency="USD" onChange={onChange} label="Hourly fee">
                <button>open</button>
            </FeeInputPopup>
        );

        fireEvent.click(screen.getByText("open"));
        const input = screen.getByDisplayValue("50") as HTMLInputElement;

        fireEvent.change(input, { target: { value: "7" } });
        expect(input.value).toBe("7");

        fireEvent.keyUp(input, { key: "Enter" });
        expect(onChange).toHaveBeenCalledWith(7, "USD");
    });

    it("commits typed value on blur", () => {
        const onChange = jest.fn();
        render(<FeeInput value={50} currency="USD" onChange={onChange} />);

        const input = screen.getByDisplayValue("50") as HTMLInputElement;
        fireEvent.change(input, { target: { value: "75" } });
        fireEvent.blur(input);

        expect(onChange).toHaveBeenCalledWith(75, "USD");
    });

    it("does not commit when the value is unchanged", () => {
        const onChange = jest.fn();
        render(<FeeInput value={50} currency="USD" onChange={onChange} />);

        const input = screen.getByDisplayValue("50") as HTMLInputElement;
        fireEvent.blur(input);

        expect(onChange).not.toHaveBeenCalled();
    });

    it("syncs the input when the value prop changes externally", () => {
        const onChange = jest.fn();
        const { rerender } = render(<FeeInput value={50} currency="USD" onChange={onChange} />);

        rerender(<FeeInput value={99} currency="USD" onChange={onChange} />);
        expect((screen.getByDisplayValue("99") as HTMLInputElement).value).toBe("99");
    });
});

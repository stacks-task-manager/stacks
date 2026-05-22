import { Locator, Page } from "@playwright/test";
import { format } from "date-fns";

export class DatePicker {
    public wrapper: Locator;
    public menu: Locator;
    public menuItems: Locator;
    public cancelButton: Locator;
    public clearButton: Locator;
    public applyButton: Locator;

    public monthPicker: Locator;
    public yearPicker: Locator;
    public day: Locator;
    public hour: Locator;
    public minute: Locator;
    public amPm: Locator;

    constructor(page: Page) {
        this.wrapper = page.getByTestId("date-picker");
        this.menu = this.wrapper.getByTestId("date-picker-menu");
        this.menuItems = this.menu.getByRole("menuitem");
        this.cancelButton = this.wrapper.getByTestId("date-picker-cancel");
        this.clearButton = this.wrapper.getByTestId("date-picker-clear");
        this.applyButton = this.wrapper.getByTestId("date-picker-apply");

        this.monthPicker = this.wrapper.getByRole("combobox", { name: "Month: " });
        this.yearPicker = this.wrapper.getByRole("combobox", { name: "Year: " });
        this.day = this.wrapper.getByRole("gridcell");
        this.hour = this.wrapper.getByRole("spinbutton", { name: /hours/ });
        this.minute = this.wrapper.getByRole("spinbutton", { name: "minutes" });
        this.amPm = this.wrapper.locator("[class*='timepicker-ampm-select']").locator("select");
    }

    public async setDate(date: Date) {
        await this.monthPicker.selectOption({ label: format(date, "MMMM") });
        await this.yearPicker.selectOption({ label: format(date, "yyyy") });
        await this.day.getByText(format(date, "d"), { exact: true }).click();
        await this.hour.fill(format(date, "h"));
        await this.hour.blur();
        await this.minute.fill(format(date, "mm"));
        await this.minute.blur();
        await this.amPm.selectOption({ label: format(date, "a") });
        await this.applyButton.click();
        await this.wrapper.waitFor({ state: "hidden" });
    }
}

export class DateRangePicker {
    public wrapper: Locator;
    public menu: Locator;
    public menuItems: Locator;
    public cancelButton: Locator;
    public clearButton: Locator;
    public applyButton: Locator;

    public startCalendarWrapper: Locator;
    public startMonthPicker: Locator;
    public startYearPicker: Locator;
    public startDay: Locator;
    public endCalendarWrapper: Locator;
    public endMonthPicker: Locator;
    public endYearPicker: Locator;
    public endDay: Locator;

    constructor(page: Page) {
        this.wrapper = page.getByTestId("date-range-picker");
        this.menu = this.wrapper.getByTestId("date-range-picker-menu");
        this.menuItems = this.menu.getByRole("menuitem");
        this.cancelButton = this.wrapper.getByTestId("date-range-picker-cancel");
        this.clearButton = this.wrapper.getByTestId("date-range-picker-clear");
        this.applyButton = this.wrapper.getByTestId("date-range-picker-apply");

        this.startCalendarWrapper = this.wrapper.locator(".rdp-caption_start");
        this.endCalendarWrapper = this.wrapper.locator(".rdp-caption_end");
        this.startMonthPicker = this.startCalendarWrapper.getByRole("combobox", { name: "Month: " });
        this.startYearPicker = this.startCalendarWrapper.getByRole("combobox", { name: "Year: " });
        this.startDay = this.startCalendarWrapper.getByRole("gridcell");
        this.endMonthPicker = this.endCalendarWrapper.getByRole("combobox", { name: "Month: " });
        this.endYearPicker = this.endCalendarWrapper.getByRole("combobox", { name: "Year: " });
        this.endDay = this.endCalendarWrapper.getByRole("gridcell");
    }

    public async setDates({ start, end }: { start?: Date; end?: Date }) {
        if (start) {
            await this.startMonthPicker.selectOption({ label: format(start, "MMMM") });
            await this.startYearPicker.selectOption({ label: format(start, "yyyy") });
            await this.startDay.getByText(format(start, "d"), { exact: true }).click();
        }
        if (end) {
            await this.endMonthPicker.selectOption({ label: format(end, "MMMM") });
            await this.endYearPicker.selectOption({ label: format(end, "yyyy") });
            await this.endDay.getByText(format(end, "d"), { exact: true }).click();
        }
        await this.applyButton.click();
        await this.wrapper.waitFor({ state: "hidden" });
    }
}

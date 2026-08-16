// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.

const mockSavePrefs = jest.fn();
const mockCalendarsList = jest.fn();
const mockGetAuthUrl = jest.fn();
const mockListIntegrationCalendars = jest.fn();
const mockEventsLoad = jest.fn();
const mockEventsRemove = jest.fn();
const mockStorageSet = jest.fn();
const mockConfirm = jest.fn();
const mockRecurringDeleteDialog = jest.fn();
const mockToastWarn = jest.fn();

jest.mock("app/api", () => ({
    __esModule: true,
    default: mockSavePrefs,
    CalendarIntegrationsAPI: {
        getAuthUrl: mockGetAuthUrl,
        listCalendars: mockListIntegrationCalendars,
    },
    CalendarsAPI: {
        list: mockCalendarsList,
    },
    EventsAPI: {
        loadEvents: mockEventsLoad,
        remove: mockEventsRemove,
    },
}));

jest.mock("app/utils/dialog", () => ({
    __esModule: true,
    default: { confirm: mockConfirm },
}));

jest.mock("app/widgets/calendar/RecurringDeleteDialog/RecurringDeleteDialog", () => ({
    showRecurringDeleteDialog: mockRecurringDeleteDialog,
}));

jest.mock("app/hooks", () => ({
    getDatesSpan: () => ({
        from: new Date("2026-07-01T00:00:00.000Z"),
        to: new Date("2026-07-31T23:59:59.999Z"),
    }),
}));

jest.mock("../tasks", () => ({ TasksActions: {} }));

jest.mock("app/utils/storage", () => ({
    __esModule: true,
    default: {
        get: jest.fn(),
        set: mockStorageSet,
    },
    getStorage: jest.fn(() => null),
}));

jest.mock("app/utils/toast", () => ({
    __esModule: true,
    default: {
        success: jest.fn(),
        warn: mockToastWarn,
    },
}));

jest.mock("@stacks/translations", () => ({
    translate: (key: string) => key,
}));

const localCalendar = {
    id: "local",
    title: "Local",
    color: "#ff8c00",
    source: "local",
    primary: true,
    readOnly: false,
};

const googleCalendar = {
    id: "primary@gmail.com",
    title: "Primary Google",
    color: "#4285f4",
    source: "google",
    primary: true,
    readOnly: false,
};

const googleRecurringEvent = {
    id: "google-calendar-1_instance-1",
    title: "Standup",
    description: "",
    start: new Date("2026-07-01T09:00:00.000Z"),
    end: new Date("2026-07-01T09:30:00.000Z"),
    allDay: false,
    assignees: [],
    source: "google" as const,
    calendar: "calendar-1",
    original: {
        google: {
            calendarId: "calendar-1",
            eventId: "instance-1",
            recurringEventId: "series-1",
            originalStartTime: { dateTime: "2026-07-01T09:00:00.000Z" },
            isRecurringInstance: true,
        },
    },
};

const setCalendarEvent = (CalendarStore: typeof import("../../calendar").CalendarStore) => {
    CalendarStore.set(state => ({
        ...state,
        events: [
            {
                title: googleRecurringEvent.title,
                start: googleRecurringEvent.start,
                end: googleRecurringEvent.end,
                resource: { type: "event", data: googleRecurringEvent },
            } as any,
        ],
    }));
};

describe("CalendarActions Google calendar loading", () => {
    let CalendarActions: typeof import("../calendar").CalendarActions;
    let CalendarStore: typeof import("../../calendar").CalendarStore;

    beforeAll(async () => {
        CalendarActions = (await import("../calendar")).CalendarActions;
        CalendarStore = (await import("../../calendar")).CalendarStore;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        CalendarStore?.init();
        mockSavePrefs.mockResolvedValue(undefined);
        mockCalendarsList.mockResolvedValue([localCalendar]);
        mockListIntegrationCalendars.mockResolvedValue([googleCalendar]);
        mockEventsLoad.mockResolvedValue([]);
        mockEventsRemove.mockResolvedValue(true);
        mockConfirm.mockResolvedValue(true);
    });

    it("loads Google calendars and events after boot hydration", async () => {
        await CalendarActions.hydrateFromBoot({ google: { isAuthenticated: true } });
        await CalendarActions.load();

        expect(mockListIntegrationCalendars).toHaveBeenCalledWith("google");
        expect(CalendarStore.get().calendars).toEqual([localCalendar, googleCalendar]);
        expect(CalendarStore.get().filters.showCalendars).toContain("google-primary@gmail.com");
        expect(mockEventsLoad).toHaveBeenCalledWith(expect.any(Date), expect.any(Date), [
            "local",
            "google:primary@gmail.com",
        ]);
        expect(mockSavePrefs).toHaveBeenCalledWith("events/savePrefs", {
            filters: expect.objectContaining({
                showCalendars: ["local", "google-primary@gmail.com"],
            }),
        });
    });

    it("does not request deletion when the recurring dialog is cancelled", async () => {
        setCalendarEvent(CalendarStore);
        mockRecurringDeleteDialog.mockResolvedValue(null);

        await CalendarActions.deleteEventAlert(googleRecurringEvent);

        expect(mockEventsRemove).not.toHaveBeenCalled();
    });

    it("sends instance metadata for one occurrence and reloads Google events", async () => {
        setCalendarEvent(CalendarStore);
        mockRecurringDeleteDialog.mockResolvedValue("single");

        await CalendarActions.deleteEventAlert(googleRecurringEvent);

        expect(mockEventsRemove).toHaveBeenCalledWith(googleRecurringEvent.id, {
            scope: "single",
            calendarId: "calendar-1",
            googleEventId: "instance-1",
            recurringEventId: "series-1",
        });
        expect(mockEventsLoad).toHaveBeenCalled();
    });

    it("sends the parent id metadata for an entire series", async () => {
        setCalendarEvent(CalendarStore);
        mockRecurringDeleteDialog.mockResolvedValue("series");

        await CalendarActions.deleteEventAlert(googleRecurringEvent);

        expect(mockEventsRemove).toHaveBeenCalledWith(
            googleRecurringEvent.id,
            expect.objectContaining({ scope: "series", recurringEventId: "series-1" })
        );
    });

    it("does not fall back to deleting an instance when series metadata is missing", async () => {
        jest.spyOn(console, "error").mockImplementation(() => undefined);
        const incompleteEvent = {
            ...googleRecurringEvent,
            original: {
                google: {
                    ...googleRecurringEvent.original.google,
                    recurringEventId: undefined,
                },
            },
        };
        setCalendarEvent(CalendarStore);
        mockRecurringDeleteDialog.mockResolvedValue("series");

        await CalendarActions.deleteEventAlert(incompleteEvent);

        expect(mockEventsRemove).not.toHaveBeenCalled();
        expect(mockToastWarn).toHaveBeenCalledWith("Problem removing selected event");
    });

    it("retains the translated warning when Google deletion fails", async () => {
        jest.spyOn(console, "error").mockImplementation(() => undefined);
        setCalendarEvent(CalendarStore);
        mockRecurringDeleteDialog.mockResolvedValue("single");
        mockEventsRemove.mockRejectedValue(new Error("Google unavailable"));

        await CalendarActions.deleteEventAlert(googleRecurringEvent);

        expect(mockToastWarn).toHaveBeenCalledWith("Problem removing selected event");
    });
});

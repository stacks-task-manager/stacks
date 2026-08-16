// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.

const mockSavePrefs = jest.fn();
const mockCalendarsList = jest.fn();
const mockGetAuthUrl = jest.fn();
const mockListIntegrationCalendars = jest.fn();
const mockEventsLoad = jest.fn();
const mockStorageSet = jest.fn();

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
    },
}));

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
        warn: jest.fn(),
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

const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

const deferred = <T,>() => {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>(innerResolve => {
        resolve = innerResolve;
    });
    return { promise, resolve };
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
    });

    it("bypasses an in-flight unauthenticated calendar load after OAuth success", async () => {
        const firstLocalLoad = deferred<typeof localCalendar[]>();
        mockCalendarsList.mockImplementationOnce(() => firstLocalLoad.promise).mockResolvedValue([localCalendar]);
        mockGetAuthUrl.mockResolvedValue({ authUrl: "https://accounts.google.test/oauth" });

        const staleLoad = CalendarActions.loadCalendars();
        const popup = {
            closed: false,
            close: jest.fn(() => {
                popup.closed = true;
            }),
        };
        jest.spyOn(window, "open").mockReturnValue(popup as unknown as Window);

        await CalendarActions.loginGoogle();
        window.dispatchEvent(
            new MessageEvent("message", {
                origin: window.location.origin,
                data: { type: "GOOGLE_AUTH_SUCCESS" },
            })
        );

        await flushPromises();
        await flushPromises();

        firstLocalLoad.resolve([localCalendar]);
        await staleLoad;
        await flushPromises();

        expect(mockListIntegrationCalendars).toHaveBeenCalledWith("google");
        expect(CalendarStore.get().calendars).toEqual([localCalendar, googleCalendar]);
        expect(CalendarStore.get().filters.showCalendars).toContain("google-primary@gmail.com");
        expect(mockEventsLoad).toHaveBeenCalledWith(
            expect.any(Date),
            expect.any(Date),
            ["local", "google:primary@gmail.com"]
        );
    });

    it("loads Google calendars and events after boot hydration", async () => {
        await CalendarActions.hydrateFromBoot({ google: { isAuthenticated: true } });
        await CalendarActions.load();

        expect(mockListIntegrationCalendars).toHaveBeenCalledWith("google");
        expect(CalendarStore.get().calendars).toEqual([localCalendar, googleCalendar]);
        expect(CalendarStore.get().filters.showCalendars).toContain("google-primary@gmail.com");
        expect(mockEventsLoad).toHaveBeenCalledWith(
            expect.any(Date),
            expect.any(Date),
            ["local", "google:primary@gmail.com"]
        );
        expect(mockSavePrefs).toHaveBeenCalledWith("events/savePrefs", {
            filters: expect.objectContaining({
                showCalendars: ["local", "google-primary@gmail.com"],
            }),
        });
    });
});

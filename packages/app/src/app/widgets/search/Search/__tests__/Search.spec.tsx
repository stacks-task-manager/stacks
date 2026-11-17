import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RECORDTYPE, type ISearchResult } from "@stacks/types";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { SearchAPI } from "app/api";
import { Search } from "../Search";

jest.mock("app/api", () => ({ SearchAPI: { search: jest.fn() } }));
jest.mock("app/hooks", () => ({
    useMousetrap: jest.fn(),
    useNav: () => jest.fn(),
    useStorage: () => [["incomplete-tasks", "comments", "attachments"], jest.fn()],
}));
jest.mock("app/components/common", () => ({
    Col: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
    Grid: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
    HotkeyChip: () => null,
    Icon: () => null,
    Row: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
    Scroller: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));
jest.mock("app/components/project", () => ({ PriorityChip: () => null }));
jest.mock("app/widgets", () => ({
    ProjectStatus: () => null,
    Tags: () => null,
    TagsWrapper: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));
jest.mock("app/widgets/people/Assignees/Assignees", () => ({ Assignees: () => null }));
jest.mock("app/utils/dom", () => ({ scrollIntoView: jest.fn() }));

const result = (id: string, title: string): ISearchResult => ({
    id,
    title,
    type: RECORDTYPE.NOTEPAD,
    parentId: "parent",
    parentType: RECORDTYPE.NOTEPAD,
    parentTitle: "Parent",
    data: {},
    url: "",
});

const deferred = <T,>() => {
    let resolve!: (value: T) => void;
    let reject!: (reason: Error) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
};

beforeEach(() => {
    jest.useFakeTimers();
    jest.mocked(SearchAPI.search).mockReset();
});

afterEach(() => {
    jest.useRealTimers();
});

it("keeps the newest results when an older search resolves last", async () => {
    const older = deferred<ISearchResult[]>();
    const newer = deferred<ISearchResult[]>();
    jest.mocked(SearchAPI.search).mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise);

    render(
        <MemoryRouter>
            <Search onClose={jest.fn()} />
        </MemoryRouter>
    );
    const input = screen.getByTestId("search-query-input");

    fireEvent.change(input, { target: { value: "ab" } });
    jest.advanceTimersByTime(500);
    fireEvent.change(input, { target: { value: "abc" } });
    jest.advanceTimersByTime(500);

    newer.resolve([result("new", "Newest result")]);
    await screen.findByText("Newest result");
    older.resolve([result("old", "Stale result")]);

    await waitFor(() => expect(screen.queryByText("Stale result")).not.toBeInTheDocument());
    expect(screen.getByText("Newest result")).toBeInTheDocument();
});

it("stops loading and shows an empty result state after a failed search", async () => {
    jest.mocked(SearchAPI.search).mockRejectedValue(new Error("Search failed"));
    render(
        <MemoryRouter>
            <Search onClose={jest.fn()} />
        </MemoryRouter>
    );

    fireEvent.change(screen.getByTestId("search-query-input"), { target: { value: "abc" } });
    jest.advanceTimersByTime(500);

    expect(await screen.findByTestId("search-no-results")).toBeInTheDocument();
});

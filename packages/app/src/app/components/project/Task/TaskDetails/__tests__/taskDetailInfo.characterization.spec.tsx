import { render, screen } from "@testing-library/react";
import { ITask, TASKDETAILMATRIX } from "@stacks/types";
import React from "react";

import { TaskDetailInfo } from "../TaskDetailInfo";

jest.mock("@stacks/translations", () => ({ translate: (key: string) => key }));
jest.mock("app/components/common", () => ({
    DatePickerButton: () => null,
    HotkeyChip: () => null,
}));
jest.mock("app/components/project", () => ({
    TaskDetailsSection: ({ children }: React.PropsWithChildren) => <section>{children}</section>,
}));
jest.mock("app/components/project/PriorityPicker/PriorityPicker", () => ({
    PriorityPicker: () => null,
}));
jest.mock("app/widgets", () => ({
    TaskDateField: () => null,
    TaskDetailsTags: () => null,
    TaskStatus: ({ variant }: { variant?: "picker" | "detail" }) => (
        <div data-testid="task-status" data-variant={variant ?? "picker"} />
    ),
}));
jest.mock("app/store/actions", () => ({ TasksActions: {} }));
jest.mock("app/hooks", () => ({ getProject: jest.fn() }));
jest.mock("app/utils/date", () => ({ formatStringDuration: jest.fn() }));
jest.mock("../../TaskDetailsCover/TaskDetailsCover", () => ({ TaskDetailsCover: () => null }));

describe("task detail info characterization", () => {
    it("uses the detail status behavior in the task-details status section", () => {
        render(
            <TaskDetailInfo
                task={{ id: "task-1", status: "status-1" } as ITask}
                section={TASKDETAILMATRIX.STATUS}
                onClose={jest.fn()}
                testIdSuffix="details"
            />
        );

        expect(screen.getByTestId("task-status")).toHaveAttribute("data-variant", "detail");
    });
});

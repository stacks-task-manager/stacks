import { PROJECTVIEW } from "@stacks/types";
import { ProjectsStatusActions } from "../projectsStatus";
import { PROJECT_ACTIVE_VIEWS, PROJECT_LAST_VIEW_TYPES, ProjectsStatusStore } from "app/store/projectsStatus";
import { setStorage, setStorageTenant } from "app/utils/storage";

jest.mock("app/hooks", () => ({ getCurrentProjectId: () => "project" }));

describe("project view hydration after authenticated bootstrap", () => {
    afterEach(() => {
        window.localStorage.clear();
        setStorageTenant("uninitialized");
        ProjectsStatusStore.init();
    });

    it("loads the authenticated namespace instead of keeping module-initialization view state", () => {
        window.localStorage.clear();
        setStorageTenant("before-bootstrap");
        setStorage(PROJECT_LAST_VIEW_TYPES, { project: PROJECTVIEW.NOTES });
        ProjectsStatusStore.init();
        expect(ProjectsStatusStore.get().lastViewTypes.project).toBe(PROJECTVIEW.NOTES);

        setStorageTenant("authenticated-tenant");
        setStorage(PROJECT_LAST_VIEW_TYPES, { project: PROJECTVIEW.OVERVIEW });
        setStorage(PROJECT_ACTIVE_VIEWS, { project: [PROJECTVIEW.BOARD, PROJECTVIEW.OVERVIEW] });
        ProjectsStatusActions.loadSaved();

        expect(ProjectsStatusStore.get().lastViewTypes).toEqual({ project: PROJECTVIEW.OVERVIEW });
        expect(ProjectsStatusStore.get().activeViews).toEqual({
            project: [PROJECTVIEW.BOARD, PROJECTVIEW.OVERVIEW],
        });
    });

    it("uses empty defaults when the authenticated tenant has no saved views", () => {
        window.localStorage.clear();
        setStorageTenant("before-bootstrap");
        setStorage(PROJECT_LAST_VIEW_TYPES, { project: PROJECTVIEW.NOTES });
        ProjectsStatusStore.init();
        setStorageTenant("empty-authenticated-tenant");

        ProjectsStatusActions.loadSaved();

        expect(ProjectsStatusStore.get().lastViewTypes).toEqual({});
        expect(ProjectsStatusStore.get().activeViews).toEqual({});
    });
});

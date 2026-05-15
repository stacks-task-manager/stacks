// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { NotepadActions, PeopleActions, ProjectsActions, TasksActions } from "app/store/actions";

/** Strict URL check (https/ftp, host, optional path). Prefer this over ad-hoc regexes. */
export const isValidUrl = (url: string) => {
    return /^(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:[/?#]\S*)?$/i.test(
        url
    );
};

/*
project:    /p/projectId
task:       /t/taskId
notepad:    /n/notepadId
attachment: /a/attachmentId
person:     /e/personId
company:    /c/companyId
*/
// Sharing-by-deep-link is not implemented yet. See [follow-up needed].
// When implemented, this should resolve the current workspace, build a
// `stacks://...` URL, copy to clipboard, and surface a toast.
export const share = (_route: string): void => {
    // intentionally no-op
};

export const urlDecoder = async (url: string) => {
    const [workspaceId, section, id] = url.split("/");

    let localRoute = "/";

    if (section === "t") {
        const task = await TasksActions.getTask(id);

        if (task) {
            localRoute = `/project/${task.project}/${task.id}`;
        }
    } else if (section === "p") {
        const project = await ProjectsActions.getProject(id);
        if (project) {
            localRoute = `/project/${project.id}`;
        }
    } else if (section === "n") {
        const notepad = await NotepadActions.getNotepad(id);
        if (notepad) {
            localRoute = `/notepad/${notepad.id}`;
        }
    } else if (section === "e") {
        const person = PeopleActions.getPerson(id);
        if (person) {
            localRoute = `/people/person/${person.id}`;
        }
    } else if (section === "c") {
        const company = PeopleActions.getCompany(id);
        if (company) {
            localRoute = `/people/company/${company.id}`;
        }
    }

    return localRoute;
};

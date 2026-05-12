// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Classes } from "@blueprintjs/core";
import { FILES_TYPE, IAttachment, ROLE_SECTIONS } from "@stacks/types";
import { Editor } from "@tiptap/core"
import { useCanAccess, useProject } from "app/hooks";
import { useUpload } from "app/hooks/fileUpload";
import { FilesActions, ProjectsActions } from "app/store/actions";
import { TipTapEditor, TipTapEditorContent, TipTapToolbar } from "app/widgets"
import React, { useRef, useState } from "react"
import { useParams } from "react-router-dom";

export const Notes = () => {
    const params = useParams();
    const [editor, setEditor] = useState<Editor | null>(null);
    const saveDebounce = useRef<NodeJS.Timeout | null>(null);
    const { project } = useProject(params.id || "");
    const { pickFiles } = useUpload();
    const { write } = useCanAccess(ROLE_SECTIONS.PROJECT_SETTINGS);

    const handleSaveContents = ({ html }: TipTapEditorContent) => {
        if (saveDebounce.current) {
            clearTimeout(saveDebounce.current);
            saveDebounce.current = null;
        }

        saveDebounce.current = setTimeout(() => {
            if (!params.id) return;
            ProjectsActions.setNotes(params.id, html);
        }, 500);
    };

    const handleUpload = async (cb: (files: IAttachment[]) => void) => {
        await pickFiles({ recordId: project!.id, type: FILES_TYPE.PROJECT_DESCRIPTION, onUploaded: cb });
    };

    const handleLoadHistory = async () => {
        if (!params.id) return [];
        return await FilesActions.load(params.id!, FILES_TYPE.PROJECT_DESCRIPTION);
    };

    const handleFileAction = async (attachmentId: string) => {
        if (!params.id) return;

        await FilesActions.remove(attachmentId);
    };

    return (<>
        {write && (<TipTapToolbar
            editor={editor}
            className={Classes.NAVBAR}
            onFileAdd={Boolean(project) ? handleUpload : undefined}
            onLoadHistory={handleLoadHistory}
        />)}

        <TipTapEditor disabled={!write} value={project?.notes || ""} onBoot={setEditor} onUpdate={handleSaveContents}
            onFileDelete={handleFileAction}
        />
    </>)
}
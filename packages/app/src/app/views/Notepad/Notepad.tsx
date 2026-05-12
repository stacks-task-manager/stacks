// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Button, Classes, Tooltip } from "@blueprintjs/core";
import { Editor } from "@tiptap/core";
import classNames from "classnames";
import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

import { FILES_TYPE, IAttachment } from "@stacks/types";
import { Icon } from "app/components/common";
import { usePreferences } from "app/hooks";
import { useUpload } from "app/hooks/fileUpload";
import { FilesActions, NotepadActions } from "app/store/actions";
import { NotepadStore } from "app/store/notepad";
import {
    AppView,
    AppViewContent,
    TipTapEditor,
    TipTapEditorContent,
    TipTapToolbar,
    ToolbarNotepad,
} from "app/widgets";
import { SeparatorItem } from "app/widgets/common/TipTapEditor/toolbar/SeparatorItem";

export const Notepad = () => {
    const [wide, setWide] = useState(false);
    const [editor, setEditor] = useState<Editor | null>(null);
    const { notepad, isLoading } = NotepadStore.use();
    const { pickFiles, removeByRecord } = useUpload();
    const params = useParams();
    const saveDebounce = useRef<NodeJS.Timeout | null>(null);
    const { notepadSpellCheck } = usePreferences(["notepadSpellCheck"]);

    useEffect(() => {
        if (!params.id) return;
        NotepadActions.load(params.id);
    }, [params.id]);

    const handleUpload = async (cb: (files: IAttachment[]) => void) => {
        await pickFiles({ recordId: notepad!.id, type: FILES_TYPE.NOTEPAD_FILE, onUploaded: cb });
    };

    const handleSaveContents = ({ html }: TipTapEditorContent) => {
        if (saveDebounce.current) {
            clearTimeout(saveDebounce.current);
            saveDebounce.current = null;
        }

        saveDebounce.current = setTimeout(() => {
            NotepadActions.setContent(html);
        }, 500);
    };

    const handleRemoveCover = async () => {
        await removeByRecord(notepad!.id, FILES_TYPE.TASK_COVER);
        await NotepadActions.removeCover();
    };

    const handleFileAction = async (attachmentId: string) => {
        if (!params.id) return;

        await FilesActions.remove(attachmentId);
    };

    const handleAddCover = async () => {
        if (!notepad?.id) return;
        pickFiles({
            recordId: notepad.id, type: FILES_TYPE.NOTEPAD_COVER, onUploaded: async (attachments: IAttachment[]) => {
                for (const attachment of attachments) {
                    if (attachment.type === FILES_TYPE.NOTEPAD_COVER && attachment.thumbnailUrl) {
                        await NotepadActions.setCover(attachment.thumbnailUrl)
                    }
                }
            }
        });
    };

    const handleLoadHistory = async () => {
        if (!params.id) return [];
        return await FilesActions.load(params.id!, FILES_TYPE.NOTEPAD_FILE);
    };

    return (
        <AppView toolbar={<ToolbarNotepad />}>
            <AppViewContent id="notepad" className={classNames({ wide })}>
                {isLoading && (
                    <div style={{ padding: 20 }}>
                        <h1 style={{ width: "50%", margin: "0 auto" }} className={Classes.SKELETON}>
                            Lorem
                        </h1>
                        <br />
                        <div
                            className={Classes.SKELETON}
                            style={{ width: "80%", height: 300, margin: "0 auto" }}
                        >
                            ...
                        </div>
                        <br />
                        <p className={Classes.SKELETON}>...</p>
                        <p className={Classes.SKELETON}>...</p>
                        <p className={Classes.SKELETON}>...</p>
                        <p className={Classes.SKELETON}>...</p>
                        <p className={Classes.SKELETON}>...</p>

                        <p className={Classes.SKELETON} style={{ width: "50%" }}>
                            ...
                        </p>
                    </div>
                )}

                <TipTapToolbar
                    editor={editor}
                    className={Classes.NAVBAR}
                    onFileAdd={notepad ? handleUpload : undefined}
                    onLoadHistory={handleLoadHistory}
                >
                    <Tooltip
                        content={wide ? "Make narrow" : "Make wider"}
                        placement="top-end"
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        renderTarget={({ isOpen, ...props }) => (
                            <Button
                                {...props}
                                variant="minimal"
                                icon={<Icon icon={wide ? "shrink" : "expand-01"} />}
                                onClick={() => setWide(!wide)}
                            />
                        )}
                    />

                    <SeparatorItem />
                    <Tooltip
                        content={notepad?.cover ? "Remove cover" : "Add cover image"}
                        placement="top-end"
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        renderTarget={({ isOpen, ...props }) => (
                            <Button
                                {...props}
                                variant="minimal"
                                icon={<Icon icon={notepad?.cover ? "image-x" : "image-up"} />}
                                onClick={notepad?.cover ? handleRemoveCover : handleAddCover}
                            />
                        )}
                    />
                </TipTapToolbar>

                {!isLoading && notepad?.cover != null && (
                    <div className="notepad-cover-image">
                        <img src={notepad.cover} alt="" />
                    </div>
                )}

                {!isLoading && notepad != null && (
                    <TipTapEditor
                        value={notepad.content}
                        spellCheck={notepadSpellCheck}
                        onBoot={setEditor}
                        onUpdate={handleSaveContents}
                        onFileDelete={handleFileAction}
                    />
                )}
            </AppViewContent>
        </AppView>
    );
};

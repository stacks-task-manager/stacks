// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Button, Classes, Intent } from "@blueprintjs/core";
import classNames from "classnames";
import Mousetrap from "mousetrap";
import React, { FunctionComponent, useEffect, useRef, useState } from "react";
import { Avatar, Col, Grid, Row } from "app/components/common";
import { shallowEqual } from "app/hooks/store";
import { ACTIVITYRESOURCETYPE, ACTIVITYTYPE, FILES_TYPE, IAttachment } from "@stacks/types";
import { ActivitiesActions, AttachmentsActions } from "app/store/actions";
import { PeopleStore } from "app/store/people";
import { scrollIntoView } from "app/utils/dom";
import { Editor, TipTapEditorContent } from "app/widgets";
import { AttachmentsStore } from "app/store/attachments";
import { useUpload } from "app/hooks/fileUpload";

/**
 * "/" quick-focus must be a module-level singleton: with many CommentsInput
 * instances mounted, each binding/unbinding the same global key would clobber
 * the others. We bind once and target the most-recently-mounted instance.
 */
let latestCommentInput: HTMLDivElement | null = null;
let globalSlashBound = false;

const focusLatestCommentInput = () => {
    if (latestCommentInput) {
        const editable = latestCommentInput.querySelector(
            ".comments-input .custom-editable-text"
        ) as HTMLDivElement | null;
        if (editable) editable.click();
    }
};

const ensureGlobalSlashBinding = () => {
    if (globalSlashBound) return;
    globalSlashBound = true;
    Mousetrap.bind("/", focusLatestCommentInput);
};

interface ICommentsInputProps {
    resourceId: string;
    parentId?: string;
}
export const CommentsInput: FunctionComponent<ICommentsInputProps> = ({ resourceId, parentId }) => {
    const [active, setActive] = useState(false);
    const [message, setMessage] = useState("");
    const me = PeopleStore.use(state => state.me, shallowEqual);
    const { pickFiles } = useUpload();

    const inputRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const node = inputRef.current;
        latestCommentInput = node;
        ensureGlobalSlashBinding();
        return () => {
            if (node === latestCommentInput) {
                latestCommentInput = null;
            }
        };
    }, []);

    const currentUser = PeopleStore.use(state => state.people.find(person => person.id === me), shallowEqual);

    const handleChangeMessage = ({ html, string }: TipTapEditorContent) => {
        setMessage(html);
        setActive(string.trim().length > 0);
    };

    const handleAddMessage = async () => {
        if (!message.trim().length || !me) {
            // window.toaster.show({
            //     message: "Make sure comment has some content",
            //     intent: Intent.WARNING,
            // });
            return;
        }

        await ActivitiesActions.addActivity({
            resourceId,
            resourceType: ACTIVITYRESOURCETYPE.TASK,
            type: ACTIVITYTYPE.MESSAGE,
            content: message,
            person: me,
            parent: parentId,
            updated: new Date(),
        });

        setMessage("");
        setActive(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
        if (event.ctrlKey && event.key === "Enter") {
            event.preventDefault();
            handleAddMessage();
        }
    };

    const handleFocus = () => {
        // setActive(true);
        setTimeout(() => {
            const comments = document.getElementById("comments");
            scrollIntoView(comments, { behavior: "smooth", block: "start" });
        });
    };

    const handleBlur = () => {
        if (!message.length) setActive(false);
        // handleAddMessage();
    };

    const handleAddAttachments = async (cb: (files: IAttachment[]) => void) => {
        await pickFiles({ recordId: resourceId, type: FILES_TYPE.TASK_COMMENT, onUploaded: cb });
    };

    const handleLoadHistory = async (): Promise<IAttachment[]> => {
        return AttachmentsStore.get().attachments[resourceId];
    };

    const handleFileDeleted = (attachmentId: string) => {
        AttachmentsActions.deleteAttachment(resourceId, attachmentId);
    };

    return (
        <div className="comments-input" ref={inputRef}>
            <Grid>
                <Row padding={10}>
                    <Col gap={10}>
                        {currentUser && <Avatar person={currentUser} small />}
                        <Editor
                            value={message}
                            onUpdate={handleChangeMessage}
                            placeholder={translate("Add a comment")}
                            showHelp={false}
                            onFocus={handleFocus}
                            onBlur={handleBlur}
                            onKeyDown={handleKeyDown}
                            onFileAdd={handleAddAttachments}
                            onLoadHistory={handleLoadHistory}
                            onFileDelete={handleFileDeleted}
                        >
                            {active ? (
                                <Row>
                                    <Col justify="right" align="center" gap={10}>
                                        <span
                                            className={classNames([Classes.TEXT_MUTED, Classes.TEXT_SMALL])}
                                        >
                                            {translate("Ctrl enter to send")}
                                        </span>
                                        <Button
                                            intent={Intent.PRIMARY}
                                            size="small"
                                            onClick={handleAddMessage}
                                            data-testid="comment-send-button"
                                        >
                                            {translate("Send")}
                                        </Button>
                                    </Col>
                                </Row>
                            ) : null}
                        </Editor>
                    </Col>
                </Row>
            </Grid>
        </div>
    );
};

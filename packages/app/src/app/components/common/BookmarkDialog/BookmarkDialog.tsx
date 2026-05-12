// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Button, Classes, Dialog, FormGroup, InputGroup, Intent, Switch } from "@blueprintjs/core";
import React, { FunctionComponent, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Icon } from "app/components/common";
import { shallowEqual } from "app/hooks/store";
import { IBookmark, RECORDTYPE } from "@stacks/types";
import { BookmarksActions, TasksActions } from "app/store/actions";
import { BookmarksStore } from "app/store/bookmarks";
import { GlobalStore, toggleNewBookmark } from "app/store/global";
import { PeopleStore } from "app/store/people";
import Toast from "app/utils/toast";
import { getDocument } from "app/hooks";

interface IBookmarkDialogProps {
    bookmark?: IBookmark;
}
export const BookmarkDialog: FunctionComponent<IBookmarkDialogProps> = ({ bookmark }) => {
    const isNewBookmarkVisible = GlobalStore.use(state => state.isNewBookmarkVisible, shallowEqual);
    const [open, setOpen] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [resourceId, setResourceId] = useState<string | undefined>(
        bookmark ? bookmark.resourceId : undefined
    );
    const [title, setTitle] = useState<string | undefined>(bookmark ? bookmark.title : undefined);
    const [type, setType] = useState<RECORDTYPE | undefined>(bookmark ? bookmark.type : undefined);
    const [url, setUrl] = useState<string | undefined>(bookmark ? bookmark.url : undefined);
    const [pinned, setPinned] = useState<boolean>(bookmark ? bookmark.pinned : false);
    const location = useLocation();

    useEffect(() => {
        if (!isNewBookmarkVisible) return;
        (async () => {
            const slugs = location.pathname.split("/");
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const [_slash, currentType, id, secondaryId] = slugs;
            let type = currentType;
            let recordId = id;

            if (type === "project" && slugs.length === 4) {
                type = "task";
                recordId = secondaryId;
            } else if ("mytasks" === type) {
                type = "task";
                recordId = id;
            }

            setResourceId(recordId);
            setType(type as RECORDTYPE);

            if (type === "project" || type === "notepad") {
                const document = getDocument(id);
                setTitle(document?.text);
            } else if (type === "task") {
                const task = await TasksActions.getCurrent();
                if (task) setTitle(task.title);
            } else if (type === "person") {
                const { people } = PeopleStore.get();
                const person = people.find(person => person.id === id);
                if (person) setTitle(`${person.firstName} ${person.lastName}`);
            } else if (type === "company") {
                const { companies } = PeopleStore.get();
                const company = companies.find(company => company.id === id);
                if (company) setTitle(company.title);
            } else {
                setType(RECORDTYPE.URL);
            }
        })();
    }, [isNewBookmarkVisible]);

    const canSave = useMemo(() => {
        if (type === RECORDTYPE.URL && url?.trim().length === 0) {
            return false;
        }
        if (title?.trim().length === 0 || !type) {
            return false;
        }
        return true;
    }, [title, type, url, resourceId]);

    if (!isNewBookmarkVisible) return null;

    const handleClosed = () => {
        toggleNewBookmark();
        setOpen(true);
    };

    const handleClose = () => {
        setResourceId(undefined);
        setTitle(undefined);
        setType(undefined);
        setUrl(undefined);
        setOpen(false);
    };

    const handleChangeTitle = (event: React.ChangeEvent<HTMLInputElement>) => {
        setTitle(event.currentTarget.value);
    };

    const handleChangeURL = (event: React.ChangeEvent<HTMLInputElement>) => {
        setUrl(event.currentTarget.value);
    };

    const handleSetPinned = (event: React.ChangeEvent<HTMLInputElement>) => {
        setPinned(event.currentTarget.checked);
    };

    const handleSave = () => {
        if (!canSave) return;

        const { bookmarks } = BookmarksStore.get();
        if (
            bookmarks.some(bookmark => {
                if (resourceId != null && bookmark.resourceId === resourceId) return true;
                if (url != null && bookmark.url === url) return true;
                return false;
            })
        ) {
            // Toast.warn("There's already a bookmark for this resource");
            // return;
            if (resourceId) BookmarksActions.removeResource(resourceId);
        }

        setIsSaving(true);

        BookmarksActions.add({
            title: title!,
            type: type!,
            resourceId: resourceId!,
            url,
            pinned,
        });

        Toast.success("Bookmark added successfully!", <Icon icon="bookmark" />);

        handleClose();
        setIsSaving(false);
    };

    return (
        <Dialog
            isOpen={open}
            title="Add bookmark"
            icon={<Icon icon="bookmark" />}
            onClose={handleClose}
            onClosed={handleClosed}
            style={{ width: 400 }}
            aria-labelledby="new-bookmark-dialog"
        >
            <div className={Classes.DIALOG_BODY}>
                <FormGroup label="Title">
                    <InputGroup value={title} onChange={handleChangeTitle} autoFocus
                        data-testid="new-bookmark-name-input"
                    />
                </FormGroup>
                {type === "url" && (
                    <FormGroup label="Url">
                        <InputGroup value={url} onChange={handleChangeURL}
                            data-testid="new-bookmark-url-input"
                        />
                    </FormGroup>
                )}
                <Switch checked={pinned} onChange={handleSetPinned} label="Pinned" />
            </div>
            <div className={Classes.DIALOG_FOOTER}>
                <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                    <Button
                        data-testid="new-bookmark-dialog-cancel-button"
                        variant="minimal" intent={Intent.NONE} onClick={handleClose}
                    >
                        {translate("Cancel")}
                    </Button>
                    <Button
                        intent={Intent.PRIMARY}
                        disabled={!canSave}
                        onClick={handleSave}
                        loading={isSaving}
                        data-testid="new-bookmark-dialog-save-button"
                    >
                        Add bookmark
                    </Button>
                </div>
            </div>
        </Dialog>
    );
};

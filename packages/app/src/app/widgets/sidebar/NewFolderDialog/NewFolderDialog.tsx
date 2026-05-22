// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Button, Checkbox, Classes, Dialog, FormGroup, InputGroup, Intent } from "@blueprintjs/core";
import React, { FunctionComponent, useState } from "react";
import { Icon } from "app/components/common";
import { APPICONS } from "@stacks/types";

interface INewFolderDialogProps {
    onSave: (folderName: string, isPublic: boolean) => void;
    onClose: () => void;
}
export const NewFolderDialog: FunctionComponent<INewFolderDialogProps> = ({ onSave, onClose }) => {
    const [value, setValue] = useState("");
    const [isPublic, setIsPublic] = useState(true);
    const [open, setOpen] = useState(true);

    const handleChangeValue = (event: React.ChangeEvent<HTMLInputElement>) => {
        setValue(event.currentTarget.value);
    };

    const handleClose = () => {
        setOpen(false);
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.keyCode === 27) {
            handleClose();
        } else if (event.keyCode === 13) {
            handleSaveFolder();
        }
    };

    const handleClosed = () => {
        onClose();
    };

    const handleChangePublic = () => {
        setIsPublic(!isPublic);
    };

    const handleSaveFolder = () => {
        if (value.trim().length === 0) return;
        onSave(value, isPublic);
        onClose();
    };

    return (
        <Dialog
            title="New folder"
            icon={<Icon icon={APPICONS.FOLDER} />}
            isOpen={open}
            style={{ width: 300 }}
            canEscapeKeyClose
            onClose={handleClose}
            onClosed={handleClosed}
            aria-labelledby="new-folder-dialog"
        >
            <div className={Classes.DIALOG_BODY}>
                <FormGroup label="Folder name" style={{ marginBottom: 0 }}>
                    <InputGroup
                        placeholder={translate("Untitled folder")}
                        value={value}
                        autoFocus
                        onKeyDown={handleKeyDown}
                        onChange={handleChangeValue}
                        data-testid="new-folder-input"
                    />
                </FormGroup>
            </div>
            <div className={Classes.DIALOG_FOOTER}>
                <div className="dialog-footer-actions">
                    <Checkbox label="Public" checked={isPublic} onChange={handleChangePublic} />

                    <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                        <Button
                            variant="minimal"
                            intent={Intent.NONE}
                            onClick={handleClose}
                            data-testid="new-folder-cancel-button"
                        >
                            {translate("Cancel")}
                        </Button>
                        <Button
                            intent={Intent.PRIMARY}
                            disabled={value.trim().length === 0}
                            onClick={handleSaveFolder}
                            data-testid="new-folder-save-button"
                        >
                            {translate("Save")}
                        </Button>
                    </div>
                </div>
            </div>
        </Dialog>
    );
};

// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Button, Checkbox, Classes, FormGroup, InputGroup, Intent } from "@blueprintjs/core";
import React, { FunctionComponent, useState } from "react";
import { AppFormDialog, Icon } from "app/components/common";
import { APPICONS } from "@stacks/types";

interface INewNotepadDialogProps {
    onSave: (folderName: string, isPublic: boolean) => void;
    onClose: () => void;
}
export const NewNotepadDialog: FunctionComponent<INewNotepadDialogProps> = ({ onSave, onClose }) => {
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
            handleSaveNotebook();
        }
    };

    const handleClosed = () => {
        onClose();
    };

    const handleChangePublic = () => {
        setIsPublic(!isPublic);
    };

    const handleSaveNotebook = () => {
        if (value.trim().length === 0) return;
        onSave(value, isPublic);
        onClose();
    };

    return (
        <AppFormDialog
            dialogProps={{
                title: "New notepad",
                icon: <Icon icon={APPICONS.NOTEPAD} />,
                isOpen: open,
                style: { width: 300 },
                canEscapeKeyClose: true,
                onClose: handleClose,
                onClosed: handleClosed,
                "aria-labelledby": "new-notepad-dialog",
            }}
            footer={
                <div className={Classes.DIALOG_FOOTER}>
                    <div className="dialog-footer-actions">
                        <Checkbox label="Public" checked={isPublic} onChange={handleChangePublic} />

                        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                            <Button
                                data-testid="new-notepad-dialog-cancel-button"
                                variant="minimal"
                                intent={Intent.NONE}
                                onClick={handleClose}
                            >
                                {translate("Cancel")}
                            </Button>
                            <Button
                                intent={Intent.PRIMARY}
                                disabled={value.trim().length === 0}
                                onClick={handleSaveNotebook}
                                data-testid="new-notepad-dialog-save-button"
                            >
                                {translate("Save")}
                            </Button>
                        </div>
                    </div>
                </div>
            }
        >
            <FormGroup label="Notepad name" style={{ marginBottom: 0 }}>
                <InputGroup
                    placeholder={translate("Untitled notepad")}
                    value={value}
                    autoFocus
                    onKeyDown={handleKeyDown}
                    onChange={handleChangeValue}
                    data-testid="new-notepad-name-input"
                />
            </FormGroup>
        </AppFormDialog>
    );
};

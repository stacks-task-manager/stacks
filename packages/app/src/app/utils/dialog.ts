// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Intent } from "@blueprintjs/core";
import { Alert, Confirm } from "app/components/common";
import { IElectronMessageBox, IElectronSaveDialog } from "@stacks/types";

interface IDialogFilter {
    name: string;
    extensions: string[];
}

interface IDialogOptionsBase {
    title?: string;
}

export interface ISaveDialog extends IDialogOptionsBase {
    defaultPath: string;
    buttonLabel: string;
    filters?: IDialogFilter[];
}

export interface IOpenDialog extends IDialogOptionsBase {
    properties: string[];
    buttonLabel?: string;
    filters?: IDialogFilter[];
    securityScopedBookmarks?: boolean;
}

export interface IMessageDialog extends IDialogOptionsBase {
    message: string;
    type: "none" | "info" | "error" | "question" | "warning";
    detail?: string;
    buttons: string[];
    defaultId?: number;
    checkboxLabel?: string;
}

const showSaveDialog = async (options: ISaveDialog, attach?: boolean): Promise<IElectronSaveDialog> => {
    console.log("showSaveDialog MISSING");
    return Promise.resolve({
        filePath: "",
        canceled: true,
    });
};

const showOpenDialog = async (options: IOpenDialog, attach?: boolean) => {
    console.log("showOpenDialog MISSING");
    return Promise.resolve({
        filePaths: [],
        canceled: true,
    });
};

const showMessageBox = async (options: IMessageDialog, attach?: boolean): Promise<IElectronMessageBox> => {
    console.log("showMessageBox MISSING");
    return Promise.resolve({
        response: 0,
        checkboxChecked: false,
    });
};

const confirm = async (
    title: string | React.ReactNode,
    description: string | React.ReactNode,
    intent?: Intent,
    options?: { cancelText?: string; confirmText?: string }
): Promise<boolean> => {
    const { cancelText, confirmText } = options || {};
    const { answer } = await Confirm({ title, description, intent, cancelText, confirmText });
    return answer;
};

const alert = async (
    title: string | React.ReactNode,
    description: string | React.ReactNode,
    intent?: Intent,
    options?: { confirmText?: string }
): Promise<void> => {
    const { confirmText } = options || {};
    await Alert({ title, description, intent, confirmText });
};

const confirmAdvanced = async (title: string, message: string, buttons: string[]): Promise<number> => {
    const result: IElectronMessageBox = await showMessageBox({
        type: "question",
        buttons: buttons,
        message: title,
        detail: message,
        defaultId: 0,
    });

    return result.response;
};

export default {
    showSaveDialog,
    showOpenDialog,
    confirm,
    alert,
    confirmAdvanced,
};

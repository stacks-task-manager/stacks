// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
export interface IElectronDialog {
    canceled: boolean;
    filePaths: string[];
}

export interface IElectronSaveDialog {
    canceled: boolean;
    filePath: string;
}

export interface IElectronMessageBox {
    response: number;
    checkboxChecked: boolean;
}

// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/* eslint-disable @typescript-eslint/no-explicit-any */
import Config from "../../config";

const _log = (type: string, message: any, ...rest: any[]) => {
    if (!Config.debug) return;

    let header = "";
    switch (type) {
        case "error":
            header = "\x1b[31m[×] ";
            break;
        case "success":
            header = "\x1b[32m[+] ";
            break;
        case "warn":
            header = "\x1b[33m[-] ";
            break;
        default:
            header = "\x1b[36m[*] ";
    }
    // eslint-disable-next-line no-console
    console.log(header, message, ...rest);
};

const info = (message: any, ...rest: any[]) => {
    _log("info", message, ...rest);
};

const warn = (message: any, ...rest: any[]) => {
    _log("warn", message, ...rest);
};

const success = (message: any, ...rest: any[]) => {
    _log("success", message, ...rest);
};

const error = (message: any, ...rest: any[]) => {
    _log("error", message, ...rest);
};

export default {
    info,
    warn,
    success,
    error,
};

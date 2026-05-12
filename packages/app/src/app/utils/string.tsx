// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Intent, Popover, Position, Tag, Tooltip } from "@blueprintjs/core";
import emoji from "node-emoji";
import * as React from "react";

import { PRIORITY } from "@stacks/types";

export const humanFileSize = (bytes: number, si = true, dp = 1): string => {
    const thresh = si ? 1000 : 1024;

    if (Math.abs(bytes) < thresh) {
        return bytes + " B";
    }

    const units = si
        ? ["kB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]
        : ["KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"];
    let u = -1;
    const r = 10 ** dp;

    do {
        bytes /= thresh;
        ++u;
    } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);

    return bytes.toFixed(dp) + " " + units[u];
};

export const truncateCenter = (str: string, maxLength: number): string => {
    const midChar = "…"; // character to insert into the center of the result
    if (str.length <= maxLength) return str;

    // length of beginning part
    const left = Math.ceil(maxLength / 2);

    // start index of ending part
    const right = str.length - Math.floor(maxLength / 2) + 1;
    return str.substr(0, left) + midChar + str.substring(right);
};

export const isCenterTruncated = (str: string, maxLength: number): boolean => {
    return str.length > maxLength;
};

export const truncateEnd = (str: string, maxLength: number) => {
    const ending = "…";
    if (str.length > maxLength) {
        return str.substring(0, maxLength) + ending;
    }
    return str;
};

export const escapeRegExpChars = (text: string) => {
    return text.replace(/([.*+?^=!:${}()|[\]/\\])/g, "\\$1");
};

export const highlightText = (text: string, query: string) => {
    let lastIndex = 0;
    const words = query
        .split(/\s+/)
        .filter(word => word.length > 0)
        .map(escapeRegExpChars);
    if (words.length === 0) {
        return [text];
    }
    const regexp = new RegExp(words.join("|"), "gi");
    const tokens: React.ReactNode[] = [];
    while (true) {
        const match = regexp.exec(text);
        if (!match) {
            break;
        }
        const length = match[0].length;
        const before = text.slice(lastIndex, regexp.lastIndex - length);
        if (before.length > 0) {
            tokens.push(before);
        }
        lastIndex = regexp.lastIndex;
        tokens.push(<strong key={lastIndex}>{match[0]}</strong>);
    }
    const rest = text.slice(lastIndex);
    if (rest.length > 0) {
        tokens.push(rest);
    }
    return tokens;
};

interface IRegExpCallback {
    ($0: string, $1?: string, $2?: string, $3?: string, ...argv: string[]): string;
    (substring: string, ...args: unknown[]): string;
}

const wrapTags = (text: string, regex: RegExp) => {
    const textArray = text.split(regex);
    const matches = text.match(regex)?.map((match: string) => {
        return match.replace(/\*\*\*/g, "");
    });

    return textArray.map((str: string, index: number) => {
        if (matches && matches.includes(str)) {
            return (
                <Popover
                    key={index}
                    content={str}
                    popoverClassName="popover-padded-medium"
                    className="confidential-popover"
                >
                    <span className="confidential">＊</span>
                </Popover>
            );
        }

        return (
            <span
                key={index}
                dangerouslySetInnerHTML={{
                    __html: str,
                }}
            />
        );
    });
};

export const md = (text: string) => {
    // https://codepen.io/kvendrik/pen/Gmefv

    if (!text) {
        return text;
    }

    function emojify(text: string /*, p1: string*/): string {
        // if (window.emoji[text.replace(/:/g, "")]) {
        //     return window.emoji[text.replace(/:/g, "")];
        // }

        // return text;
        return emoji.emojify(text);
    }

    function color(text: string, p1: string, p2: string): string {
        return `<font color="${p1 || "red"}">${p2}</font>`;
    }

    function mark(text: string, p1: string, p2: string): string {
        let style = "";

        if (p1) {
            style = `style="background-color: ${p1}"`;
        }

        return `<mark ${style}>${p2}</mark>`;
    }

    const codeRules = [
        {
            regex: /[{]{1}(.*?)[}]{1}/g, // old /[{]{1}([^{]+)[}]{1}/g
            replacement: "<code>$1</code>",
        },
        {
            regex: /[`]{1}(.*?)[`]{1}/g,
            replacement: "<code>$1</code>",
        },
        {
            regex: /[[]{1}([^\]]+)[\]]{1}[(]{1}([^)"]+)("(.+)")?[)]{1}/g,
            replacement: `<a href="$2" title="$4" target="_blank">$1</a>`,
        },
    ];

    const rules = [
        {
            regex: /[!]{1}(.*?)[!]{1}(.*?)[!!]{2}/g,
            replacement: color,
        },
        {
            regex: /\/\/(.*?)\/\//g, // old /[/]{1}([^/]+)[/]{1}/g  new /(?<=\/\/)(.*?)(?=\/\/)/g
            replacement: "<em>$1</em>",
        },
        {
            // new [:]{2}(.*?)[:]{2}
            regex: /[:]{1}([a-z0-9#]*?)[:]{1}(.*?)[:]{2}/gm, // old [:]{2}([^:]+)[:]{2}
            replacement: mark,
        },
        {
            regex: /[:]{1}([^ ]+)[:]{1}/g, // old /[:]{1}([^:]+)[:]{1}/g,
            replacement: emojify,
        },
        {
            regex: /[_]{2}(.*?)[_]{2}/g, // old /[_]{1}([^_]+)[_]{1}/g
            replacement: "<u>$1</u>",
        },
        {
            regex: /[-]{2}(.*?)[-]{2}/g, // old /[-]{1}([^-]+)[-]{1}/g
            replacement: "<strike>$1</strike>",
        },
        {
            regex: /[*]{2}(.*?)[*]{2}/g, // old /[*]{1}([^*]+)[*]{1}/g
            replacement: "<b>$1</b>",
        },

        {
            regex: /\n/g,
            replacement: "<br />",
        },
        {
            regex: /[#]{2}(.*?)[#]{2}/g, // old /[#]{1}([^#]+)[#]{1}/g
            replacement: "***$1***", //＊
        },
        {
            regex: /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/gi,
            replacement: `<a href="$1" target="_blank">$1</a>`,
        },
    ];

    let mdText = text;
    codeRules.forEach(rule => {
        mdText = mdText.replace(rule.regex, rule.replacement);
    });

    const blocks: string[] = [];
    mdText = mdText.replace(/(?:<[^>]+>.*?<\/?[^>]+>)/g, match => {
        blocks.push(match);
        return "@BLOCK@";
    });

    rules.forEach(rule => {
        if (typeof rule.replacement === "function") {
            const found = mdText.match(rule.regex);

            if (found) {
                mdText = mdText.replace(rule.regex, rule.replacement as IRegExpCallback);
            }
        } else {
            mdText = mdText.replace(rule.regex, rule.replacement);
        }
    });

    if (blocks.length) {
        mdText = mdText.replace(/@BLOCK@/g, () => blocks.shift() || "");
    }

    return wrapTags(mdText.trim(), new RegExp(/[***]{3}([^***]+)[***]{3}/g));
};

interface ITime {
    y?: number;
    M?: number;
    w?: number;
    d?: number;
    h?: number;
    m?: number;
}

const timeUMOrder = ["y", "M", "w", "d", "h", "m"];

export const timeToObj = (rawTime: string) => {
    const timeRule = /([\d*.?\d+]{1,})([y|M|w|d|h|m{1}])/g;

    const time: ITime = {};
    rawTime.match(timeRule)?.forEach((t: string) => {
        const um = t.substr(-1);
        const value = Number(t.slice(0, -1));
        if (time[um as keyof ITime]) {
            const currentValue = time[um as keyof ITime] || 0;
            time[um as keyof ITime] = currentValue + value;
        } else {
            time[um as keyof ITime] = value;
        }
    });

    const timeUM = [...timeUMOrder].reverse();

    // period spans
    // const daySpan = project?.options && project?.options.daySpan ? project?.options.daySpan : 8;
    const daySpan = 8;
    // const weekSpan = project?.options && project?.options.weekSpan ? project?.options.weekSpan : 5;
    const weekSpan = 5;

    timeUM.forEach((um: string, index: number) => {
        const value = time[um as keyof ITime];
        const nextUM = index < timeUM.length ? timeUM[index + 1] : "";

        if (value) {
            if (um === "m" && value > 59) {
                const currentH = time[nextUM as keyof ITime] || 0;
                time[nextUM as keyof ITime] = (currentH + value) / 60;
                time[um as keyof ITime] = undefined;
            }

            if (um === "h") {
                if (value > daySpan - 1) {
                    const currentD = time[nextUM as keyof ITime] || 0;
                    time[nextUM as keyof ITime] = (currentD + Math.floor(value)) / daySpan;
                    time.h = value % 1;

                    if (time.h < 1) {
                        time.m = Math.round(time.h * 60);
                        time.h = undefined;
                    }
                } else {
                    const minutes = (time[um as keyof ITime]! % 1) * 60;
                    if (minutes) {
                        time.m = Math.round(minutes);
                        time.h = Math.floor(time.h!);
                    }
                }
            }

            if (um === "d") {
                if (value > weekSpan - 1) {
                    const currentW = time[nextUM as keyof ITime] || 0;
                    const weeks = (currentW + Math.floor(value)) / weekSpan;
                    time[nextUM as keyof ITime] = Math.floor(weeks);
                    time.d = (value % 1) + Math.round((weeks % 1) * weekSpan);

                    if (time.d < 1) {
                        time.h = Math.round(time.d * daySpan);
                        time.d = undefined;
                    } else {
                        const hours = time.d % 1;
                        time.h = undefined;
                        if (hours) {
                            time.h = Math.round(hours * daySpan);
                        }
                        time.d = Math.floor(time.d);
                    }
                } else {
                    const hours = (time[um as keyof ITime]! % 1) * daySpan;

                    if (hours) {
                        time.h = Math.round(hours);
                        time.d = Math.floor(time.d!);
                    }
                }
            }

            if (um === "w") {
                if (value > 3) {
                    const currentM = time[nextUM as keyof ITime] || 0;
                    const months = (currentM + Math.floor(value)) / 4;
                    time[nextUM as keyof ITime] = Math.floor(months);
                    time.w = (value % 1) + Math.round((months % 1) * 4);

                    if (time.w < 1) {
                        time.d = Math.round(time.w * weekSpan);
                        time.w = undefined;
                    } else {
                        const days = time.w % 1;
                        time.d = undefined;
                        if (days) {
                            time.d = Math.round(days * weekSpan);
                        }
                        time.w = Math.floor(time.w);
                    }
                } else {
                    const days = (time[um as keyof ITime]! % 1) * 5;

                    if (days) {
                        time.d = Math.round(days);
                        time.w = Math.floor(time.w!);
                    }
                }
            }

            if (um === "M") {
                if (value > 11) {
                    const currentY = time[nextUM as keyof ITime] || 0;
                    const years = currentY + Math.floor(value) / 12;
                    time[nextUM as keyof ITime] = Math.floor(years);
                    time.M = (value % 1) + Math.round((years % 1) * 12);

                    if (time.M < 1) {
                        time.w = Math.round(time.M * 4);
                        time.M = undefined;
                    } else {
                        const weeks = time.M % 1;
                        time.w = undefined;
                        if (weeks) {
                            time.w = Math.round(weeks * 4);
                        }
                        time.M = Math.floor(time.M);
                    }
                } else {
                    const weeks = (time[um as keyof ITime]! % 1) * 4;

                    if (weeks) {
                        time.w = Math.round(weeks);
                        time.M = Math.floor(time.M!);
                    }
                }
            }
        }
    });

    return time;
};

const getTimeToValue = (um: keyof ITime): number => {
    const timeValues: ITime = {
        y: 115200,
        M: 9600,
        w: 2400,
        d: 480,
        h: 60,
        m: 1,
    };

    return timeValues[um] as number;
};

export const timeToMinutes = (rawTime?: string) => {
    if (!rawTime) return 0;

    const time = timeToObj(rawTime);
    let minutes = 0;

    Object.keys(time).forEach((um: string) => {
        const timeValue = time[um as keyof ITime];
        const delta = getTimeToValue(um as keyof ITime);
        minutes += delta! * timeValue!;
    });

    return minutes;
};

export const minutesToTime = (minutes: number, returnEmpty?: boolean) => {
    if (returnEmpty && !minutes) {
        return "0m";
    }

    const time: ITime = {
        y: 0,
        M: 0,
        w: 0,
        d: 0,
        h: 0,
        m: 0,
    };

    let rest = minutes;

    if (rest >= getTimeToValue("y")) {
        time.y = Math.floor(rest / getTimeToValue("y"));
        rest -= time.y * getTimeToValue("y");
    }

    if (rest >= getTimeToValue("M")) {
        time.M = Math.floor(rest / getTimeToValue("M"));
        rest -= time.M * getTimeToValue("M");
    }

    if (rest >= getTimeToValue("w")) {
        time.w = Math.floor(rest / getTimeToValue("w"));
        rest -= time.w * getTimeToValue("w");
    }

    if (rest >= getTimeToValue("d")) {
        time.d = Math.floor(rest / getTimeToValue("d"));
        rest -= time.d * getTimeToValue("d");
    }

    if (rest >= getTimeToValue("h")) {
        time.h = Math.floor(rest / getTimeToValue("h"));
        rest -= time.h * getTimeToValue("h");
    }

    time.m = rest;

    const timeString = [];
    if (time.y) {
        timeString.push(time.y.toFixed() + "y");
    }
    if (time.M) {
        timeString.push(time.M.toFixed() + "M");
    }
    if (time.w) {
        timeString.push(time.w.toFixed() + "w");
    }
    if (time.d) {
        timeString.push(time.d.toFixed() + "d");
    }
    if (time.h) {
        timeString.push(time.h.toFixed() + "h");
    }
    if (time.m) {
        timeString.push(time.m.toFixed() + "m");
    }

    return timeString.join(" ");
};

export const parseTime = (rawTime: string) => {
    const time = timeToObj(rawTime);
    const lstTime: string[] = [];

    timeUMOrder.forEach((um: string) => {
        if (time[um as keyof ITime]) {
            lstTime.push(`${time[um as keyof ITime]}${um}`);
        }
    });

    return lstTime.join(" ").trim();
};

export const stripHTML = (htmlText: string) => {
    return htmlText
        .replace(/(?:<!--(?:(?!-->)[^])*(?:-->|$)|<(?!\s+)[^>]*(?:>|$))/g, "")
        .replace(/&nbsp;/g, " ");
};

export const stripMd = (mdText: string) => {
    if (!mdText) {
        return "";
    }

    return (
        mdText
            // Remove horizontal rules
            // (stripListHeaders conflict with this rule, which is why it has been moved to the top)
            .replace(/^(-\s*?|\*\s*?|_\s*?){3,}\s*$/gm, "")
            // Header
            .replace(/\n={2,}/g, "\n")
            // Fenced codeblocks
            .replace(/~{3}.*\n/g, "")
            // Strikethrough
            .replace(/~~/g, "")
            // Fenced codeblocks
            .replace(/`{3}.*\n/g, "")
            // Remove HTML tags
            .replace(/<[^>]*>/g, "")
            // Remove setext-style headers
            .replace(/^[=-]{2,}\s*$/g, "")
            // Remove footnotes?
            .replace(/\[\^.+?\](: .*?$)?/g, "")
            .replace(/\s{0,2}\[.*?\]: .*?$/g, "")
            // Remove images
            .replace(/!\[(.*?)\][[(].*?[\])]/g, "")
            // Remove inline links
            .replace(/\[(.*?)\][[(].*?[\])]/g, "$1")
            // Remove blockquotes
            .replace(/^\s{0,3}>\s?/g, "")
            // Remove reference-style links?
            .replace(/^\s{1,2}\[(.*?)\]: (\S+)( ".*?")?\s*$/g, "")
            // Remove atx-style headers
            .replace(/^(\n)?\s{0,}#{1,6}\s+| {0,}(\n)?\s{0,}#{0,} {0,}(\n)?\s{0,}$/gm, "$1$2$3")
            // Remove emphasis (repeat the line to remove double emphasis)
            .replace(/([*_]{1,3})(\S.*?\S{0,1})\1/g, "$2")
            .replace(/([*_]{1,3})(\S.*?\S{0,1})\1/g, "$2")
            // Remove code blocks
            .replace(/(`{3,})(.*?)\1/gm, "$2")
            // Remove inline code
            .replace(/`(.+?)`/g, "$1")
            // custom my md syntax
            .replace(/[*]{2}(.*?)[*]{2}/, "$1")
            .replace(/[::]{2}(.*?)[::]{2}/, "$1")
            .replace(/\/\/(.*?)\/\//g, "$1")
            .replace(/[:]{1}([^:]+)[:]{1}/g, "")
    );
};

export const priorityToIcon = (priority?: PRIORITY) => {
    let intent: Intent = Intent.NONE;
    let label = "Priority none";

    switch (priority) {
        case PRIORITY.LOW:
            intent = Intent.SUCCESS;
            label = "Priority Low";
            break;
        case PRIORITY.MEDIUM:
            intent = Intent.WARNING;
            label = "Priority Medium";
            break;
        case PRIORITY.HIGH:
            intent = Intent.DANGER;
            label = "Priority High";
            break;
        default:
            return null;
    }

    return (
        <Tooltip content={label} className="task-priority" placement={Position.TOP}>
            <Tag intent={intent}>!</Tag>
        </Tooltip>
    );
};

export const getInitials = (firstName?: string, lastName?: string) => {
    let nameParts = `${firstName || ""} ${lastName || ""}`;
    nameParts = nameParts.replace(/[^\p{L}\d]/gu, " ");
    const parts = nameParts.split(" ");
    let initials = "";
    for (let i = 0; i < parts.length; i++) {
        if (parts[i].length > 0 && parts[i] !== "") {
            initials += parts[i][0];
        }
    }

    initials = initials.replace(/\s+/g, "");

    return initials.length ? initials.toUpperCase().slice(0, 2) : "?";
};

export { isValidUrl as validateUrl } from "app/utils/url";

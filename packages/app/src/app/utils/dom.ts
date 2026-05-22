// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import scrollIntoViewIfNeeded, { StandardBehaviorOptions } from "scroll-into-view-if-needed";

export const hasScrollbar = (el: HTMLElement | null) => {
    if (!el) {
        return false;
    }

    return el.scrollHeight > el.clientHeight;
};

export const makeTableResizable = (table: HTMLTableElement) => {
    resizableGrid(table);

    function resizableGrid(table: HTMLElement) {
        const row = table.getElementsByTagName("tr")[0];
        const cols = row ? row.children : undefined;
        if (!cols) return;

        // cleaning old resize handles
        const resizeHandles = table.getElementsByClassName("table-resize-handle");
        for (let i = 0; i < resizeHandles.length; i++) {
            const resizeHandle = resizeHandles[i];
            const parentHandle = resizeHandle.parentNode;
            if (resizeHandle && parentHandle) {
                resizeHandle!.parentNode!.removeChild(resizeHandle);
            }
        }

        const tableHeight = table.offsetHeight;

        for (let i = 0; i < cols.length; i++) {
            const col: HTMLElement = cols[i] as HTMLElement;
            if (col.dataset.fixed) continue;

            const div = createDiv(tableHeight);
            col.appendChild(div);
            setListeners(div);
        }

        function setListeners(div: HTMLElement) {
            let pageX: number | undefined;
            let curCol: HTMLElement | undefined;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            let nxtCol: HTMLElement | undefined;
            let curColWidth: number | undefined;
            let tableWidth: number | undefined;

            div.addEventListener("mousedown", (e: MouseEvent) => {
                if (e.target) {
                    const el = e.target as HTMLDivElement;
                    tableWidth = table.offsetWidth;
                    if (el.parentElement) {
                        curCol = el.parentElement;
                        if (el.parentElement.nextElementSibling) {
                            nxtCol = curCol.nextElementSibling as HTMLElement;
                            pageX = e.pageX;
                            const padding = paddingDiff(curCol);
                            curColWidth = curCol.offsetWidth - padding;
                        }
                    }
                }
            });

            div.addEventListener("mouseover", (e: MouseEvent) => {
                if (e.target) {
                    const el = e.target as HTMLDivElement;
                    // el.style.borderRight = "2px solid #0000ff";
                    el.style.backgroundColor = "#106BA3";
                }
            });

            div.addEventListener("mouseout", (e: MouseEvent) => {
                if (e.target) {
                    const el = e.target as HTMLDivElement;
                    // el.style.borderRight = "";
                    el.style.backgroundColor = "";
                }
            });

            document.addEventListener("mousemove", (e: MouseEvent) => {
                if (curCol) {
                    const diffX = e.pageX - pageX!;
                    // if (nxtCol)
                    //nxtCol.style.width = (nxtColWidth - (diffX)) + 'px';

                    // if (diffX < 0) {
                    //     diffX = 0;
                    // }
                    let colWidth = curColWidth! + diffX;
                    const direction = diffX > 0 ? "right" : "left";
                    if (direction === "left" && colWidth < Number(curCol.dataset.minwidth)) {
                        colWidth = Number(curCol.dataset.minwidth);
                    }

                    curCol.style.width = colWidth + "px";
                    table.style.width = tableWidth! + diffX + "px";
                }
            });

            document.addEventListener("mouseup", () => {
                curCol = undefined;
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                nxtCol = undefined;
                pageX = undefined;
                curColWidth = undefined;
            });
        }

        function createDiv(height: number) {
            const div = document.createElement("div");
            div.style.top = "0";
            div.style.right = "-1px";
            div.style.width = "2px";
            div.style.position = "absolute";
            // div.style.backgroundColor = "red";

            div.style.cursor = "col-resize";
            div.style.userSelect = "none";
            div.style.height = height + "px";
            div.className = "table-resize-handle";
            return div;
        }

        function paddingDiff(col: HTMLElement) {
            if (getStyleVal(col, "box-sizing") === "border-box") {
                return 0;
            }

            const padLeft = getStyleVal(col, "padding-left");
            const padRight = getStyleVal(col, "padding-right");
            return parseInt(padLeft) + parseInt(padRight);
        }

        function getStyleVal(elm: HTMLElement, css: string) {
            return window.getComputedStyle(elm, null).getPropertyValue(css);
        }
    }
};

export const getLineHeight = (element: HTMLElement) => {
    // getComputedStyle() => 18.0001px => 18
    let lineHeight = parseInt(getComputedStyle(element).lineHeight.slice(0, -2), 10);
    // this check will be true if line-height is a keyword like "normal"
    if (isNaN(lineHeight)) {
        // @see http://stackoverflow.com/a/18430767/6342931
        const line = document.createElement("span");
        line.innerHTML = "<br>";
        element.appendChild(line);
        const singleLineHeight = element.offsetHeight;
        line.innerHTML = "<br><br>";
        const doubleLineHeight = element.offsetHeight;
        element.removeChild(line);
        // this can return 0 in edge cases
        lineHeight = doubleLineHeight - singleLineHeight;
    }
    return lineHeight;
};

export const getFontSize = (element: HTMLElement) => {
    const fontSize = getComputedStyle(element).fontSize;
    return fontSize === "" ? 0 : parseInt(fontSize.slice(0, -2), 10);
};

export const scrollIntoView = (target?: Element | null, options?: StandardBehaviorOptions) => {
    if (!target) return;

    scrollIntoViewIfNeeded(target, { ...(options != null ? options : {}), scrollMode: "if-needed" });
};

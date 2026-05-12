// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import React, { FunctionComponent } from "react";
import { Icon } from "app/components/common";
import classNames from "classnames";

interface IDropZoneProps {
    children?: React.ReactNode;
    onDrop: (files: string[]) => void;
}

interface IDroppedFile extends File {
    path: string;
}

interface DragEvent extends Event {
    dataTransfer?: DataTransfer;
}

export class DropZone2 extends React.Component<IDropZoneProps> {
    private isOver = false;
    private dropZoneEl: HTMLElement | null = null;
    private childrenEl: HTMLElement | null = null;

    componentDidMount() {
        window.addEventListener("mouseup", this._onDragLeave);
        window.addEventListener("dragenter", this._onDragEnter);
        window.addEventListener("dragover", this._onDragOver);
        window.addEventListener("dragleave", this._onDragLeave);

        if (this.dropZoneEl) {
            this.dropZoneEl.addEventListener("drop", this._onDrop);
            this.dropZoneEl.addEventListener("dragenter", this.handleZoneEnter);
            this.dropZoneEl.addEventListener("dragleave", this.handleZoneLeave);
        }
    }

    componentWillUnmount() {
        window.removeEventListener("mouseup", this._onDragLeave);
        window.removeEventListener("dragenter", this._onDragEnter);
        window.removeEventListener("dragover", this._onDragOver);
        window.removeEventListener("dragleave", this._onDragLeave);

        if (this.dropZoneEl) {
            this.dropZoneEl.removeEventListener("drop", this._onDrop);
            this.dropZoneEl.removeEventListener("dragenter", this.handleZoneEnter);
            this.dropZoneEl.removeEventListener("dragleave", this.handleZoneLeave);
        }
    }

    render() {
        return (
            <React.Fragment>
                <div className="drop-zone" ref={(el: HTMLElement | null) => (this.dropZoneEl = el)}>
                    <div className="drop-zone-inner">
                        <div className="drop-area">
                            <Icon icon="folder" size={24} />
                            <div>
                                {translate("Drag and drop files here")}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="drop-zone-content" ref={(el: HTMLElement | null) => (this.childrenEl = el)}>
                    {this.props.children}
                </div>
            </React.Fragment>
        );
    }

    _onDragEnter = (e: Event) => {
        e.stopPropagation();
        e.preventDefault();

        if (this.dropZoneEl) {
            this.dropZoneEl.classList.add("visible");
        }

        if (this.childrenEl) {
            this.childrenEl.classList.add("dragging-over");
        }

        return false;
    };

    _onDragOver = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();

        if (this.dropZoneEl) {
            this.dropZoneEl.classList.add("visible");
        }

        if (this.childrenEl) {
            this.childrenEl.classList.add("dragging-over");
        }

        return false;
    };

    _onDragLeave = (e: Event) => {
        e.stopPropagation();
        e.preventDefault();

        if (!this.isOver) {
            if (this.dropZoneEl) {
                this.dropZoneEl.classList.remove("visible");
            }

            if (this.childrenEl) {
                this.childrenEl.classList.remove("dragging-over");
            }
        }

        return false;
    };

    _onDrop = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();

        const event = e as DragEvent;
        if (event.dataTransfer && event.dataTransfer.files.length) {
            this.props.onDrop(
                Array.from(event.dataTransfer.files).map((file: File) => {
                    return (file as IDroppedFile).path;
                })
            );
        }

        if (this.dropZoneEl) {
            this.dropZoneEl.classList.remove("visible");
        }

        if (this.childrenEl) {
            this.childrenEl.classList.remove("dragging-over");
        }

        return false;
    };

    private handleZoneEnter = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();

        if (!this.isOver) {
            if (this.dropZoneEl) {
                this.dropZoneEl.classList.add("visible");
            }

            if (this.childrenEl) {
                this.childrenEl.classList.add("dragging-over");
            }

            this.isOver = true;
        }

        return false;
    };

    private handleZoneLeave = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();

        if (this.isOver) {
            if (this.childrenEl) {
                this.childrenEl.classList.remove("dragging-over");
            }

            this.isOver = false;
        }

        return false;
    };
}

interface DropZoneProps {
    narrow?: boolean;
}
export const DropZone: FunctionComponent<DropZoneProps> = ({ narrow }) => {
    return (
        <div className={classNames("drop-zone", { narrow })}>
            <div className="drop-zone-inner">
                <div className="drop-area">
                    <Icon icon="share-01" size={24} />
                    <div>
                        {translate("Drag and drop files here")}
                    </div>
                </div>
            </div>
        </div>
    );
};

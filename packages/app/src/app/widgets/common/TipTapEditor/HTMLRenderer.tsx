// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { useEffect, useRef, useState } from "react";
import parse, { DOMNode } from "html-react-parser";
import { Person } from "./mentions/People/Person";
import { Document } from "./mentions/Documents/Document";
import { Classes } from "@blueprintjs/core";
import classNames from "classnames";

interface WebviewEventTarget extends EventTarget {
    getTitle: () => string;
}

interface WebviewEvent extends Event {
    target: WebviewEventTarget;
}

const Webview = ({ src, height }: { src: string; height: number | string }) => {
    const webviewRef = useRef<HTMLWebViewElement | null>(null);
    const [title, setTitle] = useState("");

    const getTitle = (e: Event) => {
        const { target } = e as WebviewEvent;
        if (target) {
            setTitle(target.getTitle());
        }
    };

    useEffect(() => {
        if (webviewRef.current) {
            webviewRef.current.addEventListener("did-finish-load", getTitle);
        }

        return () => {
            if (webviewRef.current) {
                webviewRef.current.removeEventListener("did-finish-load", getTitle);
            }
        };
    }, [src]);

    return (
        <div className="tiptap-iframe-resize">
            <div className={classNames("tiptap-iframe-resize-wrapper", Classes.DIALOG)} style={{ height }}>
                <div className={classNames("tiptap-iframe-header", Classes.DIALOG_HEADER)}>
                    <h6 className={Classes.HEADING}>{title}</h6>
                </div>
                <webview src={src} ref={webviewRef} />
            </div>
        </div>
    );
};

interface DOMNodeExtended {
    attribs: {
        [key: string]: string;
    };
    name: string;
}

const options = {
    replace: (domNode: DOMNode) => {
        const { name, attribs } = domNode as DOMNodeExtended;

        if (name === "person") {
            return <Person id={attribs.id} />;
        } else if (name === "document") {
            return <Document id={attribs.id} type={attribs.type} />;
        } else if (name === "img") {
            return (
                <div className={`tiptap-image-resize align-${attribs.align}`}>
                    <div className="tiptap-image-resize-wrapper" style={{ width: attribs.width }}>
                        <img src={attribs.src} />
                    </div>
                </div>
            );
        } else if (name === "iframe") {
            return <Webview src={attribs.src} height={attribs.height} />;
        }
    },
};

export const HTMLRenderer = ({ html, breakWord }: { html: string; breakWord?: boolean }) => {
    return <div className={classNames("tiptap html-renderer", { break: breakWord })}>{parse(html, options)}</div>;
};

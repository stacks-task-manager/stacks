// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Button, Classes, Intent, Popover } from "@blueprintjs/core";
import classNames from "classnames";
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";

import { FILES_TYPE, IAttachment } from "@stacks/types";
import { Icon } from "app/components/common";
import { useDocument } from "app/hooks";
import { ReactComponent as FileIcon } from "app/icons/file.svg";
import { FilesActions, RecordActions } from "app/store/actions";
import { humanFileSize } from "app/utils/string";
import { AppView, AppViewContent, FileMenu, ToolbarFile } from "app/widgets";
// DocumentTintMenuItem

export const File = () => {
    const navigate = useNavigate();
    const params = useParams<{ id: string }>();
    const [loading, setLoading] = useState(true);
    const [file, setFile] = useState<IAttachment | null>(null);
    const document = useDocument(params.id);

    const handleDelete = async () => {
        if (!params.id) return;
        if (document) {
            await RecordActions.removeDocument(document.id);
        }
        navigate("/");
    };

    const loadFile = async () => {
        const files = await FilesActions.load(params.id!, FILES_TYPE.FILE);
        const file = files.at(0);

        if (!file) {
            window.toaster.show({
                message:
                    "The requested file was not found.",
                icon: "paperclip",
                intent: Intent.WARNING,
            });
            navigate("/");
            return;
        }

        setFile(file);
        setLoading(false);
    };

    useEffect(() => {
        if (params.id) {
            loadFile();
        }
    }, [params.id]);

    if (loading || !file)
        return (
            <div id="file">
                <div className="file-info">
                    <div className="file-options">
                        <Button variant="minimal" icon="more" className={Classes.SKELETON} />
                    </div>

                    <div className="file-icon">
                        <FileIcon />
                    </div>

                    <div className={classNames("file-name", Classes.SKELETON)}>lorem-ipsum.pdf</div>

                    <div className="file-footer">
                        <div className="file-size">
                            <span className={Classes.SKELETON}>Filesize:</span>
                            <span className={Classes.SKELETON}>123MB</span>
                        </div>
                        <Button className={Classes.SKELETON}>Open file...</Button>
                    </div>
                </div>
            </div>
        );

    return (
        <AppView toolbar={<ToolbarFile />}>
            <AppViewContent padded>
                <div id="file">
                    <div className="file-info">
                        <div className="file-options">
                            <Popover
                                placement="bottom-end"
                                content={<FileMenu attachmentId={file.id} onDelete={handleDelete} />}
                            >
                                <Button variant="minimal" icon={<Icon icon="dots-vertical" />} />
                            </Popover>
                        </div>
                        <div className="file-icon">
                            <FileIcon />
                            <span>{file.extension}</span>
                        </div>

                        <div className="file-name">{file.originalName}</div>

                        <div className="file-footer">
                            <div className="file-size">
                                <span>Filesize:</span>
                                <span>{humanFileSize(file.size)}</span>
                            </div>

                            <Button onClick={() => alert("Open online file")} icon="cloud-download">
                                Download file...
                            </Button>
                        </div>
                    </div>
                </div>
            </AppViewContent>
        </AppView>
    );
};

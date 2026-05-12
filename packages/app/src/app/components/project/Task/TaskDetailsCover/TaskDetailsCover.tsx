// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import React, { FunctionComponent } from "react";
import { FILES_TYPE, IAttachment } from "@stacks/types";
import { RoundButton } from "app/components/common";
import { useElementHotkey } from "app/hooks";
import { useUpload } from "app/hooks/fileUpload";
import { TasksActions } from "app/store/actions";
import { TaskCover } from "../TaskCover/TaskCover";

interface ITaskDetailsCoverProps {
    taskId: string;
    url: string | null;
    disabled?: boolean;
}
export const TaskDetailsCover: FunctionComponent<ITaskDetailsCoverProps> = ({
    taskId,
    url,
    disabled,
}) => {
    useElementHotkey("shift+v", "td-cover");
    const { pickFiles, removeByRecord } = useUpload();

    const handleSelectCoverFile = async () => {
        pickFiles({
            recordId: taskId, type: FILES_TYPE.TASK_COVER, onUploaded: async (attachments: IAttachment[]) => {
                const coverImage = attachments.find((attachment) => attachment.type === FILES_TYPE.TASK_COVER);
                if (coverImage && coverImage.previewUrl) {
                    await TasksActions.addCover(taskId, coverImage.previewUrl);
                }
            }
        });
    };

    const handleRemoveCover = async () => {
        await removeByRecord(taskId, FILES_TYPE.TASK_COVER);
        await TasksActions.removeCover(taskId);
    }

    if (url) {
        return (
            <TaskCover url={url} onRemove={handleRemoveCover} />
        );
    }

    return (
        <RoundButton
            id="td-cover"
            dashed
            title={translate("Add image")}
            disabled={disabled}
            onClick={handleSelectCoverFile}
        />
    );
};

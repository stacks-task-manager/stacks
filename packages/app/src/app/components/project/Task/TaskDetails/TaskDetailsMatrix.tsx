// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { ITask, TASKDETAILMATRIX } from "@stacks/types";
import { Row } from "app/components/common";
import { usePreferences } from "app/hooks";
import React, { FunctionComponent } from "react";
import { TaskDetailInfo } from "./TaskDetailInfo";

function twoDimensional<T>(list: T[], elementsPerSubArray: number) {
    const matrix: T[][] = [];
    let i, k;

    for (i = 0, k = -1; i < list.length; i++) {
        if (i % elementsPerSubArray === 0) {
            k++;
            matrix[k] = [];
        }

        matrix[k].push(list[i]);
    }

    return matrix;
}

interface ITaskDetailsMatrixProps {
    task: ITask;
    disabled?: boolean;
    onClose: (delayed?: boolean) => void;
}
/**
 * Lays out the task's info sections as a 3-column grid matrix (from the user's
 * `taskDetailsMatrix` preference) and renders each non-empty cell via
 * `TaskDetailInfo`.
 */
// eslint-disable-next-line react/display-name
export const TaskDetailsMatrix: FunctionComponent<ITaskDetailsMatrixProps> = React.memo(
    ({ task, disabled, onClose }) => {
        const { taskDetailsMatrix } = usePreferences(["taskDetailsMatrix"]);

        return (
            <>
                {twoDimensional<TASKDETAILMATRIX | undefined>(taskDetailsMatrix!, 3).map((row, rowIndex) => {
                    if (!row.some(row => row != null)) return null;
                    return (
                        <Row gutter={20} padding={30} key={rowIndex}>
                            {row.map((col, colIndex) => {
                                return (
                                    <TaskDetailInfo
                                        task={task}
                                        section={col}
                                        key={colIndex}
                                        onClose={onClose}
                                        vertical
                                        disabled={disabled}
                                    />
                                );
                            })}
                        </Row>
                    );
                })}
            </>
        );
    }
);

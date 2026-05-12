// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import React from "react";
import classnames from "classnames";
import { ITask } from "@stacks/types";
import { Time } from "@blueprintjs/icons";

interface IPopupEstimatesViewProps {
    task: ITask;
}

export class PopupEstimatesView extends React.PureComponent<IPopupEstimatesViewProps> {
    render() {
        const { task } = this.props;
        return (
            <div className="popup-estimates-view">
                <div className="popup-estimates-view-wrapper">
                    {task.estimate && this.renderBlock(task.estimate, "tasks.estimated")}
                </div>
            </div>
        );
    }

    private renderBlock = (time: number, intent?: string) => {
        return (
            <div className={classnames("popup-estimates-view-block", intent)}>
                <div className="popup-estimates-view-block-title">
                    {translate("Estimated")}
                </div>
                <Time />
                <div className="popup-estimates-view-block-time">{time}</div>
            </div>
        );
    };
}

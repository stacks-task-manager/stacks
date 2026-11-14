// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Card, Classes, Intent, ProgressBar } from "@blueprintjs/core";
import React from "react";
import { translate } from "@stacks/translations";
import type { IWorkbookMomentum } from "app/utils/workbookOverview";

interface ICompletionMomentumProps {
    data: IWorkbookMomentum;
}

export const CompletionMomentum = ({ data }: ICompletionMomentumProps) => (
    <Card>
        <h6 className={Classes.HEADING}>{translate("Completion momentum")}</h6>
        <p className={Classes.TEXT_MUTED}>{translate("Completed vs in progress")}</p>

        <div className="workbook-overview__metrics">
            <div className="workbook-overview__metric">
                <strong>{data.total}</strong>
                <span>{translate("Total tasks")}</span>
            </div>
            <div className="workbook-overview__metric">
                <strong>{data.completed}</strong>
                <span>{translate("Completed")}</span>
            </div>
            <div className="workbook-overview__metric">
                <strong>{data.progress}</strong>
                <span>{translate("In progress")}</span>
            </div>
        </div>

        <ProgressBar
            stripes={false}
            value={Math.min(1, Math.max(0, data.percent / 100))}
            intent={Intent.PRIMARY}
        />
    </Card>
);

// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Card, Classes, Colors } from "@blueprintjs/core";
import React from "react";
import { translate } from "@stacks/translations";
import type { IWorkbookProjectWorkload } from "app/utils/workbookOverview";

interface IProjectWorkloadProps {
    data: IWorkbookProjectWorkload[];
}

export const ProjectWorkload = ({ data }: IProjectWorkloadProps) => (
    <Card>
        <h6 className={Classes.HEADING}>{translate("Project workload")}</h6>
        <p className={Classes.TEXT_MUTED}>{translate("Tasks per project")}</p>

        {data.length > 0 ? (
            data.map(project => (
                <div key={project.id} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span>{project.title}</span>
                        <span className="workbook-overview__count">{project.total}</span>
                    </div>
                    <div className="workbook-overview__bar">
                        {project.done > 0 && (
                            <div style={{ backgroundColor: Colors.GREEN3, flexGrow: project.done }} />
                        )}
                        {project.inProgress > 0 && (
                            <div style={{ backgroundColor: Colors.ORANGE3, flexGrow: project.inProgress }} />
                        )}
                        {project.total > project.done + project.inProgress && (
                            <div
                                style={{
                                    backgroundColor: Colors.GRAY3,
                                    flexGrow: project.total - project.done - project.inProgress,
                                }}
                            />
                        )}
                    </div>
                </div>
            ))
        ) : (
            <p className={Classes.TEXT_MUTED}>{translate("No projects found")}</p>
        )}
    </Card>
);

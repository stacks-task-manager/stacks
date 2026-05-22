// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import React, { useMemo } from "react";
import { Card, Classes } from "@blueprintjs/core";

import { formatDate } from "app/utils/date";
import { ProjectHealth } from "app/components/project";
import { Avatar, Col, Grid, Row } from "app/components/common";
import { PeopleStore } from "app/store/people";
import { CompanyName } from "app/widgets";
import { useCurrentProject } from "app/hooks";
import { ProjectsActions } from "app/store/actions";
import { PROJECTHEALTH } from "@stacks/types";

export const ProjectStatus = () => {
    const { project } = useCurrentProject();

    const owner = useMemo(() => {
        const { people } = PeopleStore.get();
        return people.find(person => person.id === project?.projectOwner);
    }, [project?.projectOwner]);

    if (!project) return null;

    const handleSetHealth = (health?: PROJECTHEALTH) => {
        ProjectsActions.setHealth(project.id, health);
    };

    return (
        <Card>
            <h6 className={Classes.HEADING}>Project status</h6>

            <Grid gap={15} padding={[20, 0]}>
                <Row>
                    <Col align="center">
                        <strong>Created</strong>
                    </Col>
                    <Col>{formatDate(project.created)}</Col>
                </Row>
                <Row>
                    <Col align="center">
                        <strong>Updated</strong>
                    </Col>
                    <Col>{formatDate(project.updated)}</Col>
                </Row>

                {owner && (
                    <Row>
                        <Col align="center">
                            <strong>Owner</strong>
                        </Col>
                        <Col gap={10} align="center">
                            <Avatar person={owner} small />
                            <span>
                                {owner.firstName} {owner.lastName}
                            </span>
                        </Col>
                    </Row>
                )}

                <Row>
                    <Col>
                        <strong>{translate("Company")}</strong>
                    </Col>
                    <Col>
                        <CompanyName id={project.company} placeholder="-" />
                    </Col>
                </Row>

                <Row>
                    <Col>
                        <strong>Start date</strong>
                    </Col>
                    <Col>{project.startDate ? formatDate(project.startDate) : "-"}</Col>
                </Row>

                <Row>
                    <Col>
                        <strong>End date</strong>
                    </Col>
                    <Col>{project.endDate ? formatDate(project.endDate) : "-"}</Col>
                </Row>

                <Grid gap={5}>
                    <Row>
                        <Col>
                            <strong>
                                {translate("Project health")}
                            </strong>
                        </Col>
                        <Col>
                            <ProjectHealth value={project.health} onChange={handleSetHealth} />
                        </Col>
                    </Row>
                </Grid>
            </Grid>
        </Card>
    );
};

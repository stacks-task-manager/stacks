// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Card, Classes, Tag } from "@blueprintjs/core";
import React, { FunctionComponent, useMemo } from "react";

import { Avatar, Grid } from "app/components/common";
import { IProjectCounter } from "@stacks/types";
import { PeopleStore } from "app/store/people";
import { OverviewWidgetBlankSlate } from "../OverviewWidgetBlankSlate/OverviewWidgetBlankSlate";

interface IPeopleLoadProps {
    assignees: string[];
    counter: IProjectCounter;
}
export const PeopleLoad: FunctionComponent<IPeopleLoadProps> = ({ assignees, counter }) => {
    const allPeople = PeopleStore.use(
        state => state.people,
        (left, right) => left === right
    );
    const assigneeSet = useMemo(() => new Set(assignees), [assignees]);
    const people = useMemo(
        () => allPeople.filter(person => assigneeSet.has(person.id)),
        [allPeople, assigneeSet]
    );

    return (
        <Card>
            <h6 className={Classes.HEADING}>People workload</h6>

            {people.length > 0 ? (
                <Grid gap={5}>
                    {people.map(person => {
                        return (
                            <div key={person.id} className="person-load">
                                <div>
                                    <Avatar person={person} small /> {person.firstName} {person.lastName}
                                </div>
                                <Tag round minimal>
                                    {counter[person.id]}
                                </Tag>
                            </div>
                        );
                    })}
                </Grid>
            ) : (
                <OverviewWidgetBlankSlate />
            )}
        </Card>
    );
};

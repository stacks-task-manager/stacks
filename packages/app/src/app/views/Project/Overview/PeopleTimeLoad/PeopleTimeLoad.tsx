// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Card, Classes, Tag } from "@blueprintjs/core";
import React, { FunctionComponent, useMemo } from "react";
import { Avatar, Grid } from "app/components/common";
import { IPerson, IProjectCounter } from "@stacks/types";
import { PeopleStore } from "app/store/people";
import { formatDuration } from "app/utils/date";
import { OverviewWidgetBlankSlate } from "../OverviewWidgetBlankSlate/OverviewWidgetBlankSlate";

interface IPeopleTimeLoadProps {
    assignees: string[];
    counter: IProjectCounter;
}
export const PeopleTimeLoad: FunctionComponent<IPeopleTimeLoadProps> = ({ assignees, counter }) => {
    const people = useMemo(() => {
        const { people } = PeopleStore.get();
        return people.filter(
            (person: IPerson) => Boolean(counter[person.id]) && assignees.includes(person.id)
        );
    }, [counter]);

    return (
        <Card>
            <h6 className={Classes.HEADING}>
                {translate("People timeload")}
            </h6>

            {people.length > 0 ? (
                <Grid gap={5}>
                    {people.map(person => {
                        return (
                            <div key={person.id} className="person-load">
                                <div>
                                    <Avatar person={person} small /> {person.firstName} {person.lastName}
                                </div>
                                {counter[person.id] && (
                                    <Tag round minimal>
                                        {formatDuration(counter[person.id])}
                                    </Tag>
                                )}
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

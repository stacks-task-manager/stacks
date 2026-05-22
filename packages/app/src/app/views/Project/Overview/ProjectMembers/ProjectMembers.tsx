// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Card, Classes } from "@blueprintjs/core";
import React, { FunctionComponent, useMemo } from "react";
import { IPerson } from "@stacks/types";
import { PeopleStore } from "app/store/people";
import { Assignees } from "app/widgets";
import { OverviewWidgetBlankSlate } from "../OverviewWidgetBlankSlate/OverviewWidgetBlankSlate";

interface IProjectMembersProps {
    assignees: string[];
}
export const ProjectMembers: FunctionComponent<IProjectMembersProps> = ({ assignees }) => {
    const people = useMemo(() => {
        if (assignees.length === 0) return [];
        const { people } = PeopleStore.get();
        return people.filter((person: IPerson) => assignees.includes(person.id));
    }, [assignees]);

    return (
        <Card>
            <h6 className={Classes.HEADING}>
                {translate("Project members")}
            </h6>
            {people.length > 0 ? <Assignees assignees={people} max={5} /> : <OverviewWidgetBlankSlate />}
        </Card>
    );
};

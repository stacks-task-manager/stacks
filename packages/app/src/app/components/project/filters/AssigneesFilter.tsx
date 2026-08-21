// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Alignment, Button, FormGroup } from "@blueprintjs/core";
import { produce } from "immer";
import { AvatarChip, Grid, Icon } from "app/components/common";
import { PeopleStore } from "app/store/people";
import { PeopleDialog } from "app/widgets";
import { translate } from "@stacks/translations";
import React, { FunctionComponent, useMemo, useState } from "react";
import { TagsWrapper } from "../../../widgets/common/TagsWrapper/TagsWrapper";

interface IAssigneesFilterProps {
    assignees: string[];
    disabled?: boolean;
    onChange: (assignees: string[]) => void;
    /** Stack the selected assignee chips vertically (timelogs drawer style); defaults to a wrapping grid (project filter style). */
    vertical?: boolean;
}
/**
 * Shared assignees filter: people picker dialog + removable chips.
 * The caller supplies the store action for persisting the selection.
 */
export const AssigneesFilter: FunctionComponent<IAssigneesFilterProps> = ({
    assignees,
    disabled,
    onChange,
    vertical,
}) => {
    const [open, setOpen] = useState(false);

    const people = useMemo(() => {
        return PeopleStore.get().people.filter(person => assignees.includes(person.id));
    }, [assignees]);

    const toggleAssignee = (personId: string) => {
        onChange(
            produce(assignees, (draftAssignees: string[]) => {
                const index = draftAssignees.findIndex(a => a === personId);
                if (index > -1) {
                    draftAssignees.splice(index, 1);
                } else {
                    draftAssignees.push(personId);
                }
            })
        );
    };

    const handleTogglePeopleDialog = () => {
        setOpen(!open);
    };

    return (
        <FormGroup label={translate("Assignees")}>
            <Button
                fill
                icon={<Icon icon="user-add" />}
                alignText={Alignment.LEFT}
                disabled={disabled}
                onClick={handleTogglePeopleDialog}
                data-testid="assignees-filter-button"
            >
                {translate("Add assignees")}
            </Button>

            {people.length > 0 && (
                <div style={{ marginTop: 10 }}>
                    {vertical ? (
                        <TagsWrapper gap={10} vertical>
                            {people.map(person => (
                                <AvatarChip
                                    key={person.id}
                                    person={person}
                                    small
                                    onRemove={() => toggleAssignee(person.id)}
                                />
                            ))}
                        </TagsWrapper>
                    ) : (
                        <Grid gap={10}>
                            {people.map(person => (
                                <AvatarChip
                                    key={person.id}
                                    person={person}
                                    small
                                    onRemove={() => toggleAssignee(person.id)}
                                />
                            ))}
                        </Grid>
                    )}
                </div>
            )}

            {open && (
                <PeopleDialog value={assignees} onClose={onChange} onClosed={handleTogglePeopleDialog} />
            )}
        </FormGroup>
    );
};

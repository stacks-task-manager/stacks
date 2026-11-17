// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Alignment, Button, FormGroup } from "@blueprintjs/core";
import { translate } from "@stacks/translations";
import { AvatarChip } from "app/components/common/AvatarChip/AvatarChip";
import { Grid } from "app/components/common/Layout/Grid/Grid";
import { Icon } from "app/components/common/Icon/Icon";
import { usePeople } from "app/hooks";
import { PeopleDialog } from "app/widgets/people/PeopleDialog/PeopleDialog";
import { TagsWrapper } from "app/widgets/common/TagsWrapper/TagsWrapper";
import { produce } from "immer";
import React, { FunctionComponent, memo, useCallback, useState } from "react";

interface IAssigneesFilterProps {
    assignees: string[];
    disabled?: boolean;
    onChange: (assignees: string[]) => void;
    /** Stack the selected assignee chips vertically (timelogs drawer style); defaults to a wrapping grid. */
    vertical?: boolean;
}

/**
 * Shared assignees filter: people picker dialog plus removable chips.
 * The caller supplies the selection persistence callback.
 */
export const AssigneesFilter: FunctionComponent<IAssigneesFilterProps> = memo(function AssigneesFilter({
    assignees,
    disabled,
    onChange,
    vertical,
}) {
    const [open, setOpen] = useState(false);
    const people = usePeople(assignees);

    const toggleAssignee = useCallback(
        (personId: string) => {
            onChange(
                produce(assignees, (draftAssignees: string[]) => {
                    const index = draftAssignees.findIndex(assignee => assignee === personId);
                    if (index > -1) {
                        draftAssignees.splice(index, 1);
                    } else {
                        draftAssignees.push(personId);
                    }
                })
            );
        },
        [assignees, onChange]
    );

    const handleTogglePeopleDialog = useCallback(() => {
        setOpen(current => !current);
    }, []);

    return (
        <FormGroup label={translate("Assignees")}>
            <Button
                fill
                icon={<Icon icon="user-add" />}
                alignText={Alignment.START}
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
});

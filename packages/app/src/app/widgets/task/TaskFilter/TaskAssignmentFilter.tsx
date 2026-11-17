// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import {
    AnchorButton,
    Button,
    ButtonGroup,
    Colors,
    FormGroup,
    Intent,
    Switch,
    Tooltip,
} from "@blueprintjs/core";
import { translate } from "@stacks/translations";
import { Icon } from "app/components/common/Icon/Icon";
import { useMe } from "app/hooks";
import React, { FunctionComponent, memo, useCallback } from "react";

export interface TaskAssignmentChanges {
    me?: boolean;
    nobody?: boolean;
    skipMe?: boolean;
    onlyAssigned?: boolean;
    assignees?: string[];
}

interface ITaskAssignmentFilterProps extends TaskAssignmentChanges {
    onChange: (values: TaskAssignmentChanges) => void;
}

export const TaskAssignmentFilter: FunctionComponent<ITaskAssignmentFilterProps> = memo(
    function TaskAssignmentFilter({ me, nobody, skipMe, onlyAssigned, onChange }) {
        const currentUser = useMe();
        const disabled = Boolean(me) || Boolean(nobody);

        const handleSetMe = useCallback(() => {
            if (!currentUser) return;
            onChange({
                me: true,
                nobody: undefined,
                assignees: [],
                skipMe: undefined,
                onlyAssigned: undefined,
            });
        }, [currentUser, onChange]);

        const handleSetAnyone = useCallback(() => {
            onChange({ me: undefined, nobody: undefined });
        }, [onChange]);

        const handleSetNobody = useCallback(() => {
            onChange({
                me: undefined,
                nobody: true,
                skipMe: undefined,
                onlyAssigned: undefined,
                assignees: [],
            });
        }, [onChange]);

        return (
            <>
                <FormGroup label={translate("Tasks assigned to")}>
                    <ButtonGroup fill>
                        <Tooltip
                            disabled={!currentUser}
                            content={
                                currentUser
                                    ? translate("Just me")
                                    : translate("The current user is not yet selected")
                            }
                            placement="top"
                            renderTarget={({ ref, ...props }) => (
                                <AnchorButton
                                    fill
                                    icon={<Icon icon="user" color={me ? Colors.BLUE3 : undefined} />}
                                    intent={Boolean(me) ? Intent.PRIMARY : Intent.NONE}
                                    disabled={!currentUser}
                                    ref={ref}
                                    {...props}
                                    onClick={handleSetMe}
                                />
                            )}
                        />
                        <Tooltip
                            content={translate("Anyone")}
                            placement="top"
                            renderTarget={({ ref, ...props }) => (
                                <Button
                                    fill
                                    icon={
                                        <Icon
                                            icon="users-check"
                                            color={!me && !nobody ? Colors.BLUE3 : undefined}
                                        />
                                    }
                                    intent={!me && !nobody ? Intent.PRIMARY : Intent.NONE}
                                    ref={ref}
                                    {...props}
                                    onClick={handleSetAnyone}
                                />
                            )}
                        />
                        <Tooltip
                            content={translate("Nobody")}
                            placement="top"
                            renderTarget={({ ref, ...props }) => (
                                <Button
                                    fill
                                    icon={
                                        <Icon
                                            icon="users-x"
                                            color={!me && nobody ? Colors.BLUE3 : undefined}
                                        />
                                    }
                                    intent={!me && nobody ? Intent.PRIMARY : Intent.NONE}
                                    ref={ref}
                                    {...props}
                                    onClick={handleSetNobody}
                                />
                            )}
                        />
                    </ButtonGroup>
                </FormGroup>

                <Switch
                    label={translate("Skip tasks assigned to me")}
                    checked={Boolean(skipMe)}
                    disabled={disabled}
                    onChange={() => onChange({ skipMe: !skipMe })}
                />
                <Switch
                    label={translate("Only show assigned tasks")}
                    checked={Boolean(onlyAssigned)}
                    disabled={disabled}
                    onChange={() => onChange({ onlyAssigned: !onlyAssigned })}
                />
            </>
        );
    }
);

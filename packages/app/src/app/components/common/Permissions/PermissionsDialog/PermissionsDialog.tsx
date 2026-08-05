// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import {
    AnchorButton,
    Button,
    Callout,
    Classes,
    Dialog,
    Intent,
    Menu,
    MenuItem,
    Popover,
    Tag,
    Tooltip,
} from "@blueprintjs/core";
import { translate } from "@stacks/translations";
import xor from "lodash/xor";
import React, { FunctionComponent, useEffect, useMemo, useState } from "react";

import { IPermissions, IPerson } from "@stacks/types";
import { Icon, SettingRow } from "app/components/common";
import { getRole, useMe, useRoles } from "app/hooks";
import { shallowEqual } from "app/hooks/store";
import { GlobalStore, hidePermissions } from "app/store/global";
import { PeopleStore } from "app/store/people";
import { Assignees, PeopleDialog, TagsWrapper } from "app/widgets";

const haveSameMembers = (left: string[] = [], right: string[] = []) => {
    if (left.length !== right.length) return false;
    return left.every(value => right.includes(value));
};

const haveSamePermissions = (left?: IPermissions, right?: IPermissions) => {
    if (!left || !right) return true;

    return (
        left.isPublic === right.isPublic &&
        left.owner === right.owner &&
        haveSameMembers(left.visibleUsers, right.visibleUsers) &&
        haveSameMembers(left.visibleRoles, right.visibleRoles)
    );
};

export const PermissionsDialog: FunctionComponent = () => {
    // const roles = useRoles();
    const [isOpen, setIsOpen] = useState(false);
    const [draftPermissions, setDraftPermissions] = useState<IPermissions | undefined>();
    const [isSaving, setIsSaving] = useState(false);
    const { permissions, onSave } = GlobalStore.use(
        state => ({
            permissions: state.permissions,
            onSave: state.permissionsCallback,
        }),
        shallowEqual
    );

    const [showPeople, setShowPeople] = useState(false);
    const [showTransferPeople, setShowTransferPeople] = useState(false);

    useEffect(() => {
        setIsOpen(permissions != null);
        setDraftPermissions(permissions);
        setShowPeople(false);
        setShowTransferPeople(false);
    }, [permissions]);

    const me = useMe();
    const currentPermissions = draftPermissions ?? permissions;
    const { isPublic = false, owner, visibleRoles = [], visibleUsers = [] } = currentPermissions ?? {};
    const hasChanges = useMemo(
        () => !haveSamePermissions(permissions, currentPermissions),
        [permissions, currentPermissions]
    );

    const assignees = useMemo(() => {
        if (!visibleUsers) return [];
        const { people } = PeopleStore.get();
        return people.filter(person => visibleUsers.includes(person.id));
    }, [visibleUsers]);

    const canEdit = useMemo(() => {
        if (!permissions?.owner) return false;
        if (me.id === permissions.owner || me.admin) return true;
    }, [permissions?.owner, me]);

    const ownerPerson = useMemo(() => {
        if (!owner) return null;

        const { people } = PeopleStore.get();
        return people.find((person: IPerson) => person.id === owner);
    }, [owner]);

    if (!permissions || !currentPermissions) {
        return null;
    }

    const onChange = (newPermission: Partial<IPermissions>) => {
        setDraftPermissions(current => (current ? { ...current, ...newPermission } : current));
    };

    const handleClose = () => {
        hidePermissions();
    };

    const handleToggleUsersVisibility = (visibleUsers: string[]) => {
        if (!canEdit) return;

        onChange({
            isPublic,
            visibleUsers,
            visibleRoles,
            owner: owner ?? me.id,
        });
    };

    const handleToggleUserVisibility = (personId: string) => {
        if (!canEdit) return;
        onChange({
            isPublic,
            visibleUsers: xor(visibleUsers, [personId]),
            visibleRoles,
            owner: owner ?? me.id,
        });
    };

    const handleToggleRoleVisibility = (role: string) => {
        if (!canEdit) return;
        onChange({
            isPublic,
            visibleUsers,
            visibleRoles: xor(visibleRoles, [role]),
            owner: owner ?? me.id,
        });
    };

    const handleTogglePeoplePicker = () => {
        setShowPeople(!showPeople);
    };

    const handleToggleTransferPeoplePicker = () => {
        setShowTransferPeople(!showTransferPeople);
    };

    const handleTransferOwnership = async (people: string[]) => {
        const nextOwner = people[0];
        if (!nextOwner || nextOwner === owner) return;
        onChange({ owner: nextOwner });
    };

    const handleTogglePublic = () => {
        onChange({
            isPublic: !isPublic,
            visibleUsers,
            visibleRoles,
            owner: owner ?? me.id,
        });
    };

    const handleUpdate = async () => {
        if (!onSave || !draftPermissions || !hasChanges || isSaving) return;

        setIsSaving(true);
        try {
            await onSave(draftPermissions);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog
            title={translate("Permissions visibility")}
            usePortal
            isOpen={isOpen}
            onClose={handleClose}
            style={{ width: 420 }}
        >
            <div className={Classes.DIALOG_BODY} style={{ marginBottom: 0 }}>
                {!canEdit && (
                    <Callout intent={Intent.WARNING}>
                        {translate("Only the owner can change visibility and or manage people")}
                    </Callout>
                )}

                <SettingRow
                    title={translate("Manage users visibility")}
                    description={translate("Access granted exclusively to the users on list")}
                    last={canEdit}
                    rightElement={
                        canEdit && (
                            <Tooltip
                                content={translate("You can manage people only when the resource is private")}
                                placement="top"
                                disabled={!isPublic}
                            >
                                <AnchorButton
                                    icon={<Icon icon="users" />}
                                    disabled={!canEdit || isPublic}
                                    onClick={handleTogglePeoplePicker}
                                >
                                    {translate("Add people")}
                                </AnchorButton>
                            </Tooltip>
                        )
                    }
                >
                    {visibleUsers.length > 0 && (
                        <Assignees assignees={assignees} max={5} onRemove={handleToggleUserVisibility} />
                    )}

                    {visibleUsers.length === 0 && <div className={Classes.TEXT_DISABLED}>- No users -</div>}

                    {showPeople && (
                        <PeopleDialog
                            value={visibleUsers}
                            onClosed={() => setShowPeople(false)}
                            onClose={handleToggleUsersVisibility}
                        />
                    )}
                </SettingRow>

                <SettingRow
                    title={translate("Manage roles visibility")}
                    description={translate(
                        "Only these roles will have access Admins are by default in this list"
                    )}
                    last={canEdit}
                    rightElement={
                        canEdit && (
                            <RolesPicker
                                value={visibleRoles}
                                disabled={isPublic}
                                onToggle={handleToggleRoleVisibility}
                            >
                                <Tooltip
                                    content={translate(
                                        "You can manage roles only when the resource is private"
                                    )}
                                    placement="top"
                                    disabled={!isPublic}
                                >
                                    <AnchorButton
                                        icon={<Icon icon="users" />}
                                        disabled={!canEdit || isPublic}
                                    >
                                        {translate("Add roles")}
                                    </AnchorButton>
                                </Tooltip>
                            </RolesPicker>
                        )
                    }
                >
                    {visibleRoles.length > 0 && (
                        <Roles roles={visibleRoles} onToggle={handleToggleRoleVisibility} canEdit={canEdit} />
                    )}

                    {visibleRoles.length === 0 && <div className={Classes.TEXT_DISABLED}>- No roles -</div>}
                </SettingRow>

                {!canEdit && ownerPerson && (
                    <SettingRow
                        title={translate("Owner")}
                        description={translate("Ask this person to change any visibility options")}
                        rightElement={<Assignees assignees={[ownerPerson]} max={5} />}
                        last
                    />
                )}
                {canEdit && (
                    <SettingRow
                        title={translate("Transfer ownership")}
                        description={translate(
                            "Transferring ownership to another individual will revoke any future privileges to modify any visibility options"
                        )}
                        rightElement={
                            <AnchorButton
                                icon={<Icon icon="user" />}
                                onClick={handleToggleTransferPeoplePicker}
                                data-testid="permissions-transfer-ownership-button"
                            >
                                {translate("Select owner")}
                            </AnchorButton>
                        }
                        last
                    >
                        {ownerPerson && <Assignees assignees={[ownerPerson]} max={1} />}
                        {showTransferPeople && (
                            <PeopleDialog
                                single
                                value={owner ? [owner] : []}
                                onClosed={() => setShowTransferPeople(false)}
                                onClose={handleTransferOwnership}
                            />
                        )}
                    </SettingRow>
                )}
            </div>
            {canEdit && (
                <div className={Classes.DIALOG_FOOTER}>
                    <div
                        className={Classes.DIALOG_FOOTER_ACTIONS}
                        style={{ justifyContent: "space-between", width: "100%" }}
                    >
                        <Tooltip
                            content={
                                isPublic
                                    ? translate("Make this resource public, thus visible to everyone")
                                    : translate(
                                          "Make this resource private and visible only to the owner and people in the visibility list."
                                      )
                            }
                        >
                            <AnchorButton
                                intent={isPublic ? Intent.SUCCESS : Intent.WARNING}
                                icon={isPublic ? "unlock" : "lock"}
                                onClick={handleTogglePublic}
                            >
                                {translate(isPublic ? "Make private" : "Make public")}
                            </AnchorButton>
                        </Tooltip>
                        <Button
                            intent={Intent.PRIMARY}
                            disabled={!hasChanges || isSaving}
                            loading={isSaving}
                            onClick={handleUpdate}
                            data-testid="permissions-update-button"
                        >
                            {translate("Update")}
                        </Button>
                    </div>
                </div>
            )}
        </Dialog>
    );
};

interface IRolesPickerProps {
    children: React.ReactNode;
    value: string[];
    disabled?: boolean;
    onToggle: (role: string) => void;
}
const RolesPicker: FunctionComponent<IRolesPickerProps> = ({ value, children, disabled, onToggle }) => {
    const roles = useRoles();

    const content = useMemo(() => {
        if (roles.length > 0) {
            return (
                <Menu>
                    {roles.map(role => {
                        return (
                            <MenuItem
                                text={role.title}
                                key={role.id}
                                onClick={() => onToggle(role.id)}
                                shouldDismissPopover={false}
                                labelElement={value.includes(role.id) ? <Icon icon="check" /> : undefined}
                            />
                        );
                    })}
                </Menu>
            );
        }

        return (
            <div style={{ padding: 20 }} className={Classes.TEXT_MUTED}>
                {translate("All available roles have been already assigned")}
            </div>
        );
    }, [onToggle, roles, value]);

    return (
        <Popover content={content} disabled={disabled}>
            {children}
        </Popover>
    );
};

interface RolesProps {
    roles: string[];
    canEdit: boolean | undefined;
    onToggle: (role: string) => void;
}
const Roles: FunctionComponent<RolesProps> = ({ roles, canEdit, onToggle }) => {
    return (
        <TagsWrapper>
            {roles.map((role: string) => {
                const roleObj = getRole(role);

                return (
                    <Tag
                        key={role}
                        minimal
                        size="large"
                        round
                        onRemove={canEdit ? () => onToggle(role) : undefined}
                    >
                        {roleObj?.title || role}
                    </Tag>
                );
            })}
        </TagsWrapper>
    );
};

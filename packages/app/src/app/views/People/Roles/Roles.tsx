// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { FC, useState } from "react";

import { Button, Checkbox, Classes, Colors, Dialog, FormGroup, H6, HTMLTable, InputGroup, Intent, TextArea, Tooltip } from "@blueprintjs/core";
import { IRole, IRoleAccess, IRoleActions, ITableColumns, ROLE_ICONS, ROLE_SECTIONS } from "@stacks/types";
import { Icon, TablePersistent, TablePersistentCellProps } from "app/components/common";
import { shallowEqual } from "app/hooks/store";
import { PeopleStore } from "app/store/people";
import { AppViewContent } from "app/widgets";
import { PeopleActions } from "app/store/actions";

const tableColumns: ITableColumns<IRole> = Object.freeze({
    title: {
        title: "Role",
        width: 300,
        minWidth: 100,
        maxWidth: 500,
        isSortable: true,
        unhideable: true,
        resizable: true,
    },
    description: {
        title: "Description",
        width: 150,
        minWidth: 100,
        maxWidth: 300,
        isSortable: true,
        resizable: true,
    },
    access: {
        title: "Access",
        width: 200,
        minWidth: 100,
        maxWidth: 300,
        isSortable: false,
        resizable: true,
    },
    edit: {
        title: "Edit",
        width: 150,
        minWidth: 100,
    },
});

export const PeopleRoles = () => {
    const roles = PeopleStore.use(state => state.roles, shallowEqual);
    const [role, setRole] = useState<IRole | undefined>();

    const handleUpdateAccess = (section: ROLE_SECTIONS, actions: IRoleActions) => {
        if (!role) return;
        const access = { ...(role?.access ?? {}) };
        access[section] = actions;
        if (access[section]?.read === false) {
            access[section]!.write = false;
        }

        setRole({ ...role, access });
    }

    const handleUpdateTitle = (title: string) => {
        if (!role) return;
        setRole({ ...role, title });
    }

    const handleUpdateDescription = (description: string) => {
        if (!role) return;
        setRole({ ...role, description });
    }

    const handleUpdateRole = () => {
        if (!role) return;
        PeopleActions.updateRole(role);
        closeRoleEdit();
    }

    const closeRoleEdit = () => {
        setRole(undefined)
    }

    return (
        <AppViewContent relative padded>
            <div className="people-roles">
                <TablePersistent
                    id="roles"
                    sticky
                    columns={tableColumns}
                    data={roles}
                    components={{
                        cell: RoleCell,
                        cellCallback: ({ row }) => setRole(row as IRole),
                    }}
                />
            </div>

            <Dialog title="Edit role access" isOpen={role != undefined} onClose={closeRoleEdit}>
                <div className={Classes.DIALOG_BODY}>
                    <FormGroup label="Role title" labelFor="roleTitle">
                        <InputGroup
                            id="roleTitle"
                            placeholder="A role title"
                            value={role?.title ?? ""}
                            onChange={(e) => handleUpdateTitle(e.target.value)}
                        />
                    </FormGroup>
                    <FormGroup label="Role description" labelFor="roleDescription">
                        <TextArea
                            id="roleDescription"
                            placeholder="A role description"
                            value={role?.description ?? ""}
                            onChange={(e) => handleUpdateDescription(e.target.value)}
                            fill
                        />
                    </FormGroup>

                    <H6>Access rights</H6>
                    <HTMLTable striped>
                        <thead>
                            <tr>
                                <th style={{ width: "100%" }}>Section</th>
                                <th>Read</th>
                                <th>Write</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(Object.keys(ROLE_SECTIONS) as Array<keyof typeof ROLE_SECTIONS>).map((section) => {
                                const read = role?.access[ROLE_SECTIONS[section]]?.read ?? false;
                                const write = role?.access[ROLE_SECTIONS[section]]?.write ?? false;
                                return (
                                    <tr key={section}>
                                        <td><Icon icon={ROLE_ICONS[ROLE_SECTIONS[section]]} /> {ROLE_SECTIONS[section]}</td>
                                        <td>
                                            <Checkbox
                                                checked={read}
                                                disabled={ROLE_SECTIONS[section] === ROLE_SECTIONS.ROLES}
                                                onChange={() => handleUpdateAccess(ROLE_SECTIONS[section], { read: !read, write })}
                                            />
                                        </td>
                                        <td>
                                            <Checkbox
                                                checked={write}
                                                disabled={[ROLE_SECTIONS.ROLES, ROLE_SECTIONS.REPORTS].includes(ROLE_SECTIONS[section]) || !read}
                                                onChange={() => handleUpdateAccess(ROLE_SECTIONS[section], { read, write: !write })}
                                            />
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </HTMLTable>
                </div>
                <div className={Classes.DIALOG_FOOTER}>
                    <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                        <Button
                            variant="minimal"
                            onClick={closeRoleEdit}
                        >
                            Cancel
                        </Button>
                        <Button
                            intent={Intent.PRIMARY}
                            onClick={handleUpdateRole}
                        >
                            Update role
                        </Button>
                    </div>
                </div>
            </Dialog>
        </AppViewContent>
    );
};

const RoleCell: FC<TablePersistentCellProps<IRole>> = ({ row, column, callback }) => {
    if (column === "access") {
        const access: IRoleAccess = row.access as IRoleAccess;
        const icons: React.ReactNode[] = [];

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for (const [_, roleSection] of Object.entries(ROLE_SECTIONS)) {
            if (access[roleSection] != null && access[roleSection]?.read) {
                icons.push(
                    <Tooltip content={roleSection} placement="top" key={roleSection}>
                        <Icon
                            icon={ROLE_ICONS[roleSection] ?? "alert-circle"}
                            color={access[roleSection]?.write ? Colors.VERMILION3 : Colors.GREEN3}
                        />
                    </Tooltip>
                );
            }
        }

        return <>{icons}</>
    } else if (column === "edit" && row.title !== "System") {
        return (
            <Button
                size="small"
                variant="minimal"
                icon={<Icon icon="edit-05" />}
                onClick={callback}
            >
                Edit role
            </Button>
        );
    }

    return (
        <span>
            {String(row[column as keyof IRole] ?? "")}
        </span>
    );
}
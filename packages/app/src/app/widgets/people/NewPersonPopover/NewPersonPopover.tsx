// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import {
    Button,
    Callout,
    Checkbox,
    Classes,
    FormGroup,
    HTMLSelect,
    InputGroup,
    Intent,
    Popover,
} from "@blueprintjs/core";
import React, { FunctionComponent, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { Col, Row } from "app/components/common";
import { useMe, useRoles } from "app/hooks";
import { IRole, PersonTemplate } from "@stacks/types";
import { PeopleActions } from "app/store/actions";

interface INewPersonPopoverProps {
    children: React.ReactNode;
    company?: string;
}
export const NewPersonPopover: FunctionComponent<INewPersonPopoverProps> = ({ children, company }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const locationState = location.state as { backgroundLocation?: Location };
    const [email, setEmail] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [role, setRole] = useState<string | undefined>();
    const [real, setReal] = useState(false);
    const cancelRef = useRef<HTMLButtonElement | null>(null);
    const roles = useRoles();
    const me = useMe();

    useEffect(() => {
        if (role) return;
        setRole(roles[0]?.id);
    }, [roles]);

    const canAdd = useMemo(() => {
        return firstName.trim().length > 0 && lastName.trim().length > 0;
    }, [email, firstName, lastName]);

    const handleAddPerson = async () => {
        const newPerson = {
            ...PersonTemplate,
            email,
            firstName,
            lastName,
            role,
        }

        if (company) {
            newPerson.company = company;
        }

        const person = await PeopleActions.addPerson(newPerson, real);
        if (!person) return;

        if (cancelRef.current) {
            cancelRef.current.click();
        }

        navigate(`/person/${person.id}`, {
            state: { backgroundLocation: locationState?.backgroundLocation || location },
        });
    };

    const handleClear = () => {
        setEmail("");
        setFirstName("");
        setLastName("");
        setReal(false);

        if (role !== roles[0]?.id) {
            setRole(roles[0]?.id);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && canAdd) {
            handleAddPerson();
        }
    };

    return (
        <Popover
            placement="bottom-end"
            popoverClassName="popover-padded-medium"
            content={
                <div>
                    <FormGroup label={translate("Name")}>
                        <Row gutter={10}>
                            <Col>
                                <InputGroup
                                    value={firstName}
                                    placeholder={translate("First name")}
                                    autoFocus
                                    onChange={e => setFirstName(e.currentTarget.value)}
                                    onKeyDown={handleKeyDown}
                                />
                            </Col>
                            <Col>
                                <InputGroup
                                    value={lastName}
                                    placeholder={translate("Last name")}
                                    onChange={e => setLastName(e.currentTarget.value)}
                                    onKeyDown={handleKeyDown}
                                />
                            </Col>
                        </Row>
                    </FormGroup>

                    <FormGroup label="Email">
                        <InputGroup
                            value={email}
                            placeholder="john@domain.com"
                            onChange={e => setEmail(e.currentTarget.value)}
                        />
                    </FormGroup>

                    <FormGroup label="User role">
                        <HTMLSelect fill value={role} onChange={e => setRole(e.currentTarget.value)}>
                            {roles.map((role: IRole) => {
                                return (
                                    <option value={role.id} key={role.id}>
                                        {role.title}
                                    </option>
                                );
                            })}
                        </HTMLSelect>
                    </FormGroup>

                    {email.length > 1 && me.admin && (
                        <Checkbox
                            label="Enable this user for login"
                            checked={real}
                            onChange={() => setReal(!real)}
                        />
                    )}

                    {real && (
                        <Callout intent="primary" style={{ maxWidth: 362 }}>
                            An email will be sent to <strong>{email}</strong> to invite them to set a
                            password.
                        </Callout>
                    )}

                    <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                        <Button
                            minimal
                            className={Classes.POPOVER_DISMISS}
                            ref={cancelRef}
                            onClick={handleClear}
                        >
                            {translate("Cancel")}
                        </Button>
                        <Button intent={Intent.PRIMARY} onClick={handleAddPerson} disabled={!canAdd}>
                            {translate("Add")}
                        </Button>
                    </div>
                </div>
            }
        >
            {children}
        </Popover>
    );
};

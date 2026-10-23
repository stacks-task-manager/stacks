// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Button, Colors, Dialog, Intent, Menu, MenuDivider, MenuItem, Popover } from "@blueprintjs/core";
import { shallowEqual } from "app/hooks/store";
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { Avatar, Icon } from "app/components/common";
import { AuthAPI } from "app/api/auth";
import { usePerson } from "app/hooks";
import { PeopleStore } from "app/store/people";
import { isSameDay } from "date-fns";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Video = require("assets/hb.mp4");

export const Me = () => {
    const me = PeopleStore.use(state => state.me, shallowEqual);
    const { isLoading, person } = usePerson(me);
    const [open, setOpen] = useState(false);
    const [showHB, setShowHB] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (!person) return;
        const shouldShowHB = person.birthday != null && isSameDay(person.birthday, new Date());
        setShowHB(shouldShowHB);
    }, [person]);

    const handleTogglePeopleDialog = () => {
        setOpen(!open);
    };

    const openProfile = () => {
        navigate(`/person/${me}`, {
            state: { backgroundLocation: location },
        });
    };

    /** Drops the session cookie and the non-authoritative hints, then returns to login. */
    const clearLocalSession = () => {
        for (const cookie of ["auth_token", "tenant", "uid"]) {
            document.cookie = `${cookie}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure; sameSite=`;
        }

        window.location.href = "/login";
    };

    /** Revokes the current session server-side; local state is cleared either way. */
    const handleLogout = async () => {
        let serverAccepted = false;
        try {
            await AuthAPI.revokeCurrentSession();
            serverAccepted = true;
        } catch {
            serverAccepted = false;
        }

        clearLocalSession();

        if (!serverAccepted) {
            window.toaster.show({
                message: translate(
                    "You are signed out on this device but the server could not revoke your session"
                ),
                intent: Intent.DANGER,
                icon: "error",
            });
        }
    };

    if (isLoading || !person) {
        return (
            <>
                <Popover
                    popoverClassName="popover-padded-medium"
                    content={
                        <div>
                            {translate("The current user is not yet selected")}
                            <br />
                            {translate("Click to select yourself from the list of people")}
                        </div>
                    }
                    placement="top-start"
                    interactionKind="hover"
                    renderTarget={({ isOpen, ...props }) => (
                        <Button
                            icon="user"
                            id="select-me"
                            variant="minimal"
                            onClick={handleTogglePeopleDialog}
                            active={isOpen}
                            {...props}
                        />
                    )}
                />
            </>
        );
    }

    return (
        <>
            <Popover
                content={
                    <Menu data-testid="profile-menu">
                        <MenuItem
                            text={`${translate("Edit profile")}...`}
                            icon={<Icon icon="user-circle" />}
                            intent={Intent.SUCCESS}
                            onClick={openProfile}
                        />
                        <MenuDivider />
                        <MenuItem
                            text={translate("Log out")}
                            icon={<Icon icon="user-add" />}
                            onClick={handleLogout}
                        />
                    </Menu>
                }
                placement="right-end"
            >
                <Avatar
                    person={person}
                    interractive
                    showTooltip
                    placement="right"
                    data-testid="profile-button"
                />
            </Popover>

            <Dialog
                isOpen={showHB}
                lazy
                style={{ background: Colors.WHITE, width: 300 }}
                title={`Happy Birthday ${person.firstName}!`}
                icon={<Icon icon="award-01" />}
                onClose={() => setShowHB(false)}
            >
                <video width="100%" autoPlay loop style={{ padding: "20px 20px 0 20px" }}>
                    <source src={Video} type="video/mp4" />
                </video>
            </Dialog>
        </>
    );
};

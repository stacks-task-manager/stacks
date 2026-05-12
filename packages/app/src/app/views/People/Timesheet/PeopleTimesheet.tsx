// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React from "react";

import { AppViewContent, PersonTimesheet } from "app/widgets";

export const PeopleTimesheet = () => {
    return (
        <AppViewContent relative>
            <div className="people-timesheet">
                <PersonTimesheet />
            </div>
        </AppViewContent>
    );
};

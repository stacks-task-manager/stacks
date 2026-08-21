// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.

import { AppViewContent, PersonTimesheet } from "app/widgets";

export const PeopleTimesheet = () => {
    return (
        <AppViewContent relative data-testid="people-timesheet-view">
            <div className="people-timesheet" data-testid="people-timesheet-content">
                <PersonTimesheet />
            </div>
        </AppViewContent>
    );
};

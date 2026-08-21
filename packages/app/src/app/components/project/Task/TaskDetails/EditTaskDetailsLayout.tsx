// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Classes, Tooltip } from "@blueprintjs/core";
import { translate } from "@stacks/translations";
import classNames from "classnames";
import { publish } from "app/hooks";
import { togglePreferences } from "app/store/global";

/**
 * Divider row with an "Edit" affordance that opens the Preferences dialog on the
 * task-details layout tab.
 */
export const EditTaskDetailsLayout = () => {
    const handleOpenPreferences = () => {
        togglePreferences();
        setTimeout(() => {
            publish("preferences:tab", "projects-tasksdetails");
        }, 200);
    };

    return (
        <div className="task-details-divider">
            <div className="task-details-divider__content">
                <Tooltip content={translate("Edit task details layout")} placement="top-end">
                    <small
                        className={classNames(Classes.TEXT_SMALL, Classes.TEXT_DISABLED)}
                        onClick={handleOpenPreferences}
                        data-testid="edit-task-details-layout"
                    >
                        {translate("Edit")}
                    </small>
                </Tooltip>
            </div>
        </div>
    );
};

// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { AnchorButton, ButtonGroup, Colors, FormGroup, Intent, Tooltip } from "@blueprintjs/core";
import { translate } from "@stacks/translations";
import { Icon } from "app/components/common/Icon/Icon";
import type { IFilters } from "app/store/projectFilters";
import React, { FunctionComponent, memo } from "react";

interface ITaskStateFilterProps {
    state: IFilters["state"];
    onChange: (state: IFilters["state"]) => void;
}

export const TaskStateFilter: FunctionComponent<ITaskStateFilterProps> = memo(function TaskStateFilter({
    state,
    onChange,
}) {
    return (
        <FormGroup label={translate("Task state")}>
            <ButtonGroup fill>
                <Tooltip
                    content={translate("Incomplete tasks")}
                    placement="top"
                    renderTarget={({ ref, ...props }) => (
                        <AnchorButton
                            fill
                            icon={<Icon icon="circle" color={Colors.ORANGE2} />}
                            ref={ref}
                            intent={state === "todo" ? Intent.PRIMARY : Intent.NONE}
                            onClick={() => onChange("todo")}
                            {...props}
                        />
                    )}
                />
                <Tooltip
                    content={translate("Completed tasks")}
                    placement="top"
                    renderTarget={({ ref, ...props }) => (
                        <AnchorButton
                            fill
                            icon={<Icon icon="check-circle" color={Colors.FOREST2} />}
                            ref={ref}
                            intent={state === "done" ? Intent.PRIMARY : Intent.NONE}
                            onClick={() => onChange("done")}
                            {...props}
                        />
                    )}
                />
                <Tooltip
                    content={translate("All tasks")}
                    placement="top"
                    renderTarget={({ ref, ...props }) => (
                        <AnchorButton
                            fill
                            icon={<Icon icon="minus-circle" color={Colors.BLUE3} />}
                            ref={ref}
                            intent={state === "all" ? Intent.PRIMARY : Intent.NONE}
                            onClick={() => onChange("all")}
                            {...props}
                        />
                    )}
                />
            </ButtonGroup>
        </FormGroup>
    );
});

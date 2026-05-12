// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import React from "react";
import { Position, Classes, Intent, Button, Popover } from "@blueprintjs/core";

interface IPopupDeleteWidgetProps {
    onDelete: () => void;
}

export class PopupDeleteWidget extends React.PureComponent<IPopupDeleteWidgetProps> {
    render() {
        return (
            <Popover
                content={this.renderDeletePopover()}
                placement={Position.LEFT}
                usePortal
                className="delete-widget-button"
                popoverClassName="popover-small popover-padded"
            >
                <Button size="small" variant="minimal" icon="trash" intent={Intent.DANGER} />
            </Popover>
        );
    }

    private renderDeletePopover = () => {
        const { onDelete } = this.props;

        return (
            <React.Fragment>
                <p>
                    {translate("Are you sure you want to delete this widget This action cannot be undone")}
                </p>
                <Button
                    intent={Intent.DANGER}
                    icon="trash"
                    onClick={onDelete}
                    className={Classes.POPOVER_DISMISS}
                >
                    {translate("Yes")}
                </Button>
            </React.Fragment>
        );
    };
}

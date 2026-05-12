// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React from "react";

interface IPopupDescriptionViewProps {
    description: string;
}

export class PopupDescriptionView extends React.PureComponent<IPopupDescriptionViewProps> {
    render() {
        const { description } = this.props;

        return <div className="popup-description-view">{description}</div>;
    }
}

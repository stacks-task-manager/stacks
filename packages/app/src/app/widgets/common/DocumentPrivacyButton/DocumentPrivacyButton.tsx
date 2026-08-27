// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { FunctionComponent } from "react";
import { translate } from "@stacks/translations";

import { useDocument } from "app/hooks";
import { Colors } from "@blueprintjs/core";
import { ToolbarButton } from "app/components/common";

interface DocumentPrivacyButtonProps {
    documentId: string;
    onClick: () => void;
}
export const DocumentPrivacyButton: FunctionComponent<DocumentPrivacyButtonProps> = ({
    documentId,
    onClick,
}) => {
    const document = useDocument(documentId);
    if (document?.permissions.isPublic) return null;

    return (
        <ToolbarButton
            icon="shield-tick"
            tooltip={translate("This project is private")}
            placement="bottom"
            minimal
            iconColor={Colors.RED3}
            onClick={onClick}
        />
    );
};

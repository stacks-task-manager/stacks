// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { NonIdealState } from "@blueprintjs/core";
import classNames from "classnames";
import React, { CSSProperties, FunctionComponent } from "react";

import { Icon } from "../Icon/Icon";

interface BlankSlateProps {
    icon: string;
    title?: React.ReactNode;
    description?: React.ReactNode | string;
    children?: React.ReactNode;
    maxWidth?: number | string;
    width?: number | string;
    padding?: number;
    small?: boolean;
    action?: React.JSX.Element;
    testId?: string;
}
export const BlankSlate: FunctionComponent<BlankSlateProps> = ({
    icon,
    title,
    description,
    children,
    maxWidth,
    width,
    padding,
    small,
    action,
    testId,
}) => {
    const style: CSSProperties = {
        padding: `${padding ?? 30}px 10px`,
    };

    if (width != null) {
        style.width = width;
    }

    if (maxWidth != null) {
        style.maxWidth = maxWidth;
    }

    return (
        <div className={classNames("blank-slate", { small })} style={style} data-testid={testId}>
            <NonIdealState
                title={title}
                icon={<Icon icon={icon} size={small ? 28 : 42} />}
                description={description}
                action={action}
            >
                {children}
            </NonIdealState>

            {/* <Grid gap={15} padding={padding ?? 30}>
                <div>
                    <Grid gap={5}>
                        <Row>
                            <Col justify="center">
                                <Icon icon={icon} size={32} className={Classes.TEXT_DISABLED} />
                            </Col>
                        </Row>
                        <Row>
                            <Col justify="center">
                                <div className={classNames(Classes.TEXT_MUTED, "text-center")}>{title}</div>
                            </Col>
                        </Row>
                    </Grid>
                </div>

                {children && (
                    <Row>
                        <Col justify="center">{children}</Col>
                    </Row>
                )}
            </Grid> */}
        </div>
    );
};

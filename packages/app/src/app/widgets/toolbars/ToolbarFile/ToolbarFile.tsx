// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Button, Menu, MenuDivider, Popover } from "@blueprintjs/core";
import { useParams } from "react-router-dom";

import { Icon } from "app/components/common";
import { DocumentTintMenuItem, ToolbarTitle } from "app/widgets";
import {
    MainToolbar,
    SectionToolbar,
    SectionToolbarOptions,
    SectionToolbarSide,
    SectionToolbarTitle,
} from "app/widgets/toolbars/ToolbarLayout";

export const ToolbarFile = () => {
    const params = useParams<{ id: string }>();

    return (
        <MainToolbar single>
            <SectionToolbar>
                <SectionToolbarSide side>
                    <SectionToolbarTitle>
                        <ToolbarTitle documentId={params.id} />
                    </SectionToolbarTitle>
                    <SectionToolbarOptions>
                        <Popover
                            content={
                                <Menu>
                                    {params.id && <DocumentTintMenuItem documentId={params.id} />}
                                    <MenuDivider />
                                </Menu>
                            }
                            placement="bottom"
                        >
                            <Button size="small" variant="minimal" icon={<Icon icon="chevron-down" />} />
                        </Popover>
                    </SectionToolbarOptions>
                </SectionToolbarSide>
                <SectionToolbarSide fixed>&nbsp;</SectionToolbarSide>
            </SectionToolbar>
        </MainToolbar>
    );
};

// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.

import {
    MainToolbar,
    SectionToolbar,
    SectionToolbarSide,
    SectionToolbarTitle,
} from "app/widgets/toolbars/ToolbarLayout";
export const InboxToolbar = () => {
    return (
        <MainToolbar>
            <SectionToolbar>
                <SectionToolbarSide side>
                    <SectionToolbarTitle>
                        <h1>Inbox</h1>
                    </SectionToolbarTitle>
                </SectionToolbarSide>
                <SectionToolbarSide fixed>&nbsp;</SectionToolbarSide>
            </SectionToolbar>
            {/* <div className="section-toolbar">
                <div className="section-toolbar-side">&nbsp;</div>
                <div className="section-toolbar-side"></div>
            </div> */}
        </MainToolbar>
    );
};

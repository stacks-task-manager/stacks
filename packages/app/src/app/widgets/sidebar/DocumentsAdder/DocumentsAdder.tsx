// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Button, Colors, Menu, MenuDivider, MenuItem, Popover, useHotkeys } from "@blueprintjs/core";
import { TreeMethods } from "@minoru/react-dnd-treeview";
import React, { FunctionComponent, useMemo, useRef, useState } from "react";

import { APPICONS, FILES_TYPE, IAttachment, IProject, RECORDTYPE, ROLE_SECTIONS } from "@stacks/types";
import { HotkeyChip, HotkeyTooltip, Icon } from "app/components/common";
import { QuickTimeLogDialog } from "app/components/project";
import { useCanAccess, useNav, useOnClickOutside } from "app/hooks";
import { RecordActions } from "app/store/actions";
import { toggleNewBookmark, toggleNewTask } from "app/store/global";
import { NewFolderDialog } from "../NewFolderDialog/NewFolderDialog";
import { NewNotepadDialog } from "../NewNotepadDialog/NewNotepadDialog";
import { NewProjectDialog } from "../NewProjectDialog/NewProjectDialog";
import { SidebarDivider } from "../SidebarDivider/SidebarDivider";
import { useUpload } from "app/hooks/fileUpload";
import { DocumentsArchiveDialog } from "app/widgets/common";

interface IDocumentsAdderProps {
    treeMethods: TreeMethods | null;
    padded?: boolean;
}
const DocumentsAdderPure: FunctionComponent<IDocumentsAdderProps> = ({ treeMethods, padded }) => {
    const navigate = useNav();
    const quickAddOpen = useRef(false);
    const popoverRef = useRef(null);
    const [showPopover, setShowPopover] = useState(false);
    const [showNewFolder, setShowNewFolder] = useState(false);
    const [showNewProject, setShowNewProject] = useState(false);
    const [showNewNotepad, setShowNewNotepad] = useState(false);
    const [showLogTime, setShowLogTime] = useState(false);
    const [showArchives, setShowArchives] = useState(false);
    const { pickFiles } = useUpload();
    const { write: canLogTime } = useCanAccess(ROLE_SECTIONS.TIMELOGS);

    useOnClickOutside(popoverRef, () => {
        setShowPopover(false);
    });

    const handleShowNewProject = () => {
        setShowNewProject(true);
    };

    const handleShowNewNotepad = () => {
        setShowNewNotepad(true);
    };

    const handleTogglePopover = () => {
        setShowPopover(!showPopover);
    };

    const handleHidePopover = () => {
        setShowPopover(false);
    };

    const handleShowTimeLog = () => {
        setShowLogTime(true);
    };

    const handleShowArchives = () => {
        setShowArchives(true);
    };

    const hotkeys = useMemo(() => {
        const hotkeys = [
            {
                combo: "Q",
                global: true,
                label: "Quick add a document",
                onKeyDown: handleTogglePopover,
            },
            {
                combo: "F",
                global: true,
                label: "Quick add a folder",
                preventDefault: true,
                onKeyDown: () => {
                    if (quickAddOpen.current) {
                        handleHidePopover();
                        setShowNewFolder(true);
                    }
                },
            },
            {
                combo: "P",
                global: true,
                preventDefault: true,
                label: "Quick add project",
                onKeyDown: () => {
                    if (quickAddOpen.current) {
                        handleHidePopover();
                        handleShowNewProject();
                    }
                },
            },
            {
                combo: "T",
                global: true,
                label: "Quick add task",
                onKeyDown: () => {
                    if (quickAddOpen.current) {
                        handleHidePopover();
                        toggleNewTask();
                    }
                },
            },
            {
                combo: "N",
                global: true,
                label: "Quick add notepad",
                preventDefault: true,
                onKeyDown: () => {
                    if (quickAddOpen.current) {
                        handleHidePopover();
                        handleShowNewNotepad();
                    }
                },
            },
            {
                combo: "B",
                global: true,
                label: "Quick add bookmark",
                onKeyDown: () => {
                    if (quickAddOpen.current) {
                        handleHidePopover();
                        toggleNewBookmark();
                    }
                },
            },
            {
                combo: "A",
                global: true,
                label: "Quick add file",
                onKeyDown: () => {
                    if (quickAddOpen.current) {
                        handleHidePopover();
                        handleAddFile();
                    }
                },
            },
        ];

        if (canLogTime) {
            hotkeys.push({
                combo: "L",
                global: true,
                label: "Quick log time",
                onKeyDown: () => {
                    if (quickAddOpen.current) {
                        handleHidePopover();
                        handleShowTimeLog();
                    }
                },
            });
        }

        hotkeys.push({
            combo: "S",
            global: true,
            label: "Show archives",
            onKeyDown: () => {
                if (quickAddOpen.current) {
                    handleHidePopover();
                    handleShowArchives();
                }
            },
        });

        return hotkeys;
    }, [canLogTime]);
    const { handleKeyDown, handleKeyUp } = useHotkeys(hotkeys);

    const handleAddFolder = async (title: string, isPublic: boolean) => {
        const selectedRecord = RecordActions.getSelected();

        if (selectedRecord && selectedRecord.droppable) {
            if (treeMethods && treeMethods) {
                treeMethods.open(selectedRecord.id);
            }
        }

        await RecordActions.addDocument({
            title,
            type: RECORDTYPE.FOLDER,
            parent: selectedRecord?.droppable ? selectedRecord.id : undefined,
            permissions: {
                isPublic,
            },
        });
    };

    const handleAddProject = async (title: string, data: Partial<IProject>, isPublic: boolean) => {
        const selectedRecord = RecordActions.getSelected();

        const document = await RecordActions.addDocument({
            title,
            type: RECORDTYPE.PROJECT,
            parent: selectedRecord?.droppable ? selectedRecord.id : undefined,
            permissions: {
                isPublic,
            },
            data,
        });

        navigate(`/project/${document.id}`);
    };

    const handleAddNotepad = async (title: string, isPublic: boolean) => {
        const selectedRecord = RecordActions.getSelected();

        const document = await RecordActions.addDocument({
            title,
            type: RECORDTYPE.NOTEPAD,
            parent: selectedRecord?.droppable ? selectedRecord.id : undefined,
            permissions: {
                isPublic,
            },
        });

        navigate(`/notepad/${document.id}`);
    };

    const handleAddFile = async () => {
        const selectedRecord = RecordActions.getSelected();

        const document = await RecordActions.addDocument({
            title: "Temp file",
            type: RECORDTYPE.FILE,
            parent: selectedRecord?.droppable ? selectedRecord.id : undefined,
            permissions: {
                isPublic: true,
            },
        });

        pickFiles({
            recordId: document.id,
            type: FILES_TYPE.FILE,
            onUploaded: async (files: IAttachment[]) => {
                await RecordActions.setTitle(files[0].originalName, document.id);
                navigate(`/file/${document.id}`);
            },
        });
    };

    // this is required in order to not unselect a folder or document
    // when the user tries to add a child document in the selected
    const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
        event.stopPropagation();
    };

    const margin = padded ? 10 : 2;

    return (
        <div onClick={handleClick}>
            <div
                tabIndex={0}
                onKeyDown={handleKeyDown}
                onKeyUp={handleKeyUp}
                style={{ width: "100%", height: 1, margin: `${margin}px 0` }}
            />
            <SidebarDivider title={translate("Documents")}>
                <Popover
                    isOpen={showPopover}
                    onOpened={() => (quickAddOpen.current = true)}
                    onClosed={() => (quickAddOpen.current = false)}
                    placement="right-start"
                    popoverRef={popoverRef}
                    content={
                        <Menu data-testid="quick-add-menu">
                            <MenuItem
                                text={translate("Folder")}
                                icon={<Icon icon={APPICONS.FOLDER} />}
                                labelElement={<HotkeyChip keys={["F"]} />}
                                onClick={() => {
                                    handleHidePopover();
                                    setShowNewFolder(true);
                                }}
                                data-testid="new-folder-item"
                            />
                            <MenuDivider />
                            <MenuItem
                                text={translate("Project")}
                                icon={<Icon icon={APPICONS.PROJECT} />}
                                labelElement={<HotkeyChip keys={["P"]} />}
                                onClick={() => {
                                    handleHidePopover();
                                    handleShowNewProject();
                                }}
                                data-testid="new-project-item"
                            />
                            <MenuItem
                                text={translate("Task")}
                                icon={<Icon icon="check-circle" />}
                                labelElement={<HotkeyChip keys={["T"]} />}
                                onClick={() => {
                                    handleHidePopover();
                                    toggleNewTask();
                                }}
                                data-testid="new-task-item"
                            />
                            <MenuItem
                                text={translate("Notepad")}
                                icon={<Icon icon={APPICONS.NOTEPAD} />}
                                labelElement={<HotkeyChip keys={["N"]} />}
                                onClick={() => {
                                    handleHidePopover();
                                    handleShowNewNotepad();
                                }}
                                data-testid="new-notepad-item"
                            />
                            <MenuItem
                                text={translate("File")}
                                icon={<Icon icon={APPICONS.FILE} />}
                                labelElement={<HotkeyChip keys={["A"]} />}
                                onClick={() => {
                                    handleHidePopover();
                                    handleAddFile();
                                }}
                                data-testid="new-file-item"
                            />
                            {/* <MenuItem
                                text="Goal"
                                icon={<Icon icon="target-04" />}
                                labelElement={<HotkeyChip keys={["G"]} />}
                            /> */}
                            <MenuItem
                                text={translate("Bookmark")}
                                icon={<Icon icon="bookmark" />}
                                labelElement={<HotkeyChip keys={["B"]} />}
                                onClick={() => {
                                    handleHidePopover();
                                    toggleNewBookmark();
                                }}
                                data-testid="new-bookmark-item"
                            />
                            {canLogTime && (
                                <MenuItem
                                    text={translate("Log time")}
                                    icon={<Icon icon="clock-plus" />}
                                    labelElement={<HotkeyChip keys={["L"]} />}
                                    onClick={() => {
                                        handleHidePopover();
                                        handleShowTimeLog();
                                    }}
                                    data-testid="new-logtime-item"
                                />
                            )}

                            <MenuDivider />
                            <MenuItem
                                text="Show Archives"
                                icon={<Icon icon={APPICONS.ARCHIVED} />}
                                onClick={handleShowArchives}
                                labelElement={<HotkeyChip keys={["S"]} />}
                                data-testid="show-archives-item"
                            />
                        </Menu>
                    }
                    renderTarget={({ isOpen, ...props }) => (
                        <span {...props}>
                            <HotkeyTooltip
                                title={translate("Quick add")}
                                keys={["Q"]}
                                placement="top"
                                horizontal
                            >
                                <Button
                                    size="small"
                                    variant="minimal"
                                    icon={<Icon icon="plus" color={Colors.GRAY3} />}
                                    data-testid="quick-add-button"
                                    active={isOpen}
                                    onClick={handleTogglePopover}
                                >
                                    <Icon icon="chevron-down" color={Colors.GRAY2} size={12} />
                                </Button>
                            </HotkeyTooltip>
                        </span>
                    )}
                />
            </SidebarDivider>

            {showNewProject && (
                <NewProjectDialog onSave={handleAddProject} onClose={() => setShowNewProject(false)} />
            )}
            {showNewFolder && (
                <NewFolderDialog onClose={() => setShowNewFolder(false)} onSave={handleAddFolder} />
            )}
            {showNewNotepad && (
                <NewNotepadDialog onClose={() => setShowNewNotepad(false)} onSave={handleAddNotepad} />
            )}

            {showLogTime ? (
                <QuickTimeLogDialog changeProject changeTask onClose={() => setShowLogTime(false)} />
            ) : null}

            {showArchives && <DocumentsArchiveDialog onClose={() => setShowArchives(false)} />}
        </div>
    );
};

export const DocumentsAdder = React.memo(DocumentsAdderPure);

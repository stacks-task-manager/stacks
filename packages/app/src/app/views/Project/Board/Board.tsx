// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Button, Classes, Intent } from "@blueprintjs/core";
import { Plus } from "@blueprintjs/icons";
import mousetrap, { ExtendedKeyboardEvent } from "mousetrap";
import React, { useEffect, useMemo, useRef } from "react";
import { BlankSlate, Grid, PopupNewGeneric } from "app/components/common";
import { Container } from "app/components/draggable";
import { NewStack, Stack } from "app/components/project";
import { getCurrentProjectId, getHashPathname, getProjectIdFromHashPath, useNav } from "app/hooks";
import { snapshotTaskModalBackground } from "app/hooks/router";
import { useStacksIds } from "app/hooks/stacks";
import { StacksActions, TasksActions } from "app/store/actions";
import {
    NavigationStore,
    cancelSelection,
    copySelection,
    navigateNextStack,
    navigateNextTask,
    navigatePrevStack,
    navigatePrevTask,
} from "app/store/navigation";
import { PreferencesStore } from "app/store/preferences";
import { scrollIntoView } from "app/utils/dom";
const StacksPure = () => {
    const stacks = useStacksIds();

    const memoizedStacks = useMemo(() => {
        return stacks.map((stackId: string, index: number) => {
            return <Stack key={stackId} stackId={stackId} stackIndex={index} />;
        });
    }, [stacks]);

    return <React.Fragment>{memoizedStacks}</React.Fragment>;
};
const Stacks = React.memo(StacksPure);

interface IPos {
    top: number;
    left: number;
    x: number;
    y: number;
}

const BoardPure = () => {
    const nav = useNav();
    const navToastRef = useRef<string>();

    const pos = useRef<IPos>({
        top: 0,
        left: 0,
        x: 0,
        y: 0,
    });

    const openTask = (e: ExtendedKeyboardEvent) => {
        // this would fix hitting enter on buttons, menu items
        const focusedElement = e.target as Element | null;
        if (focusedElement) {
            if (focusedElement.tagName === "BUTTON" || focusedElement.classList.contains(Classes.MENU_ITEM)) {
                setTimeout(() => {
                    (focusedElement as HTMLButtonElement).click();
                });
                return;
            }
        }

        const { tasks } = NavigationStore.get();
        if (!tasks.length) return;
        const [task] = tasks;

        const projectId = getCurrentProjectId();

        if (PreferencesStore.get().embeddedTask) {
            nav(`/project/${projectId}/${task}`);
            setTimeout(() => {
                scrollIntoView(document.getElementById(`task-${task}`), { behavior: "smooth" });
            }, 500);
        } else {
            nav(`/task/${task}`, {
                state: {
                    backgroundLocation: snapshotTaskModalBackground(),
                },
            });
        }
    };

    const showToast = (isStack?: boolean) => {
        if (navToastRef.current) {
            window.toaster.dismiss(navToastRef.current);
        }

        navToastRef.current = window.toaster.show({
            message: `Enable highlighting from the Board Preferences to select a ${
                isStack ? "stack" : "task"
            }`,
        });
    };

    useEffect(() => {
        // used to navigate to the next stack
        mousetrap.bind("right", (e: ExtendedKeyboardEvent) => {
            if (!PreferencesStore.get().highlightStack) {
                showToast(true);
            }

            navigateNextStack(e);

            if (getHashPathname().split("/").filter(Boolean).length > 2 && PreferencesStore.get().embeddedTask) {
                openTask(e);
            }
        });
        // used to navigate to the previous stack
        mousetrap.bind("left", (e: ExtendedKeyboardEvent) => {
            if (!PreferencesStore.get().highlightStack) {
                showToast(true);
            }

            navigatePrevStack(e);

            if (getHashPathname().split("/").filter(Boolean).length > 2 && PreferencesStore.get().embeddedTask) {
                openTask(e);
            }
        });
        // used to navigate to the next task
        mousetrap.bind(["down", "shift+down"], (e: ExtendedKeyboardEvent) => {
            if (!PreferencesStore.get().highlightTask) {
                showToast();
            }

            navigateNextTask(e);

            if (getHashPathname().split("/").filter(Boolean).length > 2 && PreferencesStore.get().embeddedTask) {
                openTask(e);
            }
        });
        // used to navigate to the previous task
        mousetrap.bind(["up", "shift+up"], (e: ExtendedKeyboardEvent) => {
            if (!PreferencesStore.get().highlightTask) {
                showToast();
            }

            navigatePrevTask(e);

            if (getHashPathname().split("/").filter(Boolean).length > 2 && PreferencesStore.get().embeddedTask) {
                openTask(e);
            }
        });
        // used to unselect the current task and stack
        mousetrap.bind("escape", () => {
            cancelSelection();
            if (getHashPathname().split("/").filter(Boolean).length > 2 && PreferencesStore.get().embeddedTask) {
                nav(`/project/${getProjectIdFromHashPath()}`);
            }
        });
        // copy selected tasks info to pasteboard
        mousetrap.bind("meta+c", copySelection);
        // used to open the selected task
        mousetrap.bind("enter", openTask);
        // used to toggle done on the selected task
        mousetrap.bind("space", TasksActions.toggleSelected);
        // used to add a new stack
        mousetrap.bind("meta+shift+n", () => {
            if (PreferencesStore.get().hideNewStack) {
                const project = getCurrentProjectId();

                StacksActions.add({
                    title: translate("Untitled stack"),
                    project,
                }).then(newStack => {
                    if (newStack) {
                        setTimeout(() => {
                            scrollIntoView(document.getElementById(`stack-${newStack.id}`), {
                                behavior: "smooth",
                            });
                        }, 200);
                    }
                });
            } else {
                const stackNewEl = document.getElementById("stack-add-new");
                scrollIntoView(stackNewEl);
                stackNewEl?.click();
            }
        });
        // used to add a new task
        mousetrap.bind("meta+n", () => {
            const selectedStack = StacksActions.getSelectedStack();

            if (selectedStack) {
                if (selectedStack.collapsed) {
                    StacksActions.uncollapse(selectedStack.id);
                }
                document.getElementById(`new-task-bottom-${selectedStack.id}`)?.click();
            } else {
                window.toaster.show({
                    message:
                        "Make sure you either select a default Stack in Project settings or select a stack using the hotkeys",
                    icon: "warning-sign",
                    intent: Intent.WARNING,
                });
            }
        });
        // used to collapse the stack
        mousetrap.bind("shift+left", () => StacksActions.collapseSelected());
        // used to uncollapse the stack
        mousetrap.bind("shift+right", () => StacksActions.uncollapseSelected());
        // used to delete a task
        mousetrap.bind("meta+backspace", () => {
            TasksActions.removeSelected();
        });

        return () => {
            mousetrap.unbind("right");
            mousetrap.unbind("left");
            mousetrap.unbind(["down", "shift+down"]);
            mousetrap.unbind(["up", "shift+up"]);
            mousetrap.unbind("escape");
            mousetrap.unbind("meta+c");
            mousetrap.unbind("enter");
            mousetrap.unbind("space");
            mousetrap.unbind("meta+shift+n");
            mousetrap.unbind("meta+n");
            mousetrap.unbind("shift+left");
            mousetrap.unbind("shift+right");
            mousetrap.unbind("meta+backspace");
        };
    }, []);

    const mouseMoveHandler = (event: MouseEvent) => {
        // const element = event.target as HTMLElement;
        const stacksEl = document.getElementById("stacks");

        // How far the mouse has been moved
        const dx = event.clientX - pos.current.x;
        const dy = event.clientY - pos.current.y;

        // Scroll the element
        if (stacksEl) {
            stacksEl.scrollTop = pos.current.top - dy;
            stacksEl.scrollLeft = pos.current.left - dx;
        }
    };

    const mouseUpHandler = (event: MouseEvent) => {
        const element = event.target as HTMLElement;
        element.style.cursor = "grab";
        element.style.removeProperty("user-select");

        document.removeEventListener("mousemove", mouseMoveHandler);
        document.removeEventListener("mouseup", mouseUpHandler);
    };

    const handleMouseDown = (event: React.MouseEvent<HTMLElement>) => {
        const element = event.target as HTMLElement;
        const stacksEl = document.getElementById("stacks");

        if (
            stacksEl &&
            (element.id === "stacks" ||
                (element.classList.contains("container") &&
                    element.getAttribute("data-direction") === "horizontal"))
        ) {
            element.style.cursor = "grabbing";
            element.style.userSelect = "none";

            pos.current = {
                left: stacksEl.scrollLeft,
                top: stacksEl.scrollTop,
                // Get the current mouse position
                x: event.clientX,
                y: event.clientY,
            };

            document.addEventListener("mousemove", mouseMoveHandler);
            document.addEventListener("mouseup", mouseUpHandler);
        }
    };

    return (
        <Container
            id="stacks"
            type="stack"
            direction="horizontal"
            tabIndex={-1}
            onReorder={StacksActions.drop}
            onMouseDown={handleMouseDown}
            className="scroller"
            data-testid="board-view"
        >
            <Stacks />
            <BoardNoColumns />
        </Container>
    );
};

export const BoardNoColumns = () => {
    const stacks = useStacksIds();

    if (stacks.length) {
        return <NewStack />;
    }

    const handleCreateStack = (title: string) => {
        const project = getCurrentProjectId();
        StacksActions.add({ title: title.trim(), project });
    };

    return (
        <Grid vertical>
            <BlankSlate
                testId="board-no-columns-blank-slate"
                title="No columns"
                description="This project does not have any columns just yet. Add your first column now."
                icon="board-view"
                action={
                    <PopupNewGeneric placeholder={translate("Untitled stack")} onAdd={handleCreateStack}>
                        <Button
                            variant="minimal"
                            intent={Intent.PRIMARY}
                            icon={<Plus />}
                            data-testid="board-no-columns-blank-slate-add-button"
                        >
                            {translate("Add a new stack")}
                        </Button>
                    </PopupNewGeneric>
                }
            />
        </Grid>
    );
};

export const Board = React.memo(BoardPure);

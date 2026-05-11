// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Button, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import {
    Modal,
    ModalBackdrop,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
} from "@/components/ui/modal";
import { Pressable } from "@/components/ui/pressable";
import { ScrollView } from "@/components/ui/scroll-view";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useRef } from "react";
import type { IStack, ITask } from "@stacks/types";

/**
 * Column-picker for moving a task. Opens from a long-press on a TaskCard,
 * lists every column except the task's current one, and fires `onSelect`
 * with the chosen stack id. The caller is responsible for calling the
 * `POST /api/tasks/move` endpoint.
 */
export function MoveTaskModal({
    task,
    stacks,
    onClose,
    onSelect,
}: {
    task: ITask | null;
    stacks: IStack[];
    onClose: () => void;
    onSelect: (stackId: string) => void;
}) {
    const visible = task != null;
    const targets = stacks.filter(s => s.id !== task?.stack);
    const ref = useRef(null);

    return (
        <Modal isOpen={visible} onClose={onClose} finalFocusRef={ref}>
            <ModalBackdrop />
            <ModalContent>
                <ModalHeader>
                    <VStack>
                        <Heading size="md">Move task</Heading>
                        {task ? (
                            <Text
                                size="sm"
                                className="text-typography-500"
                                numberOfLines={2}
                            >
                                {task.title}
                            </Text>
                        ) : null}
                    </VStack>
                </ModalHeader>
                <ModalBody>
                    {targets.length === 0 ? (
                        <Text className="text-typography-500">
                            This project has no other columns.
                        </Text>
                    ) : (
                        <ScrollView style={{ maxHeight: 400 }}>
                            <VStack>
                                {targets.map(stack => (
                                    <Pressable
                                        key={stack.id}
                                        onPress={() => onSelect(stack.id)}
                                        className="py-3 px-2.5 rounded-sm active:bg-background-100"
                                    >
                                        <Text size="md" className="text-typography-900">
                                            {stack.title}
                                        </Text>
                                    </Pressable>
                                ))}
                            </VStack>
                        </ScrollView>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button variant="outline" onPress={onClose}>
                        <ButtonText>Cancel</ButtonText>
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

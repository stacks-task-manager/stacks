// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { createContext, useContext } from 'react';
import {
  Modal as RNModal,
  Pressable,
  ScrollView,
  View,
  type ModalProps,
  type PressableProps,
  type ScrollViewProps,
  type ViewProps,
} from 'react-native';

import { cn } from '../lib/cn';

const MODAL_SCOPE = Symbol('MODAL');

const ModalContext = createContext<'xs' | 'sm' | 'md' | 'lg' | 'full'>('md');

const MODAL_CONTENT_WIDTH: Record<string, string> = {
  xs: 'w-[60%] max-w-[360px]',
  sm: 'w-[70%] max-w-[420px]',
  md: 'w-[80%] max-w-[510px]',
  lg: 'w-[90%] max-w-[640px]',
  full: 'w-full',
};

type IModalProps = Omit<ModalProps, 'visible' | 'onRequestClose'> & {
  isOpen?: boolean;
  onClose?: () => void;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'full';
  finalFocusRef?: React.RefObject<unknown> | null;
  className?: string;
};

const Modal = React.forwardRef<React.ComponentRef<typeof RNModal>, IModalProps>(
  function Modal(
    { isOpen, onClose, size = 'md', finalFocusRef, className, children, ...props },
    ref
  ) {
    void finalFocusRef;
    return (
      <ModalContext.Provider value={size}>
        <RNModal
          ref={ref}
          {...props}
          visible={!!isOpen}
          onRequestClose={onClose}
          transparent
          animationType="fade"
        >
          <View className="flex-1 items-center justify-center bg-black/50" pointerEvents="box-none">
            {children}
          </View>
        </RNModal>
      </ModalContext.Provider>
    );
  }
);

type IModalBackdropProps = PressableProps & { className?: string };

const ModalBackdrop = React.forwardRef<
  React.ComponentRef<typeof Pressable>,
  IModalBackdropProps
>(function ModalBackdrop({ className, onPress, ...props }, ref) {
  // The backdrop sits behind the content; tapping it requests close.
  return (
    <Pressable
      ref={ref}
      {...props}
      onPress={onPress}
      className={cn('absolute left-0 top-0 right-0 bottom-0', className)}
    />
  );
});

type IModalContentProps = ViewProps & { className?: string };

const ModalContent = React.forwardRef<
  React.ComponentRef<typeof View>,
  IModalContentProps
>(function ModalContent({ className, ...props }, ref) {
  const parentSize = useContext(ModalContext);
  return (
    <View
      ref={ref}
      {...props}
      className={cn(
        'bg-background-0 rounded-md overflow-hidden border border-outline-100 shadow-hard-2 p-6',
        MODAL_CONTENT_WIDTH[parentSize],
        className
      )}
    />
  );
});

type IModalHeaderProps = ViewProps & { className?: string };

const ModalHeader = React.forwardRef<
  React.ComponentRef<typeof View>,
  IModalHeaderProps
>(function ModalHeader({ className, ...props }, ref) {
  return (
    <View ref={ref} {...props} className={cn('flex-row justify-between items-center', className)} />
  );
});

type IModalBodyProps = ScrollViewProps & { className?: string };

const ModalBody = React.forwardRef<
  React.ComponentRef<typeof ScrollView>,
  IModalBodyProps
>(function ModalBody({ className, ...props }, ref) {
  return (
    <ScrollView ref={ref} {...props} className={cn('mt-2 mb-6', className)} />
  );
});

type IModalFooterProps = ViewProps & { className?: string };

const ModalFooter = React.forwardRef<
  React.ComponentRef<typeof View>,
  IModalFooterProps
>(function ModalFooter({ className, ...props }, ref) {
  return (
    <View ref={ref} {...props} className={cn('flex-row justify-end items-center gap-2', className)} />
  );
});

Modal.displayName = 'Modal';
ModalBackdrop.displayName = 'ModalBackdrop';
ModalContent.displayName = 'ModalContent';
ModalHeader.displayName = 'ModalHeader';
ModalBody.displayName = 'ModalBody';
ModalFooter.displayName = 'ModalFooter';
void MODAL_SCOPE;

export { Modal, ModalBackdrop, ModalContent, ModalHeader, ModalBody, ModalFooter };

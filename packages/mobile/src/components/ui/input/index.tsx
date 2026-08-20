// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { createContext, useContext } from 'react';
import {
  Pressable,
  TextInput,
  View,
  type PressableProps,
  type TextInputProps,
  type ViewProps,
} from 'react-native';

import { cn } from '../lib/cn';

const INPUT_SCOPE = Symbol('INPUT');

type InputContextValue = {
  variant: 'underlined' | 'outline' | 'rounded';
  size: 'xl' | 'lg' | 'md' | 'sm';
  isDisabled: boolean;
};

const InputContext = createContext<InputContextValue>({
  variant: 'outline',
  size: 'md',
  isDisabled: false,
});

const INPUT_SIZE_HEIGHT: Record<string, string> = {
  xl: 'h-12',
  lg: 'h-11',
  md: 'h-10',
  sm: 'h-9',
};

const INPUT_VARIANT_CLASS: Record<string, string> = {
  underlined: 'rounded-none border-b',
  outline: 'rounded border',
  rounded: 'rounded-full border',
};

type IInputProps = ViewProps & {
  className?: string;
  variant?: 'underlined' | 'outline' | 'rounded';
  size?: 'xl' | 'lg' | 'md' | 'sm';
  isDisabled?: boolean;
};

const Input = React.forwardRef<React.ComponentRef<typeof View>, IInputProps>(
  function Input(
    { className, variant = 'outline', size = 'md', isDisabled, ...props },
    ref
  ) {
    return (
      <InputContext.Provider value={{ variant, size, isDisabled: !!isDisabled }}>
        <View
          ref={ref}
          {...props}
          className={cn(
            'border-background-300 flex-row overflow-hidden items-center',
            INPUT_SIZE_HEIGHT[size],
            INPUT_VARIANT_CLASS[variant],
            className
          )}
        />
      </InputContext.Provider>
    );
  }
);

type IInputFieldProps = TextInputProps & { className?: string };

const InputField = React.forwardRef<
  React.ComponentRef<typeof TextInput>,
  IInputFieldProps
>(function InputField({ className, ...props }, ref) {
  const { variant, size, isDisabled } = useContext(InputContext);
  void size;
  return (
    <TextInput
      ref={ref}
      {...props}
      editable={props.editable === false ? false : !isDisabled}
      placeholderTextColor="#8f8f8f"
      className={cn(
        'flex-1 text-typography-900 py-0 px-3 h-full',
        variant === 'rounded' && 'px-4',
        variant === 'underlined' && 'px-0',
        className
      )}
    />
  );
});

type IInputSlotProps = PressableProps & { className?: string };

const InputSlot = React.forwardRef<
  React.ComponentRef<typeof Pressable>,
  IInputSlotProps
>(function InputSlot({ className, ...props }, ref) {
  return (
    <Pressable ref={ref} {...props} className={cn('justify-center items-center', className)} />
  );
});

Input.displayName = 'Input';
InputField.displayName = 'InputField';
InputSlot.displayName = 'InputSlot';
void INPUT_SCOPE;

export { Input, InputField, InputSlot };

// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React from 'react';
import { Pressable as RNPressable, type PressableProps } from 'react-native';

const Pressable = React.forwardRef<
  React.ComponentRef<typeof RNPressable>,
  PressableProps & { className?: string }
>(function Pressable({ className, ...props }, ref) {
  return <RNPressable ref={ref} {...props} className={className} />;
});

Pressable.displayName = 'Pressable';
export { Pressable };

// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { ActivityIndicator, type ActivityIndicatorProps } from 'react-native';
import React from 'react';

const Spinner = React.forwardRef<
  React.ComponentRef<typeof ActivityIndicator>,
  ActivityIndicatorProps
>(function Spinner(
  {
    focusable = false,
    'aria-label': ariaLabel = 'loading',
    ...props
  },
  ref
) {
  return (
    <ActivityIndicator
      ref={ref}
      focusable={focusable}
      aria-label={ariaLabel}
      {...props}
    />
  );
});

Spinner.displayName = 'Spinner';

export { Spinner };

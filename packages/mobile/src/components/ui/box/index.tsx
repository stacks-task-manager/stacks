// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React from 'react';
import { View, type ViewProps } from 'react-native';

import { cn } from '../lib/cn';

type IBoxProps = ViewProps & { className?: string };

const Box = React.forwardRef<React.ComponentRef<typeof View>, IBoxProps>(
  function Box({ className, ...props }, ref) {
    return (
      <View
        ref={ref}
        {...props}
        className={cn(
          'relative box-border border-0 bg-transparent items-stretch m-0 p-0',
          className
        )}
      />
    );
  }
);

Box.displayName = 'Box';
export { Box };

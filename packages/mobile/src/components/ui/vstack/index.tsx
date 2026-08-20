// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React from 'react';
import { View, type ViewProps } from 'react-native';

import { cn, SPACE_TO_GAP } from '../lib/cn';

type IVStackProps = ViewProps & {
  className?: string;
  space?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  reversed?: boolean;
};

const VStack = React.forwardRef<React.ComponentRef<typeof View>, IVStackProps>(
  function VStack({ className, space, reversed, ...props }, ref) {
    return (
      <View
        ref={ref}
        {...props}
        className={cn(
          'flex-col',
          space && SPACE_TO_GAP[space],
          reversed && 'flex-col-reverse',
          className
        )}
      />
    );
  }
);

VStack.displayName = 'VStack';

export { VStack };

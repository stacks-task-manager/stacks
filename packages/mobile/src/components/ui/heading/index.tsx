// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { forwardRef, memo } from 'react';
import { Text as RNText, type TextProps } from 'react-native';

import { cn } from '../lib/cn';

const HEADING_SIZE_CLASS: Record<string, string> = {
  '5xl': 'text-6xl',
  '4xl': 'text-5xl',
  '3xl': 'text-4xl',
  '2xl': 'text-3xl',
  'xl': 'text-2xl',
  'lg': 'text-xl',
  'md': 'text-lg',
  'sm': 'text-base',
  'xs': 'text-sm',
};

type IHeadingProps = TextProps & {
  className?: string;
  as?: React.ElementType;
  isTruncated?: boolean;
  bold?: boolean;
  underline?: boolean;
  strikeThrough?: boolean;
  size?: '5xl' | '4xl' | '3xl' | '2xl' | 'xl' | 'lg' | 'md' | 'sm' | 'xs';
  sub?: boolean;
  italic?: boolean;
  highlight?: boolean;
};

const Heading = memo(
  forwardRef<React.ComponentRef<typeof RNText>, IHeadingProps>(
    function Heading(
      {
        className,
        size = 'lg',
        as: AsComp,
        isTruncated,
        bold,
        underline,
        strikeThrough,
        sub,
        italic,
        highlight,
        ...props
      },
      ref
    ) {
      const content = (
        <RNText
          ref={ref}
          {...props}
          className={cn(
            'text-typography-900 font-bold font-heading',
            HEADING_SIZE_CLASS[sub ? 'xs' : size],
            isTruncated && 'truncate',
            bold && 'font-bold',
            underline && 'underline',
            strikeThrough && 'line-through',
            italic && 'italic',
            highlight && 'bg-yellow-500',
            className
          )}
        />
      );

      if (AsComp) {
        const As = AsComp as React.ElementType;
        return <As {...props}>{content}</As>;
      }
      return content;
    }
  )
);

Heading.displayName = 'Heading';

export { Heading };

// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React from 'react';
import { Image as RNImage, type ImageProps as RNImageProps } from 'react-native';

import { cn } from '../lib/cn';

const IMAGE_SIZE_CLASS: Record<string, string> = {
  '2xs': 'h-6 w-6',
  'xs': 'h-10 w-10',
  'sm': 'h-16 w-16',
  'md': 'h-20 w-20',
  'lg': 'h-24 w-24',
  'xl': 'h-32 w-32',
  '2xl': 'h-64 w-64',
  'full': 'h-full w-full',
  'none': '',
};

type ImageProps = RNImageProps & {
  className?: string;
  size?: '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' | 'none';
};
const Image = React.forwardRef<
  React.ComponentRef<typeof RNImage>,
  ImageProps
>(function Image({ size = 'md', className, ...props }, ref) {
  return (
    <RNImage
      ref={ref}
      {...props}
      className={cn('max-w-full', IMAGE_SIZE_CLASS[size], className)}
    />
  );
});

Image.displayName = 'Image';
export { Image };

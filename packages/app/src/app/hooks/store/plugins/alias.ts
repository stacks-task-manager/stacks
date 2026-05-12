// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Entity key aliasing for legacy ids.
 */
import type { Plugin } from '../entity'

/**
 * Alias plug-in provides a meaningful name to the entity.
 *
 * @param name - unique name
 */
export function alias(name: string): Plugin {
  return {
    init(origInit, entity) {
      return () => {
        entity.name = name

        origInit()
      }
    },
  }
}

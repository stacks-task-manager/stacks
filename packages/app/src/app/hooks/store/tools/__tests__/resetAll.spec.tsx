// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { resetAll } from '../resetAll'
import { enableStore } from '../store'
import { entity } from '../../entity'

import type { Entity } from '../../entity'

describe('resetAll', () => {
  it('resets all entities to initial value', () => {
    enableStore()

    const counters: Entity<number>[] = []
    for (let i = 0; i < 5; i++) {
      counters[i] = entity(0)
    }
    counters.forEach(counter => counter.set(1))

    resetAll()

    counters.forEach(counter => {
      expect(counter.get()).toBe(0)
    })
  })

  it('requires store to be enabled and throws error otherwise', () => {
    enableStore(false)
    expect(() => resetAll()).toThrow()
  })
})

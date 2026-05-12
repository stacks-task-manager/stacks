// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { persistence } from '../persistence'
import { entity } from '../../entity'

import type { AsyncStorage, Storage } from '../persistence'

function attachStorageMock(name: 'localStorage' | 'sessionStorage') {
  const store: Record<string, string> = {}
  const api = {
    getItem: jest.fn((key: string) => (Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null)),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = String(value)
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key]
    }),
    clear: jest.fn(() => {
      for (const k of Object.keys(store)) delete store[k]
    }),
    key: jest.fn(),
    get length() {
      return Object.keys(store).length
    },
  }
  Object.defineProperty(window, name, {
    value: api,
    configurable: true,
    writable: true,
  })
  return api
}

describe('persistence', () => {
  beforeEach(() => {
    attachStorageMock('localStorage')
    attachStorageMock('sessionStorage')
  })

  it('comes as a function that returns the plug-in', () => {
    expect(persistence).toBeInstanceOf(Function)

    const plugin = persistence('counter')
    expect(plugin).toBeInstanceOf(Object)
  })

  it('provides override for entity.init()', () => {
    const plugin = persistence('counter')
    expect(plugin).toHaveProperty('init')
  })

  it('provides override for entity.set()', () => {
    const plugin = persistence('counter')
    expect(plugin).toHaveProperty('set')
  })

  it('requires a `key` as its first argument', () => {
    expect(() => {
      // @ts-ignore
      persistence()
    }).toThrow()
  })

  it('fetches the persisted value by `key` upon entity initialization', () => {
    entity(0, [persistence('counter')])
    expect(localStorage.getItem).toHaveBeenLastCalledWith('counter')
  })

  it('sets the fetched value as current value', () => {
    localStorage.setItem('counter', '1')
    const counter = entity(0, [persistence('counter')])
    expect(counter.get()).toBe(1)
  })

  it('persists the new value by `key` on every entity.set()', () => {
    const counter = entity(0, [persistence('counter')])
    counter.set(1)
    expect(localStorage.setItem).toHaveBeenLastCalledWith('counter', '1')
  })

  it('uses localStorage by default if no `storage` is specified in options', () => {
    entity(0, [persistence('counter')])
    expect(localStorage.getItem).toHaveBeenLastCalledWith('counter')
  })

  it('uses localStorage when `storage` option is set to `localStorage`', () => {
    entity(0, [persistence('counter', { storage: localStorage })])
    expect(localStorage.getItem).toHaveBeenLastCalledWith('counter')
  })

  it('uses sessionStorage when `storage` option is set to `sessionStorage`', () => {
    entity(0, [persistence('counter', { storage: sessionStorage })])
    expect(sessionStorage.getItem).toHaveBeenLastCalledWith('counter')
    expect(localStorage.getItem).not.toHaveBeenCalled()
  })

  it('supports custom storage', () => {
    const customStorage = {
      getItem: jest.fn(() => null),
      setItem: jest.fn(),
      length: 0,
      clear: jest.fn(),
      key: jest.fn(),
      removeItem: jest.fn(),
    } as Storage
    entity(0, [persistence('counter', { storage: customStorage })])
    expect(customStorage.getItem).toHaveBeenLastCalledWith('counter')
    expect(localStorage.getItem).not.toHaveBeenCalled()
  })

  it('supports custom storage with async methods', async () => {
    const customStorage: AsyncStorage = {
      getItem: key => Promise.resolve('10'),
      setItem: (key, value) => Promise.resolve(),
    }
    const counter = entity(0, [
      persistence('counter', { storage: customStorage }),
    ])
    await inspectAfterTimeout(() => {
      expect(counter.get()).toBe(10)
    })
  })

  it('warns if custom storage does not implement both `getItem` and `setItem`', () => {
    const origWarn = console.warn
    console.warn = jest.fn()

    // @ts-ignore
    const customStorage: AsyncStorage = {
      setItem: jest.fn(),
    }
    expect(() => {
      entity(0, [persistence('counter', { storage: customStorage })])
    }).not.toThrow()

    console.warn = origWarn
  })

  it('supports a custom `serializeFn` when saving to storage', () => {
    let serialized = ''
    const wrap = (val: any) => {
      return (serialized = JSON.stringify({ value: val }))
    }
    const counter = entity(0, [persistence('counter', { serializeFn: wrap })])
    counter.set(1)
    expect(localStorage.setItem).toHaveBeenLastCalledWith('counter', serialized)
  })

  it('supports async custom `serializeFn`', async () => {
    let serialized = ''
    const wrap = (val: any) =>
      new Promise<string>(resolve => {
        resolve((serialized = JSON.stringify({ value: val })))
      })
    const counter = entity(0, [persistence('counter', { serializeFn: wrap })])
    counter.set(1)
    await inspectAfterTimeout(() => {
      expect(localStorage.setItem).toHaveBeenLastCalledWith(
        'counter',
        serialized,
      )
    })
  })

  it('supports a custom `deserializeFn` when fetching from storage', () => {
    localStorage.setItem('counter', '{"value":1}')
    const unwrap = (val: string) => JSON.parse(val).value
    const counter = entity(0, [
      persistence('counter', { deserializeFn: unwrap }),
    ])
    expect(counter.get()).toBe(1)
  })

  it('supports async custom `deserializeFn`', async () => {
    localStorage.setItem('counter', '{"value":1}')
    const unwrap = (val: string) =>
      new Promise(resolve => resolve(JSON.parse(val).value))
    const counter = entity(0, [
      persistence('counter', { deserializeFn: unwrap }),
    ])
    await inspectAfterTimeout(() => {
      expect(counter.get()).toBe(1)
    })
  })

  it('does not set entity value if async `getItem` resolves to null', async () => {
    const customStorage: AsyncStorage = {
      getItem: key => Promise.resolve(null),
      setItem: jest.fn(),
    }
    const counter = entity(0, [
      persistence('counter', { storage: customStorage }),
    ])
    await inspectAfterTimeout(() => {
      expect(customStorage.setItem).not.toHaveBeenCalled()
      expect(counter.get()).toBe(0)
    })
  })

  it('warns if localStorage is not available but does not throw', () => {
    const origWarn = console.warn
    console.warn = jest.fn()

    const prev = window.localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {},
      configurable: true,
      writable: true,
    })

    expect(() => {
      entity(0, [persistence('counter')])
    }).not.toThrow()
    expect(console.warn).toHaveBeenCalled()

    Object.defineProperty(window, 'localStorage', {
      value: prev,
      configurable: true,
      writable: true,
    })

    console.warn = origWarn
  })

  it('warns if sessionStorage is not available but does not throw', () => {
    const origWarn = console.warn
    console.warn = jest.fn()

    const prevSession = window.sessionStorage
    const prevLocal = window.localStorage
    Object.defineProperty(window, 'sessionStorage', {
      value: {},
      configurable: true,
      writable: true,
    })
    Object.defineProperty(window, 'localStorage', {
      value: {},
      configurable: true,
      writable: true,
    })

    expect(() => {
      entity(0, [persistence('counter', { storage: sessionStorage })])
    }).not.toThrow()
    expect(console.warn).toHaveBeenCalled()

    Object.defineProperty(window, 'sessionStorage', {
      value: prevSession,
      configurable: true,
      writable: true,
    })
    Object.defineProperty(window, 'localStorage', {
      value: prevLocal,
      configurable: true,
      writable: true,
    })

    console.warn = origWarn
  })
})

const inspectAfterTimeout = (inspect: () => void, timeout = 25) =>
  new Promise<void>(resolve => {
    setTimeout(() => {
      inspect()
      resolve()
    }, timeout)
  })

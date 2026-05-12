// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import {
  __resetInspectorForTests,
  enableInspector,
  initInspector,
  onInit,
  onSet,
  features,
} from '../inspector'
import { getMutableMap, initRegistry, updateRegistry } from '../registry'
import { entity } from '../../entity'

import type { Entity } from '../../entity'

describe('inspector', () => {
  let origExt: any
  let isDevToolsEnabled = true
  let isDevToolsInitialized = false
  let lastDevToolsEvent: any = null
  let lastDevToolsState: Record<string, any>

  /** Holds DevTools `subscribe` callback — use a property to avoid jest/global name collisions (see `connection`). */
  const devToolsDispatchListener: { current: ((event: any) => void) | null } = {
    current: null,
  }

  const mockDevToolsConnection = {
    // Plain methods (not jest.fn) so param names like `state`/`event` cannot collide with jsdom globals.
    init(map: Record<string, any>) {
      isDevToolsInitialized = true
      lastDevToolsEvent = { type: '@@INIT' }
      lastDevToolsState = map
    },
    send(
      action: { type: string } | null,
      map: Record<string, any>,
    ) {
      lastDevToolsEvent = action
      lastDevToolsState = { ...map }
    },
    subscribe(fn: (event: any) => void) {
      devToolsDispatchListener.current = fn
    },
  }

  const ext = {
    connect: jest.fn(),
  }

  function mockDevTools() {
    origExt = window.__REDUX_DEVTOOLS_EXTENSION__
    window.__REDUX_DEVTOOLS_EXTENSION__ = ext
  }

  function unmockDevTools() {
    window.__REDUX_DEVTOOLS_EXTENSION__ = origExt
  }

  function enableDevTools(enabled = true) {
    isDevToolsEnabled = enabled
    window.__REDUX_DEVTOOLS_EXTENSION__ = isDevToolsEnabled ? ext : undefined
  }

  function mockEntity(initialValue: any, name?: string) {
    let _value = initialValue
    return {
      name: name ?? 'entity0',
      get: jest.fn(() => _value),
      set: jest.fn(value => (_value = value)),
    } as any as Entity
  }

  beforeAll(mockDevTools)
  afterAll(unmockDevTools)

  beforeEach(() => {
    __resetInspectorForTests()
    enableDevTools(true)
    window.__REDUX_DEVTOOLS_EXTENSION__ = ext
    ext.connect.mockReset()
    ext.connect.mockReturnValue(mockDevToolsConnection)
    initRegistry()
    devToolsDispatchListener.current = null
    lastDevToolsEvent = null
    lastDevToolsState = {}
    isDevToolsInitialized = false
  })

  describe('onInit', () => {
    it('does not proceed if entity is private', () => {
      onInit(mockEntity(0, '_privateFoo'))
      expect(ext.connect).not.toHaveBeenCalled()
    })

    it('initializes Inspector on first invocation only', () => {
      onInit(mockEntity(0))
      onInit(mockEntity(0))
      expect(ext.connect).toHaveBeenCalledTimes(1)
    })

    it('subscribes the entity to updates in the registry value', () => {
      enableInspector()
      const counter = mockEntity(0, 'counter')
      onInit(counter)
      updateRegistry({ counter: 1 })

      expect(counter.get()).toBe(1)
    })

    it('restricts subscription to update the entity only if Inspector is enabled', () => {
      enableInspector(false)
      const counter = mockEntity(0, 'counter')
      onInit(counter)
      updateRegistry({ counter: 1 })

      expect(counter.get()).toBe(0)
    })

    it('saves the initial value of the entity to the registry', () => {
      onInit(mockEntity(0, 'counter'))

      expect(getMutableMap()).toHaveProperty('counter', 0)
    })

    it('defers responding to RESET until values are initialized', () => {
      enableInspector()
      const counter = mockEntity(0, 'counter')
      onInit(counter)
      devToolsDispatchListener.current!({
        type: 'DISPATCH',
        payload: { type: 'RESET' },
      })

      expect(lastDevToolsEvent).toBeNull()
    })

    it('defers sending initial values to Dev Tools until the first entity `set()`', () => {
      enableInspector()
      const counter = mockEntity(0, 'counter')
      onInit(counter)
      expect(isDevToolsInitialized).toBe(false)

      onSet(counter, 'increment')
      expect(isDevToolsInitialized).toBe(true)
    })

    it('notifies Dev Tools of any lazy-initialized entity', () => {
      enableInspector()
      const primer = mockEntity(0, 'primer')
      onInit(primer)
      onSet(primer, 'prime')
      lastDevToolsEvent = null
      onInit(mockEntity(null, 'foo'))

      expect(lastDevToolsEvent).toHaveProperty('type', 'foo:@@LAZY_INIT')
      expect(lastDevToolsState).toEqual(getMutableMap())
    })
  })

  describe('initInspector', () => {
    document.title = 'Test'

    it('connects to Dev Tools, setting name to document title, with certain features disabled', () => {
      initInspector()
      expect(ext.connect).toHaveBeenCalledWith({ name: 'Test', features })
    })

    it('initializes the registry', () => {
      initInspector()
      expect(getMutableMap()).toEqual({})
    })

    it('subscribes to Dev Tools "Jump to State" events', () => {
      initInspector()
      enableInspector()
      devToolsDispatchListener.current!({
        type: 'DISPATCH',
        state: '{"counter": 1}',
        payload: { type: 'JUMP_TO_STATE' },
      })

      const registryVal = getMutableMap()
      expect(registryVal).toHaveProperty('counter', 1)
    })

    it('subscribes to Dev Tools "Jump to Action" events', () => {
      initInspector()
      enableInspector()
      devToolsDispatchListener.current!({
        type: 'DISPATCH',
        state: '{"counter": 1}',
        payload: { type: 'JUMP_TO_ACTION' },
      })

      const registryVal = getMutableMap()
      expect(registryVal).toHaveProperty('counter', 1)
    })

    it('subscribes to Dev Tools "Commit" events', () => {
      initInspector()
      enableInspector()
      const registryVal = getMutableMap()
      devToolsDispatchListener.current!({
        type: 'DISPATCH',
        payload: { type: 'COMMIT' },
      })

      expect(lastDevToolsEvent).toHaveProperty('type', '@@INIT')
      expect(lastDevToolsState).toEqual(registryVal)
    })

    it('subscribes to Dev Tools "Rollback" events', () => {
      initInspector()
      enableInspector()
      devToolsDispatchListener.current!({
        type: 'DISPATCH',
        state: '{"counter": 1}',
        payload: { type: 'ROLLBACK' },
      })

      const registryVal = getMutableMap()
      expect(registryVal).toHaveProperty('counter', 1)
      expect(lastDevToolsEvent).toHaveProperty('type', '@@INIT')
      expect(lastDevToolsState).toEqual(registryVal)
    })

    it('subscribes to Dev Tools "Reset" events', () => {
      initInspector()
      enableInspector()
      const seed = mockEntity(0, 'counter')
      onInit(seed)
      onSet(seed, 'seed')
      lastDevToolsEvent = { type: 'increment' }
      lastDevToolsState = { counter: 1 }
      updateRegistry({ counter: 1 })
      devToolsDispatchListener.current!({
        type: 'DISPATCH',
        payload: { type: 'RESET' },
      })

      const registryVal = getMutableMap()
      expect(registryVal).toHaveProperty('counter', 0)
      expect(lastDevToolsEvent).toHaveProperty('type', '@@INIT')
      expect(lastDevToolsState).toEqual(registryVal)
    })

    it('subscribes to Dev Tools "Import State" events', () => {
      initInspector()
      enableInspector()
      updateRegistry({ counter: 5 })
      const nextLiftedState = {
        computedStates: [{ state: { counter: 0 } }, { state: { counter: 1 } }],
        currentStateIndex: 1,
      }
      devToolsDispatchListener.current!({
        type: 'DISPATCH',
        payload: {
          type: 'IMPORT_STATE',
          nextLiftedState,
        },
      })

      const registryVal = getMutableMap()
      expect(registryVal).toHaveProperty('counter', 1)
      expect(lastDevToolsEvent).toBeNull()
      expect(lastDevToolsState).toEqual(nextLiftedState)
    })

    it('gracefully handles invalid "Import State" payload', () => {
      initInspector()
      enableInspector()
      updateRegistry({ counter: 5 })

      const noNextLiftedState = { type: 'IMPORT_STATE' }
      const noComputedStates = {
        type: 'IMPORT_STATE',
        nextLiftedState: {},
      }
      const emptyComputedStates = {
        type: 'IMPORT_STATE',
        nextLiftedState: { computedStates: [] },
      }
      ;[noNextLiftedState, noComputedStates, emptyComputedStates].forEach(
        payload => {
          expect(() => {
            devToolsDispatchListener.current!({
              type: 'DISPATCH',
              payload,
            })
          }).not.toThrow()

          const registryVal = getMutableMap()
          expect(registryVal).toHaveProperty('counter', 5)
        },
      )
    })

    it('subscribes to Dev Tools "Pause Recording" events', () => {
      initInspector()
      enableInspector()

      const foo = entity('', 'foo')
      foo.set('bar', 'setFooBar')
      devToolsDispatchListener.current!({
        type: 'DISPATCH',
        payload: { type: 'PAUSE_RECORDING' },
      })
      foo.set('boo', 'setFooBoo')

      expect(lastDevToolsEvent).toHaveProperty('type', 'foo:setFooBar')
      expect(lastDevToolsState).toHaveProperty('foo', 'bar')

      // Resume recording.
      devToolsDispatchListener.current!({
        type: 'DISPATCH',
        payload: { type: 'PAUSE_RECORDING' },
      })
    })

    it('restricts subscription to only respond to Dev Tools events when Inspector is enabled', () => {
      initInspector()
      enableInspector(false)
      devToolsDispatchListener.current!({
        type: 'DISPATCH',
        state: '{"counter": 1}',
        payload: { type: 'JUMP_TO_STATE' },
      })

      const registryVal = getMutableMap()
      expect(registryVal).not.toHaveProperty('counter')
    })

    it('does not subscribe if Dev Tools is not detected', () => {
      enableDevTools(false)
      initInspector()

      expect(devToolsDispatchListener.current).toBeNull()

      enableDevTools(true)
    })

    it('gracefully handles invalid state from Dev Tools event', () => {
      const origConsoleError = console.error
      console.error = jest.fn()

      initInspector()
      enableInspector()
      updateRegistry({ counter: 1 })

      expect(() => {
        devToolsDispatchListener.current!({
          type: 'DISPATCH',
          state: 'undefined',
          payload: { type: 'JUMP_TO_STATE' },
        })
      }).not.toThrow()
      expect(console.error).toHaveBeenCalled()

      const registryVal = getMutableMap()
      expect(registryVal).toHaveProperty('counter', 1)

      console.error = origConsoleError
    })

    it('ignores Dev Tools event types other than "DISPATCH"', () => {
      initInspector()
      enableInspector()
      updateRegistry({ counter: 1 })
      devToolsDispatchListener.current!({
        type: 'ACTION',
        payload: '{ "type": "DO_SOMETHING" }',
      })

      const registryVal = getMutableMap()
      expect(registryVal).toHaveProperty('counter', 1)
    })
  })

  describe('onSet', () => {
    beforeEach(() => {
      initInspector()
      lastDevToolsEvent = null
      lastDevToolsState = {}
    })

    it('saves the updated value of the entity to the registry', () => {
      const counter = mockEntity(0, 'counter')
      onInit(counter)
      counter.set(1)
      onSet(counter, 'increment')

      expect(getMutableMap()).toHaveProperty('counter', 1)
    })

    it('notifies Dev Tools of the entity update', () => {
      enableInspector()
      const counter = mockEntity(0, 'counter')
      onInit(counter)
      counter.set(1)
      onSet(counter, 'increment')

      expect(lastDevToolsEvent).toHaveProperty('type', 'counter:increment')
      expect(lastDevToolsState).toEqual(getMutableMap())
    })

    it('does not notify Dev Tools of the entity update if Inspector is disabled', () => {
      enableInspector(false)
      const counter = mockEntity(0, 'counter')
      onInit(counter)
      counter.set(1)
      onSet(counter, 'increment')

      expect(lastDevToolsEvent).toBeNull()
    })

    it('does not notify Dev Tools if update came from Inspector', () => {
      enableInspector()
      const counter = mockEntity(0, 'counter')
      onInit(counter)
      counter.set(1)
      onSet(counter, 'increment')
      onSet(counter, '@@DEVTOOLS')

      expect(lastDevToolsEvent).toHaveProperty('type', 'counter:increment')
    })
  })
})

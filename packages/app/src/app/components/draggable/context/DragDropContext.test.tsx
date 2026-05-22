// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React, { useRef, useEffect } from 'react';
import { DragDropProvider, useDragDrop } from './DragDropContext';

// Helper to create a mock rect
const createRect = (top: number, left: number, width: number, height: number): DOMRect => ({
  top,
  left,
  bottom: top + height,
  right: left + width,
  width,
  height,
  x: left,
  y: top,
  toJSON: () => ({}),
});

// Test component that simulates Container behavior
interface TestContainerProps {
  id: string;
  acceptsTypes: string[];
  direction?: 'horizontal' | 'vertical';
  children?: React.ReactNode;
  onReorder?: (result: { itemId: string; fromIndex: number; toIndex: number }) => void;
  onItemMove?: (result: { itemId: string; fromContainerId: string; toContainerId: string; fromIndex: number; toIndex: number }) => void;
  mockRect?: DOMRect;
}

function TestContainer({ id, acceptsTypes, direction, children, onReorder, onItemMove, mockRect }: TestContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { registerContainer, unregisterContainer } = useDragDrop();

  useEffect(() => {
    if (containerRef.current && mockRect) {
      containerRef.current.getBoundingClientRect = () => mockRect;
    }
    registerContainer(id, acceptsTypes, direction, containerRef.current, onReorder, onItemMove);
    return () => unregisterContainer(id);
  }, [id, acceptsTypes, direction, onReorder, onItemMove, registerContainer, unregisterContainer, mockRect]);

  return (
    <div ref={containerRef} data-testid={`container-${id}`} data-container-id={id}>
      {children}
    </div>
  );
}

// Test component that simulates Draggable behavior
interface TestDraggableProps {
  id: string;
  type: string;
  containerId: string;
  children: React.ReactNode;
  mockRect?: DOMRect;
}

function TestDraggable({ id, type, containerId, children, mockRect }: TestDraggableProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const { dragState, startDrag } = useDragDrop();

  useEffect(() => {
    if (elementRef.current && mockRect) {
      elementRef.current.getBoundingClientRect = () => mockRect;
    }
  }, [mockRect]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (elementRef.current) {
      startDrag(id, type, containerId, e, elementRef.current, children);
    }
  };

  const isBeingDragged = dragState.isDragging && dragState.draggedId === id && dragState.sourceContainerId === containerId;

  return (
    <div
      ref={elementRef}
      data-id={id}
      data-type={type}
      data-container-id={containerId}
      data-testid={`draggable-${id}`}
      onMouseDown={handleMouseDown}
      style={{ opacity: isBeingDragged ? 0.5 : 1 }}
    >
      {children}
    </div>
  );
}

describe('DragDropContext', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('DragDropProvider', () => {
    it('should render children', () => {
      render(
        <DragDropProvider>
          <div data-testid="child">Hello</div>
        </DragDropProvider>
      );
      
      expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('should provide drag context to children', () => {
      const TestChild = () => {
        const context = useDragDrop();
        return <div data-testid="context-check">{context ? 'has-context' : 'no-context'}</div>;
      };

      render(
        <DragDropProvider>
          <TestChild />
        </DragDropProvider>
      );
      
      expect(screen.getByTestId('context-check')).toHaveTextContent('has-context');
    });

    it('should throw error when useDragDrop is used outside provider', () => {
      const TestChild = () => {
        useDragDrop();
        return null;
      };

      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => render(<TestChild />)).toThrow('useDragDrop must be used within a DragDropProvider');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Container Registration', () => {
    it('should register a container', () => {
      const onReorder = vi.fn();
      
      render(
        <DragDropProvider>
          <TestContainer id="test-container" acceptsTypes={['item']} onReorder={onReorder}>
            <div>Container content</div>
          </TestContainer>
        </DragDropProvider>
      );
      
      expect(screen.getByTestId('container-test-container')).toBeInTheDocument();
    });

    it('should register multiple containers', () => {
      render(
        <DragDropProvider>
          <TestContainer id="container-1" acceptsTypes={['item']}>
            <div>Container 1</div>
          </TestContainer>
          <TestContainer id="container-2" acceptsTypes={['item']}>
            <div>Container 2</div>
          </TestContainer>
        </DragDropProvider>
      );
      
      expect(screen.getByTestId('container-container-1')).toBeInTheDocument();
      expect(screen.getByTestId('container-container-2')).toBeInTheDocument();
    });

    it('should unregister container on unmount', () => {
      const { rerender } = render(
        <DragDropProvider>
          <TestContainer id="test-container" acceptsTypes={['item']}>
            <div>Container content</div>
          </TestContainer>
        </DragDropProvider>
      );
      
      rerender(
        <DragDropProvider>
          <div>No container</div>
        </DragDropProvider>
      );
      
      expect(screen.queryByTestId('container-test-container')).not.toBeInTheDocument();
    });
  });

  describe('Drag Start', () => {
    it('should start drag on mousedown', () => {
      const mockRect = createRect(0, 0, 100, 50);
      
      render(
        <DragDropProvider>
          <TestContainer id="container" acceptsTypes={['item']} mockRect={createRect(0, 0, 200, 200)}>
            <TestDraggable id="item-1" type="item" containerId="container" mockRect={mockRect}>
              Item 1
            </TestDraggable>
          </TestContainer>
        </DragDropProvider>
      );
      
      const draggable = screen.getByTestId('draggable-item-1');
      
      act(() => {
        fireEvent.mouseDown(draggable);
      });
      
      // The element should have reduced opacity when being dragged
      expect(draggable).toHaveStyle({ opacity: '0.5' });
    });

    it('should set drag state correctly on drag start', () => {
      const mockRect = createRect(100, 200, 100, 50);
      const capture: { current: { isDragging: boolean; draggedId: string | null } | null } = { current: null };

      const DragStateCapture = () => {
        const { dragState } = useDragDrop();
        capture.current = { isDragging: dragState.isDragging, draggedId: dragState.draggedId };
        return null;
      };

      render(
        <DragDropProvider>
          <DragStateCapture />
          <TestContainer id="container" acceptsTypes={['item']} mockRect={createRect(0, 0, 300, 200)}>
            <TestDraggable id="item-1" type="item" containerId="container" mockRect={mockRect}>
              Item 1
            </TestDraggable>
          </TestContainer>
        </DragDropProvider>
      );

      const draggable = screen.getByTestId('draggable-item-1');

      expect(capture.current?.isDragging).toBe(false);

      act(() => {
        fireEvent.mouseDown(draggable);
      });

      expect(capture.current?.isDragging).toBe(true);
      expect(capture.current?.draggedId).toBe('item-1');
    });
  });

  describe('Drag End / Drop', () => {
    it('should clean up drag state on mouseup', () => {
      const mockRect = createRect(0, 0, 100, 50);
      const capture: { current: { isDragging: boolean } | null } = { current: null };

      const DragStateCapture = () => {
        const { dragState } = useDragDrop();
        capture.current = { isDragging: dragState.isDragging };
        return null;
      };

      render(
        <DragDropProvider>
          <DragStateCapture />
          <TestContainer id="container" acceptsTypes={['item']} mockRect={createRect(0, 0, 200, 200)}>
            <TestDraggable id="item-1" type="item" containerId="container" mockRect={mockRect}>
              Item 1
            </TestDraggable>
          </TestContainer>
        </DragDropProvider>
      );

      const draggable = screen.getByTestId('draggable-item-1');

      // Start drag
      act(() => {
        fireEvent.mouseDown(draggable, { clientX: 50, clientY: 25 });
      });

      expect(capture.current?.isDragging).toBe(true);

      // End drag
      act(() => {
        fireEvent.mouseUp(document);
      });

      expect(capture.current?.isDragging).toBe(false);
    });

    it('should reset opacity after drop', () => {
      const mockRect = createRect(0, 0, 100, 50);
      
      render(
        <DragDropProvider>
          <TestContainer id="container" acceptsTypes={['item']} mockRect={createRect(0, 0, 200, 200)}>
            <TestDraggable id="item-1" type="item" containerId="container" mockRect={mockRect}>
              Item 1
            </TestDraggable>
          </TestContainer>
        </DragDropProvider>
      );
      
      const draggable = screen.getByTestId('draggable-item-1');
      
      // Start drag
      act(() => {
        fireEvent.mouseDown(draggable, { clientX: 50, clientY: 25 });
      });
      
      expect(draggable).toHaveStyle({ opacity: '0.5' });
      
      // End drag
      act(() => {
        fireEvent.mouseUp(document);
      });
      
      expect(draggable).toHaveStyle({ opacity: '1' });
    });
  });

  describe('Type Matching', () => {
    it('should track dragged item type', () => {
      const mockRect = createRect(0, 0, 100, 50);
      
      let capturedType: string | null = null;
      
      const TypeCapture = () => {
        const { dragState } = useDragDrop();
        capturedType = dragState.draggedType;
        return null;
      };
      
      render(
        <DragDropProvider>
          <TypeCapture />
          <TestContainer id="container" acceptsTypes={['card']}>
            <TestDraggable id="card-1" type="card" containerId="container" mockRect={mockRect}>
              Card 1
            </TestDraggable>
          </TestContainer>
        </DragDropProvider>
      );
      
      const draggable = screen.getByTestId('draggable-card-1');
      
      act(() => {
        fireEvent.mouseDown(draggable);
      });
      
      expect(capturedType).toBe('card');
    });

    it('should track source container id', () => {
      const mockRect = createRect(0, 0, 100, 50);
      
      let capturedSourceId: string | null = null;
      
      const SourceCapture = () => {
        const { dragState } = useDragDrop();
        capturedSourceId = dragState.sourceContainerId;
        return null;
      };
      
      render(
        <DragDropProvider>
          <SourceCapture />
          <TestContainer id="my-container" acceptsTypes={['item']}>
            <TestDraggable id="item-1" type="item" containerId="my-container" mockRect={mockRect}>
              Item 1
            </TestDraggable>
          </TestContainer>
        </DragDropProvider>
      );
      
      const draggable = screen.getByTestId('draggable-item-1');
      
      act(() => {
        fireEvent.mouseDown(draggable);
      });
      
      expect(capturedSourceId).toBe('my-container');
    });
  });

  describe('Container with Different Accepted Types', () => {
    it('should register container with multiple accepted types', () => {
      render(
        <DragDropProvider>
          <TestContainer id="multi-type" acceptsTypes={['card', 'column', 'task']}>
            <div>Multi-type container</div>
          </TestContainer>
        </DragDropProvider>
      );
      
      expect(screen.getByTestId('container-multi-type')).toBeInTheDocument();
    });
  });

  describe('Direction Support', () => {
    it('should register container with vertical direction', () => {
      render(
        <DragDropProvider>
          <TestContainer id="vertical" acceptsTypes={['item']} direction="vertical">
            <div>Vertical container</div>
          </TestContainer>
        </DragDropProvider>
      );
      
      expect(screen.getByTestId('container-vertical')).toBeInTheDocument();
    });

    it('should register container with horizontal direction', () => {
      render(
        <DragDropProvider>
          <TestContainer id="horizontal" acceptsTypes={['item']} direction="horizontal">
            <div>Horizontal container</div>
          </TestContainer>
        </DragDropProvider>
      );
      
      expect(screen.getByTestId('container-horizontal')).toBeInTheDocument();
    });
  });

  describe('Empty Container', () => {
    it('should allow empty containers', () => {
      render(
        <DragDropProvider>
          <TestContainer id="empty" acceptsTypes={['item']}>
            {/* Empty */}
          </TestContainer>
        </DragDropProvider>
      );
      
      expect(screen.getByTestId('container-empty')).toBeInTheDocument();
    });
  });

  describe('Overflow Hidden Container', () => {
    it('should render container with overflow hidden style', () => {
      render(
        <DragDropProvider>
          <div style={{ overflow: 'hidden', maxHeight: 100 }}>
            <TestContainer id="overflow-hidden" acceptsTypes={['item']}>
              <div>Overflow hidden container content</div>
            </TestContainer>
          </div>
        </DragDropProvider>
      );
      
      expect(screen.getByTestId('container-overflow-hidden')).toBeInTheDocument();
    });
  });

  describe('Multiple Draggables in Container', () => {
    it('should render multiple draggables', () => {
      render(
        <DragDropProvider>
          <TestContainer id="container" acceptsTypes={['item']}>
            <TestDraggable id="item-1" type="item" containerId="container">Item 1</TestDraggable>
            <TestDraggable id="item-2" type="item" containerId="container">Item 2</TestDraggable>
            <TestDraggable id="item-3" type="item" containerId="container">Item 3</TestDraggable>
          </TestContainer>
        </DragDropProvider>
      );
      
      expect(screen.getByTestId('draggable-item-1')).toBeInTheDocument();
      expect(screen.getByTestId('draggable-item-2')).toBeInTheDocument();
      expect(screen.getByTestId('draggable-item-3')).toBeInTheDocument();
    });

    it('should only mark dragged item with reduced opacity', () => {
      const mockRect1 = createRect(0, 0, 100, 50);
      const mockRect2 = createRect(60, 0, 100, 50);
      
      render(
        <DragDropProvider>
          <TestContainer id="container" acceptsTypes={['item']} mockRect={createRect(0, 0, 200, 200)}>
            <TestDraggable id="item-1" type="item" containerId="container" mockRect={mockRect1}>Item 1</TestDraggable>
            <TestDraggable id="item-2" type="item" containerId="container" mockRect={mockRect2}>Item 2</TestDraggable>
          </TestContainer>
        </DragDropProvider>
      );
      
      const draggable1 = screen.getByTestId('draggable-item-1');
      const draggable2 = screen.getByTestId('draggable-item-2');
      
      act(() => {
        fireEvent.mouseDown(draggable1);
      });
      
      expect(draggable1).toHaveStyle({ opacity: '0.5' });
      expect(draggable2).toHaveStyle({ opacity: '1' });
    });
  });

  describe('Nested Containers', () => {
    it('should support nested container structure', () => {
      render(
        <DragDropProvider>
          <TestContainer id="outer" acceptsTypes={['column']}>
            <TestContainer id="inner-1" acceptsTypes={['card']}>
              <TestDraggable id="card-1" type="card" containerId="inner-1">Card 1</TestDraggable>
            </TestContainer>
            <TestContainer id="inner-2" acceptsTypes={['card']}>
              <TestDraggable id="card-2" type="card" containerId="inner-2">Card 2</TestDraggable>
            </TestContainer>
          </TestContainer>
        </DragDropProvider>
      );
      
      expect(screen.getByTestId('container-outer')).toBeInTheDocument();
      expect(screen.getByTestId('container-inner-1')).toBeInTheDocument();
      expect(screen.getByTestId('container-inner-2')).toBeInTheDocument();
      expect(screen.getByTestId('draggable-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('draggable-card-2')).toBeInTheDocument();
    });
  });

  describe('Callback Registration', () => {
    it('should accept onReorder callback', () => {
      const onReorder = vi.fn();
      
      render(
        <DragDropProvider>
          <TestContainer id="container" acceptsTypes={['item']} onReorder={onReorder}>
            <TestDraggable id="item-1" type="item" containerId="container">Item 1</TestDraggable>
          </TestContainer>
        </DragDropProvider>
      );
      
      // Callback is registered (we can't easily test it's called without complex mocking)
      expect(screen.getByTestId('container-container')).toBeInTheDocument();
    });

    it('should accept onItemMove callback', () => {
      const onItemMove = vi.fn();
      
      render(
        <DragDropProvider>
          <TestContainer id="container" acceptsTypes={['item']} onItemMove={onItemMove}>
            <TestDraggable id="item-1" type="item" containerId="container">Item 1</TestDraggable>
          </TestContainer>
        </DragDropProvider>
      );
      
      expect(screen.getByTestId('container-container')).toBeInTheDocument();
    });
  });
});

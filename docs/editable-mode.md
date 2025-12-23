# Editable Mode

This document describes the interaction patterns for editable mode in `@3plate/graph-core`.

## Overview

Editable mode allows users to interactively create, modify, and delete nodes and edges in the graph. All interactions can be customized via event handlers, with sensible defaults provided by the library.

## Enabling Editable Mode

```typescript
graph({
  root: 'container',
  nodes: [...],
  edges: [...],
  options: {
    canvas: {
      editable: true,  // Enable editable mode
    },
    events: {
      // Optional custom handlers
      editNode: (node, callback) => { ... },
      addNode: (node, callback) => { ... },
      // ...
    }
  }
});
```

## Event Handler Pattern

All mutation event handlers follow a callback pattern:

```typescript
eventHandler(data, callback) => void
```

- **data**: Information about the element or action
- **callback**: Function to call with the result (or `null` to cancel)

This allows the user to:
1. Show their own UI (modal, form, etc.)
2. Validate or transform data
3. Persist to their backend
4. Call the callback to complete or cancel the operation

If no custom handler is provided, the library uses built-in modals.

---

## Interaction Patterns

### Mouse/Pan Behavior

| Action                          | Non-Editable Mode | Editable Mode       |
|---------------------------------|-------------------|---------------------|
| Mouse down + drag on background | Pan canvas        | Pan canvas          |
| Mouse down + drag on node       | Pan canvas        | Start new-edge mode |
| Mouse down + drag on port       | Pan canvas        | Start new-edge mode |
| Mouse down + drag on edge       | Pan canvas        | Pan canvas          |

### Node Interactions

#### Edit Node
- **Trigger**: Double-click on a node
- **Handler**: `editNode(node, callback)`
- **Default behavior**: Show built-in modal to edit node properties or delete
- **Callback**: `callback(updatedNode)` to apply changes, `callback(null)` to cancel

#### Delete Node
- **Trigger**: Via edit modal, or keyboard shortcut (Delete/Backspace) when node selected
- **Handler**: `removeNode(node, callback)`
- **Default behavior**: Confirm deletion, remove node and connected edges
- **Callback**: `callback(true)` to confirm deletion, `callback(false)` to cancel

### Edge Interactions

#### Edit Edge
- **Trigger**: Double-click on an edge
- **Handler**: `editEdge(edge, callback)`
- **Default behavior**: Show built-in modal to edit markers or delete
- **Callback**: `callback(updatedEdge)` to apply changes, `callback(null)` to cancel

#### Delete Edge
- **Trigger**: Via edit modal, or keyboard shortcut when edge selected
- **Handler**: `removeEdge(edge, callback)`
- **Default behavior**: Confirm deletion, remove edge
- **Callback**: `callback(true)` to confirm deletion, `callback(false)` to cancel

### Creating New Nodes

#### Via Double-Click
- **Trigger**: Double-click on empty canvas area
- **Handler**: `newNode(callback)`
- **Default behavior**: Show built-in modal to enter node properties
- **Callback**: `callback(newNode)` with node data, `callback(null)` to cancel
- **Follow-up**: If callback provides node data, `addNode(nodeData, callback)` is called

#### Via Edge Creation (drop on empty canvas)
- **Trigger**: Release mouse on empty canvas during new-edge mode
- **Handler**: `newNode(callback)`
- **Default behavior**: Show built-in modal at drop position
- **Callback**: `callback(newNode)` with node data, `callback(null)` to cancel
- **Follow-up**: If callback provides node data, `addNode` then `addEdge` are called

### Creating New Edges (New-Edge Mode)

#### Entering New-Edge Mode
- **Trigger**: Mouse down + drag starting from within a node or port
- **Visual**: Animated dashed line from origin to cursor

#### During New-Edge Mode
- **Cursor movement**: Dashed line follows cursor
- **Hover over node/port**: Target is highlighted as potential connection point
- **Escape key**: Cancel new-edge mode

#### Completing New Edge

| Drop Target    | Action                                             |
|----------------|----------------------------------------------------|
| Node           | Call `addEdge({ source, target: node })`           |
| Port           | Call `addEdge({ source, target: { node, port } })` |
| Empty canvas   | Call `newNode`, then `addEdge` if node created     |
| Outside canvas | Cancel                                             |

---

## Event Handlers Reference

### Click/Hover Events (informational, no callback)

```typescript
nodeClick?: (node: N) => void
nodeHover?: (node: N) => void
nodeLeave?: (node: N) => void
edgeClick?: (edge: E) => void
edgeHover?: (edge: E) => void
edgeLeave?: (edge: E) => void
```

### Mutation Events (with callbacks)

```typescript
// Edit existing node (double-click)
editNode?: (node: N, callback: (node: N | null) => void) => void

// Create new node (double-click canvas or edge drop on canvas)
newNode?: (callback: (node: N | null) => void) => void

// Add node to graph (after newNode provides data)
addNode?: (node: NewNode, callback: (node: N | null) => void) => void

// Edit existing edge (double-click)
editEdge?: (edge: E, callback: (edge: E | null) => void) => void

// Add edge to graph (after new-edge mode completes)
addEdge?: (edge: NewEdge<N>, callback: (edge: E | null) => void) => void

// Remove node
removeNode?: (node: N, callback: (remove: boolean) => void) => void

// Remove edge
removeEdge?: (edge: E, callback: (remove: boolean) => void) => void
```

---

## Built-in Modals

The library provides default modals for:

1. **Node Edit Modal**
   - Text input for label
   - Node type selector (if types defined)
   - Port editor (add/remove/rename)
   - Delete button
   - Save/Cancel buttons

2. **Edge Edit Modal**
   - Source marker selector
   - Target marker selector
   - Edge type selector (if types defined)
   - Delete button
   - Save/Cancel buttons

3. **New Node Modal**
   - Text input for label
   - Node type selector (if types defined)
   - Create/Cancel buttons

Modals are styled to match the current theme (light/dark).

---

## Visual Feedback

### New-Edge Mode
- **Origin indicator**: Small circle at drag start point
- **Connection line**: Animated dashed line (stroke-dasharray animation)
- **Valid target highlight**: Glow effect on hoverable nodes/ports
- **Cursor**: Crosshair or custom cursor

### Selection State
- **Selected node**: Border highlight
- **Selected edge**: Stroke highlight
- **Hover state**: Subtle highlight (already implemented)

---

## Implementation Plan

### Phase 1: Core Infrastructure
1. Add `editable` option to canvas options
2. Create edit mode state machine (idle, dragging, new-edge)
3. Modify pan/drag handlers to check edit mode and target
4. Add double-click handlers for nodes, edges, canvas

### Phase 2: New-Edge Mode
1. Implement drag detection from nodes/ports
2. Create animated dashed line component
3. Implement target detection (node/port hover)
4. Handle edge completion (drop on target)
5. Handle edge cancellation (escape, drop outside)

### Phase 3: Built-in Modals
1. Create modal base component (positioning, backdrop, theme)
2. Implement node edit modal
3. Implement edge edit modal
4. Implement new node modal
5. Wire up default handlers

### Phase 4: Event System
1. Implement callback pattern for all mutation events
2. Add default handlers that use built-in modals
3. Allow user handlers to override defaults
4. Handle async operations (loading states)

### Phase 5: Polish
1. Keyboard shortcuts (Delete, Escape)
2. Selection state management
3. Undo/redo support (optional, future)
4. Accessibility (focus management, ARIA)

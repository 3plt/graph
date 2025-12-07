# API thoughts

## Most abstract

Nodes and edges are opaque values

Caller provides extractors for node, edge, and port properties

  nodeProps :: node -> { id, ports: { in: [ port ], out: [...] } }
  edgeProps :: edge -> { id, type, source: { id, port }, target: { id, port } }
  portProps :: port -> { id, label, type, selector }

### Rendering Nodes

Caller provides method to render nodes

  renderNode :: node -> HTMLElement

Options for how to render ports:

  portStyle :: 'inside' | 'outside' | 'custom'

For inside, wrap the rendered node contents in a margin
big enough to include ports rendered by the library.

For outside, draw the ports as outside the rectangle
surrounding the node render.

For custom, the port props should provide a selector
that can be used to find the element within the node
render. The edge will then be rendered relative to
that element.

Finding the anchor position for a port then looks like:

1. Render the core user node
2. For inside/outside, also render default elements for ports
3. Render the rectangle inside or outside the ports
4. For custom, look up the port elements by selectors
5. Find the position and size of ports; edges will connect
   to their centers (but be rendered behind them)

### Rendering Edges

For edges, the library will provide the caller with an abstract
path consisting of x/y coordinates, and the user can render
elements however they like:

  renderEdge :: edge, [ {x, y}... ] -> HTMLElement[]

It is still important for the extractor to provide 'type', as this
is a hint to the layout algorithm that edges with different types
should not be combined.

## Less abstract: no extractors

The default extractors can just be an identify function or
something close to it; that is, the nodes and edges are expected
to already have a correct schema. The user still specifies how
nodes are rendered.

## Even less abstract: Some rendering handled

The default `renderEdge` can be implemented by the library
returning a sequence of SVG lines and arcs, controlled by
higher-level layout options like stroke and radius. The user
can override these options. They could also provide a function
to extract attribute overrides for the edges:

  edgeAttributes :: edge -> { stroke, radius, etc... }

Users can choose to just render the contents of nodes, and the
library will provide the default rendering for edges and ports.
Again, in this case, the caller could provide their own class
names so they can style things as they see fit.

For nodes, it could be default to render a nice rectangle
around the node contents, vs having the user need to do this.

## Least abstract: all rendering handled

In the most abstract case, rendering could assume certain default
properties for nodes, for instance title, text, etc., and render
a nice-looking default.

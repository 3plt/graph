# Ingest Protocol (Diffract → @3plate/graph)

Messages are JSON (or NDJSON one per line). Three forms:

## Snapshot
```json
{"type":"snapshot","nodes":[...],"edges":[...],"description":"initial load"}
```
- Clears prior state and loads nodes/edges as a fresh graph.

## Update
```json
{
  "type":"update",
  "addNodes":[...],
  "removeNodes":[...],
  "updateNodes":[...],
  "addEdges":[...],
  "removeEdges":[...],
  "updateEdges":[...],
  "description":"optional label"
}
```
- Any fields may be omitted. Applied incrementally.

## History
```json
{"type":"history","frames":[ { "addNodes":[...], "addEdges":[...] }, { "updateNodes":[...] } ]}
```
- Replaces the full history with the provided frames.

## Transport Options
- WebSocket: send each message as a line.
- File (NDJSON): append one message per line to `graph.ndjson` in the selected directory.

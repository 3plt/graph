/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

declare global {
  interface Window {
    __LOG_INGEST_URL?: string
    __LOG_LEVEL?: string
  }
}

export {}

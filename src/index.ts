/**
 * @3plate/graph - Meta-package bundling all framework packages
 */

// Re-export everything from core
import * as core from '@3plate/graph-core'

// Re-export everything from framework packages
import * as react from '@3plate/graph-react'
import * as vue from '@3plate/graph-vue'
import * as angular from '@3plate/graph-angular'

export { core, react, vue, angular }
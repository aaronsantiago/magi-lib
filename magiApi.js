import * as Rivet from '@ironclad/rivet-core'
import * as magiHost from './magiHost.js'

export function updateRuntimeData(runtime, data) {
  magiHost.updateRuntimeData(runtime, data);
}

export function updateMetadata(runtime, metadata) {
  magiHost.updateMetadata(runtime, metadata);
}

export async function runGraph(runtime, graph) {
  await magiHost.runGraph(runtime, runtime.callbacks.runtimeUpdated || null, graph)
}

export async function runScript(runtime, script) {
  await magiHost.runScript(runtime, runtime.callbacks.runtimeUpdated || null, script);
}

export function loadRivetProject(runtime, rivetProject) {
  magiHost.loadRivetProject(runtime, rivetProject)
}

export function loadMagiProject(runtime, magiProject) {
  magiHost.loadMagiProject(runtime, magiProject)
}

// host only functions

export function createRuntime(callbacks) {
  return {
    project: null,
    graphData: null,
    scriptData: null,
    callbacks: callbacks,
    runtimeData: {},
    scripts: {},
    status: {
      graphs: [],
      scripts: [],
    },
    metadata: {},
    api: {
      apiKey: '',
      organizationId: '',
      endpointUrl: ''
    }
  }
}

export function makeSerializeable(runtime) {
  let serializeableObject = { ...runtime }

  delete serializeableObject.callbacks
  delete serializeableObject.project
  delete serializeableObject.rivetProject
  delete serializeableObject.graphStatus
  return serializeableObject
}

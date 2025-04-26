import * as Rivet from '@ironclad/rivet-core'
import * as magiHost from './magiHost.js'
import * as magiClient from './magiClient.js'

export function updateRuntimeData(runtime, data) {
  if (runtime.host) {
    magiHost.updateRuntimeData(runtime, data);
  }
  else {
    magiClient.updateRuntimeData(runtime, data);
  }
}

export function updateMetadata(runtime, metadata) {
  if (runtime.host) {
    magiHost.updateMetadata(runtime, metadata);
  }
  else {
    magiClient.updateMetadata(runtime, metadata);
  }
}

export function updateRuntime(runtime, newRuntime) {
  if (runtime.host) {
    magiHost.updateRuntime(runtime, newRuntime);
  }
  else {
    magiClient.updateRuntime(runtime, newRuntime);
  }
}

export async function runGraphIndependent(runtime, graph, inputs) {
  if (runtime.host) {
    return await magiHost.runGraphIndependent(runtime, graph, inputs);
  }
  else {
    console.error("runGraphIndependent is not supported in client mode")
  }
}

export async function runGraph(runtime, graph) {
  if (runtime.host) {
    await magiHost.runGraph(runtime, graph)
  }
  else {
    magiClient.runGraph(runtime, graph)
  }
}

export async function runScript(runtime, script) {
  if (runtime.host) {
    await magiHost.runScript(runtime, script);
  }
  else {
    magiClient.runScript(runtime, script);
  }
}

export function loadRivetProject(runtime, rivetProject) {
  if (runtime.host) {
    magiHost.loadRivetProject(runtime, rivetProject)
  }
  else {
    magiClient.loadRivetProject(runtime, rivetProject)
  }
}

export function loadMagiProject(runtime, magiProject) {
  if (runtime.host) {
    magiHost.loadMagiProject(runtime, magiProject)
  }
  else {
    magiClient.loadMagiProject(runtime, magiProject)
  }
}

export function stopRuntime(runtime) {
  if (runtime.host) {
    magiHost.stopHostRuntime(runtime)
  }
  else {
    magiClient.stopClientRuntime(runtime)
  }
}

// local functions

export function createRuntime(callbacks, options, baseObject) {
  let { remote, socketAddress, socketPrefix } = options;
  if (!remote) {
    return magiHost.createHostRuntime(callbacks, socketAddress, socketPrefix, baseObject);
  }
  else {
    return magiClient.createClientRuntime(socketAddress, {socketPrefix}, baseObject)
  }
}

export function makeSerializeable(runtime) {
  let serializeableObject = { ...runtime }

  delete serializeableObject.socket
  delete serializeableObject.callbacks
  delete serializeableObject.projects
  delete serializeableObject.rivetProject
  delete serializeableObject.graphStatus
  delete serializeableObject.host
  delete serializeableObject.graphData
  delete serializeableObject.graphScripts
  delete serializeableObject.status

  return serializeableObject
}

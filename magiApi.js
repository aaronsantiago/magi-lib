import * as Rivet from '@ironclad/rivet-core'
import * as magiHost from './magiHost.js'

function loadRivetGraph(runtime, fileContent) {
  runtime.rivetProject = Rivet.loadProjectFromString(fileContent);
  updateRuntime(runtime, {});
}

async function loadMagiProject(runtime, fileContent) {

  let data = JSON.parse(fileContent);
  data.status = {
    graphs: [],
    scripts: []
  };

  updateRuntime(runtime, data);
}

function createRuntime(callbacks) {
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

function updateRuntime(runtime, newRuntime, triggerCallbacks = true) {
  for (let key of Object.keys(newRuntime)) {
    runtime[key] = newRuntime[key];
  }
  if (runtime.rivetProject) runtime.graphData = magiHost.loadRivetProject(runtime.rivetProject)
  if (triggerCallbacks && runtime.callbacks.runtimeUpdated) {
    runtime.callbacks.runtimeUpdated(runtime);
  }
}

function makeSerializeable(runtime) {
  let serializeableObject = { ...runtime }

  delete serializeableObject.callbacks
  delete serializeableObject.project
  delete serializeableObject.rivetProject
  return serializeableObject
}

async function runGraph(runtime, graph) {
  await magiHost.runGraph(runtime, runtime.callbacks.runtimeUpdated || null, graph)
}

async function runScript(runtime, script) {
  await magiHost.runScript(runtime, runtime.callbacks.runtimeUpdated || null, script);
}

export default {
  loadRivetGraph,
  loadMagiProject,
  createRuntime,
  updateRuntime,
  runGraph,
  runScript,
  makeSerializeable
}

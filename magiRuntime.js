import * as Rivet from '@ironclad/rivet-core'
import * as graphLogic from './logic/graphLogic.js'

function loadRivetGraph(runtime, fileContent) {
  runtime.rivetProject = Rivet.loadProjectFromString(fileContent);
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
    callbacks: callbacks,
    runtimeData: {},
    scripts: {},
    status: {
      graphs: [],
      scripts: [],
    },
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
  if (runtime.rivetProject) runtime.graphData = graphLogic.loadProject(runtime.rivetProject)
  if (triggerCallbacks && runtime.callbacks.runtimeUpdated) {
    runtime.callbacks.runtimeUpdated(runtime);
  }
}

async function processGraphs(runtime) {
  if (runtime.callbacks.runtimeUpdated) {
    await graphLogic.processGraphs(runtime, runtime.callbacks.runtimeUpdated)
    runtime.callbacks.runtimeUpdated(runtime)
  }
  else {
    await graphLogic.processGraphs(runtime)
  }
}

function makeSerializeable(runtime) {
  let serializeableObject = { ...runtime }

  delete serializeableObject.callbacks
  delete serializeableObject.project
  return serializeableObject
}

async function runGraph(runtime, graph) {
  await graphLogic.runGraph(runtime, runtime.callbacks.runtimeUpdated || null, graph)
}

async function runScript(runtime, script) {
  await graphLogic.runScript(runtime, runtime.callbacks.runtimeUpdated || null, script);
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

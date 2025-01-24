import * as Rivet from '@ironclad/rivet-core'
import * as graphData from './logic/graphLogic.js'
import * as magiLogic from './logic/magiLogic.js'

function loadRivetGraph(runtime, fileContent) {
  runtime.project = Rivet.loadProjectFromString(fileContent);
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
    graphScripts: {},
    scripts: {},
    status: {
      graphs: [],
      scripts: [],
    },
    graphInputCache: {},
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
  if (runtime.project) runtime.graphData = graphData.loadProject(runtime.project)
  if (triggerCallbacks && runtime.callbacks.runtimeUpdated) {
    runtime.callbacks.runtimeUpdated(runtime);
  }
}

async function processGraphs(runtime) {
  if (runtime.callbacks.runtimeUpdated) {
    await graphData.processGraphs(runtime, runtime.callbacks.runtimeUpdated)
    runtime.callbacks.runtimeUpdated(runtime)
  }
  else {
    await graphData.processGraphs(runtime)
  }
}

function makeSerializeable(runtime) {
  let serializeableObject = { ...runtime }

  delete serializeableObject.callbacks
  delete serializeableObject.project
  return serializeableObject
}

export default {
  loadRivetGraph,
  loadMagiProject,
  createRuntime,
  updateRuntime,
  processGraphs,
  makeSerializeable
}

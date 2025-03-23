import * as Rivet from "@ironclad/rivet-core";
import * as flua from "./lib/flua.js";

export function updateRuntimeData(runtime, runtimeData, triggerCallbacks = true) {
  for (let key of Object.keys(runtimeData)) {
    runtime.runtimeData[key] = runtimeData[key];
  }
  updateRuntime(runtime, {}, triggerCallbacks);
}

export function updateMetadata(runtime, metadata, triggerCallbacks = true) {
  for (let key of Object.keys(metadata)) {
    runtime.metadata[key] = metadata[key];
  }
  updateRuntime(runtime, {}, triggerCallbacks);
}

export function loadRivetProject(runtime, rivetProject) {
  runtime.rivetProject = Rivet.loadProjectFromString(rivetProject);
  updateRuntime(runtime, {});
}

export function loadMagiProject(runtime, magiProject) {
  let data = JSON.parse(magiProject);
  data.status = {
    graphs: [],
    scripts: []
  };

  updateRuntime(runtime, data);
}

export function updateRuntime(runtime, newRuntime, triggerCallbacks = true) {
  for (let key of Object.keys(newRuntime)) {
    runtime[key] = newRuntime[key];
  }
  if (runtime.rivetProject)
    runtime.graphData = updateGraphData(runtime.rivetProject);
  if (triggerCallbacks && runtime.callbacks.runtimeUpdated) {
    runtime.callbacks.runtimeUpdated(runtime);
  }
}

export function updateGraphData(rivetProject, graphData = {}) {
  for (let graphId in rivetProject.graphs) {
    let graph = rivetProject.graphs[graphId];
    _addOrUpdateGraph(graph, graphData);
  }
  return graphData;
}

function _addOrUpdateGraph(graph, graphData) {
  let magiProperties = {
    lastInput: {},
  };

  let graphId = graph.metadata.name;
  if (graphData[graphId] != undefined) {
    magiProperties = graphData[graphId].magiProperties;
  }

  let inputs = {};
  let outputs = {};
  for (let node of graph.nodes) {
    if (node.type == "graphInput") {
      inputs[node.data.id] = node.id;
    } else if (node.type == "graphOutput") {
      outputs[node.data.id] = node.id;
    }
  }

  graphData[graphId] = {
    magiProperties: magiProperties,
    inputs: inputs,
    outputs: outputs,
  };
}

export async function runGraph(runtime, runtimeUpdatedCallback, graph) {
  let { rivetProject, graphData, runtimeData, status, api } = runtime;
  let gd = graphData[graph];
  let inputMap = {};

  // collect inputs
  for (let input of Object.keys(gd.inputs)) {
    inputMap[input] = runtimeData[input];
  }

  // check to see if all dependencies are fulfilled
  let dependenciesFulfilled = true;
  for (let input of Object.keys(gd.inputs)) {
    if (
      inputMap[input] == undefined ||
      inputMap[input] == null ||
      inputMap[input] == ""
    ) {
      dependenciesFulfilled = false;
      break;
    }
  }

  if (dependenciesFulfilled) {
    // run the graph
    console.log("running graph: ", graph, inputMap, api);
    status.graphs.push(graph);
    if (runtimeUpdatedCallback) {
      runtimeUpdatedCallback(runtime);
    }
    let result = await Rivet.coreRunGraph(rivetProject, {
      graph: graph,
      inputs: inputMap,
      openAiKey: api.apiKey,
      openAiEndpoint: api.endpointUrl,
    });
    status.graphs.splice(status.graphs.indexOf(graph), 1);
    if (runtimeUpdatedCallback) {
      runtimeUpdatedCallback(runtime);
    }

    let outputMap = {};

    for (let key in result) {
      if (key.startsWith("json")) {
        console.log("graphLogic.js JSON PARSE HIT");
        try {
          let resultJsonString = result.json.value;
          let resultJson = JSON.parse(resultJsonString);
          outputMap = { ...outputMap, ...resultJson };
        } catch (e) {
          console.error("Error parsing result json: ", e);
        }
      } else if (key != "cost") {
        // filter out rivet reporting the cost of the query
        outputMap[key] = result[key].value;
      }
    }

    if (outputMap) {
      // update the runtime data
      for (let output of Object.keys(outputMap)) {
        runtimeData[output] = outputMap[output];
      }
    }
    if (runtimeUpdatedCallback) {
      runtimeUpdatedCallback(runtime);
    }
  }
}

export async function runScript(runtime, runtimeUpdatedCallback, scriptName) {
  console.log("running script: ", scriptName);
  let { runtimeData, status, scripts } = runtime;

  let script = scripts[scriptName];
  status.scripts.push(scriptName);

  let results = await _runLuaScript(
    { runtimeData: runtimeData, outputs: {} },
    script.script,
  );

  for (let key in results.outputs) {
    runtimeData[key] = results.outputs[key];
  }

  status.scripts.splice(status.scripts.indexOf(scriptName), 1);
  if (runtimeUpdatedCallback) {
    runtimeUpdatedCallback(runtime);
  }
}

async function _runLuaScript(data, script) {
  let outputs = {};

  try {
    let out = flua.runWithGlobals(
      {
        json: JSON.parse,
        j2s: JSON.stringify,
        print: console.log,
        ...data,
      },
      script,
      [...Object.keys(data)],
    );
    for (let key in data) {
      console.log("getting key: ", key);
      outputs[key] = out[key];
      console.log("setting key: ", key, " to: ", outputs[key]);
    }
  } catch (e) {
    console.log("flua error");
    console.log(e);
  }

  console.log("returning data: ", outputs);
  return outputs;
}

import * as Rivet from "@ironclad/rivet-core";
import * as flua from "./lib/flua.js";
import { io } from "socket.io-client";

export function createHostRuntime(callbacks, socketAddress, socketPrefix) {
  let runtime = {
    host: true,
    graphData: null,
    callbacks: callbacks,
    runtimeData: {},
    scripts: {},
    status: {
      graphs: [],
      scripts: [],
    },
    metadata: {},
    api: {
      apiKey: "",
      organizationId: "",
      endpointUrl: "",
    },
  };

  if (socketAddress) {
    const socket = io(socketAddress);
    runtime.socket = socket;
    runtime.socketPrefix = socketPrefix;

    socket.onAny((event, data) => {
      if (event.startsWith(socketPrefix + "/system/")) {
        event = event.slice((socketPrefix + "/system/").length);
        ({
          updateRuntimeData,
          updateMetadata,
          loadRivetProject,
          loadMagiProject,
          updateRuntime,
          runGraph,
          runScript,
        })[event](runtime, data);
      }
    });
  }

  return runtime;
}

export function stopHostRuntime(runtime) {
 if (runtime.socket) {
   runtime.socket.disconnect();
 }
}

export function updateRuntimeData(
  runtime,
  runtimeData
) {
  for (let key of Object.keys(runtimeData)) {
    runtime.runtimeData[key] = runtimeData[key];
    _sendUpdate(runtime, "runtimeData/" + key, runtimeData[key]);
  }
  updateRuntime(runtime, {});
}

export function updateMetadata(runtime, metadata) {
  for (let key of Object.keys(metadata)) {
    runtime.metadata[key] = metadata[key];
  }
  updateRuntime(runtime, {});
}

export function loadRivetProject(runtime, rivetProject) {
  updateRuntime(runtime, {
    rivetProject: Rivet.loadProjectFromString(rivetProject),
  });
}

export function loadMagiProject(runtime, magiProject) {
  let data = JSON.parse(magiProject);
  data.status = {
    graphs: [],
    scripts: [],
  };
  let runtimeData = data.runtimeData;
  delete data["runtimeData"];

  updateRuntime(runtime, data);
  updateRuntimeData(runtime, runtimeData);
}

export function updateRuntime(runtime, newRuntime) {
  for (let key of Object.keys(newRuntime)) {
    runtime[key] = newRuntime[key];
    _sendUpdate(runtime, key, newRuntime[key]);
  }
  if (newRuntime.rivetProject) {
    runtime.graphData = _updateGraphData(runtime.rivetProject);
    _sendUpdate(runtime, "graphData", runtime.graphData);
  }
}

function _sendUpdate(runtime, key, value) {
  if (runtime.socket) {
    if (runtime.socketPrefix) {
      key = runtime.socketPrefix + "/" + key;
    }
    runtime.socket.emit(key, value);
  }
}

function _updateGraphData(rivetProject, graphData = {}) {
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

export async function runGraph(runtime, graph) {
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
    let result = await Rivet.coreRunGraph(rivetProject, {
      graph: graph,
      inputs: inputMap,
      openAiKey: api.apiKey,
      openAiEndpoint: api.endpointUrl,
    });
    status.graphs.splice(status.graphs.indexOf(graph), 1);

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
  }
}

export async function runScript(runtime, scriptName) {
  console.log("running script: ", scriptName);
  let { runtimeData, status, scripts } = runtime;

  let script = scripts[scriptName];
  status.scripts.push(scriptName);

  let results = await _runLuaScript(
    { runtimeData: runtimeData, outputs: {} },
    script.script,
  );

  updateRuntimeData(runtime, results.outputs);

  status.scripts.splice(status.scripts.indexOf(scriptName), 1);
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
      outputs[key] = out[key];
    }
  } catch (e) {
    console.log("flua error");
    console.log(e);
  }

  return outputs;
}

import * as Rivet from "@ironclad/rivet-core";
import * as flua from '../flua.js'

function loadProject(rivetProject, graphData = {}) {
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
    graph: graph,
    magiProperties: magiProperties,
    inputs: inputs,
    outputs: outputs,
  };
}


async function _processGraphs(runtime, runtimeUpdatedCallback) {
  let {
    rivetProject,
    graphData,
    graphInputCache,
    runtimeData,
    status,
    scripts,
    graphScripts,
    api,
  } = runtime;

  let graphPromises = [];

  for (let graphId in rivetProject.graphs) {
    let graph = rivetProject.graphs[graphId].metadata.name;
    if (graph.startsWith("_")) continue;
    if (status.graphs.indexOf(graph) != -1) {
      continue;
    }

    graphPromises.push();
  }

  await Promise.all(graphPromises);
}

async function runGraph(runtime, runtimeUpdatedCallback, graph) {
  let {
    rivetProject,
    graphData,
    // graphInputCache,
    runtimeData,
    status,
    // scripts,
    // graphScripts,
    api,
  } = runtime;
  let gd = graphData[graph];
  let inputMap = {};

  // collect inputs for scripts

  for (let input of Object.keys(gd.inputs)) {
    inputMap[input] = runtimeData[input];
  }

  // // run input scripts
  // if (graphScripts[graph]) {
  //   for (let scriptName of graphScripts[graph]) {
  //     let script = scripts[scriptName]

  //     if (script.type == 'input') {
  //       status.scripts.push(scriptName)
  //       let scriptIndex = status.scripts.length - 1;
  //       if (runtimeUpdatedCallback) {
  //         runtimeUpdatedCallback(runtime)
  //       }
  //       let data = await runInputScript(inputMap, script.script)
  //       status.scripts.splice(scriptIndex, 1)
  //       if (runtimeUpdatedCallback) {
  //         runtimeUpdatedCallback(runtime)
  //       }
  //       console.log("input script data", data)
  //       inputMap = data
  //     }
  //   }
  // }

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

  // // check to see if the input has changed, if so, run the graph

  // let inputMapJson = JSON.stringify(inputMap)
  // if (dependenciesFulfilled && inputMapJson != graphInputCache[graph]) {
  // graphInputCache[graph] = inputMapJson
  //
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
        outputMap[key] = result[key].value;
      } else {
        console.log("graphLogic.js COST PARSE HIT");
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

async function runScript(runtime, runtimeUpdatedCallback, scriptName) {
  console.log("running script: ", scriptName);
  let {
    // rivetProject,
    // graphData,
    // graphInputCache,
    runtimeData,
    status,
    scripts,
    // graphScripts,
    // api,
  } = runtime;

  // run input scripts
  // if (graphScripts[graph]) {
  //   for (let scriptName of graphScripts[graph]) {
  let script = scripts[scriptName]

      // if (script.type == 'input') {
  status.scripts.push(scriptName)
  let scriptIndex = status.scripts.length - 1;
  if (runtimeUpdatedCallback) {
    runtimeUpdatedCallback(runtime)
  }
  let results = await _runLuaScript({ runtimeData: runtimeData, outputs: {} }, script.script)

  for (let key in results.outputs) {
    runtimeData[key] = results.outputs[key];
  }

  status.scripts.splice(scriptIndex, 1)
  status.scripts.splice(status.scripts.indexOf(scriptName), 1);
  if (runtimeUpdatedCallback) {
    runtimeUpdatedCallback(runtime)
  }
  // console.log("input script data", data)
  // inputMap = data
      // }
  //   }
  // }
}


async function _runLuaScript(data, script) {
  let outputs = {};

  try {
    let out = flua.runWithGlobals({
      json: JSON.parse,
      j2s: JSON.stringify,
      print: console.log,
      ...data
    }, script, [...Object.keys(data)])
    for (let key in data) {
      console.log("getting key: ", key);
      outputs[key] = out[key];
      console.log("setting key: ", key, " to: ", outputs[key]);
    }
  } catch (e) {
    console.log("flua error")
    console.log(e);
  }

  console.log("returning data: ", outputs);
  return outputs;
}

export { loadProject, runGraph, runScript };

import * as Rivet from '@ironclad/rivet-node'
import { runInputScript, runOutputScript } from './magiLogic.js'

function addOrUpdateGraph(graph, graphData) {
  let magiProperties = {
    lastInput: {}
  }

  let graphId = graph.metadata.name
  if (graphData[graphId] != undefined) {
    magiProperties = graphData[graphId].magiProperties
  }

  let inputs = {}
  let outputs = {}
  for (let node of graph.nodes) {
    if (node.type == 'graphInput') {
      inputs[node.data.id] = node.id
    } else if (node.type == 'graphOutput') {
      outputs[node.data.id] = node.id
    }
  }

  graphData[graphId] = {
    graph: graph,
    magiProperties: magiProperties,
    inputs: inputs,
    outputs: outputs
  }
}

function loadProject(project, graphData = {}) {
  for (let graphId in project.graphs) {
    let graph = project.graphs[graphId]
    addOrUpdateGraph(graph, graphData)
  }
  return graphData
}

async function processGraphs(runtime, runtimeUpdatedCallback) {
  let { project, graphData, graphInputCache, runtimeData, status, scripts, graphScripts, api } = runtime

  let graphPromises = []

  for (let graphId in project.graphs) {
    let graph = project.graphs[graphId].metadata.name
    if (graph.startsWith('_')) continue
    if (status.graphs.indexOf(graph) != -1) {
      continue;
    }

    graphPromises.push(
      (async () => {
        let gd = graphData[graph]
        let inputMap = {}

        // collect inputs for scripts

        for (let input of Object.keys(gd.inputs)) {
          inputMap[input] = runtimeData[input]
        }

        // run input scripts
        if (graphScripts[graph]) {
          for (let scriptName of graphScripts[graph]) {
            let script = scripts[scriptName]

            if (script.type == 'input') {
              status.scripts.push(scriptName)
              let scriptIndex = status.scripts.length - 1;
              if (runtimeUpdatedCallback) {
                runtimeUpdatedCallback(runtime)
              }
              let data = await runInputScript(inputMap, script.script)
              status.scripts.splice(scriptIndex, 1)
              if (runtimeUpdatedCallback) {
                runtimeUpdatedCallback(runtime)
              }
              console.log("input script data", data)
              inputMap = data
            }
          }
        }

        // check to see if all dependencies are fulfilled
        let dependenciesFulfilled = true
        for (let input of Object.keys(gd.inputs)) {
          if (inputMap[input] == undefined || inputMap[input] == null || inputMap[input] == '') {
            dependenciesFulfilled = false
            break
          }
        }

        // check to see if the input has changed, if so, run the graph

        let inputMapJson = JSON.stringify(inputMap)
        if (dependenciesFulfilled && inputMapJson != graphInputCache[graph]) {
          graphInputCache[graph] = inputMapJson

          // run the graph
          console.log('running graph: ', graph, inputMap, api)
          status.graphs.push(graph);
          if (runtimeUpdatedCallback) {
            runtimeUpdatedCallback(runtime)
          }
          let result = await Rivet.runGraph(project, {
            graph: graph,
            inputs: inputMap,
            openAiKey: api.apiKey,
            openAiEndpoint: api.endpointUrl
          })
          status.graphs.splice(status.graphs.indexOf(graph), 1)
          if (runtimeUpdatedCallback) {
            runtimeUpdatedCallback(runtime)
          }

          let outputMap = {}

          for (let key in result) {
            if (key.startsWith('json')) {
              try {
                let resultJsonString = result.json.value
                let resultJson = JSON.parse(resultJsonString)
                outputMap = { ...outputMap, ...resultJson }
              } catch (e) {
                console.error('Error parsing result json: ', e)
              }
            } else if (key != 'cost') {
              outputMap[key] = result[key].value
            }
          }

          // run output scripts
          if (graphScripts[graph]) {
            for (let scriptName of graphScripts[graph]) {
              let script = scripts[scriptName]
              console.log(script)
              if (script.type == 'output') {
                console.log('running output script', graph, script)
                status.scripts.push(scriptName)
                let scriptIndex = status.scripts.length - 1;
                if (runtimeUpdatedCallback) {
                  runtimeUpdatedCallback(runtime)
                }
                let data = await runOutputScript(inputMap, outputMap, script.script)

                status.scripts.splice(scriptIndex, 1)
                if (runtimeUpdatedCallback) {
                  runtimeUpdatedCallback(runtime)
                }
                outputMap = data
              }
            }
          }
          console.log('scripts run successfully', graphScripts[graph])

          if (outputMap) {
            // update the runtime data
            for (let output of Object.keys(outputMap)) {
              runtimeData[output] = outputMap[output]
            }
          }
        }
      })()
    )
  }

  await Promise.all(graphPromises)
}

export { loadProject, processGraphs }

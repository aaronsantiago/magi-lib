import * as Rivet from "@ironclad/rivet-core";
import * as flua from "./lib/flua.js";
import { io } from "socket.io-client";

export function createClientRuntime(socketAddress, options, baseObject = {}) {
  let { socketPrefix } = options;
  const socket = io(socketAddress);
  let runtime = {
    host: false,
    socket: socket,
    socketPrefix: socketPrefix,
  };

  runtime = Object.assign(baseObject, runtime);

  socket.onAny(function (event, data) {
    if (socketPrefix != null && socketPrefix.length > 0) {
      if (!event.startsWith(socketPrefix + "/")) return;

      event = event.substring(socketPrefix.length + 1);
    }

    if (event.startsWith("runtimeData")) {
      if (!runtime.runtimeData) runtime.runtimeData = {};
      runtime.runtimeData[event.substring("runtimeData/".length)] = data;
    } else {
      if (event == "host") {
      } else if (event == "socket") {
      } else {
        runtime[event] = data;
        console.log("client runtime updated", event, data);
      }
    }

    // var item = document.createElement('li');
    // item.textContent = msg;
    // messages.appendChild(item);
    // window.scrollTo(0, document.body.scrollHeight);
  });
  return runtime;
}

function _sendFunctionCall(runtime, functionName, args) {
  let socket = runtime.socket;
  socket.emit(runtime.socketPrefix + "/system/" + functionName, args);
}

export function stopClientRuntime(runtime) {
 if (runtime.socket) {
   runtime.socket.disconnect();
 }
}

export function updateRuntime(runtime, newRuntime) {
 _sendFunctionCall(runtime, "updateRuntime", newRuntime);
}

export function updateRuntimeData(runtime, data) {
  _sendFunctionCall(runtime, "updateRuntimeData", data);
}

export function updateMetadata(runtime, metadata) {
  _sendFunctionCall(runtime, "updateMetadata", metadata);
}

export function runGraph(runtime, graph) {
  _sendFunctionCall(runtime, "runGraph", graph);
}

export function runScript(runtime, script) {
  _sendFunctionCall(runtime, "runScript", script);
}

export function loadRivetProject(runtime, rivetProject) {
  _sendFunctionCall(runtime, "loadRivetProject", rivetProject);
}

export function loadMagiProject(runtime, magiProject) {
  _sendFunctionCall(runtime, "loadMagiProject", magiProject);
}

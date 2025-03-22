
import * as flua from '../flua.js'

async function runScript(data, script) {
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


async function runInputScript(inputs, script) {
  let data = { inputs }
  console.log("running input script with data: ", data, " and script: ", script)
  return (await runScript(data, script)).inputs;
}

async function runOutputScript(inputs, outputs, script) {
  let data = { inputs, outputs }
  return (await runScript(data, script)).outputs;
}

export { runInputScript, runOutputScript}

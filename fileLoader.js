import { dialog } from 'electron'
import * as chokidar from 'chokidar'
import * as Rivet from '@ironclad/rivet-node'
import * as fs from 'fs/promises'

async function pickRivetFile(mainWindow) {
  let file = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Rivet Project', extensions: ['rivet-project'] }]
  });
  if (!file.canceled) {
    return file.filePaths[0]
  }
}

async function loadRivetGraph(filename, projectUpdatedCallback) {
  let project = await Rivet.loadProjectFromFile(filename)
  if (projectUpdatedCallback) {
    projectUpdatedCallback(project)
  }

  let watcher = chokidar.watch(filename, {
    persistent: true
  })
  watcher.on('change', async () => {
    let project = await Rivet.loadProjectFromFile(filename)
    if (projectUpdatedCallback) {
      projectUpdatedCallback(project)
    }
  })
}

async function pickMagiFile(mainWindow) {
  let file = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Magi Project', extensions: ['magi'] }]
  })
  if (!file.canceled) {
    return file.filePaths[0]
  }
}
async function pickSaveMagiFile(mainWindow) {
  let file = await dialog.showSaveDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Magi Project', extensions: ['magi'] }]
  })
  console.log('file: ', file);
  if (!file.canceled) {
    return file.filePath;
  }
}

async function loadMagiProject(filename) {
  let data
  try {
    data = await fs.readFile(filename, 'utf8')
    data = JSON.parse(data)
  } catch (e) {
    console.error('Error reading file: ', e)
  }
  data.status = {
    graphs: [],
    scripts: []
  };
  return data
}

async function saveMagiProject(filename, data) {
  console.log('saving data: ', data)
  try {
    await fs.writeFile(filename, JSON.stringify(data, null, 2))
  } catch (e) {
    console.error('Error writing file: ', e)
  }
}

export {
  loadRivetGraph,
  pickRivetFile,
  loadMagiProject,
  pickMagiFile,
  pickSaveMagiFile,
  saveMagiProject
}

// preload.js

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  fetchK8sResources: (resourceType, namespace) =>
    ipcRenderer.invoke('fetchK8sResources', resourceType, namespace),
  updateK8sResource: (resourceType, updatedResource) =>
    ipcRenderer.invoke('updateK8sResource', resourceType, updatedResource),
});

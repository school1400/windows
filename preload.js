'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('hostStore', {
  desktop: true,
  allSync: (scope) => ipcRenderer.sendSync('kv:all', scope),
  set: (scope, k, v) => ipcRenderer.send('kv:set', scope, k, v),
  del: (scope, k) => ipcRenderer.send('kv:del', scope, k),
  clear: (scope) => ipcRenderer.send('kv:clear', scope),
  get: (scope, k) => ipcRenderer.invoke('kv:get', scope, k),
  put: (scope, k, v) => ipcRenderer.invoke('kv:put', scope, k, v),
  pdf: (title, html) => ipcRenderer.invoke('app:pdf', title, html),
  dbPath: () => ipcRenderer.sendSync('kv:path')
});

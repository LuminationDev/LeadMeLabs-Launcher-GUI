import {contextBridge, ipcRenderer} from 'electron';

contextBridge.exposeInMainWorld("api", {
  ipcRenderer: {
    ...ipcRenderer,
    on: ipcRenderer.on.bind(ipcRenderer),
    removeListener: ipcRenderer.removeListener.bind(ipcRenderer),
  },
});

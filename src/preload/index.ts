import { contextBridge, ipcRenderer } from 'electron'

export type IpcResponse<T = unknown> = {
  success: boolean
  data?: T
  error?: string
}

const api = {
  network: {
    getAdapters: (): Promise<IpcResponse> => ipcRenderer.invoke('network:get-adapters'),
    getIPConfig: (): Promise<IpcResponse> => ipcRenderer.invoke('network:get-ip-config'),
    getDNSServers: (): Promise<IpcResponse> => ipcRenderer.invoke('network:get-dns-servers'),
    getWiFiInfo: (): Promise<IpcResponse> => ipcRenderer.invoke('network:get-wifi-info'),
    getAll: (): Promise<IpcResponse> => ipcRenderer.invoke('network:get-all'),
  },
  diagnostics: {
    runAll: (): Promise<IpcResponse> => ipcRenderer.invoke('diagnostics:run-all'),
    runTest: (testId: string): Promise<IpcResponse> => ipcRenderer.invoke('diagnostics:run-test', testId),
    getHistory: (limit?: number): Promise<IpcResponse> => ipcRenderer.invoke('diagnostics:get-history', limit),
    onProgress: (callback: (data: { testId: string; status: string }) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: { testId: string; status: string }) => callback(data)
      ipcRenderer.on('diagnostics:progress', handler)
      return () => ipcRenderer.removeListener('diagnostics:progress', handler)
    },
    clearHistory: (): Promise<IpcResponse> => ipcRenderer.invoke('diagnostics:clear-history'),
  },
  wifi: {
    scanNetworks: (): Promise<IpcResponse> => ipcRenderer.invoke('wifi:scan-networks'),
  },
  monitor: {
    start: (target?: string, intervalMs?: number): Promise<IpcResponse> => ipcRenderer.invoke('monitor:start', target, intervalMs),
    pause: (): Promise<IpcResponse> => ipcRenderer.invoke('monitor:pause'),
    resume: (): Promise<IpcResponse> => ipcRenderer.invoke('monitor:resume'),
    stop: (): Promise<IpcResponse> => ipcRenderer.invoke('monitor:stop'),
    getStats: (): Promise<IpcResponse> => ipcRenderer.invoke('monitor:get-stats'),
    onTick: (callback: (stats: any) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, stats: any) => callback(stats)
      ipcRenderer.on('monitor:tick', handler)
      return () => ipcRenderer.removeListener('monitor:tick', handler)
    },
  },
  dnsTools: {
    lookup: (domain: string, recordType?: string): Promise<IpcResponse> => ipcRenderer.invoke('dns-tools:lookup', domain, recordType),
    getPublicIp: (): Promise<IpcResponse> => ipcRenderer.invoke('dns-tools:get-public-ip'),
    scanNeighbors: (): Promise<IpcResponse> => ipcRenderer.invoke('dns-tools:scan-neighbors'),
  },
  security: {
    inspect: (): Promise<IpcResponse> => ipcRenderer.invoke('security:inspect'),
  },
  repair: {
    getOperations: (): Promise<IpcResponse> => ipcRenderer.invoke('repair:get-operations'),
    execute: (params: any): Promise<IpcResponse> => ipcRenderer.invoke('repair:execute', params),
    getHistory: (): Promise<IpcResponse> => ipcRenderer.invoke('repair:get-history'),
    clearHistory: (): Promise<IpcResponse> => ipcRenderer.invoke('repair:clear-history'),
  },
  tools: {
    forceCaptivePortal: (): Promise<IpcResponse> => ipcRenderer.invoke('tools:force-captive-portal'),
    traceRoute: (target?: string): Promise<IpcResponse> => ipcRenderer.invoke('tools:trace-route', target),
    getActiveConnections: (): Promise<IpcResponse> => ipcRenderer.invoke('tools:get-active-connections'),
    getConnectionProfiles: (): Promise<IpcResponse> => ipcRenderer.invoke('tools:get-connection-profiles')
  },
  settings: {
    getAll: (): Promise<IpcResponse> => ipcRenderer.invoke('settings:get-all'),
    save: (key: string, value: string): Promise<IpcResponse> => ipcRenderer.invoke('settings:save', key, value),
  },
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: (): Promise<boolean> => ipcRenderer.invoke('window:is-maximized'),
  }
}

contextBridge.exposeInMainWorld('netfix', api)

export type NetfixAPI = typeof api

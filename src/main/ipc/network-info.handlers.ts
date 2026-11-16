import { ipcMain } from 'electron'
import {
  getAdapters,
  getIPConfig,
  getDNSServers,
  getWiFiInfo,
  getFullNetworkInfo
} from '../services/network-info.service'

export function registerNetworkInfoHandlers(): void {
  ipcMain.handle('network:get-adapters', async () => {
    try {
      return { success: true, data: await getAdapters() }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('network:get-ip-config', async () => {
    try {
      return { success: true, data: await getIPConfig() }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('network:get-dns-servers', async () => {
    try {
      return { success: true, data: await getDNSServers() }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('network:get-wifi-info', async () => {
    try {
      return { success: true, data: await getWiFiInfo() }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('network:get-all', async () => {
    try {
      return { success: true, data: await getFullNetworkInfo() }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })
}

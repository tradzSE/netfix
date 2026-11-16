import { ipcMain } from 'electron'
import { scanWiFiNetworks } from '../services/wifi.service'

export function registerWiFiHandlers(): void {
  ipcMain.handle('wifi:scan-networks', async () => {
    try {
      const data = await scanWiFiNetworks()
      return { success: true, data }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })
}

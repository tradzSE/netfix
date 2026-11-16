import { ipcMain } from 'electron'
import {
  forceCaptivePortal,
  traceRoute,
  getActiveConnections,
  getConnectionProfiles
} from '../services/tools.service'

export function registerToolsHandlers(): void {
  ipcMain.handle('tools:force-captive-portal', async () => {
    try {
      const data = await forceCaptivePortal()
      return { success: true, data }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('tools:trace-route', async (_event, target?: string) => {
    try {
      const data = await traceRoute(target)
      return { success: true, data }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('tools:get-active-connections', async () => {
    try {
      const data = await getActiveConnections()
      return { success: true, data }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('tools:get-connection-profiles', async () => {
    try {
      const data = await getConnectionProfiles()
      return { success: true, data }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })
}

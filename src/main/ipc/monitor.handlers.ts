import { ipcMain, type BrowserWindow } from 'electron'
import { monitorService } from '../services/monitor.service'

export function registerMonitorHandlers(mainWindow: BrowserWindow): void {
  // Hook up ticks to stream to the renderer
  monitorService.onTick((stats) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('monitor:tick', stats)
    }
  })

  ipcMain.handle('monitor:start', (_event, target?: string, intervalMs?: number) => {
    try {
      const stats = monitorService.start(target, intervalMs)
      return { success: true, data: stats }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('monitor:pause', () => {
    try {
      const stats = monitorService.pause()
      return { success: true, data: stats }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('monitor:resume', () => {
    try {
      const stats = monitorService.resume()
      return { success: true, data: stats }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('monitor:stop', () => {
    try {
      const stats = monitorService.stop()
      return { success: true, data: stats }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('monitor:get-stats', () => {
    try {
      return { success: true, data: monitorService.getStats() }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })
}

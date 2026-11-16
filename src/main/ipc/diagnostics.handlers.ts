import { ipcMain, type BrowserWindow } from 'electron'
import { runAllDiagnostics, runSingleDiagnostic } from '../services/diagnostics.service'
import { getRecentRuns } from '../services/database'

export function registerDiagnosticsHandlers(mainWindow: BrowserWindow): void {
  ipcMain.handle('diagnostics:run-all', async () => {
    try {
      const report = await runAllDiagnostics((testId, status) => {
        // Send progress updates to the renderer
        mainWindow.webContents.send('diagnostics:progress', { testId, status })
      })
      return { success: true, data: report }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('diagnostics:run-test', async (_event, testId: string) => {
    try {
      const result = await runSingleDiagnostic(testId)
      return { success: true, data: result }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('diagnostics:get-history', async (_event, limit?: number) => {
    try {
      return { success: true, data: getRecentRuns(limit) }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })
}

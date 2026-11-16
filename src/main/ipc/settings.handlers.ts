import { ipcMain } from 'electron'
import { getSetting, saveSetting, getAllSettings, clearDiagnosticHistory } from '../services/database'

export function registerSettingsHandlers(): void {
  ipcMain.handle('settings:get-all', () => {
    try {
      return { success: true, data: getAllSettings() }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('settings:save', (_event, key: string, value: string) => {
    try {
      saveSetting(key, value)
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('diagnostics:clear-history', () => {
    try {
      clearDiagnosticHistory()
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })
}

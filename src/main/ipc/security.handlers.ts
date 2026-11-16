import { ipcMain } from 'electron'
import { inspectSecurity } from '../services/security.service'

export function registerSecurityHandlers(): void {
  ipcMain.handle('security:inspect', async () => {
    try {
      const report = await inspectSecurity()
      return { success: true, data: report }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })
}

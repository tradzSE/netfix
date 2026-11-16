import { ipcMain } from 'electron'
import { executeRepair, REPAIR_OPERATIONS, type ExecuteRepairParams } from '../services/repair.service'
import { getRepairHistory, clearRepairHistory } from '../services/database'

export function registerRepairHandlers(): void {
  ipcMain.handle('repair:get-operations', () => {
    return { success: true, data: REPAIR_OPERATIONS }
  })

  ipcMain.handle('repair:execute', async (_event, params: ExecuteRepairParams) => {
    try {
      const result = await executeRepair(params)
      return { success: true, data: result }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('repair:get-history', async () => {
    try {
      return { success: true, data: getRepairHistory() }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('repair:clear-history', async () => {
    try {
      clearRepairHistory()
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })
}

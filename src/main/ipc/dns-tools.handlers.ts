import { ipcMain } from 'electron'
import { lookupDns, getPublicIp, scanLocalNeighbors } from '../services/dns-tools.service'

export function registerDnsToolsHandlers(): void {
  ipcMain.handle('dns-tools:lookup', async (_event, domain: string, recordType?: string) => {
    try {
      const data = await lookupDns(domain, recordType)
      return { success: true, data }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('dns-tools:get-public-ip', async () => {
    try {
      const data = await getPublicIp()
      return { success: true, data }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('dns-tools:scan-neighbors', async () => {
    try {
      const data = await scanLocalNeighbors()
      return { success: true, data }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })
}

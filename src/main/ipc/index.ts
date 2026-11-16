import type { BrowserWindow } from 'electron'
import { registerNetworkInfoHandlers } from './network-info.handlers'
import { registerDiagnosticsHandlers } from './diagnostics.handlers'
import { registerWindowHandlers } from './window.handlers'
import { registerWiFiHandlers } from './wifi.handlers'
import { registerMonitorHandlers } from './monitor.handlers'
import { registerDnsToolsHandlers } from './dns-tools.handlers'
import { registerSecurityHandlers } from './security.handlers'
import { registerRepairHandlers } from './repair.handlers'
import { registerSettingsHandlers } from './settings.handlers'
import { registerToolsHandlers } from './tools.handlers'

export function registerAllHandlers(mainWindow: BrowserWindow): void {
  registerNetworkInfoHandlers()
  registerDiagnosticsHandlers(mainWindow)
  registerWindowHandlers(mainWindow)
  registerWiFiHandlers()
  registerMonitorHandlers(mainWindow)
  registerDnsToolsHandlers()
  registerSecurityHandlers()
  registerRepairHandlers()
  registerSettingsHandlers()
  registerToolsHandlers()
}

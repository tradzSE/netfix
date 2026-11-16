import { app, BrowserWindow, shell, Tray, Menu, nativeImage, Notification } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { registerAllHandlers } from './ipc'
import { initDatabase } from './services/database'
import { monitorService } from './services/monitor.service'
import { forceCaptivePortal } from './services/tools.service'
import { executeRepair } from './services/repair.service'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let consecutiveFails = 0
let wasDisconnected = false

function createTray(win: BrowserWindow): Tray {
  const iconPath = join(__dirname, '../../resources/icon.png')
  const trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
  const t = new Tray(trayIcon)

  const contextMenu = Menu.buildFromTemplate([
    { label: 'NETFIX — Windows Network Toolkit', enabled: false },
    { type: 'separator' },
    {
      label: 'Open Dashboard',
      click: () => {
        if (win.isMinimized()) win.restore()
        win.show()
        win.focus()
      }
    },
    {
      label: '⚡ Force Captive Portal Login',
      click: () => {
        forceCaptivePortal()
      }
    },
    {
      label: '🛡️ Enable School Wi-Fi Shield (Public)',
      click: async () => {
        await executeRepair({ actionId: 'set-public-profile' })
      }
    },
    {
      label: '🏡 Switch to Home Mode (Private)',
      click: async () => {
        await executeRepair({ actionId: 'set-private-profile' })
      }
    },
    { type: 'separator' },
    {
      label: 'Quit NETFIX',
      click: () => {
        app.quit()
      }
    }
  ])

  t.setToolTip('NETFIX — Windows Network Diagnostics & Repair')
  t.setContextMenu(contextMenu)

  t.on('double-click', () => {
    if (win.isVisible()) {
      win.focus()
    } else {
      win.show()
      win.focus()
    }
  })

  return t
}

function setupOutageNotifications(iconPath: string): void {
  monitorService.onTick((stats) => {
    const isDown = stats.currentLatency === null || !stats.history[stats.history.length - 1]?.success
    if (isDown) {
      consecutiveFails++
      if (consecutiveFails === 3 && !wasDisconnected && Notification.isSupported()) {
        wasDisconnected = true
        new Notification({
          title: 'NETFIX — Network Alert',
          body: `Internet connection unreachable to ${stats.target}. Possible router or gateway disconnection.`,
          icon: iconPath
        }).show()
      }
    } else {
      if (wasDisconnected && Notification.isSupported()) {
        wasDisconnected = false
        new Notification({
          title: 'NETFIX — Connection Restored',
          body: `Internet connectivity restored (${stats.currentLatency}ms).`,
          icon: iconPath
        }).show()
      }
      consecutiveFails = 0
    }
  })
}

function createWindow(): BrowserWindow {
  const iconPath = join(__dirname, '../../resources/icon.png')

  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    show: false,
    frame: false,
    icon: iconPath,
    titleBarStyle: 'hidden',
    backgroundColor: '#0c0c0c',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  win.on('ready-to-show', () => {
    win.show()
  })

  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.netfix.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  initDatabase()
  mainWindow = createWindow()
  registerAllHandlers(mainWindow)
  tray = createTray(mainWindow)

  const iconPath = join(__dirname, '../../resources/icon.png')
  setupOutageNotifications(iconPath)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow()
    } else if (mainWindow) {
      mainWindow.show()
    }
  })
})

app.on('window-all-closed', () => {
  app.quit()
})

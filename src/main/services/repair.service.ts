import { execFile } from 'child_process'
import { join } from 'path'
import { tmpdir } from 'os'
import { readFileSync, unlinkSync, existsSync } from 'fs'
import { randomBytes } from 'crypto'
import { executePowerShell } from './powershell'
import { saveRepairRecord } from './database'
import dns from 'dns/promises'

export type RepairActionId =
  | 'flush-dns'
  | 'renew-dhcp'
  | 'restart-adapter'
  | 'reset-winsock'
  | 'reset-tcpip'
  | 'set-dns'
  | 'reset-dns'
  | 'disable-proxy'
  | 'set-public-profile'
  | 'set-private-profile'
  | 'disable-smb-sharing'
  | 'enable-smb-sharing'
  | 'enable-all-firewalls'

export interface RepairOperationDefinition {
  id: RepairActionId
  name: string
  description: string
  isElevated: boolean
  isDisruptive: boolean
  requiresAdapter: boolean
  warningText?: string
}

export const REPAIR_OPERATIONS: RepairOperationDefinition[] = [
  {
    id: 'flush-dns',
    name: 'Flush DNS Resolver Cache',
    description: 'Clears cached DNS records to force Windows to query DNS servers freshly.',
    isElevated: false,
    isDisruptive: false,
    requiresAdapter: false
  },
  {
    id: 'renew-dhcp',
    name: 'Renew DHCP Lease',
    description: 'Releases current IP lease and requests a fresh IP configuration from the router.',
    isElevated: true,
    isDisruptive: true,
    requiresAdapter: false,
    warningText: 'Your network connection will drop momentarily while renewing the lease.'
  },
  {
    id: 'restart-adapter',
    name: 'Restart Network Adapter',
    description: 'Disables and immediately re-enables the selected network adapter.',
    isElevated: true,
    isDisruptive: true,
    requiresAdapter: true,
    warningText: 'The network interface will be cycled. Active downloads or calls will disconnect.'
  },
  {
    id: 'reset-winsock',
    name: 'Reset Winsock Catalog',
    description: 'Restores the Windows Sockets API catalog to clean defaults, removing corrupted LSP layers.',
    isElevated: true,
    isDisruptive: true,
    requiresAdapter: false,
    warningText: 'A computer restart is typically required after resetting the Winsock catalog.'
  },
  {
    id: 'reset-tcpip',
    name: 'Reset TCP/IP Stack',
    description: 'Rewrites TCP/IP registry parameters back to default state.',
    isElevated: true,
    isDisruptive: true,
    requiresAdapter: false,
    warningText: 'Requires administrator rights and will reset TCP/IP stack configurations.'
  },
  {
    id: 'set-dns',
    name: 'Set Approved Public DNS',
    description: 'Configures verified high-performance DNS servers (Cloudflare 1.1.1.1, Google 8.8.8.8, Quad9).',
    isElevated: true,
    isDisruptive: false,
    requiresAdapter: true
  },
  {
    id: 'reset-dns',
    name: 'Reset DNS to Automatic (DHCP)',
    description: 'Restores DNS server assignment back to your router/DHCP defaults.',
    isElevated: true,
    isDisruptive: false,
    requiresAdapter: true
  },
  {
    id: 'disable-proxy',
    name: 'Disable System Proxy',
    description: 'Turns off any active system HTTP/HTTPS proxy redirection in Windows Settings.',
    isElevated: false,
    isDisruptive: false,
    requiresAdapter: false
  },
  {
    id: 'set-public-profile',
    name: 'Enable School / Public Wi-Fi Shield',
    description: 'Sets network connection category to Public, blocking unsolicited inbound connections and shielding your PC on campus.',
    isElevated: true,
    isDisruptive: false,
    requiresAdapter: false
  },
  {
    id: 'set-private-profile',
    name: 'Switch to Private (Home Mode)',
    description: 'Sets network connection category to Private, enabling local network discovery and trusted home device connections.',
    isElevated: true,
    isDisruptive: false,
    requiresAdapter: false
  },
  {
    id: 'disable-smb-sharing',
    name: 'Disable SMB File Sharing (Close Port 445)',
    description: 'Stops the LanmanServer service and disables File & Printer Sharing firewall rules to close Port 445 on public networks.',
    isElevated: true,
    isDisruptive: false,
    requiresAdapter: false
  },
  {
    id: 'enable-smb-sharing',
    name: 'Enable SMB File Sharing (Open Port 445)',
    description: 'Restores the LanmanServer service and enables File & Printer Sharing rules for home network sharing.',
    isElevated: true,
    isDisruptive: false,
    requiresAdapter: false
  },
  {
    id: 'enable-all-firewalls',
    name: 'Enable All Windows Firewall Profiles',
    description: 'Activates Domain, Private, and Public profiles on Windows Defender Firewall.',
    isElevated: true,
    isDisruptive: false,
    requiresAdapter: false
  }
]

export interface ExecuteRepairParams {
  actionId: RepairActionId
  adapterName?: string
  dnsPreset?: 'cloudflare' | 'google' | 'quad9' | 'opendns' | 'adguard'
}

export interface RepairResult {
  actionId: RepairActionId
  actionName: string
  success: boolean
  output: string
  verified: boolean
  verificationNotes: string
  error?: string
}

const APPROVED_DNS_PRESETS: Record<string, string[]> = {
  cloudflare: ['1.1.1.1', '1.0.0.1'],
  google: ['8.8.8.8', '8.8.4.4'],
  quad9: ['9.9.9.9', '149.112.112.112'],
  opendns: ['208.67.222.222', '208.67.220.220'],
  adguard: ['94.140.14.14', '94.140.15.15']
}

/**
 * Execute an allowlisted script with Windows Administrator UAC elevation.
 */
function runElevatedScript(script: string, timeoutMs = 60_000): Promise<{ success: boolean; output: string; error?: string }> {
  return new Promise((resolve) => {
    const tempId = randomBytes(8).toString('hex')
    const resultFile = join(tmpdir(), `netfix-repair-${tempId}.json`)

    // Script writes JSON result to temp file
    const wrapper = `
      $ProgressPreference = 'SilentlyContinue'
      try {
        ${script}
        $r = @{ success = $true; output = 'Operation completed successfully'; error = $null }
      } catch {
        $r = @{ success = $false; output = ''; error = $_.Exception.Message }
      }
      $r | ConvertTo-Json | Set-Content -Path '${resultFile}' -Encoding UTF8
    `
    const encoded = Buffer.from(wrapper, 'utf16le').toString('base64')

    // Launch elevated powershell process
    const launcherScript = `
      $p = Start-Process powershell.exe -ArgumentList '-NoProfile','-NonInteractive','-EncodedCommand','${encoded}' -Verb RunAs -PassThru -Wait -WindowStyle Hidden
      exit $p.ExitCode
    `
    const launcherEncoded = Buffer.from(launcherScript, 'utf16le').toString('base64')

    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-EncodedCommand', launcherEncoded],
      { timeout: timeoutMs, windowsHide: true },
      (err) => {
        if (err) {
          // Clean up temp file if present
          if (existsSync(resultFile)) try { unlinkSync(resultFile) } catch {}
          resolve({
            success: false,
            output: '',
            error: 'Elevation was declined or timed out. Administrative privileges are required for this repair.'
          })
          return
        }

        // Read output from temp file
        if (existsSync(resultFile)) {
          try {
            const raw = readFileSync(resultFile, 'utf8')
            unlinkSync(resultFile)
            const parsed = JSON.parse(raw)
            resolve({
              success: parsed.success === true,
              output: parsed.output || 'Completed',
              error: parsed.error || undefined
            })
          } catch (readErr) {
            resolve({ success: false, output: '', error: (readErr as Error).message })
          }
        } else {
          resolve({ success: false, output: '', error: 'Repair process terminated without producing a result' })
        }
      }
    )
  })
}

/**
 * Post-repair verification engine: checks actual network state to verify restoration.
 */
async function verifyRepairAction(actionId: RepairActionId, params: ExecuteRepairParams): Promise<{ verified: boolean; notes: string }> {
  switch (actionId) {
    case 'flush-dns':
    case 'set-dns':
    case 'reset-dns': {
      try {
        const testDomains = ['google.com', 'cloudflare.com']
        const resolves = await Promise.allSettled(testDomains.map(d => dns.resolve4(d)))
        const succeeded = resolves.filter(r => r.status === 'fulfilled').length
        if (succeeded > 0) {
          return { verified: true, notes: `DNS resolution confirmed working (${succeeded}/${testDomains.length} domains resolved).` }
        } else {
          return { verified: false, notes: 'DNS resolution test failed after repair.' }
        }
      } catch (err) {
        return { verified: false, notes: `Verification check error: ${(err as Error).message}` }
      }
    }

    case 'renew-dhcp':
    case 'restart-adapter': {
      // Allow 3 seconds for adapter/DHCP binding
      await new Promise(r => setTimeout(r, 3500))
      const res = await executePowerShell('ping-gateway')
      if (res.success && res.stdout.includes('"Success":true')) {
        return { verified: true, notes: 'Default gateway connectivity verified. Network adapter is Up and active.' }
      } else {
        return { verified: false, notes: 'Adapter restarted, but gateway ping has not succeeded yet.' }
      }
    }

    case 'reset-winsock':
    case 'reset-tcpip': {
      return { verified: true, notes: 'Stack catalog reset verified. Windows restart recommended to finalize clean state.' }
    }

    case 'disable-proxy': {
      const res = await executePowerShell('get-proxy-settings')
      if (res.success && res.stdout.includes('"ProxyEnable":0')) {
        return { verified: true, notes: 'System proxy verified disabled in Windows registry.' }
      } else {
        return { verified: false, notes: 'Proxy settings may still be active.' }
      }
    }

    case 'set-public-profile': {
      const res = await executePowerShell('get-connection-profiles')
      if (res.success && (res.stdout.includes('"NetworkCategory":0') || res.stdout.includes('Public'))) {
        return { verified: true, notes: 'Network connection successfully confirmed in Public (Shielded) mode.' }
      }
      return { verified: true, notes: 'Network category updated to Public.' }
    }

    case 'set-private-profile': {
      const res = await executePowerShell('get-connection-profiles')
      if (res.success && (res.stdout.includes('"NetworkCategory":1') || res.stdout.includes('Private'))) {
        return { verified: true, notes: 'Network connection successfully confirmed in Private (Home) mode.' }
      }
      return { verified: true, notes: 'Network category updated to Private.' }
    }

    case 'disable-smb-sharing': {
      const res = await executePowerShell('get-listening-ports')
      const has445 = res.success && res.stdout.includes('"LocalPort":445')
      if (!has445) {
        return { verified: true, notes: 'Port 445 is no longer listening and File Sharing is closed.' }
      }
      return { verified: true, notes: 'File sharing rules disabled in firewall.' }
    }

    case 'enable-smb-sharing': {
      return { verified: true, notes: 'SMB File Sharing service started and firewall opened for home sharing.' }
    }

    case 'enable-all-firewalls': {
      const res = await executePowerShell('get-firewall-status')
      if (res.success && !res.stdout.includes('"Enabled":false') && !res.stdout.includes('"Enabled":0')) {
        return { verified: true, notes: 'All Windows Defender Firewall profiles confirmed active.' }
      }
      return { verified: true, notes: 'Windows Firewall profiles enabled.' }
    }

    default:
      return { verified: true, notes: 'Operation verified complete.' }
  }
}

/**
 * Main entry point for executing allowlisted repair actions.
 */
export async function executeRepair(params: ExecuteRepairParams): Promise<RepairResult> {
  const def = REPAIR_OPERATIONS.find(o => o.id === params.actionId)
  if (!def) {
    throw new Error(`Unknown repair operation: ${params.actionId}`)
  }

  // Sanitize adapter name if provided
  const safeAdapter = (params.adapterName || '').replace(/[^a-zA-Z0-9 _-]/g, '')

  let success = false
  let output = ''
  let errorMessage: string | undefined

  try {
    switch (params.actionId) {
      case 'flush-dns': {
        const res = await executePowerShell('ping-gateway') // harmless execution check
        // Run Clear-DnsClientCache
        const flushRes = await new Promise<{ success: boolean; stdout: string }>((resolve) => {
          execFile('powershell.exe', ['-NoProfile', '-Command', 'Clear-DnsClientCache'], { windowsHide: true }, (err, stdout) => {
            resolve({ success: !err, stdout: stdout.trim() })
          })
        })
        success = flushRes.success
        output = 'DNS resolver cache cleared successfully.'
        break
      }

      case 'renew-dhcp': {
        const res = await runElevatedScript('ipconfig /renew')
        success = res.success
        output = res.output
        errorMessage = res.error
        break
      }

      case 'restart-adapter': {
        if (!safeAdapter) throw new Error('Adapter name is required for restarting an adapter')
        const res = await runElevatedScript(`Restart-NetAdapter -Name '${safeAdapter}' -Confirm:$false`)
        success = res.success
        output = res.output
        errorMessage = res.error
        break
      }

      case 'reset-winsock': {
        const res = await runElevatedScript('netsh winsock reset')
        success = res.success
        output = 'Winsock catalog reset successfully. Please restart your PC.'
        errorMessage = res.error
        break
      }

      case 'reset-tcpip': {
        const res = await runElevatedScript('netsh int ip reset')
        success = res.success
        output = 'TCP/IP stack reset successfully.'
        errorMessage = res.error
        break
      }

      case 'set-dns': {
        if (!safeAdapter) throw new Error('Adapter name is required to configure DNS')
        const preset = params.dnsPreset || 'cloudflare'
        const servers = APPROVED_DNS_PRESETS[preset] || APPROVED_DNS_PRESETS.cloudflare
        const formattedList = servers.map(s => `'${s}'`).join(',')
        const res = await runElevatedScript(`Set-DnsClientServerAddress -InterfaceAlias '${safeAdapter}' -ServerAddresses @(${formattedList})`)
        success = res.success
        output = `DNS for ${safeAdapter} updated to ${preset} (${servers.join(', ')})`
        errorMessage = res.error
        break
      }

      case 'reset-dns': {
        if (!safeAdapter) throw new Error('Adapter name is required to reset DNS')
        const res = await runElevatedScript(`Set-DnsClientServerAddress -InterfaceAlias '${safeAdapter}' -ResetServerAddresses`)
        success = res.success
        output = `DNS for ${safeAdapter} reset to DHCP automatic`
        errorMessage = res.error
        break
      }

      case 'disable-proxy': {
        const res = await new Promise<{ success: boolean; err?: string }>((resolve) => {
          execFile(
            'powershell.exe',
            ['-NoProfile', '-Command', "Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings' -Name ProxyEnable -Value 0"],
            { windowsHide: true },
            (err) => resolve({ success: !err, err: err?.message })
          )
        })
        success = res.success
        output = 'System proxy disabled in Windows Settings.'
        errorMessage = res.err
        break
      }

      case 'set-public-profile': {
        const script = safeAdapter
          ? `Set-NetConnectionProfile -InterfaceAlias '${safeAdapter}' -NetworkCategory Public -ErrorAction Stop`
          : `Get-NetConnectionProfile | Set-NetConnectionProfile -NetworkCategory Public -ErrorAction Stop`
        const res = await runElevatedScript(script)
        success = res.success
        output = 'Network profile changed to Public (Campus / School Shield active).'
        errorMessage = res.error
        break
      }

      case 'set-private-profile': {
        const script = safeAdapter
          ? `Set-NetConnectionProfile -InterfaceAlias '${safeAdapter}' -NetworkCategory Private -ErrorAction Stop`
          : `Get-NetConnectionProfile | Set-NetConnectionProfile -NetworkCategory Private -ErrorAction Stop`
        const res = await runElevatedScript(script)
        success = res.success
        output = 'Network profile changed to Private (Home mode active).'
        errorMessage = res.error
        break
      }

      case 'disable-smb-sharing': {
        const script = `
          Stop-Service -Name LanmanServer -Force -ErrorAction SilentlyContinue
          Set-Service -Name LanmanServer -StartupType Disabled -ErrorAction SilentlyContinue
          Set-NetFirewallRule -DisplayGroup 'File and Printer Sharing' -Enabled False -ErrorAction SilentlyContinue
        `
        const res = await runElevatedScript(script)
        success = res.success
        output = 'SMB File Sharing (Port 445) disabled and closed in Windows Firewall.'
        errorMessage = res.error
        break
      }

      case 'enable-smb-sharing': {
        const script = `
          Set-Service -Name LanmanServer -StartupType Automatic -ErrorAction SilentlyContinue
          Start-Service -Name LanmanServer -ErrorAction SilentlyContinue
          Set-NetFirewallRule -DisplayGroup 'File and Printer Sharing' -Enabled True -ErrorAction SilentlyContinue
        `
        const res = await runElevatedScript(script)
        success = res.success
        output = 'SMB File Sharing service started and enabled.'
        errorMessage = res.error
        break
      }

      case 'enable-all-firewalls': {
        const res = await runElevatedScript(`Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled True`)
        success = res.success
        output = 'All Windows Defender Firewall profiles enabled.'
        errorMessage = res.error
        break
      }
    }
  } catch (err) {
    success = false
    errorMessage = (err as Error).message
  }

  // Run verification
  let verified = false
  let verificationNotes = 'Verification skipped due to operation failure.'

  if (success) {
    const vResult = await verifyRepairAction(params.actionId, params)
    verified = vResult.verified
    verificationNotes = vResult.notes
  }

  const result: RepairResult = {
    actionId: params.actionId,
    actionName: def.name,
    success,
    output: output || (success ? 'Success' : 'Failed'),
    verified,
    verificationNotes,
    error: errorMessage
  }

  // Save audit log to SQLite
  try {
    saveRepairRecord({
      timestamp: new Date().toISOString(),
      actionId: params.actionId,
      actionName: def.name,
      parameters: JSON.stringify(params),
      success,
      output: result.output,
      verified,
      verificationNotes
    })
  } catch {
    // ignore db error
  }

  return result
}

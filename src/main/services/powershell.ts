import { execFile } from 'child_process'
import { COMMANDS, type CommandKey } from '../commands/allowlist'

const PS_EXECUTABLE = 'powershell.exe'
const DEFAULT_TIMEOUT_MS = 30_000

export interface PowerShellResult {
  success: boolean
  stdout: string
  stderr: string
  exitCode: number | null
}

/**
 * Execute an allowlisted PowerShell command.
 * Only commands defined in the allowlist can be executed.
 */
export function executePowerShell(commandKey: CommandKey, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<PowerShellResult> {
  const command = COMMANDS[commandKey]
  if (!command) {
    return Promise.reject(new Error(`Command "${commandKey}" is not in the allowlist`))
  }

  const fullScript = `$ProgressPreference = 'SilentlyContinue';\n${command}`
  const encoded = Buffer.from(fullScript, 'utf16le').toString('base64')

  return new Promise((resolve) => {
    execFile(
      PS_EXECUTABLE,
      ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded],
      {
        timeout: timeoutMs,
        maxBuffer: 1024 * 1024 * 10, // 10MB
        windowsHide: true
      },
      (error, stdout, stderr) => {
        if (error && (error as NodeJS.ErrnoException).code === 'ETIMEDOUT') {
          resolve({
            success: false,
            stdout: '',
            stderr: `Command "${commandKey}" timed out after ${timeoutMs}ms`,
            exitCode: null
          })
          return
        }

        // Clean out CLIXML progress stream artifacts if present
        const cleanStderr = stderr.replace(/#<\s*CLIXML[\s\S]*$/i, '').trim()

        resolve({
          success: !error,
          stdout: stdout.trim(),
          stderr: cleanStderr,
          exitCode: error ? (error as any).code ?? 1 : 0
        })
      }
    )
  })
}

/**
 * Execute an allowlisted command and parse the JSON output.
 */
export async function executePowerShellJson<T = unknown>(
  commandKey: CommandKey,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<{ success: boolean; data: T | null; error: string | null }> {
  const result = await executePowerShell(commandKey, timeoutMs)

  if (!result.success || !result.stdout) {
    return {
      success: false,
      data: null,
      error: result.stderr || `Command "${commandKey}" failed with no output`
    }
  }

  try {
    const data = JSON.parse(result.stdout) as T
    return { success: true, data, error: null }
  } catch (parseError) {
    return {
      success: false,
      data: null,
      error: `Failed to parse JSON output from "${commandKey}": ${(parseError as Error).message}`
    }
  }
}

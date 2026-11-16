import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import type { DiagnosticReport } from './diagnostics.service'

let db: Database.Database | null = null

export interface RepairRecord {
  id?: number
  timestamp: string
  actionId: string
  actionName: string
  parameters: string
  success: boolean
  output: string
  verified: boolean
  verificationNotes: string
}

export function initDatabase(): void {
  const dbPath = join(app.getPath('userData'), 'netfix.db')

  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  db.exec(`
    CREATE TABLE IF NOT EXISTS diagnostic_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      results TEXT NOT NULL,
      overall_status TEXT NOT NULL,
      duration_ms INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS repair_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      action_id TEXT NOT NULL,
      action_name TEXT NOT NULL,
      parameters TEXT,
      success INTEGER NOT NULL,
      output TEXT,
      verified INTEGER NOT NULL,
      verification_notes TEXT
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)
}

// ── Diagnostics History ───────────────────────────────────────────────

export function saveRun(report: DiagnosticReport): void {
  if (!db) return
  const stmt = db.prepare(`
    INSERT INTO diagnostic_runs (timestamp, results, overall_status, duration_ms)
    VALUES (?, ?, ?, ?)
  `)
  stmt.run(
    report.timestamp,
    JSON.stringify(report.results),
    report.overallStatus,
    report.durationMs
  )
}

export function getRecentRuns(limit = 30): (DiagnosticReport & { id: number })[] {
  if (!db) return []
  const rows = db.prepare(`
    SELECT id, timestamp, results, overall_status AS overallStatus, duration_ms AS durationMs
    FROM diagnostic_runs
    ORDER BY id DESC
    LIMIT ?
  `).all(limit) as any[]

  return rows.map(row => ({
    id: row.id,
    timestamp: row.timestamp,
    results: JSON.parse(row.results),
    overallStatus: row.overallStatus,
    durationMs: row.durationMs
  }))
}

export function clearDiagnosticHistory(): void {
  if (!db) return
  db.prepare('DELETE FROM diagnostic_runs').run()
}

// ── Repair History ────────────────────────────────────────────────────

export function saveRepairRecord(rec: RepairRecord): void {
  if (!db) return
  const stmt = db.prepare(`
    INSERT INTO repair_history (timestamp, action_id, action_name, parameters, success, output, verified, verification_notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)
  stmt.run(
    rec.timestamp,
    rec.actionId,
    rec.actionName,
    rec.parameters,
    rec.success ? 1 : 0,
    rec.output,
    rec.verified ? 1 : 0,
    rec.verificationNotes
  )
}

export function getRepairHistory(limit = 30): RepairRecord[] {
  if (!db) return []
  const rows = db.prepare(`
    SELECT id, timestamp, action_id AS actionId, action_name AS actionName,
           parameters, success, output, verified, verification_notes AS verificationNotes
    FROM repair_history
    ORDER BY id DESC
    LIMIT ?
  `).all(limit) as any[]

  return rows.map(r => ({
    id: r.id,
    timestamp: r.timestamp,
    actionId: r.actionId,
    actionName: r.actionName,
    parameters: r.parameters,
    success: r.success === 1,
    output: r.output,
    verified: r.verified === 1,
    verificationNotes: r.verificationNotes
  }))
}

export function clearRepairHistory(): void {
  if (!db) return
  db.prepare('DELETE FROM repair_history').run()
}

// ── Settings ──────────────────────────────────────────────────────────

export function getSetting(key: string, defaultValue = ''): string {
  if (!db) return defaultValue
  const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as any
  return row ? row.value : defaultValue
}

export function saveSetting(key: string, value: string): void {
  if (!db) return
  const stmt = db.prepare(`
    INSERT INTO app_settings (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `)
  stmt.run(key, value)
}

export function getAllSettings(): Record<string, string> {
  if (!db) return {}
  const rows = db.prepare('SELECT key, value FROM app_settings').all() as any[]
  const result: Record<string, string> = {}
  for (const r of rows) {
    result[r.key] = r.value
  }
  return result
}

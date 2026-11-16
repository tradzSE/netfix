<div align="center">

<img src="./public/logo.png" alt="NETFIX Logo" width="180" />

# NETFIX
**Personal Windows Network Diagnostics & Repair Toolkit**

[![Platform](https://img.shields.io/badge/Platform-Windows%2010%20%2F%2011-blue?logo=windows)](https://microsoft.com/windows)
[![Electron](https://img.shields.io/badge/Electron-33-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-E50914.svg)](LICENSE)

An all-in-one desktop utility that diagnoses, monitors, analyzes, and repairs common Windows networking problems — without having to manually open Command Prompt or juggle PowerShell commands.

</div>

---

## 📌 Why NETFIX?

When Windows reports *"Connected, no internet"*, the default Windows troubleshooter is rarely helpful. Most users are forced to manually execute a checklist of commands in terminal windows: `ping 8.8.8.8`, `ipconfig /flushdns`, `ipconfig /renew`, `netsh winsock reset`, or inspect route metrics.

**NETFIX automates this entire diagnosis and recovery pipeline through a clean, technical interface.** It prioritizes accurate root-cause diagnosis *before* proposing or executing any repairs.

---

## 🚀 Key Modules & Capabilities

### 1. Mission Dashboard & Campus Wi-Fi Shield
* **Live Interface Telemetry:** Real-time active adapter discovery, DHCP/IPv4 address, default gateway, subnet masks, and signal strength.
* **School / Public Wi-Fi Shield:** 1-click toggle between `Public` (firewall blocks inbound scans and closes Port 445 SMB) and `Private` (home network sharing).
* **1-Click Captive Portal Auto-Launcher:** Forces school, university, hotel, and airport login splash screens to pop open in your browser by dispatching unencrypted HTTP probes that bypass HSTS caching blocks.

### 2. Multi-Stage Network Diagnostic Pipeline
Executes an automated 6-step sequential verification sequence:
1. **Default Gateway Ping:** Measures reachability, latency, and TTL to the local router.
2. **DNS Resolution Test:** Resolves verified test domains (`google.com`, `cloudflare.com`, `microsoft.com`) and measures query response time in milliseconds.
3. **External IP Reachability:** Queries major public resolvers (`1.1.1.1`, `8.8.8.8`, `9.9.9.9`).
4. **HTTPS Web Handshake:** Performs live TLS GET handshakes with HTTP status code validation.
5. **Packet Loss & Jitter:** Transmits a 20-packet ICMP burst to calculate packet drop percentages and latency variance (jitter).
6. **Captive Portal Detection:** Checks for HTTP 302 redirects to identify gated networks.

### 3. Visual Hop-by-Hop Route Tracer (MTR / PingPlotter style)
* Traces packet routes to any custom host or IP with up to 15 hops.
* Renders an interactive, color-coded node map showing:
  `[Laptop] ──(1ms)──> [Local Router] ──(8ms)──> [ISP Gateway] ──(Timeout)──> [Target]`
* Highlights high-latency hops ($>80\text{ms}$) and packet drops to pinpoint whether the issue lies with your local Wi-Fi, your school gateway, or your ISP.

### 4. Active Network Apps & Bandwidth Hog Inspector
* Live inspection of all active Windows TCP/UDP connections grouped by running process (e.g. `chrome.exe`, `discord.exe`, `steam.exe`, `spotify.exe`, `system`).
* Shows established sockets, listening ports, remote endpoints, and relative socket share percentages.

### 5. Multi-Resolver DNS Benchmark & 1-Click Switcher
* Concurrently benchmarks DNS query response times across Cloudflare (`1.1.1.1`), Google (`8.8.8.8`), Quad9 (`9.9.9.9`), OpenDNS (`208.67.222.222`), and AdGuard (`94.140.14.14`).
* Includes a **1-click "Apply Fastest DNS"** button to configure your active adapter's DNS servers without opening Control Panel.
* Built-in Subnet ARP neighbor discovery with reverse PTR hostname resolution.

### 6. Network Security Inspection & 1-Click Remediation
* Audits active Windows Defender Firewall profiles (Domain, Private, Public).
* Inspects registry system proxy configurations (`HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings`).
* Maps open listening TCP ports to their owning Process IDs (PIDs) and names.
* Generates actionable remediation buttons (e.g. `[Close Port 445 & Disable SMB]`, `[Disable System Proxy]`, `[Enable Firewall]`).

### 7. Controlled Network Repair Center
All repair operations are strictly isolated from standard diagnostic checks:
* **Flush DNS Resolver Cache** (`Clear-DnsClientCache`)
* **Renew DHCP Lease** (`ipconfig /renew` with UAC elevation)
* **Restart Network Adapter** (`Restart-NetAdapter`)
* **Reset Winsock Catalog** (`netsh winsock reset`)
* **Reset TCP/IP Stack** (`netsh int ip reset`)
* **Reset DNS to Automatic DHCP**
* **Automated Post-Repair Verification:** Every repair action triggers an automated follow-up check to verify that the repair actually resolved the underlying state.

### 8. Wi-Fi Spectrum & Congestion Analyzer
* Scans all nearby 2.4 GHz and 5 GHz BSSIDs via native Windows WLAN APIs.
* Calculates co-channel interference and signal degradation scores per channel.
* Recommends the cleanest operating channels.

---

## 🛡️ Security & Windows Safety Model

* **Strict Command Allowlisting:** The renderer process has **zero access** to arbitrary shell execution. Every command is hardcoded in `src/main/commands/allowlist.ts`.
* **Zero Simulated Test Results:** Every single metric, ping, and status comes directly from real Windows CIM/WMI cmdlets, native Node sockets, or OS network APIs.
* **Separation of Privileges:** Read-only diagnostics run with standard user privileges. Disruptive repair actions explicitly require Windows UAC elevation (`Start-Process -Verb RunAs`) and user confirmation.
* **Enterprise & School Network Safety:** NETFIX never tampers with domain-authenticated adapters or wipes saved enterprise credentials.
* **Local-First Architecture:** Reports and audit history are stored locally in an embedded SQLite database (`better-sqlite3` in WAL mode). No telemetry or cloud dependency.

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Desktop Shell** | Electron 33, Node.js 22 |
| **Frontend Framework** | React 19, TypeScript 5.7, Vite (`electron-vite`) |
| **Styling & Motion** | Tailwind CSS 3.4, Lucide React, Glassmorphism, CSS Shimmer |
| **Windows Integration** | PowerShell 5.1 & 7+ (UTF-16LE Encoded Commands), CIM/WMI cmdlets |
| **Storage & Validation**| SQLite 3 via `better-sqlite3` (WAL mode), Zod |

---

## 📦 Getting Started

### Prerequisites
* Windows 10 or Windows 11 (64-bit)
* Node.js 18+ and npm

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/tradzSE/netfix.git
   cd netfix
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run in development mode:**
   ```bash
   npm run dev
   ```

4. **Typecheck & Lint:**
   ```bash
   npm run typecheck
   ```

5. **Build production executable / installer:**
   ```bash
   npm run build
   npx electron-builder --win
   ```

---

## 📂 Project Architecture

```
netfix/
├── public/                 # Static assets (logo.png, intro.mp4, audio.mp3)
├── resources/              # Application window and installer icons
├── src/
│   ├── main/               # Electron Main Process
│   │   ├── commands/       # Strict PowerShell allowlist definitions
│   │   ├── ipc/            # Type-safe IPC handler registrations
│   │   ├── services/       # Diagnostics, repair, wifi, monitor & DB services
│   │   └── index.ts        # App lifecycle, system tray & window management
│   ├── preload/            # Context Bridge & exposed window.netfix API
│   └── renderer/           # React 19 UI
│       ├── src/
│       │   ├── assets/     # Images, audio, and video assets
│       │   ├── components/ # Layout (Sidebar, TitleBar), UI & Skeletons
│       │   ├── hooks/      # Custom reactive network and telemetry hooks
│       │   ├── lib/        # Correlation engine & troubleshooter rules
│       │   └── pages/      # 10 core modules (Dashboard, Repair, etc.)
└── electron.vite.config.ts # Vite configuration for main, preload & renderer
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

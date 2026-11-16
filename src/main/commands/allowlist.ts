/**
 * NETFIX Command Allowlist
 *
 * Every PowerShell command the application can execute is defined here.
 * No user-provided input is interpolated into these commands.
 * The renderer process cannot construct or modify commands.
 */

export const COMMANDS = {
  // ── Network Information ──────────────────────────────────────────────
  'get-adapters': `
    Get-NetAdapter |
      Select-Object Name, InterfaceDescription, Status, LinkSpeed,
        MacAddress, InterfaceIndex, MediaType, DriverVersion |
      ConvertTo-Json -Compress
  `,

  'get-ip-config': `
    @(Get-NetIPConfiguration) | ForEach-Object {
      [PSCustomObject]@{
        InterfaceAlias    = $_.InterfaceAlias
        InterfaceIndex    = $_.InterfaceIndex
        IPv4Address       = $_.IPv4Address.IPAddress
        IPv6Address       = $_.IPv6Address.IPAddress
        IPv4SubnetMask    = $_.IPv4Address.PrefixLength
        IPv4Gateway       = $_.IPv4DefaultGateway.NextHop
        DNSServers        = @($_.DNSServer.ServerAddresses)
      }
    } | ConvertTo-Json -Depth 4 -Compress
  `,

  'get-dns-servers': `
    Get-DnsClientServerAddress |
      Where-Object { $_.ServerAddresses.Count -gt 0 } |
      Select-Object InterfaceAlias, InterfaceIndex,
        @{N='AddressFamily';E={if($_.AddressFamily -eq 2){'IPv4'}else{'IPv6'}}},
        ServerAddresses |
      ConvertTo-Json -Depth 3 -Compress
  `,

  'get-wifi-info': `netsh wlan show interfaces`,

  'get-wifi-networks': `netsh wlan show networks mode=bssid`,

  // ── Diagnostics ──────────────────────────────────────────────────────
  'ping-gateway': `
    $gw = (Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway }).IPv4DefaultGateway.NextHop | Select-Object -First 1
    if ($gw) {
      $r = Test-Connection -ComputerName $gw -Count 4 -ErrorAction SilentlyContinue
      $successes = @($r | Where-Object { $_.StatusCode -eq 0 -or $_.Status -eq 'Success' })
      [PSCustomObject]@{
        Target    = $gw
        Success   = ($successes.Count -gt 0)
        Replies   = @($r | ForEach-Object {
          $isOk = ($_.StatusCode -eq 0 -or $_.Status -eq 'Success')
          $lat = if ($null -ne $_.ResponseTime) { $_.ResponseTime } else { $_.Latency }
          $ttl = if ($null -ne $_.ResponseTimeToLive) { $_.ResponseTimeToLive } else { $_.TimeToLive }
          [PSCustomObject]@{
            Status      = if ($isOk) { 'Success' } else { 'Failed' }
            RoundTrip   = $lat
            TTL         = $ttl
            BufferSize  = $_.BufferSize
          }
        })
        Sent      = 4
        Received  = $successes.Count
      } | ConvertTo-Json -Depth 3 -Compress
    } else {
      [PSCustomObject]@{ Target = $null; Success = $false; Error = 'No default gateway found' } | ConvertTo-Json -Compress
    }
  `,

  'test-dns': `
    $targets = @('google.com', 'cloudflare.com', 'microsoft.com')
    $results = @()
    foreach ($t in $targets) {
      try {
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        $r = Resolve-DnsName -Name $t -Type A -ErrorAction Stop
        $sw.Stop()
        $results += [PSCustomObject]@{
          Domain    = $t
          Success   = $true
          Addresses = @($r | Where-Object { $_.Type -eq 'A' } | ForEach-Object { $_.IPAddress })
          TimeMs    = $sw.ElapsedMilliseconds
        }
      } catch {
        $results += [PSCustomObject]@{
          Domain  = $t
          Success = $false
          Error   = $_.Exception.Message
          TimeMs  = -1
        }
      }
    }
    $results | ConvertTo-Json -Depth 3 -Compress
  `,

  'test-internet': `
    $targets = @(
      @{ Name = 'Cloudflare'; IP = '1.1.1.1' },
      @{ Name = 'Google'; IP = '8.8.8.8' },
      @{ Name = 'Quad9'; IP = '9.9.9.9' }
    )
    $results = @()
    foreach ($t in $targets) {
      $r = Test-Connection -ComputerName $t.IP -Count 3 -ErrorAction SilentlyContinue
      $successes = @($r | Where-Object { $_.StatusCode -eq 0 -or $_.Status -eq 'Success' })
      $latencies = @($successes | ForEach-Object { if ($null -ne $_.ResponseTime) { $_.ResponseTime } else { $_.Latency } })
      $results += [PSCustomObject]@{
        Name       = $t.Name
        Target     = $t.IP
        Success    = ($successes.Count -gt 0)
        Sent       = 3
        Received   = $successes.Count
        AvgLatency = if ($latencies.Count -gt 0) { [math]::Round(($latencies | Measure-Object -Average).Average, 1) } else { -1 }
        MinLatency = if ($latencies.Count -gt 0) { ($latencies | Measure-Object -Minimum).Minimum } else { -1 }
        MaxLatency = if ($latencies.Count -gt 0) { ($latencies | Measure-Object -Maximum).Maximum } else { -1 }
      }
    }
    $results | ConvertTo-Json -Depth 3 -Compress
  `,

  'test-https': `
    $targets = @(
      @{ Name = 'Google'; URL = 'https://www.google.com' },
      @{ Name = 'Cloudflare'; URL = 'https://one.one.one.one' },
      @{ Name = 'Microsoft'; URL = 'https://www.microsoft.com' }
    )
    $results = @()
    foreach ($t in $targets) {
      try {
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        $response = Invoke-WebRequest -Uri $t.URL -UseBasicParsing -TimeoutSec 10 -MaximumRedirection 3 -ErrorAction Stop
        $sw.Stop()
        $results += [PSCustomObject]@{
          Name       = $t.Name
          URL        = $t.URL
          Success    = $true
          StatusCode = $response.StatusCode
          TimeMs     = $sw.ElapsedMilliseconds
        }
      } catch {
        $results += [PSCustomObject]@{
          Name    = $t.Name
          URL     = $t.URL
          Success = $false
          Error   = $_.Exception.Message
          TimeMs  = -1
        }
      }
    }
    $results | ConvertTo-Json -Depth 3 -Compress
  `,

  'test-packet-loss': `
    $gw = (Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway }).IPv4DefaultGateway.NextHop | Select-Object -First 1
    $target = if ($gw) { $gw } else { '1.1.1.1' }
    $r = Test-Connection -ComputerName $target -Count 20 -ErrorAction SilentlyContinue
    $successes = @($r | Where-Object { $_.StatusCode -eq 0 -or $_.Status -eq 'Success' })
    $latencies = @($successes | ForEach-Object { if ($null -ne $_.ResponseTime) { $_.ResponseTime } else { $_.Latency } })
    $avgLat = if ($latencies.Count -gt 0) { [math]::Round(($latencies | Measure-Object -Average).Average, 1) } else { -1 }
    $jitter = if ($latencies.Count -gt 1) {
      $diffs = @()
      for ($i = 1; $i -lt $latencies.Count; $i++) {
        $diffs += [math]::Abs($latencies[$i] - $latencies[$i-1])
      }
      [math]::Round(($diffs | Measure-Object -Average).Average, 1)
    } else { 0 }
    [PSCustomObject]@{
      Target     = $target
      Sent       = 20
      Received   = $successes.Count
      LossPercent = [math]::Round((1 - $successes.Count / 20) * 100, 1)
      AvgLatency = $avgLat
      MinLatency = if ($latencies.Count -gt 0) { ($latencies | Measure-Object -Minimum).Minimum } else { -1 }
      MaxLatency = if ($latencies.Count -gt 0) { ($latencies | Measure-Object -Maximum).Maximum } else { -1 }
      Jitter     = $jitter
    } | ConvertTo-Json -Compress
  `,

  'detect-captive-portal': `
    try {
      $r = Invoke-WebRequest -Uri 'http://www.msftconnecttest.com/connecttest.txt' -UseBasicParsing -TimeoutSec 5 -MaximumRedirection 0 -ErrorAction Stop
      [PSCustomObject]@{
        IsCaptive   = ($r.Content.Trim() -ne 'Microsoft Connect Test')
        StatusCode  = $r.StatusCode
        Content     = $r.Content.Substring(0, [math]::Min(200, $r.Content.Length))
      } | ConvertTo-Json -Compress
    } catch {
      $ex = $_.Exception
      if ($ex.Response -and $ex.Response.StatusCode -eq 302) {
        [PSCustomObject]@{
          IsCaptive  = $true
          StatusCode = 302
          RedirectTo = $ex.Response.Headers.Location
        } | ConvertTo-Json -Compress
      } else {
        [PSCustomObject]@{
          IsCaptive = $false
          Error     = $ex.Message
        } | ConvertTo-Json -Compress
      }
    }
  `,

  'get-routes': `
    Get-NetRoute -AddressFamily IPv4 |
      Where-Object { $_.NextHop -ne '0.0.0.0' } |
      Select-Object DestinationPrefix, NextHop, RouteMetric, InterfaceAlias, InterfaceIndex |
      ConvertTo-Json -Compress
  `,

  'get-neighbors': `
    Get-NetNeighbor -AddressFamily IPv4 |
      Where-Object { $_.State -ne 'Unreachable' -and $_.IPAddress -notlike '224.*' -and $_.IPAddress -notlike '239.*' -and $_.IPAddress -notlike '255.*' } |
      Select-Object IPAddress, LinkLayerAddress, State, InterfaceAlias |
      ConvertTo-Json -Compress
  `,

  // ── Security Inspection ───────────────────────────────────────────────
  'get-firewall-status': `
    Get-NetFirewallProfile |
      Select-Object Name, Enabled, DefaultInboundAction, DefaultOutboundAction |
      ConvertTo-Json -Compress
  `,

  'get-proxy-settings': `
    Get-ItemProperty 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings' |
      Select-Object ProxyEnable, ProxyServer, AutoConfigURL |
      ConvertTo-Json -Compress
  `,

  'get-listening-ports': `
    Get-NetTCPConnection -State Listen |
      Select-Object -First 30 |
      ForEach-Object {
        $p = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
        [PSCustomObject]@{
          LocalAddress = $_.LocalAddress
          LocalPort    = $_.LocalPort
          PID          = $_.OwningProcess
          ProcessName  = if ($p) { $p.ProcessName } else { 'System' }
        }
      } | ConvertTo-Json -Compress
  `,

  // ── Network Profiles & Activity ───────────────────────────────────────
  'get-connection-profiles': `
    Get-NetConnectionProfile |
      Select-Object Name, InterfaceAlias, InterfaceIndex, NetworkCategory, IPv4Connectivity |
      ConvertTo-Json -Compress
  `,

  'get-active-connections': `
    Get-NetTCPConnection |
      Where-Object { $_.State -eq 'Established' -or $_.State -eq 'Listen' } |
      Select-Object -First 80 |
      ForEach-Object {
        $p = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
        [PSCustomObject]@{
          LocalAddress  = $_.LocalAddress
          LocalPort     = $_.LocalPort
          RemoteAddress = $_.RemoteAddress
          RemotePort    = $_.RemotePort
          State         = [string]$_.State
          PID           = $_.OwningProcess
          ProcessName   = if ($p) { $p.ProcessName } else { 'System' }
        }
      } | ConvertTo-Json -Compress
  `
} as const

export type CommandKey = keyof typeof COMMANDS

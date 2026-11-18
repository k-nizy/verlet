$ErrorActionPreference = 'Stop'
$taskName = 'Boutique Codex Connector'
$projectPath = Split-Path -Parent $PSScriptRoot
$startupPath = Join-Path (Split-Path -Parent (Split-Path -Parent $projectPath)) 'boutique-startup'
$supervisorPath = Join-Path $PSScriptRoot 'connector-supervisor.mjs'
$nodePath = (Get-Command node.exe -ErrorAction Stop).Source
New-Item -ItemType Directory -Path $startupPath -Force | Out-Null
# Fixed paths only; no command or URL supplied by a webpage is accepted.
$launcher = "`$ErrorActionPreference = 'Stop'`r`n& '$($nodePath.Replace("'", "''"))' '$($supervisorPath.Replace("'", "''"))'`r`nexit `$LASTEXITCODE`r`n"
Set-Content -LiteralPath (Join-Path $startupPath 'start-connector.ps1') -Value $launcher -Encoding UTF8
$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction Stop
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
Set-ScheduledTask -TaskName $taskName -Settings $settings | Out-Null
Write-Output 'Configured the Windows sign-in task and supervised Boutique connection; no browser protocol or model API key is required.'

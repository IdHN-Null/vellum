# Usage:  .\install.ps1 "C:\path\to\YourVault"
param(
    [Parameter(Mandatory = $true)]
    [string]$VaultPath
)

if (-not (Test-Path (Join-Path $VaultPath ".obsidian"))) {
    Write-Error "'$VaultPath' is not an Obsidian vault (.obsidian folder not found)."
    exit 1
}

$dest = Join-Path $VaultPath ".obsidian\plugins\vellum"
New-Item -ItemType Directory -Force $dest | Out-Null

Copy-Item "$PSScriptRoot\main.js" $dest -Force
Copy-Item "$PSScriptRoot\manifest.json" $dest -Force
Copy-Item "$PSScriptRoot\styles.css" $dest -Force

Write-Host "Vellum installed : $dest"
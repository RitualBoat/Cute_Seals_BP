# ============================================================
# Cute Seals Add-On — Packaging Script
# Author:   Ritual Boat
# Version:  1.0.0
# Produces: $env:USERPROFILE\Downloads\Cute_Seals.mcaddon
#
# Uses .NET ZipFile (not Compress-Archive) for maximum
# compatibility with Minecraft Bedrock's zip parser.
# Creates two .mcpack archives inside one .mcaddon.
# ============================================================

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$projectRoot = $PSScriptRoot
if (-not $projectRoot) { $projectRoot = (Get-Location).Path }

$bp = Join-Path $projectRoot "behavior_pack"
$rp = Join-Path $projectRoot "resource_pack"
$output = Join-Path "$env:USERPROFILE\Downloads" "Cute_Seals.mcaddon"

# Temp workspace
$stamp = Get-Date -Format "yyyyMMddHHmmss"
$temp = Join-Path $env:TEMP "CuteSeals_Build_$stamp"
New-Item $temp -ItemType Directory -Force | Out-Null

try {
    # --- Step 1: Create individual .mcpack archives ---
    Write-Host "[1/4] Packing Behavior Pack..." -ForegroundColor Cyan
    $bpPack = Join-Path $temp "Cute_Seals_BP.mcpack"
    [System.IO.Compression.ZipFile]::CreateFromDirectory(
        $bp, $bpPack,
        [System.IO.Compression.CompressionLevel]::Optimal,
        $false   # $false = do NOT include the base directory name
    )

    Write-Host "[2/4] Packing Resource Pack..." -ForegroundColor Cyan
    $rpPack = Join-Path $temp "Cute_Seals_RP.mcpack"
    [System.IO.Compression.ZipFile]::CreateFromDirectory(
        $rp, $rpPack,
        [System.IO.Compression.CompressionLevel]::Optimal,
        $false
    )

    # --- Step 2: Bundle both .mcpack files into one .mcaddon ---
    Write-Host "[3/4] Bundling into .mcaddon..." -ForegroundColor Cyan
    if (Test-Path $output) { Remove-Item $output -Force }

    $addonZip = [System.IO.Compression.ZipFile]::Open(
        $output,
        [System.IO.Compression.ZipArchiveMode]::Create
    )
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
        $addonZip, $bpPack, "Cute_Seals_BP.mcpack",
        [System.IO.Compression.CompressionLevel]::Optimal
    ) | Out-Null
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
        $addonZip, $rpPack, "Cute_Seals_RP.mcpack",
        [System.IO.Compression.CompressionLevel]::Optimal
    ) | Out-Null
    $addonZip.Dispose()

    # --- Done ---
    Write-Host "[4/4] Done!" -ForegroundColor Green
    Write-Host ""
    $size = [math]::Round((Get-Item $output).Length / 1KB, 1)
    Write-Host "Output : $output" -ForegroundColor Yellow
    Write-Host "Size   : $size KB" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Double-click the .mcaddon file to import into Minecraft Bedrock." -ForegroundColor White

} finally {
    # Cleanup temp files
    Remove-Item $temp -Recurse -Force -ErrorAction SilentlyContinue
}

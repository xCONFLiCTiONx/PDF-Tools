$ErrorActionPreference = 'Stop'

$SourceDir = $PSScriptRoot
$TargetDir = Join-Path $env:LOCALAPPDATA 'xExtensions\PDF-Tools'

if (-not (Test-Path $TargetDir)) {
    New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
}

# Mirror extension files to LocalAppData\xExtensions\PDF-Tools
$RobocopyArgs = @(
    $SourceDir,
    $TargetDir,
    '/MIR',
    '/XD', 'tests', '.git', '.idea',
    '/XF', '.build.ps1', '*.test.js',
    '/NFL', '/NDL', '/NJH', '/NJS', '/NP'
)

& robocopy @RobocopyArgs | Out-Null
# Robocopy exit codes 0-7 indicate success (with varying levels of changes copied).
if ($LASTEXITCODE -ge 8) {
    throw "robocopy failed with exit code $LASTEXITCODE"
}

Write-Host "Copied PDF-Tools to $TargetDir" -ForegroundColor Green

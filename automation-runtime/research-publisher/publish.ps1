[CmdletBinding()]
param(
    [string]$HtmlRoot = 'D:\Evan\html',
    [string]$NodeExe = '',
    [string]$PythonExe = ''
)

$ErrorActionPreference = 'Stop'
$runtimeRoot = (Resolve-Path -LiteralPath $PSScriptRoot).Path
$script = Join-Path $runtimeRoot 'scripts\publish-research-library.mjs'
$env:RESEARCH_SOURCE_DIR = [System.IO.Path]::GetFullPath($HtmlRoot)

if (-not $NodeExe) {
    $node = Get-Command node -ErrorAction SilentlyContinue
    if ($node) { $NodeExe = $node.Source }
}
if (-not $NodeExe -or -not (Test-Path -LiteralPath $NodeExe)) {
    throw 'Node.js was not found. Pass -NodeExe with an existing node.exe path.'
}

if ($PythonExe) {
    if (-not (Test-Path -LiteralPath $PythonExe)) { throw "Python executable not found: $PythonExe" }
    $env:RESEARCH_PYTHON = [System.IO.Path]::GetFullPath($PythonExe)
}

if (-not (Test-Path -LiteralPath (Join-Path $runtimeRoot 'node_modules\cheerio\package.json'))) {
    $npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if (-not $npm) { throw 'Cheerio is not installed and npm.cmd was not found.' }
    Push-Location $runtimeRoot
    try {
        & $npm.Source install --omit=dev --ignore-scripts --no-audit --no-fund
        if ($LASTEXITCODE -ne 0) { throw "npm install failed with exit code $LASTEXITCODE" }
    } finally {
        Pop-Location
    }
}

& $NodeExe $script
if ($LASTEXITCODE -ne 0) { throw "Research publisher failed with exit code $LASTEXITCODE" }

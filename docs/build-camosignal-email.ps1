$ErrorActionPreference = "Stop"

$DocsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $DocsDir
$BuilderPath = Join-Path $DocsDir "camosignal-email-marketing-template-builder.mjs"
$OutputPath = Join-Path $DocsDir "camosignal-email-marketing-template-messaging.html"

Set-Location $ProjectRoot

node $BuilderPath

$html = Get-Content -Path $OutputPath -Raw

if (($html | Select-String -Pattern "{{ open_tracking_block }}" -AllMatches).Matches.Count -ne 1) {
  throw "Missing or duplicated {{ open_tracking_block }}."
}

if (($html | Select-String -Pattern "{{ unsubscribe_link }}" -AllMatches).Matches.Count -ne 1) {
  throw "Missing or duplicated {{ unsubscribe_link }}."
}

if ($html -match "{%") {
  throw "Messaging HTML must not contain Liquid tags like {% ... %}."
}

if ($html -match "&#9733;|\(128\)") {
  throw "Static review stars/counts are still present."
}

$html | Set-Clipboard

Write-Host ""
Write-Host "Done."
Write-Host "Generated and copied to clipboard:"
Write-Host $OutputPath
Write-Host ""
Write-Host "Paste this HTML into Shopify/Messaging."

$ErrorActionPreference = "Stop"

$path = "src/pages/owner/OwnerDossiersPage.tsx"

if (-not (Test-Path $path)) {
  throw "Missing file: $path"
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backup = "$path.bak-remove-iframe-$stamp"
Copy-Item $path $backup -Force

$text = Get-Content -Path $path -Raw
$changed = $false

$patterns = @(
  '(?s)\r?\n\s*<div\s+style=\{\{.*?overflow:\s*"hidden".*?minHeight:\s*620.*?\}\}>.*?<iframe\b.*?</iframe>\s*</div>',
  '(?s)\r?\n\s*<div\s+style=\{\{.*?overflow:\s*"hidden".*?\}\}>.*?<iframe\b.*?</iframe>\s*</div>',
  '(?s)\r?\n\s*<iframe\b.*?</iframe>\s*'
)

foreach ($pattern in $patterns) {
  $next = [regex]::Replace($text, $pattern, "`r`n", 1)
  if ($next -ne $text) {
    $text = $next
    $changed = $true
    break
  }
}

if (-not $changed) {
  throw "No embedded iframe block matched in $path"
}

$text = $text -replace '(\r?\n){3,}', "`r`n`r`n"

Set-Content -Path $path -Value $text -Encoding UTF8

Write-Host "Patched $path"
Write-Host "Backup: $backup"
Write-Host ""
Write-Host "Verify:"
Select-String -Path $path -Pattern '<iframe|Open Full Dossier' -Context 2,2

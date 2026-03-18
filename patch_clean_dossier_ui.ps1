$ErrorActionPreference = "Stop"

function Backup-File {
  param([string]$Path)
  if (-not (Test-Path $Path)) {
    throw "Missing file: $Path"
  }
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $backup = "$Path.bak-clean-dossier-$stamp"
  Copy-Item $Path $backup -Force
  Write-Host "Backup created: $backup"
}

function Read-Text {
  param([string]$Path)
  Get-Content $Path -Raw
}

function Write-Text {
  param([string]$Path, [string]$Text)
  Set-Content -Path $Path -Value $Text -Encoding UTF8
  Write-Host "Patched $Path"
}

function Clean-DossierFile {
  param(
    [string]$Path,
    [string]$BackButtonTarget,
    [string]$BackButtonLabel,
    [string]$KeepOwnerLookup
  )

  Backup-File $Path
  $text = Read-Text $Path

  $text = $text -replace 'import\s+\{\s*getCommandCenterModules\s*\}\s+from\s+"../../components/commandcenter/ccModules";\r?\n', ''
  $text = $text -replace '(?s)\s*const cc = useMemo\(\(\) => getCommandCenterModules\(\), \[\]\);\r?\n\s*const modules = useMemo\(\(\) => cc\.map\(\(\{ key, label, hint \}\) => \(\{ key, label, hint \}\)\), \[cc\]\);\r?\n\s*function onSelectModule\(k: string\) \{ const to = cc\.find\(m => m\.key === k\)\?\.to; if \(to\) nav\(to\); \}\r?\n', "`r`n"

  $text = $text -replace '\r?\n\s*modules=\{modules\}', ''
  $text = $text -replace '\r?\n\s*activeModuleKey="[^"]+"', ''
  $text = $text -replace '\r?\n\s*onSelectModule=\{onSelectModule\}', ''

  if ($KeepOwnerLookup -eq "yes") {
    $newTopRight = @"
      topRight={
        <div style={{ display:"flex", gap: 8, flexWrap:"wrap" }}>
          <button className="zombie-btn" type="button" onClick={printSheet}>Print / Save PDF</button>
          <button className="zombie-btn" type="button" onClick={() => nav("$BackButtonTarget")}>$BackButtonLabel</button>
        </div>
      }
"@
  } else {
    $newTopRight = @"
      topRight={
        <div style={{ display:"flex", gap: 8, flexWrap:"wrap" }}>
          <button className="zombie-btn" type="button" onClick={printSheet}>Print / Save PDF</button>
          <button className="zombie-btn" type="button" onClick={() => nav("$BackButtonTarget")}>$BackButtonLabel</button>
        </div>
      }
"@
  }

  $text = [regex]::Replace(
    $text,
    '(?s)topRight=\{\s*<div style=\{\{ display:"flex", gap: 8, flexWrap:"wrap" \}\}>.*?</div>\s*\}',
    [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $newTopRight }
  )

  Write-Text $Path $text
}

Clean-DossierFile -Path "src/pages/me/DossierSheetPage.tsx" -BackButtonTarget "/me/dossier" -BackButtonLabel "Back to My Dossier" -KeepOwnerLookup "no"
Clean-DossierFile -Path "src/pages/player/PlayerDossierPage.tsx" -BackButtonTarget "/owner/dossier" -BackButtonLabel "Owner Lookup" -KeepOwnerLookup "yes"

Write-Host ""
Write-Host "Dossier cleanup patch complete."

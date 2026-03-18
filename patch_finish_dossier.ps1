$ErrorActionPreference = "Stop"

function Read-FileText {
  param([string]$Path)
  if (-not (Test-Path $Path)) {
    throw "Missing file: $Path"
  }

  $raw = Get-Content $Path -Raw
  $eol = if ($raw.Contains("`r`n")) { "`r`n" } else { "`n" }

  [PSCustomObject]@{
    Path = $Path
    Raw  = $raw
    Eol  = $eol
    Text = ($raw -replace "`r`n", "`n")
  }
}

function Write-FileText {
  param(
    [string]$Path,
    [string]$Text,
    [string]$Eol
  )

  $backup = "$Path.bak-dossier-finish"
  Copy-Item $Path $backup -Force
  Set-Content -Path $Path -Value ($Text -replace "`n", $Eol) -Encoding UTF8
  Write-Host "Patched $Path"
  Write-Host "Backup saved to $backup"
}

function Replace-Required {
  param(
    [string]$Text,
    [string]$Label,
    [string]$Old,
    [string]$New
  )

  if (-not $Text.Contains($Old)) {
    throw "Patch failed: could not find block: $Label"
  }

  return $Text.Replace($Old, $New)
}

$routeFile = Read-FileText "src/routes/AppRoutes.tsx"
$routeText = $routeFile.Text

$oldRoute = @"
      <Route path="/me/dossier" element={<DossierSheetPage />} />
"@

$newRoute = @"
      <Route path="/me/dossier" element={<MeDossierPage />} />
      <Route path="/me/dossier-sheet" element={<DossierSheetPage />} />
"@

if ($routeText.Contains($oldRoute)) {
  $routeText = Replace-Required $routeText "AppRoutes dossier route" $oldRoute $newRoute
} elseif ($routeText.Contains('<Route path="/me/dossier" element={<MeDossierPage />} />') -and $routeText.Contains('<Route path="/me/dossier-sheet" element={<DossierSheetPage />} />')) {
  Write-Host "AppRoutes already patched."
} else {
  throw "Patch failed: /me/dossier route not found in expected format."
}

Write-FileText $routeFile.Path $routeText $routeFile.Eol

$meFile = Read-FileText "src/pages/me/MeDossierPage.tsx"
$meText = $meFile.Text

if ($meText.Contains('title="Dossier Sheet"')) {
  $meText = Replace-Required $meText "MeDossier title" 'title="Dossier Sheet"' 'title="My Dossier"'
}

if ($meText.Contains('subtitle="Identity • memberships • defaults • zombie command center"')) {
  $meText = Replace-Required $meText "MeDossier subtitle" 'subtitle="Identity • memberships • defaults • zombie command center"' 'subtitle="Overview • memberships • Discord defaults • quick links"'
}

$oldMeTopRight = @"
      topRight={
        <div style={{ display:"flex", gap: 8, flexWrap:"wrap" }}>
          <button className="zombie-btn" type="button" onClick={() => nav("/dashboard")}>Dashboard</button>
          <button className="zombie-btn" type="button" onClick={() => nav("/owner/approval-center")}>Approval Center</button>
          <button className="zombie-btn" type="button" onClick={() => nav("/state/789")}>State 789</button>
        </div>
      }
"@

$newMeTopRight = @"
      topRight={
        <div style={{ display:"flex", gap: 8, flexWrap:"wrap" }}>
          <button className="zombie-btn" type="button" onClick={() => nav("/me")}>Back</button>
          <button className="zombie-btn" type="button" onClick={() => nav("/me/dossier-sheet")}>Print Sheet</button>
          <button className="zombie-btn" type="button" onClick={() => nav("/dashboard")}>Dashboard</button>
          <button className="zombie-btn" type="button" onClick={() => nav("/state/789")}>State 789</button>
        </div>
      }
"@

if ($meText.Contains($oldMeTopRight)) {
  $meText = Replace-Required $meText "MeDossier topRight" $oldMeTopRight $newMeTopRight
}

Write-FileText $meFile.Path $meText $meFile.Eol

$sheetFile = Read-FileText "src/pages/me/DossierSheetPage.tsx"
$sheetText = $sheetFile.Text

if ($sheetText.Contains('activeModuleKey="me"')) {
  $sheetText = Replace-Required $sheetText "DossierSheet activeModuleKey" 'activeModuleKey="me"' 'activeModuleKey="dossier"'
}

if ($sheetText.Contains('subtitle="Identity + memberships • printable intel page"')) {
  $sheetText = Replace-Required $sheetText "DossierSheet subtitle" 'subtitle="Identity + memberships • printable intel page"' 'subtitle="Printable version of your dossier"'
}

$oldSheetTopRight = @"
      topRight={
        <div style={{ display:"flex", gap: 8, flexWrap:"wrap" }}>
          <button className="zombie-btn" type="button" onClick={printSheet}>Print / Save PDF</button>
          <button className="zombie-btn" type="button" onClick={() => nav("/me")}>Back</button>
        </div>
      }
"@

$newSheetTopRight = @"
      topRight={
        <div style={{ display:"flex", gap: 8, flexWrap:"wrap" }}>
          <button className="zombie-btn" type="button" onClick={printSheet}>Print / Save PDF</button>
          <button className="zombie-btn" type="button" onClick={() => nav("/me/dossier")}>Back to My Dossier</button>
        </div>
      }
"@

if ($sheetText.Contains($oldSheetTopRight)) {
  $sheetText = Replace-Required $sheetText "DossierSheet topRight" $oldSheetTopRight $newSheetTopRight
}

Write-FileText $sheetFile.Path $sheetText $sheetFile.Eol

Write-Host ""
Write-Host "Dossier patch complete."

param(
  [Parameter(Mandatory=$true)][string]$PatchPath,
  [Parameter(Mandatory=$true)][string]$Message
)

$ErrorActionPreference = "Stop"

function Assert-Cmd($cmd) {
  $null = Get-Command $cmd -ErrorAction Stop
}

Assert-Cmd git
Assert-Cmd npm

if (!(Test-Path $PatchPath)) { throw "Patch not found: $PatchPath" }

Write-Host "== Repo ==" -ForegroundColor Cyan
git status -sb

Write-Host "`n== Applying patch: $PatchPath ==" -ForegroundColor Cyan
git apply --whitespace=nowarn --verbose $PatchPath

Write-Host "`n== Build ==" -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { throw "Build failed. Paste the FIRST error block." }

Write-Host "`n== Commit ==" -ForegroundColor Cyan
git add -A
git commit -m $Message 2>$null
if ($LASTEXITCODE -ne 0) {
  # If no changes (or commit blocked), still allow deploy trigger
  git commit --allow-empty -m "$Message (deploy trigger)"
}

Write-Host "`n== Push (Cloudflare trigger) ==" -ForegroundColor Cyan
git push origin main

Write-Host "`n== Verify remote HEAD ==" -ForegroundColor Cyan
$local = (git rev-parse HEAD).Trim()
$remote = ((git ls-remote origin refs/heads/main).Split("`t")[0]).Trim()
"LOCAL  = $local"
"REMOTE = $remote"
if ($local -ne $remote) { throw "Push did NOT reach origin/main. Re-run: git push origin main" }

Write-Host "`n✅ Done. Cloudflare deploy should trigger from main." -ForegroundColor Green

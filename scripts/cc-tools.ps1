function Write-Section {
 param([string]$Title)
 Write-Host ""
 Write-Host ("=== " + $Title + " ===") -ForegroundColor Cyan
}

function New-Stamp {
 return (Get-Date -Format "yyyyMMdd-HHmmss")
}

function Backup-File {
 param([Parameter(Mandatory=$true)][string]$Path)
 if (!(Test-Path $Path)) { throw ("Missing: " + $Path) }
 $Stamp = New-Stamp
 Copy-Item $Path ($Path + ".bak." + $Stamp) -Force
 Write-Host ("Backup -> " + $Path + ".bak." + $Stamp)
}

function Ensure-LineInFile {
 param([string]$Path,[string]$Line)
 if (!(Test-Path $Path)) { New-Item -ItemType File -Force -Path $Path | Out-Null }
 $txt = Get-Content $Path -Raw
 if ($txt -notmatch [regex]::Escape($Line)) {
 Add-Content -Encoding UTF8 -LiteralPath $Path -Value $Line
 Write-Host ("Added: " + $Line)
 }
}

function Build-OrThrow {
 Write-Section "Build (must be green)"
 npm run build
 if ($LASTEXITCODE -ne 0) { throw "Build failed — paste the FIRST error block." }
}

function Push-And-Verify {
 param([string]$Branch="main")
 Write-Section "Push"
 git push origin $Branch

 Write-Section "Verify local == remote"
 $Local = (git rev-parse HEAD).Trim()
 $Remote = ((git ls-remote origin ("refs/heads/" + $Branch)).Split("`t")[0]).Trim()
 ("LOCAL = " + $Local)
 ("REMOTE = " + $Remote)
 if ($Local -ne $Remote) { throw ("Push did NOT reach origin/" + $Branch + ". Paste git push output.") }
}

function Deploy-Stamp {
 Write-Section "Deploy stamp (force Cloudflare deploy)"
 $Stamp = New-Stamp
 $DeployFile = "public/deploy-stamp.txt"
 New-Item -ItemType Directory -Force -Path "public" | Out-Null
 ("deploy-stamp=" + $Stamp) | Set-Content -Encoding UTF8 -LiteralPath $DeployFile
 Build-OrThrow
 git add $DeployFile
 git commit -m ("Deploy stamp (" + $Stamp + ")") 2>$null
 Push-And-Verify "main"
}

function Repo-Hygiene {
 Write-Section "Repo hygiene (ignore junk so pushes stay fast)"
 $Ignore = ".gitignore"
 $Patterns = @(
 "dist/",
 "audit/",
 "backups/",
 "_snapshots/",
 "SAFE-*/",
 "_RECOVERY_*/",
 "_recovery_*/",
 "_backup_*/",
 "src-backup*/",
 "src_backup*/",
 "backup-src*/",
 "*.bundle",
 "*.zip",
 "*.bak.*",
 "*.broken.*.bak",
 ".DS_Store"
 )
 foreach ($p in $Patterns) { Ensure-LineInFile -Path $Ignore -Line $p }

 Write-Section "Untrack junk folders if committed (keeps local copies)"
 foreach ($d in @("audit","backups","_snapshots")) {
 if (Test-Path $d) { git rm -r --cached $d 2>$null | Out-Null }
 }
}

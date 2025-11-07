# Script push code an toàn lên GitHub
# Sử dụng: .\scripts\safe-push.ps1 [-Message "commit message"]

param(
    [Parameter(Mandatory=$false)]
    [string]$Message = "chore: update code"
)

$ProjectDir = "D:\MEDICARE\MEDICARE_FINAL"
$RemoteUrl = "https://github.com/98tttm/251EIE503001---WEB-BUSINESS---GROUP-2---FINAL-PROJECT.git"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Kiểm tra thư mục project
if (-not (Test-Path $ProjectDir)) {
    Write-Host "Error: Project directory not found: $ProjectDir" -ForegroundColor Red
    exit 1
}

Push-Location $ProjectDir

try {
    Write-Host "=== SAFE PUSH TO GITHUB ===" -ForegroundColor Cyan
    Write-Host "Repository: $RemoteUrl`n" -ForegroundColor Gray
    
    # Bước 1: Backup
    Write-Host "[1/7] Creating backup..." -ForegroundColor Yellow
    & "$ScriptDir\backup-before-push.ps1"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Backup failed! Aborting push." -ForegroundColor Red
        exit 1
    }
    
    # Bước 2: Kiểm tra git đã khởi tạo chưa
    Write-Host "`n[2/7] Checking git repository..." -ForegroundColor Yellow
    if (-not (Test-Path ".git")) {
        Write-Host "Initializing git repository..." -ForegroundColor Yellow
        git init
    }
    
    # Bước 3: Kiểm tra remote
    Write-Host "`n[3/7] Checking remote..." -ForegroundColor Yellow
    $remotes = git remote -v 2>$null
    if (-not $remotes) {
        Write-Host "Adding remote origin..." -ForegroundColor Yellow
        git remote add origin $RemoteUrl
    } else {
        $currentUrl = (git remote get-url origin 2>$null)
        if ($currentUrl -ne $RemoteUrl) {
            Write-Host "Updating remote URL..." -ForegroundColor Yellow
            git remote set-url origin $RemoteUrl
        }
    }
    Write-Host "Remote: $RemoteUrl" -ForegroundColor Green
    
    # Bước 4: Kiểm tra branch
    Write-Host "`n[4/7] Checking branch..." -ForegroundColor Yellow
    $currentBranch = git branch --show-current 2>$null
    if (-not $currentBranch) {
        Write-Host "Creating main branch..." -ForegroundColor Yellow
        git checkout -b main
        $currentBranch = "main"
    }
    Write-Host "Current branch: $currentBranch" -ForegroundColor Green
    
    # Bước 5: Pull trước khi push
    Write-Host "`n[5/7] Pulling latest changes..." -ForegroundColor Yellow
    git fetch origin 2>&1 | Out-Null
    
    # Kiểm tra xem remote có branch main không
    $remoteBranch = git ls-remote --heads origin main 2>$null
    if ($remoteBranch) {
        Write-Host "Remote branch exists, pulling changes..." -ForegroundColor Yellow
        try {
            git pull origin main --no-rebase --no-edit 2>&1 | Out-Null
            Write-Host "Pull completed" -ForegroundColor Green
        } catch {
            Write-Host "Warning: Pull had conflicts or issues. Please resolve manually." -ForegroundColor Yellow
            Write-Host "You may need to: git pull origin main --no-rebase" -ForegroundColor Yellow
        }
    } else {
        Write-Host "Remote branch doesn't exist yet. Will create on first push." -ForegroundColor Yellow
    }
    
    # Bước 6: Add và commit
    Write-Host "`n[6/7] Adding and committing changes..." -ForegroundColor Yellow
    $status = git status --porcelain
    if ($status) {
        Write-Host "Changes detected:" -ForegroundColor Yellow
        git status --short
        
        git add .
        git commit -m $Message
        Write-Host "Committed with message: $Message" -ForegroundColor Green
    } else {
        Write-Host "No changes to commit" -ForegroundColor Yellow
    }
    
    # Bước 7: Push
    Write-Host "`n[7/7] Pushing to GitHub..." -ForegroundColor Yellow
    $pushResult = git push origin $currentBranch 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Push completed successfully!" -ForegroundColor Green
        Write-Host "View your code at: $RemoteUrl" -ForegroundColor Cyan
    } else {
        Write-Host "`n⚠️ Push had issues:" -ForegroundColor Yellow
        Write-Host $pushResult -ForegroundColor Yellow
        Write-Host "`nYou may need to:" -ForegroundColor Yellow
        Write-Host "1. Pull first: git pull origin $currentBranch" -ForegroundColor Yellow
        Write-Host "2. Resolve conflicts if any" -ForegroundColor Yellow
        Write-Host "3. Push again: git push origin $currentBranch" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "`n❌ Error occurred: $_" -ForegroundColor Red
    Write-Host "Check the backup if you need to restore" -ForegroundColor Yellow
    Write-Host "Backup location: D:\MEDICARE_BACKUPS" -ForegroundColor Yellow
} finally {
    Pop-Location
}


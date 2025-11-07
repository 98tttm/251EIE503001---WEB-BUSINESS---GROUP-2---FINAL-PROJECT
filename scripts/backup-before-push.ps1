# Script backup trước khi push code
# Sử dụng: .\scripts\backup-before-push.ps1

$ProjectDir = "D:\MEDICARE\MEDICARE_FINAL"
$BackupBaseDir = "D:\MEDICARE_BACKUPS"
$Date = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupDir = "$BackupBaseDir\MEDICARE_BACKUP_$Date"

Write-Host "=== BACKUP BEFORE PUSH ===" -ForegroundColor Cyan
Write-Host "Creating backup..." -ForegroundColor Yellow

# Kiểm tra thư mục project có tồn tại không
if (-not (Test-Path $ProjectDir)) {
    Write-Host "Error: Project directory not found: $ProjectDir" -ForegroundColor Red
    exit 1
}

# Tạo thư mục backup
New-Item -ItemType Directory -Path $BackupBaseDir -Force | Out-Null
New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null

# Copy project (loại trừ các thư mục không cần thiết)
Write-Host "Copying files..." -ForegroundColor Yellow

$excludeDirs = @(
    "node_modules",
    ".git",
    "dist",
    "build",
    "logs",
    "*.log",
    "backup*",
    "MEDICARE_BACKUPS"
)

# Copy từng thư mục/file, bỏ qua các thư mục exclude
Get-ChildItem -Path $ProjectDir -Exclude $excludeDirs | ForEach-Object {
    $destPath = Join-Path $BackupDir $_.Name
    Copy-Item -Path $_.FullName -Destination $destPath -Recurse -Force -ErrorAction SilentlyContinue
}

# Tạo file info
$infoFile = Join-Path $BackupDir "BACKUP_INFO.txt"
@"
Backup Information
==================
Date: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Source: $ProjectDir
Destination: $BackupDir
Created by: $env:USERNAME
"@ | Out-File -FilePath $infoFile -Encoding UTF8

Write-Host "`n✅ Backup created successfully!" -ForegroundColor Green
Write-Host "Location: $BackupDir" -ForegroundColor Green
Write-Host "`nYou can now safely push to GitHub" -ForegroundColor Cyan

# Xóa backups cũ hơn 7 ngày
Write-Host "`nCleaning up old backups (older than 7 days)..." -ForegroundColor Yellow
Get-ChildItem -Path $BackupBaseDir -Directory | Where-Object {
    $_.LastWriteTime -lt (Get-Date).AddDays(-7)
} | Remove-Item -Recurse -Force

Write-Host "Cleanup completed!" -ForegroundColor Green


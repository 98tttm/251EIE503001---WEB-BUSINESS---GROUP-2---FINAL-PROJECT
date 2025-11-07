# Script restore MongoDB cho MediCare trên Windows
# Sử dụng: .\restore-mongodb.ps1 <backup_file.zip>

param(
    [Parameter(Mandatory=$true)]
    [string]$BackupFile
)

$DBName = "MediCare_database"
$TempDir = "$env:TEMP\mongodb_restore_$(Get-Random)"

if (-not (Test-Path $BackupFile)) {
    Write-Host "Error: Backup file not found: $BackupFile" -ForegroundColor Red
    exit 1
}

Write-Host "WARNING: This will replace the current database!" -ForegroundColor Yellow
$confirm = Read-Host "Are you sure you want to continue? (yes/no)"

if ($confirm -ne "yes") {
    Write-Host "Restore cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host "Extracting backup..." -ForegroundColor Green
New-Item -ItemType Directory -Path $TempDir -Force | Out-Null
Expand-Archive -Path $BackupFile -DestinationPath $TempDir -Force

$BackupFolder = Get-ChildItem -Path $TempDir -Directory | Select-Object -First 1

Write-Host "Restoring database: $DBName" -ForegroundColor Green
mongorestore --db $DBName --drop "$($BackupFolder.FullName)\$DBName"

if ($LASTEXITCODE -eq 0) {
    Write-Host "Restore completed successfully!" -ForegroundColor Green
    Remove-Item -Path $TempDir -Recurse -Force
} else {
    Write-Host "Restore failed!" -ForegroundColor Red
    Remove-Item -Path $TempDir -Recurse -Force
    exit 1
}


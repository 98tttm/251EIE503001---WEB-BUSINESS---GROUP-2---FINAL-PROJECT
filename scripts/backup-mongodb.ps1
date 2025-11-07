# Script backup MongoDB cho MediCare trên Windows
# Sử dụng: .\backup-mongodb.ps1

$BackupDir = "C:\backups\mongodb"
$DBName = "MediCare_database"
$Date = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupPath = "$BackupDir\backup_$Date"

Write-Host "Starting MongoDB backup..." -ForegroundColor Green

# Tạo thư mục backup nếu chưa có
New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null

# Backup database
Write-Host "Backing up database: $DBName" -ForegroundColor Green
mongodump --db $DBName --out $BackupPath

if ($LASTEXITCODE -eq 0) {
    Write-Host "Backup completed successfully!" -ForegroundColor Green
    Write-Host "Backup location: $BackupPath" -ForegroundColor Green
    
    # Compress backup
    Write-Host "Compressing backup..." -ForegroundColor Green
    Compress-Archive -Path $BackupPath -DestinationPath "$BackupPath.zip" -Force
    Remove-Item -Path $BackupPath -Recurse -Force
    Write-Host "Compressed backup: $BackupPath.zip" -ForegroundColor Green
    
    # Xóa backups cũ hơn 7 ngày
    Write-Host "Cleaning up old backups (older than 7 days)..." -ForegroundColor Yellow
    Get-ChildItem -Path $BackupDir -Filter "backup_*.zip" | Where-Object {
        $_.LastWriteTime -lt (Get-Date).AddDays(-7)
    } | Remove-Item
    
    Write-Host "Cleanup completed!" -ForegroundColor Green
} else {
    Write-Host "Backup failed!" -ForegroundColor Red
    exit 1
}


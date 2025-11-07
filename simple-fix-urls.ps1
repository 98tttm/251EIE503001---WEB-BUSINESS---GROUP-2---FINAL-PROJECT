# Script đơn giản thay thế URL

Write-Host "Đang thay thế URLs..." -ForegroundColor Green

# Get all .ts files
$files = Get-ChildItem -Path "my_client\src\app","my_admin\src\app" -Include "*.ts" -Recurse

$count = 0
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    
    if ($content -match "localhost:3000") {
        # Simple replacements
        $newContent = $content
        $newContent = $newContent -replace "http://localhost:3000/api", '${environment.apiUrl}/api'
        $newContent = $newContent -replace "http://localhost:3000", '${environment.apiUrl}'
        
        if ($newContent -ne $content) {
            Set-Content -Path $file.FullName -Value $newContent -NoNewline
            Write-Host "Updated: $($file.Name)"
            $count++
        }
    }
}

Write-Host "`nUpdated $count files" -ForegroundColor Green


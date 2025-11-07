# Script tự động fix tất cả URL trong project

Write-Host "`n=== BẮT ĐẦU UPDATE API URLs ===" -ForegroundColor Green

# Tìm và sửa tất cả file .ts trong client
$clientFiles = Get-ChildItem -Path "my_client\src\app" -Include "*.ts" -Recurse

Write-Host "`nĐang xử lý Client files..." -ForegroundColor Yellow
$clientCount = 0

foreach ($file in $clientFiles) {
    $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
    
    if ($content -and $content -match "http://localhost:3000") {
        Write-Host "  Fixing: $($file.Name)" -ForegroundColor Cyan
        
        # Thêm import nếu chưa có
        if ($content -notmatch "import.*environment") {
            $content = $content -replace "(import .+ from [^;]+;)", "`$1`nimport { environment } from '../../environments/environment';"
        }
        
        # Replace URLs
        $content = $content -replace "'http://localhost:3000/api", "'`${environment.apiUrl}/api"
        $content = $content -replace "`"http://localhost:3000/api", "`"`${environment.apiUrl}/api"
        $content = $content -replace "'http://localhost:3000'", "environment.apiUrl"
        $content = $content -replace "`"http://localhost:3000`"", "environment.apiUrl"
        $content = $content -replace "const API_BASE_URL = 'http://localhost:3000'", "import { environment } from '../../environments/environment';`nconst API_BASE_URL = environment.apiUrl"
        
        Set-Content -Path $file.FullName -Value $content -NoNewline
        $clientCount++
    }
}

# Tìm và sửa tất cả file .ts trong admin
$adminFiles = Get-ChildItem -Path "my_admin\src\app" -Include "*.ts" -Recurse

Write-Host "`nĐang xử lý Admin files..." -ForegroundColor Yellow
$adminCount = 0

foreach ($file in $adminFiles) {
    $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
    
    if ($content -and $content -match "http://localhost:3000") {
        Write-Host "  Fixing: $($file.Name)" -ForegroundColor Cyan
        
        # Thêm import nếu chưa có
        if ($content -notmatch "import.*environment") {
            # Tính số cấp thư mục để import đúng
            $relativePath = $file.FullName -replace [regex]::Escape((Get-Location).Path + "\my_admin\src\app\"), ""
            $depth = ($relativePath -split "\\").Count - 1
            $importPath = "../" * $depth + "../../environments/environment"
            
            $content = $content -replace "(import .+ from [^;]+;)", "`$1`nimport { environment } from '$importPath';"
        }
        
        # Replace URLs
        $content = $content -replace "'http://localhost:3000/api", "'`${environment.apiUrl}/api"
        $content = $content -replace "`"http://localhost:3000/api", "`"`${environment.apiUrl}/api"
        $content = $content -replace "'http://localhost:3000'", "environment.apiUrl"
        $content = $content -replace "`"http://localhost:3000`"", "environment.apiUrl"
        
        Set-Content -Path $file.FullName -Value $content -NoNewline
        $adminCount++
    }
}

Write-Host "`n=== HOÀN TẤT ===" -ForegroundColor Green
Write-Host "✅ Đã update $clientCount file trong Client" -ForegroundColor Green
Write-Host "✅ Đã update $adminCount file trong Admin" -ForegroundColor Green
Write-Host "`nBây giờ bạn có thể deploy lên internet!" -ForegroundColor Cyan


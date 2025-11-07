# Script tự động cập nhật API URLs trong tất cả các file

Write-Host "=== CẬP NHẬT API URLs TRONG CLIENT ===" -ForegroundColor Green

# Danh sách các file cần update trong client
$clientFiles = @(
    "my_client\src\app\services\category.service.ts",
    "my_client\src\app\services\cart.service.ts",
    "my_client\src\app\services\image-search.service.ts",
    "my_client\src\app\blog-detail\blog-detail.ts",
    "my_client\src\app\homepage\homepage.ts",
    "my_client\src\app\listblog\listblog.ts",
    "my_client\src\app\listproduct\listproduct.ts",
    "my_client\src\app\product-detail\product-detail.ts",
    "my_client\src\app\pharmacist-chat\pharmacist-chat.ts",
    "my_client\src\app\core\services\notification-api.service.ts"
)

foreach ($file in $clientFiles) {
    if (Test-Path $file) {
        Write-Host "Updating: $file" -ForegroundColor Yellow
        
        # Đọc nội dung file
        $content = Get-Content $file -Raw
        
        # Kiểm tra xem đã có import environment chưa
        if ($content -notmatch "import.*environment") {
            # Thêm import statement sau các import khác
            $content = $content -replace "(import.*?;`n)((?!import))", "`$1import { environment } from '../../environments/environment';`n`$2"
        }
        
        # Thay thế URL cứng bằng environment variable
        $content = $content -replace "private apiUrl = 'http://localhost:3000/api'", "private apiUrl = `"`${environment.apiUrl}/api`""
        $content = $content -replace "private apiUrl = 'http://localhost:3000'", "private apiUrl = environment.apiUrl"
        $content = $content -replace "const API_BASE_URL = 'http://localhost:3000'", "import { environment } from '../../environments/environment';`nconst API_BASE_URL = environment.apiUrl"
        $content = $content -replace "'http://localhost:3000/api", "`"`${environment.apiUrl}/api"
        $content = $content -replace "'http://localhost:3000/", "`"`${environment.apiUrl}/"
        $content = $content -replace "http://localhost:3000", "environment.apiUrl"
        
        # Ghi lại file
        $content | Set-Content $file -NoNewline
        
        Write-Host "✓ Updated: $file" -ForegroundColor Green
    } else {
        Write-Host "✗ File not found: $file" -ForegroundColor Red
    }
}

Write-Host "`n=== CẬP NHẬT API URLs TRONG ADMIN ===" -ForegroundColor Green

# Danh sách các file cần update trong admin
$adminFiles = @(
    "my_admin\src\app\core\services\admin-api.service.ts",
    "my_admin\src\app\core\services\admin-auth.service.ts",
    "my_admin\src\app\core\services\notification-api.service.ts"
)

foreach ($file in $adminFiles) {
    if (Test-Path $file) {
        Write-Host "Updating: $file" -ForegroundColor Yellow
        
        # Đọc nội dung file
        $content = Get-Content $file -Raw
        
        # Kiểm tra xem đã có import environment chưa
        if ($content -notmatch "import.*environment") {
            # Thêm import statement
            $content = $content -replace "(import.*?;`n)((?!import))", "`$1import { environment } from '../../../environments/environment';`n`$2"
        }
        
        # Thay thế URL cứng
        $content = $content -replace "private readonly baseUrl = 'http://localhost:3000/api/admin'", "private readonly baseUrl = `"`${environment.apiUrl}/api/admin`""
        $content = $content -replace "private readonly baseUrl = 'http://localhost:3000/api'", "private readonly baseUrl = `"`${environment.apiUrl}/api`""
        $content = $content -replace "'http://localhost:3000/api", "`"`${environment.apiUrl}/api"
        $content = $content -replace "'http://localhost:3000", "environment.apiUrl"
        $content = $content -replace "http://localhost:3000", "environment.apiUrl"
        
        # Ghi lại file
        $content | Set-Content $file -NoNewline
        
        Write-Host "✓ Updated: $file" -ForegroundColor Green
    } else {
        Write-Host "✗ File not found: $file" -ForegroundColor Red
    }
}

Write-Host "`n✅ HOÀN TẤT! Tất cả các file đã được cập nhật." -ForegroundColor Green
Write-Host "Bây giờ bạn có thể deploy lên internet." -ForegroundColor Cyan


# Script đơn giản để fix API URLs

Write-Host "Updating API URLs..." -ForegroundColor Green

# List files cần update
$files = @(
    "my_client\src\app\services\category.service.ts",
    "my_client\src\app\services\cart.service.ts",
    "my_client\src\app\services\image-search.service.ts",
    "my_client\src\app\core\services\notification-api.service.ts",
    "my_admin\src\app\core\services\admin-api.service.ts",
    "my_admin\src\app\core\services\admin-auth.service.ts",
    "my_admin\src\app\core\services\notification-api.service.ts"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "Processing: $file"
        $content = Get-Content $file -Raw
        $content = $content -replace "http://localhost:3000", '${environment.apiUrl}'
        Set-Content $file $content -NoNewline
    }
}

Write-Host "Done!" -ForegroundColor Green


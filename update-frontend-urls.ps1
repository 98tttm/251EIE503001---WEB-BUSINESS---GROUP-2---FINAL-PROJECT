# Script update API URLs cho frontend
# Sử dụng: .\update-frontend-urls.ps1 "https://your-railway-url.up.railway.app"

param(
    [Parameter(Mandatory=$true)]
    [string]$BackendUrl
)

Write-Host "=== UPDATE FRONTEND API URLs ===" -ForegroundColor Green
Write-Host "Backend URL: $BackendUrl" -ForegroundColor Cyan

# Validate URL
if ($BackendUrl -notmatch '^https?://') {
    Write-Host "❌ ERROR: URL phải bắt đầu với http:// hoặc https://" -ForegroundColor Red
    exit 1
}

# Remove trailing slash
$BackendUrl = $BackendUrl.TrimEnd('/')

Write-Host "`n1. Updating Client environment..." -ForegroundColor Yellow

# Update Client environment.prod.ts
$clientEnvFile = "my_client\src\environments\environment.prod.ts"
$clientContent = @"
// Environment cho production (deploy lên internet)
export const environment = {
  production: true,
  apiUrl: '$BackendUrl'
};
"@

Set-Content -Path $clientEnvFile -Value $clientContent
Write-Host "✅ Updated: $clientEnvFile" -ForegroundColor Green

Write-Host "`n2. Updating Admin environment..." -ForegroundColor Yellow

# Update Admin environment.prod.ts
$adminEnvFile = "my_admin\src\environments\environment.prod.ts"
$adminContent = @"
// Environment cho production (deploy lên internet)
export const environment = {
  production: true,
  apiUrl: '$BackendUrl'
};
"@

Set-Content -Path $adminEnvFile -Value $adminContent
Write-Host "✅ Updated: $adminEnvFile" -ForegroundColor Green

Write-Host "`n3. Verifying changes..." -ForegroundColor Yellow
Write-Host "`nClient environment.prod.ts:" -ForegroundColor Cyan
Get-Content $clientEnvFile | Write-Host

Write-Host "`nAdmin environment.prod.ts:" -ForegroundColor Cyan
Get-Content $adminEnvFile | Write-Host

Write-Host "`n=== DONE! ===" -ForegroundColor Green
Write-Host "Bây giờ chạy:" -ForegroundColor Yellow
Write-Host "  git add my_client/src/environments my_admin/src/environments" -ForegroundColor White
Write-Host "  git commit -m 'Update production API URLs'" -ForegroundColor White
Write-Host "  git push" -ForegroundColor White


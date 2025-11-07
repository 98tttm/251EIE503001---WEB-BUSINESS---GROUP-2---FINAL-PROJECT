# Script deploy tự động cho MediCare trên Windows
# Sử dụng: .\deploy.ps1 [client|admin|backend|all]

param(
    [Parameter(Position=0)]
    [ValidateSet("client", "admin", "backend", "all")]
    [string]$Component = "all"
)

$ErrorActionPreference = "Stop"

$ProjectDir = "C:\www\medicare"
$BackendDir = "$ProjectDir\backend"
$ClientDir = "$ProjectDir\my_client"
$AdminDir = "$ProjectDir\my_admin"
$ClientWebDir = "$ProjectDir\client"
$AdminWebDir = "$ProjectDir\admin"

function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Green
}

function Write-Warn {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Deploy-Backend {
    Write-Info "Deploying Backend..."
    
    Push-Location $BackendDir
    
    try {
        Write-Info "Installing dependencies..."
        npm install --production
        
        Write-Info "Creating logs directory..."
        New-Item -ItemType Directory -Path "logs" -Force | Out-Null
        
        Write-Info "Restarting PM2..."
        $pm2Status = pm2 list | Select-String "medicare-backend"
        if ($pm2Status) {
            pm2 restart medicare-backend
        } else {
            pm2 start ecosystem.config.js
        }
        
        Write-Info "Backend deployed successfully!"
    } finally {
        Pop-Location
    }
}

function Deploy-Client {
    Write-Info "Deploying Client Frontend..."
    
    Push-Location $ClientDir
    
    try {
        Write-Info "Installing dependencies..."
        npm install
        
        Write-Info "Building production..."
        npm run build
        
        Write-Info "Copying files to web directory..."
        if (Test-Path $ClientWebDir) {
            Remove-Item -Path $ClientWebDir\* -Recurse -Force
        } else {
            New-Item -ItemType Directory -Path $ClientWebDir -Force | Out-Null
        }
        
        Copy-Item -Path "dist\my_client\browser\*" -Destination $ClientWebDir -Recurse -Force
        
        Write-Info "Client deployed successfully!"
    } finally {
        Pop-Location
    }
}

function Deploy-Admin {
    Write-Info "Deploying Admin Frontend..."
    
    Push-Location $AdminDir
    
    try {
        Write-Info "Installing dependencies..."
        npm install
        
        Write-Info "Building production..."
        npm run build
        
        Write-Info "Copying files to web directory..."
        if (Test-Path $AdminWebDir) {
            Remove-Item -Path $AdminWebDir\* -Recurse -Force
        } else {
            New-Item -ItemType Directory -Path $AdminWebDir -Force | Out-Null
        }
        
        Copy-Item -Path "dist\my_admin\browser\*" -Destination $AdminWebDir -Recurse -Force
        
        Write-Info "Admin deployed successfully!"
    } finally {
        Pop-Location
    }
}

function Deploy-All {
    Write-Info "Deploying all components..."
    Deploy-Backend
    Deploy-Client
    Deploy-Admin
    Write-Info "All components deployed successfully!"
}

# Main
switch ($Component) {
    "backend" {
        Deploy-Backend
    }
    "client" {
        Deploy-Client
    }
    "admin" {
        Deploy-Admin
    }
    "all" {
        Deploy-All
    }
}

Write-Info "Deployment completed!"


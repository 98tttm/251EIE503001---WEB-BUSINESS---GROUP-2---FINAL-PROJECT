# 📤 HƯỚNG DẪN PUSH CODE LÊN GITHUB AN TOÀN

Hướng dẫn chi tiết để push code lên GitHub một cách an toàn, không mất source code.

**Repository:** https://github.com/98tttm/251EIE503001---WEB-BUSINESS---GROUP-2---FINAL-PROJECT.git

---

## 🛡️ NGUYÊN TẮC AN TOÀN

1. **Luôn backup trước khi push**
2. **Commit từng phần nhỏ, không commit tất cả cùng lúc**
3. **Test code trước khi push**
4. **Pull trước khi push để tránh conflict**
5. **Không force push lên main/master branch**

---

## 📋 CHUẨN BỊ

### 1. Kiểm tra Git đã cài đặt chưa:

```bash
git --version
```

Nếu chưa có, tải từ: https://git-scm.com/download/win

### 2. Cấu hình Git (lần đầu):

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

---

## 🔄 QUY TRÌNH PUSH AN TOÀN (TỪNG BƯỚC)

### BƯỚC 1: BACKUP CODE TRƯỚC KHI PUSH

**⚠️ QUAN TRỌNG: Luôn backup trước khi push!**

#### Cách 1: Copy thư mục (Đơn giản nhất)

```powershell
# Trên Windows PowerShell
$BackupDir = "D:\MEDICARE_BACKUP_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
Copy-Item -Path "D:\MEDICARE\MEDICARE_FINAL" -Destination $BackupDir -Recurse
Write-Host "Backup created at: $BackupDir" -ForegroundColor Green
```

#### Cách 2: Sử dụng script backup tự động

Chạy script `scripts/backup-before-push.ps1` (sẽ tạo ở dưới)

### BƯỚC 2: KIỂM TRA TRẠNG THÁI GIT

```bash
cd D:\MEDICARE\MEDICARE_FINAL
git status
```

Kiểm tra:
- Files nào đã thay đổi?
- Files nào chưa được track?
- Có commit nào chưa push không?

### BƯỚC 3: KHỞI TẠO GIT REPO (NẾU CHƯA CÓ)

```bash
cd D:\MEDICARE\MEDICARE_FINAL

# Kiểm tra xem đã có .git chưa
if (Test-Path .git) {
    Write-Host "Git repository already initialized" -ForegroundColor Green
} else {
    # Khởi tạo git repo
    git init
    
    # Tạo file .gitignore nếu chưa có
    if (-not (Test-Path .gitignore)) {
        # Tạo .gitignore (xem nội dung bên dưới)
    }
}
```

### BƯỚC 4: TẠO/KIỂM TRA FILE .GITIGNORE

Tạo file `.gitignore` để không commit các file không cần thiết:

```gitignore
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build outputs
dist/
build/
*.log

# Environment variables
.env
.env.local
.env.production

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db
desktop.ini

# Backend specific
backend/logs/
backend/public/uploads/*
!backend/public/uploads/.gitkeep

# Frontend specific
my_client/dist/
my_admin/dist/

# Temporary files
*.tmp
*.temp
.cache/

# Database
*.db
*.sqlite

# Backup files
*.backup
*_backup/
backup_*/
```

### BƯỚC 5: ADD REMOTE (NẾU CHƯA CÓ)

```bash
# Kiểm tra remote hiện tại
git remote -v

# Nếu chưa có remote, thêm remote
git remote add origin https://github.com/98tttm/251EIE503001---WEB-BUSINESS---GROUP-2---FINAL-PROJECT.git

# Hoặc nếu đã có nhưng sai URL, cập nhật
git remote set-url origin https://github.com/98tttm/251EIE503001---WEB-BUSINESS---GROUP-2---FINAL-PROJECT.git
```

### BƯỚC 6: PULL TRƯỚC KHI PUSH (QUAN TRỌNG!)

```bash
# Fetch changes từ remote
git fetch origin

# Kiểm tra xem có thay đổi trên remote không
git log HEAD..origin/main --oneline

# Pull changes (nếu có)
git pull origin main --no-rebase

# Nếu có conflict, xử lý conflict trước khi tiếp tục
```

### BƯỚC 7: ADD VÀ COMMIT CODE

#### Cách an toàn: Commit từng phần

```bash
# Xem các file đã thay đổi
git status

# Add từng file hoặc từng thư mục
git add backend/server.js
git add my_client/src/app/homepage/
git add DEPLOYMENT_GUIDE.md

# Commit với message rõ ràng
git commit -m "feat: update deployment guide for Windows"

# Hoặc add tất cả (cẩn thận!)
git add .
git commit -m "chore: update project files"
```

#### Commit message tốt:

```
feat: thêm tính năng mới
fix: sửa lỗi
docs: cập nhật tài liệu
style: format code
refactor: refactor code
test: thêm test
chore: cập nhật config, dependencies
```

### BƯỚC 8: PUSH CODE LÊN GITHUB

```bash
# Push lên branch main
git push origin main

# Hoặc nếu branch hiện tại khác
git push origin HEAD:main

# Nếu lần đầu push, set upstream
git push -u origin main
```

### BƯỚC 9: KIỂM TRA KẾT QUẢ

```bash
# Kiểm tra log
git log --oneline -5

# Kiểm tra remote
git remote -v

# Kiểm tra branch
git branch -a
```

---

## 🚨 XỬ LÝ TÌNH HUỐNG

### 1. CONFLICT KHI PULL

```bash
# Khi pull bị conflict
git pull origin main

# Git sẽ báo conflict, mở file conflict
# Tìm các dòng:
# <<<<<<< HEAD
# ... code của bạn ...
# =======
# ... code từ remote ...
# >>>>>>> origin/main

# Sửa conflict, sau đó:
git add .
git commit -m "fix: resolve merge conflict"
git push origin main
```

### 2. PUSH BỊ TỪ CHỐI (REJECTED)

```bash
# Nếu push bị reject, có thể remote đã có commit mới
# Pull lại trước
git pull origin main --rebase

# Hoặc merge
git pull origin main

# Sau đó push lại
git push origin main
```

### 3. QUÊN COMMIT FILE QUAN TRỌNG

```bash
# Thêm file vào commit trước đó
git add forgotten-file.js
git commit --amend --no-edit

# Nếu đã push, cần force push (CẨN THẬN!)
git push origin main --force-with-lease
```

### 4. HOÀN TÁC COMMIT CHƯA PUSH

```bash
# Hoàn tác commit cuối cùng (giữ thay đổi)
git reset --soft HEAD~1

# Hoặc hoàn tác và xóa thay đổi (CẨN THẬN!)
git reset --hard HEAD~1
```

### 5. HOÀN TÁC COMMIT ĐÃ PUSH (CẨN THẬN!)

```bash
# Tạo commit mới để hoàn tác
git revert HEAD
git push origin main

# Hoặc reset về commit cũ (CHỈ KHI CHẮC CHẮN!)
git reset --hard <commit-hash>
git push origin main --force-with-lease
```

---

## 📝 SCRIPT TỰ ĐỘNG

### Script backup trước khi push (PowerShell)

Tạo file `scripts/backup-before-push.ps1`:

```powershell
# Script backup trước khi push code
$ProjectDir = "D:\MEDICARE\MEDICARE_FINAL"
$BackupBaseDir = "D:\MEDICARE_BACKUPS"
$Date = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupDir = "$BackupBaseDir\MEDICARE_BACKUP_$Date"

Write-Host "Creating backup..." -ForegroundColor Yellow

# Tạo thư mục backup
New-Item -ItemType Directory -Path $BackupBaseDir -Force | Out-Null
New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null

# Copy project
Write-Host "Copying files..." -ForegroundColor Yellow
Copy-Item -Path $ProjectDir -Destination $BackupDir -Recurse -Exclude @("node_modules", ".git", "dist", "*.log")

Write-Host "Backup created at: $BackupDir" -ForegroundColor Green
Write-Host "You can now safely push to GitHub" -ForegroundColor Green
```

### Script push an toàn (PowerShell)

Tạo file `scripts/safe-push.ps1`:

```powershell
# Script push code an toàn
param(
    [Parameter(Mandatory=$false)]
    [string]$Message = "chore: update code"
)

$ProjectDir = "D:\MEDICARE\MEDICARE_FINAL"
$RemoteUrl = "https://github.com/98tttm/251EIE503001---WEB-BUSINESS---GROUP-2---FINAL-PROJECT.git"

Push-Location $ProjectDir

try {
    Write-Host "=== SAFE PUSH TO GITHUB ===" -ForegroundColor Cyan
    
    # Bước 1: Backup
    Write-Host "`n[1/6] Creating backup..." -ForegroundColor Yellow
    & "$PSScriptRoot\backup-before-push.ps1"
    
    # Bước 2: Kiểm tra git status
    Write-Host "`n[2/6] Checking git status..." -ForegroundColor Yellow
    git status
    
    # Bước 3: Kiểm tra remote
    Write-Host "`n[3/6] Checking remote..." -ForegroundColor Yellow
    $remotes = git remote -v
    if (-not $remotes) {
        Write-Host "Adding remote..." -ForegroundColor Yellow
        git remote add origin $RemoteUrl
    } else {
        git remote set-url origin $RemoteUrl
    }
    
    # Bước 4: Pull trước
    Write-Host "`n[4/6] Pulling latest changes..." -ForegroundColor Yellow
    git fetch origin
    $currentBranch = git branch --show-current
    if ($currentBranch -eq "") {
        git checkout -b main
    }
    git pull origin main --no-rebase
    
    # Bước 5: Add và commit
    Write-Host "`n[5/6] Adding and committing changes..." -ForegroundColor Yellow
    git add .
    git commit -m $Message
    
    # Bước 6: Push
    Write-Host "`n[6/6] Pushing to GitHub..." -ForegroundColor Yellow
    git push origin main
    
    Write-Host "`n✅ Push completed successfully!" -ForegroundColor Green
} catch {
    Write-Host "`n❌ Error occurred: $_" -ForegroundColor Red
    Write-Host "Check the backup if you need to restore" -ForegroundColor Yellow
} finally {
    Pop-Location
}
```

---

## ✅ CHECKLIST TRƯỚC KHI PUSH

- [ ] Đã backup code
- [ ] Đã test code hoạt động
- [ ] Đã kiểm tra `.gitignore` (không commit file nhạy cảm)
- [ ] Đã pull latest changes từ remote
- [ ] Đã resolve conflicts (nếu có)
- [ ] Commit message rõ ràng
- [ ] Chỉ commit code cần thiết
- [ ] Không commit file `.env` hoặc secrets
- [ ] Không commit `node_modules` hoặc `dist`

---

## 🔐 BẢO MẬT

### KHÔNG BAO GIỜ COMMIT:

- File `.env` chứa secrets
- API keys, passwords
- Private keys
- Database credentials
- Personal information

### Nếu đã commit nhầm:

```bash
# Xóa file khỏi git history (CẨN THẬN!)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all

# Force push (CHỈ KHI CHẮC CHẮN!)
git push origin --force --all
```

---

## 📚 LỆNH GIT HỮU ÍCH

```bash
# Xem lịch sử commit
git log --oneline --graph --all

# Xem thay đổi
git diff

# Xem file đã thay đổi
git status

# Xem remote
git remote -v

# Xem branch
git branch -a

# Tạo branch mới
git checkout -b feature/new-feature

# Chuyển branch
git checkout main

# Merge branch
git merge feature/new-feature

# Xóa branch
git branch -d feature/new-feature
```

---

## 🆘 KHÔI PHỤC NẾU BỊ MẤT CODE

### Nếu chưa push:

```bash
# Xem các commit
git reflog

# Khôi phục về commit cũ
git reset --hard <commit-hash>
```

### Nếu đã push nhưng muốn khôi phục:

```bash
# Tạo branch backup
git branch backup-before-revert

# Revert về commit cũ
git revert <commit-hash>
git push origin main
```

### Nếu mất code hoàn toàn:

1. Kiểm tra backup đã tạo
2. Clone lại từ GitHub: `git clone <repo-url>`
3. Khôi phục từ backup

---

## 📞 HỖ TRỢ

Nếu gặp vấn đề:

1. Kiểm tra backup
2. Xem git log: `git log --oneline`
3. Kiểm tra remote: `git remote -v`
4. Xem status: `git status`

---

**Chúc bạn push code thành công và an toàn! 🎉**


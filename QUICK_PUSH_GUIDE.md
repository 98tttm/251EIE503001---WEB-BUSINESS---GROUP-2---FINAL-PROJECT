# ⚡ QUICK PUSH GUIDE - GITHUB

Hướng dẫn push code nhanh lên GitHub.

**Repository:** https://github.com/98tttm/251EIE503001---WEB-BUSINESS---GROUP-2---FINAL-PROJECT.git

---

## 🚀 CÁCH NHANH NHẤT (SỬ DỤNG SCRIPT)

### Bước 1: Chạy script backup và push tự động

```powershell
# Mở PowerShell trong thư mục project
cd D:\MEDICARE\MEDICARE_FINAL

# Chạy script push an toàn
.\scripts\safe-push.ps1 -Message "feat: update deployment guides"
```

Script sẽ tự động:
1. ✅ Backup code
2. ✅ Kiểm tra git repo
3. ✅ Pull latest changes
4. ✅ Add và commit
5. ✅ Push lên GitHub

---

## 📝 CÁCH THỦ CÔNG (TỪNG BƯỚC)

### Bước 1: Backup

```powershell
.\scripts\backup-before-push.ps1
```

### Bước 2: Vào thư mục project

```powershell
cd D:\MEDICARE\MEDICARE_FINAL
```

### Bước 3: Kiểm tra status

```powershell
git status
```

### Bước 4: Khởi tạo git (nếu chưa có)

```powershell
git init
git remote add origin https://github.com/98tttm/251EIE503001---WEB-BUSINESS---GROUP-2---FINAL-PROJECT.git
```

### Bước 5: Pull trước

```powershell
git pull origin main --allow-unrelated-histories
```

### Bước 6: Add và commit

```powershell
git add .
git commit -m "feat: update code"
```

### Bước 7: Push

```powershell
git push origin main
```

---

## ⚠️ LƯU Ý QUAN TRỌNG

1. **Luôn backup trước khi push**
2. **Không commit file `.env` hoặc secrets**
3. **Pull trước khi push để tránh conflict**
4. **Commit message rõ ràng**

---

## 🆘 NẾU GẶP LỖI

### Lỗi: "remote origin already exists"

```powershell
git remote set-url origin https://github.com/98tttm/251EIE503001---WEB-BUSINESS---GROUP-2---FINAL-PROJECT.git
```

### Lỗi: "failed to push some refs"

```powershell
git pull origin main --rebase
git push origin main
```

### Lỗi: "authentication failed"

Cần cấu hình GitHub credentials hoặc sử dụng Personal Access Token.

---

Xem file `GITHUB_PUSH_GUIDE.md` để biết chi tiết đầy đủ!


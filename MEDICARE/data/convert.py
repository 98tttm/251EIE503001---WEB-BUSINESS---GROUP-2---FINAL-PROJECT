# Script để loại bỏ BOM khỏi file JSON
import json

# Đọc file với encoding 'utf-8-sig' để tự động xử lý BOM
with open('longchau_products.json', 'r', encoding='utf-8-sig') as f:
    data = json.load(f)

# Ghi lại file với encoding 'utf-8' chuẩn
with open('longchau_products_fixed.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Đã tạo file 'longchau_products_fixed.json' thành công!")
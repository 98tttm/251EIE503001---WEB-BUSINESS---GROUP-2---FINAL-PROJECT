# Long Châu Article Scraper

Script để cào dữ liệu bài viết từ Góc Sức Khỏe của Nhà Thuốc Long Châu.

## Yeu cau

- Node.js >= 16
- npm hoac yarn
- MongoDB (neu muon import vao database)

## Cai dat

```bash
cd backend/scraper
npm install
```

## Co 2 phuong phap cao du lieu

### Phương pháp 1: Puppeteer (chậm hơn nhưng đầy đủ hơn)
- Sử dụng headless browser
- Cào được nội dung được render bằng JavaScript
- Chậm hơn nhưng chính xác hơn

### Phương pháp 2: Axios + Cheerio (nhanh hơn)
- Chỉ parse HTML tĩnh
- Nhanh hơn nhiều
- Có thể miss một số nội dung được load bằng JS

## Su dung

### Phương pháp 1: Puppeteer (Khuyên dùng)

```bash
# Cào 50 bài viết (mặc định)
npm run scrape

# Cào 20 bài viết (nhỏ, test)
npm run scrape:small

# Cào 100 bài viết (trung bình)
npm run scrape:medium

# Cào 500 bài viết (lớn)
npm run scrape:large

# Tùy chỉnh số lượng
node scrape-longchau-articles.js 200
```

**Output:** `backend/data/longchau-articles.json`

### Phương pháp 2: Axios + Cheerio (Nhanh hơn)

```bash
# Cào 50 bài viết
npm run scrape:simple

# Cào 20 bài viết
npm run scrape:simple:small

# Cào 100 bài viết
npm run scrape:simple:medium

# Tùy chỉnh số lượng
node scrape-simple.js 200
```

**Output:** `backend/data/longchau-articles-simple.json`

### Import vào MongoDB

Sau khi cào xong, import vào database:

```bash
npm run import
```

Script sẽ tự động tìm file JSON mới nhất và import vào MongoDB.

## Du lieu duoc cao

Script sẽ cào các thông tin sau từ mỗi bài viết:

### Thông tin cơ bản
- `url`: Đường dẫn bài viết
- `slug`: Slug của bài viết (từ URL)
- `title`: Tiêu đề bài viết
- `category`: Danh mục bài viết
- `author`: Tác giả
- `publishDate`: Ngày xuất bản

### Nội dung
- `summary`: Tóm tắt bài viết
- `content`: Nội dung đầy đủ (HTML)
- `metaDescription`: Meta description
- `metaKeywords`: Meta keywords

### Media
- `images[]`: Danh sách ảnh trong bài viết
  - `src`: Đường dẫn ảnh
  - `alt`: Alt text
  - `caption`: Caption/title
  - `width`: Chiều rộng
  - `height`: Chiều cao
  - `isFeatured`: Ảnh đại diện (true/false)

### Phân loại
- `tags[]`: Danh sách tags
- `hashtags[]`: Danh sách hashtags
- `relatedArticles[]`: Bài viết liên quan
  - `title`: Tiêu đề
  - `url`: Đường dẫn
  - `thumbnail`: Ảnh thumbnail

### Metadata
- `scrapedAt`: Thời gian cào dữ liệu

## Output

Dữ liệu sẽ được lưu vào:
- `backend/data/longchau-articles.json` - Toàn bộ dữ liệu
- `backend/data/scraper-summary.json` - Thống kê tóm tắt

## Cau truc file JSON

```json
{
  "metadata": {
    "source": "Long Chau Health Corner",
    "url": "https://nhathuoclongchau.com.vn/bai-viet",
    "scrapedAt": "2025-10-31T...",
    "totalArticles": 50,
    "totalCategories": 8
  },
  "categories": [
    {
      "id": "cat-1",
      "name": "Dinh dưỡng",
      "slug": "dinh-duong",
      "url": "..."
    }
  ],
  "articles": [
    {
      "url": "https://...",
      "slug": "...",
      "title": "...",
      "category": "...",
      "author": "...",
      "publishDate": "...",
      "summary": "...",
      "content": "...",
      "images": [...],
      "tags": [...],
      "hashtags": [...],
      "relatedArticles": [...],
      "metaDescription": "...",
      "metaKeywords": "...",
      "scrapedAt": "..."
    }
  ]
}
```

## Luu y

1. **Rate Limiting**: Script có delay 2-3 giây giữa mỗi request để tránh bị block
2. **Timeout**: Mỗi trang có timeout 60 giây
3. **Headless Mode**: Chạy ở chế độ headless để tăng tốc
4. **Error Handling**: Script sẽ tiếp tục khi gặp lỗi ở một bài viết
5. **Memory**: Cào nhiều bài viết có thể tốn nhiều RAM

## Troubleshooting

### Lỗi "Cannot find module 'puppeteer'"
```bash
npm install
```

### Lỗi timeout
- Tăng timeout trong code hoặc giảm số lượng bài viết
- Kiểm tra kết nối internet

### Script bị treo
- Giảm số lượng bài viết
- Tăng delay giữa các request

## Performance

- **20 bài viết**: ~2-3 phút
- **50 bài viết**: ~5-8 phút  
- **100 bài viết**: ~10-15 phút
- **500 bài viết**: ~50-90 phút

## Next Steps

Sau khi có dữ liệu, bạn có thể:
1. Import vào MongoDB
2. Tạo API endpoints để serve dữ liệu
3. Hiển thị trong phần "Góc sức khỏe" trên homepage


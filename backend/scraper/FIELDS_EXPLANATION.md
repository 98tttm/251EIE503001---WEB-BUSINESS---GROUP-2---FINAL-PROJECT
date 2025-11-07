# 📝 GIẢI THÍCH CÁC TRƯỜNG DỮ LIỆU

Tài liệu này giải thích chi tiết từng trường dữ liệu được cào và cách sử dụng.

---

## 🔑 Trường bắt buộc (Required)

### `url` (String)
- **Mô tả**: Đường dẫn đầy đủ của bài viết
- **Ví dụ**: `"https://nhathuoclongchau.com.vn/bai-viet/hop-tac-lich-su"`
- **Sử dụng**: Link đến bài viết gốc, unique identifier

### `slug` (String)
- **Mô tả**: URL-friendly identifier của bài viết
- **Ví dụ**: `"hop-tac-lich-su"`
- **Sử dụng**: Tạo URL cho website, làm ID trong database

### `title` (String)
- **Mô tả**: Tiêu đề bài viết
- **Ví dụ**: `"Hợp tác Lịch sử: Bộ Y tế, Long Châu, Bayer 'bắt tay'"`
- **Sử dụng**: Hiển thị tiêu đề, SEO title

---

## 📂 Phân loại (Classification)

### `category` (String)
- **Mô tả**: Danh mục bài viết
- **Ví dụ**: `"Truyền thông"`, `"Dinh dưỡng"`, `"Sức khỏe"`
- **Sử dụng**: Filter, group bài viết theo chủ đề

### `tags` (Array of Strings)
- **Mô tả**: Danh sách tags liên quan
- **Ví dụ**: `["Sức khỏe", "Hợp tác", "Bộ Y tế"]`
- **Sử dụng**: Search, filter, related articles

### `hashtags` (Array of Strings)
- **Mô tả**: Danh sách hashtags
- **Ví dụ**: `["#suckhoe", "#longchau", "#bayer"]`
- **Sử dụng**: Social media, trending topics

---

## ✍️ Nội dung (Content)

### `summary` (String)
- **Mô tả**: Tóm tắt ngắn gọn (1-2 đoạn)
- **Độ dài**: Thường 100-300 ký tự
- **Sử dụng**: Preview, excerpt trong listing

### `content` (String - HTML)
- **Mô tả**: Nội dung đầy đủ dạng HTML
- **Bao gồm**: 
  - Đoạn văn `<p>`
  - Tiêu đề phụ `<h2>`, `<h3>`
  - Danh sách `<ul>`, `<ol>`
  - Ảnh `<img>`
  - Bảng `<table>` (nếu có)
- **Sử dụng**: Hiển thị nội dung bài viết với format

### `contentText` (String - Plain Text)
- **Mô tả**: Nội dung thuần không HTML
- **Sử dụng**: Full-text search, preview, SEO

---

## 🖼️ Ảnh (Images)

### `images` (Array of Objects)

Mỗi image object chứa:

```javascript
{
  src: "https://cdn.nhathuoclongchau.com.vn/.../image.jpg",
  alt: "Mô tả ảnh",
  caption: "Caption/title của ảnh",
  title: "Title attribute",
  width: 1200,
  height: 800,
  isFeatured: true  // Chỉ ảnh đầu tiên = true
}
```

**Thứ tự ảnh:**
1. Ảnh đầu tiên (`isFeatured: true`): Ảnh đại diện/thumbnail
2. Các ảnh còn lại: Ảnh trong nội dung bài viết

**Sử dụng:**
- `images[0]`: Thumbnail cho card bài viết
- `images`: Gallery trong trang chi tiết

---

## 👤 Tác giả & Ngày tháng

### `author` (String)
- **Mô tả**: Tên tác giả hoặc người đăng
- **Ví dụ**: `"Dược sĩ Nguyễn Văn A"`, `"Long Châu"`, `"Biên tập viên"`
- **Sử dụng**: Hiển thị byline, filter theo author

### `publishDate` (String)
- **Mô tả**: Ngày xuất bản
- **Format**: Có thể là `"DD/MM/YYYY"` hoặc ISO `"2025-10-31T..."`
- **Sử dụng**: Sắp xếp bài viết, hiển thị ngày đăng

---

## 🔗 Liên kết (Links)

### `relatedArticles` (Array of Objects)

```javascript
{
  relatedArticles: [
    {
      title: "Tiêu đề bài viết liên quan",
      url: "https://nhathuoclongchau.com.vn/bai-viet/...",
      thumbnail: "https://cdn.nhathuoclongchau.com.vn/.../thumb.jpg"
    }
  ]
}
```

**Sử dụng:** Hiển thị "Bài viết liên quan" ở cuối bài

---

## 🎯 SEO & Social Media

### `metaDescription` (String)
- **Mô tả**: Meta description tag
- **Độ dài**: 150-160 ký tự
- **Sử dụng**: SEO, hiển thị trên Google search results

### `metaKeywords` (String)
- **Mô tả**: Meta keywords (CSV)
- **Ví dụ**: `"sức khỏe, dinh dưỡng, vitamin, long châu"`
- **Sử dụng**: SEO (ít quan trọng hơn hiện nay)

### `ogTitle` (String - Open Graph)
- **Mô tả**: Tiêu đề khi share lên Facebook/social
- **Thường giống**: `title`
- **Sử dụng**: Social media sharing

### `ogDescription` (String - Open Graph)
- **Mô tả**: Mô tả khi share lên social
- **Sử dụng**: Social media sharing preview

### `ogImage` (String - Open Graph)
- **Mô tả**: Ảnh khi share lên social
- **Thường giống**: `images[0].src`
- **Sử dụng**: Social media thumbnail

---

## 📅 Timestamps

### `scrapedAt` (ISO String)
- **Mô tả**: Thời điểm cào dữ liệu
- **Format**: `"2025-10-31T12:34:56.789Z"`
- **Sử dụng**: Track version, biết data có cũ không

### `createdAt` (ISO String)
- **Mô tả**: Thời điểm tạo record trong DB
- **Sử dụng**: Audit trail

### `updatedAt` (ISO String)
- **Mô tả**: Thời điểm cập nhật cuối
- **Sử dụng**: Track changes

---

## 📊 Statistics (Khi import vào DB)

### `views` (Number)
- **Mô tả**: Số lượt xem
- **Default**: 0
- **Sử dụng**: Thống kê, trending articles

### `likes` (Number)
- **Mô tả**: Số lượt thích
- **Default**: 0
- **Sử dụng**: Popular articles, sorting

### `status` (String: "draft" | "published")
- **Mô tả**: Trạng thái bài viết
- **Default**: "published"
- **Sử dụng**: Content management

---

## 🎯 Use Cases

### Display article list
```javascript
const article = data.articles[0];
// Show: title, summary, images[0], category, publishDate
```

### Display article detail
```javascript
// Show: title, author, publishDate, content, images, tags
// Related: relatedArticles
```

### SEO
```javascript
<title>{article.ogTitle || article.title}</title>
<meta name="description" content="{article.metaDescription}" />
<meta property="og:image" content="{article.ogImage}" />
```

### Search
```javascript
// Search in: title, contentText, tags, hashtags, summary
```

---

## ⚠️ Lưu ý

1. **Null values**: Một số trường có thể null nếu không tìm thấy
2. **Empty arrays**: `tags`, `hashtags`, `relatedArticles` có thể rỗng
3. **Image quality**: Một số ảnh có thể không có width/height
4. **Content format**: HTML có thể khác nhau giữa các bài viết
5. **Date format**: Không đồng nhất, cần parse cẩn thận


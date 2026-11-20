# Thư Quán — web đọc & tải ebook

Trang tĩnh (HTML/CSS/JS thuần), không cần server hay cơ sở dữ liệu.

## Chạy thử
Nhấp đúp `index.html` để mở bằng Chrome/Safari/Edge.

## Cấu trúc
```
index.html          khung trang
assets/style.css    giao diện (sáng/tối, responsive)
assets/app.js       trang chủ, thể loại, tìm kiếm, chi tiết sách, trình đọc, tủ sách, tải về
data/library.js     DANH SÁCH SÁCH + THỂ LOẠI  ← sửa file này
files/              đặt file ebook có sẵn (epub, pdf, mobi, azw3) và ảnh bìa
```

## Thêm một cuốn sách
Mở `data/library.js`, chép một khối `{ ... }` trong `window.BOOKS` rồi sửa:

```js
{
  id: "ten-sach-khong-dau",
  title: "Tên Sách", author: "Tác Giả",
  category: "van-hoc-viet-nam", status: "Hoàn thành",
  year: 2025, views: 0, rating: 5, tags: ["..."],
  description: "Giới thiệu ngắn",
  cover: "files/covers/ten-sach.jpg",                      // không bắt buộc
  files: { epub: "files/ten-sach.epub", pdf: "files/ten-sach.pdf" }, // không bắt buộc
  chapters: [                                               // để đọc online
    { title: "Chương 1", paragraphs: ["Đoạn 1", "Đoạn 2"] }
  ]
}
```

- Có `chapters` → đọc online được, và trang tự tạo file **EPUB / TXT / HTML** để tải.
- Có `files` → hiện nút tải đúng file bạn đặt trong `files/`.

## Tính năng
- Trang chủ: sách mới, xếp hạng xem nhiều, thể loại, “Đọc tiếp”.
- Tìm kiếm theo tên/tác giả/thẻ, gõ có dấu hay không dấu đều được.
- Trang sách: thông tin, đánh giá, danh sách chương (đánh dấu chương đã đọc), lưu tủ sách, chia sẻ.
- Trình đọc: 5 màu nền, cỡ chữ, phông, giãn dòng, độ rộng; phím ← → chuyển chương; thanh tiến độ; nhớ chương đang đọc.
- Tủ sách & lịch sử đọc (lưu trên trình duyệt).

## Đưa lên mạng (miễn phí)
Tải cả thư mục `ebook/` lên **Netlify Drop** (app.netlify.com/drop), **GitHub Pages** hoặc **Cloudflare Pages**.

> Chỉ đăng tải sách bạn có quyền chia sẻ. Sách mẫu trong `library.js` là nội dung tự viết để minh hoạ.

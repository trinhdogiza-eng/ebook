/*
 * KHO SÁCH CÔNG KHAI — sửa file này để thêm / bớt sách.
 *
 * CHỈ đăng sách đã HẾT BẢN QUYỀN hoặc bạn có quyền chia sẻ:
 *  - Tác giả (và người dịch, người chú thích, người viết lời giới thiệu nếu có) đã mất trên 50 năm
 *    (Luật SHTT Việt Nam: bảo hộ suốt đời + 50 năm; sách khuyết danh: 75 năm kể từ lần xuất bản đầu).
 *  - Bản in mới có lời giới thiệu / chú thích của người còn sống thì KHÔNG đăng được, dù tác phẩm gốc đã cũ.
 *
 * Mỗi sách gồm:
 *  id          : mã không dấu, không trùng (dùng trong đường dẫn)
 *  title, author, category (id thể loại bên dưới), description
 *  year        : (tuỳ chọn) năm sáng tác / năm của bản in
 *  edition     : (tuỳ chọn) ghi chú bản in
 *  cover       : đường dẫn ảnh bìa trong files/covers/
 *  files       : { epub: "files/abc.epub", pdf: "...", mobi: "...", azw3: "..." }
 *  added       : ngày thêm (YYYY-MM-DD) — sách mới thêm hiện trước
 */

// Địa chỉ app Tree Ebook, tính từ trang web này: dvt-treebook.com/  →  app ở dvt-treebook.com/app/
window.READER_URL = "app/";

// Thể loại = tên thư mục trong kho "Ebook sách"
window.CATEGORIES = [
  { id: "tho-ca", name: "Thơ Ca" },
  { id: "danh-nhan", name: "Danh Nhân" },
  { id: "tieu-thuyet", name: "Tiểu thuyết" },
  { id: "tap-truyen-ngan", name: "Tập Truyện Ngắn" }
];

window.BOOKS = [
  {
    id: "truyen-trinh-thu", title: "Truyện Trinh Thử", author: "Xử sĩ Hồ Huyền Qui",
    category: "tho-ca", year: 1956, edition: "Bùi Kỷ hiệu đính — Tân Việt, 1956", added: "2026-11-20",
    tags: ["Truyện thơ Nôm", "Ngụ ngôn"],
    description: "Truyện thơ Nôm lục bát mượn chuyện loài chuột — nàng chuột bạch giữ tiết, chuột đực đa tình, vợ ghen — để bàn về đạo vợ chồng và lòng chung thuỷ. Bản do cụ Bùi Kỷ hiệu đính.",
    cover: "files/covers/truyen-trinh-thu.jpg", files: { epub: "files/truyen-trinh-thu.epub" }
  },
  {
    id: "cung-oan-ngam-khuc", title: "Cung Oán Ngâm Khúc", author: "Nguyễn Gia Thiều",
    category: "tho-ca", year: 1780, added: "2026-11-20",
    tags: ["Song thất lục bát", "Văn học cổ điển"],
    description: "Khúc ngâm song thất lục bát nổi tiếng của Ôn Như Hầu: lời than của người cung nữ tài sắc bị vua ruồng bỏ, qua đó gửi nỗi suy tư về kiếp người và lẽ vô thường.",
    cover: "files/covers/cung-oan-ngam-khuc.jpg", files: { epub: "files/cung-oan-ngam-khuc.epub" }
  },
  {
    id: "dai-nam-quoc-su-dien-ca-1", title: "Đại Nam Quốc Sử Diễn Ca — Quyển 1", author: "Lê Ngô Cát & Phạm Đình Toái",
    category: "tho-ca", year: 1949, edition: "Sông Nhị, 1949", added: "2026-11-20",
    tags: ["Lịch sử", "Diễn ca"],
    description: "Lịch sử nước ta kể bằng thơ lục bát, dễ đọc dễ nhớ. Quyển 1: từ thời Hồng Bàng đến nhà Tiền Lê.",
    cover: "files/covers/dai-nam-quoc-su-dien-ca-1.jpg", files: { epub: "files/dai-nam-quoc-su-dien-ca-1.epub" }
  },
  {
    id: "dai-nam-quoc-su-dien-ca-2", title: "Đại Nam Quốc Sử Diễn Ca — Quyển 2", author: "Lê Ngô Cát & Phạm Đình Toái",
    category: "tho-ca", edition: "Sông Nhị", added: "2026-11-20",
    tags: ["Lịch sử", "Diễn ca"],
    description: "Phần tiếp theo của bộ sử bằng thơ lục bát. Quyển 2: từ nhà Lý đến nhà Nguyễn Tây Sơn.",
    cover: "files/covers/dai-nam-quoc-su-dien-ca-2.jpg", files: { epub: "files/dai-nam-quoc-su-dien-ca-2.epub" }
  },
  {
    id: "ha-thanh-that-thu-ca", title: "Hà Thành Thất Thủ Ca và Hoàng Diệu", author: "Khuyết danh",
    category: "tho-ca", year: 1950, edition: "Sông Nhị, 1950", added: "2026-11-20",
    tags: ["Văn cổ", "Lịch sử"],
    description: "Tập hợp các bài văn cổ khuyết danh về việc thành Hà Nội thất thủ năm 1882 và tấm gương tuẫn tiết của Tổng đốc Hoàng Diệu.",
    cover: "files/covers/ha-thanh-that-thu-ca.jpg", files: { epub: "files/ha-thanh-that-thu-ca.epub" }
  },
  {
    id: "tho-han-mac-tu", title: "Thơ Hàn Mặc Tử", author: "Hàn Mặc Tử",
    category: "tho-ca", added: "2026-11-20",
    tags: ["Thơ mới", "Đau thương"],
    description: "Tuyển thơ của Hàn Mặc Tử, từ những bài Đường luật thuở đầu, Gái quê, đến Đau thương với “Đây thôn Vĩ Dạ”, “Mùa xuân chín”… cùng những lời tựa do chính nhà thơ viết.",
    cover: "files/covers/tho-han-mac-tu.jpg", files: { epub: "files/tho-han-mac-tu.epub" }
  },
  {
    id: "van-chau", title: "Văn Chầu", author: "Tân Dân Thư Quán",
    category: "tho-ca", year: 1929, edition: "Tân Dân Thư Quán, 1929", added: "2026-11-20",
    tags: ["Hát chầu văn", "Tín ngưỡng dân gian"],
    description: "Các bài văn chầu đủ các vị trong tín ngưỡng thờ Mẫu, in năm 1929 — tư liệu quý về lời hát chầu văn và tiếng Việt đầu thế kỷ XX.",
    cover: "files/covers/van-chau.jpg", files: { epub: "files/van-chau.epub" }
  },
  {
    id: "vua-ham-nghi", title: "Vua Hàm Nghi", author: "Phan Trần Chúc",
    category: "danh-nhan", year: 1951, edition: "Chính Ký, 1951", added: "2026-11-20",
    tags: ["Lịch sử", "Nhà Nguyễn", "Cần Vương"],
    description: "Cuộc đời vị vua trẻ rời kinh thành, phát hịch Cần Vương chống Pháp rồi bị bắt và đày sang Algérie — kể bằng ngòi bút sử ký của Phan Trần Chúc.",
    cover: "files/covers/vua-ham-nghi.jpg", files: { epub: "files/vua-ham-nghi.epub" }
  },
  {
    id: "vua-le-chieu-thong", title: "Vua Lê Chiêu Thống: Bánh Xe Khứ Quốc", author: "Phan Trần Chúc",
    category: "danh-nhan", year: 1952, edition: "Chính Ký, 1952", added: "2026-11-20",
    tags: ["Lịch sử", "Nhà Lê", "Tây Sơn"],
    description: "Những năm cuối của nhà Hậu Lê: vua Lê Chiêu Thống giữa thế Trịnh – Tây Sơn, cầu viện nhà Thanh và kết cục nơi đất khách.",
    cover: "files/covers/vua-le-chieu-thong.jpg", files: { epub: "files/vua-le-chieu-thong.epub" }
  },
  {
    id: "la-co-theu-sau-chu-vang", title: "Lá Cờ Thêu Sáu Chữ Vàng", author: "Nguyễn Huy Tưởng",
    category: "tieu-thuyet", year: 1960, added: "2026-11-20",
    tags: ["Lịch sử", "Nhà Trần", "Thiếu nhi"],
    description: "Hoài Văn Hầu Trần Quốc Toản tuổi mười sáu bóp nát quả cam vì không được dự bàn việc nước, rồi tự dựng cờ “Phá cường địch, báo hoàng ân” đi đánh giặc Nguyên.",
    cover: "files/covers/la-co-theu-sau-chu-vang.jpg", files: { epub: "files/la-co-theu-sau-chu-vang.epub" }
  },
  {
    id: "moi-tinh-chan", title: "Mối Tình “Chân”", author: "Nhất Linh",
    category: "tap-truyen-ngan", added: "2026-11-20",
    tags: ["Tự Lực Văn Đoàn", "Truyện ngắn"],
    description: "Tập truyện ngắn của Nhất Linh, mở đầu bằng chuyện tình mộc mạc giữa cô Bé đi mua tôm và anh lái đò Đỗi bên bến đò làng Trò.",
    cover: "files/covers/moi-tinh-chan.jpg", files: { epub: "files/moi-tinh-chan.epub" }
  }
];

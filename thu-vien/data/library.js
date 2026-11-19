/*
 * THƯ VIỆN SÁCH — sửa file này để thêm / bớt sách.
 *
 * Mỗi sách gồm:
 *  id          : mã không dấu, không trùng (dùng trong đường dẫn)
 *  title       : tên sách
 *  author      : tác giả
 *  category    : id thể loại (xem CATEGORIES bên dưới)
 *  status      : "Hoàn thành" | "Đang ra"
 *  year, views, rating, tags, description
 *  cover       : (tuỳ chọn) đường dẫn ảnh bìa, ví dụ "files/covers/abc.jpg"
 *  files       : (tuỳ chọn) file tải sẵn có, ví dụ { epub: "files/abc.epub", pdf: "files/abc.pdf", mobi: "...", azw3: "..." }
 *  chapters    : (tuỳ chọn) nội dung đọc online — mảng { title, paragraphs: [ "...", "..." ] }
 *                Nếu có chapters, trang tự tạo được file EPUB / TXT để tải về.
 *
 * Toàn bộ sách dưới đây là nội dung MẪU tự viết để minh hoạ.
 */

// Địa chỉ app Tree Ebook, tính từ trang thư viện này.
// Thư viện đặt ở …/ebook/thu-vien/  →  Tree Ebook ở …/ebook/  →  "../"
// Để trống "" nếu không muốn hiện nút "Đọc bằng Tree Ebook".
window.READER_URL = "../";

window.CATEGORIES = [
  { id: "tien-hiep", name: "Tiên hiệp" },
  { id: "kiem-hiep", name: "Kiếm hiệp" },
  { id: "ngon-tinh", name: "Ngôn tình" },
  { id: "trinh-tham", name: "Trinh thám" },
  { id: "kinh-di", name: "Kinh dị" },
  { id: "khoa-hoc-vien-tuong", name: "Khoa học viễn tưởng" },
  { id: "van-hoc-viet-nam", name: "Văn học Việt Nam" },
  { id: "ky-nang", name: "Kỹ năng sống" }
];

window.BOOKS = [
  {
    id: "kiem-khach-song-han", title: "Kiếm Khách Sông Hàn", author: "Lâm Phong",
    files: { epub: "files/kiem-khach-song-han.epub" },
    category: "kiem-hiep", status: "Hoàn thành", year: 2024, views: 15230, rating: 4.6,
    tags: ["Võ hiệp", "Phiêu lưu"],
    description: "Một thiếu niên làng chài bên sông Hàn nhặt được thanh kiếm gãy dưới đáy sông, từ đó bị cuốn vào cuộc tranh đoạt giữa các môn phái giang hồ.",
    chapters: [
      { title: "Chương 1: Thanh kiếm dưới đáy sông", paragraphs: [
        "Sáng hôm ấy sương phủ trắng mặt sông Hàn. An chèo chiếc thuyền nan ra giữa dòng, quăng mẻ lưới đầu tiên trong ngày.",
        "Lưới nặng bất thường. Khi kéo lên, giữa đám rong rêu là một thanh kiếm gãy, chuôi bọc da cá đã mục, lưỡi vẫn sáng như vừa được mài.",
        "Cậu chưa kịp ngắm kỹ thì từ bờ bên kia, ba bóng người áo đen đã lướt trên mặt nước mà đến."] },
      { title: "Chương 2: Người áo đen", paragraphs: [
        "Kẻ đi đầu đứng trên mũi thuyền nhẹ như chiếc lá. Hắn nhìn thanh kiếm rồi nhìn An, giọng lạnh như nước sông mùa đông: “Đưa đây.”",
        "An siết chặt chuôi kiếm. Một luồng hơi ấm chạy dọc cánh tay, và cậu nghe thấy, rất khẽ, tiếng ai đó thì thầm trong đầu: “Đừng buông.”"] },
      { title: "Chương 3: Lão chèo đò", paragraphs: [
        "Lão chèo đò già mà cả làng vẫn tưởng là kẻ say rượu bỗng đứng dậy. Cây sào tre trong tay lão quét ngang, hất văng cả ba kẻ áo đen xuống sông.",
        "“Mười năm rồi,” lão nói, mắt không rời thanh kiếm. “Cuối cùng nó cũng chọn được chủ.”"] }
    ]
  },
  {
    id: "mua-ha-nam-ay", title: "Mùa Hạ Năm Ấy", author: "Thu Nguyệt",
    files: { epub: "files/mua-ha-nam-ay.epub" },
    category: "ngon-tinh", status: "Hoàn thành", year: 2023, views: 28910, rating: 4.8,
    tags: ["Thanh xuân", "Học đường"],
    description: "Câu chuyện nhẹ nhàng về hai người bạn cùng lớp, một cây phượng già và những lá thư chưa từng được gửi đi.",
    chapters: [
      { title: "Chương 1: Cây phượng ở góc sân", paragraphs: [
        "Trường cấp ba của chúng tôi có một cây phượng già ở góc sân, gốc to đến ba người ôm không xuể.",
        "Năm lớp mười một, Khang chuyển đến và được xếp ngồi cạnh tôi, ngay cửa sổ nhìn ra cây phượng ấy."] },
      { title: "Chương 2: Lá thư đầu tiên", paragraphs: [
        "Tôi viết lá thư đầu tiên vào một chiều mưa tháng Ba. Viết xong, tôi gấp làm tư rồi kẹp vào cuốn sổ toán.",
        "Lá thư ấy chưa bao giờ được gửi đi. Những lá sau cũng vậy."] },
      { title: "Chương 3: Mùa thi", paragraphs: [
        "Phượng nở đỏ rực vào đúng tuần thi cuối cấp. Khang hỏi tôi định thi trường nào, tôi nói dối là chưa nghĩ đến.",
        "Hôm chia tay, cậu ấy đưa tôi một cuốn sổ. Bên trong, kẹp giữa các trang, là những lá thư cậu ấy cũng chưa từng gửi."] }
    ]
  },
  {
    id: "an-mang-pho-co", title: "Án Mạng Phố Cổ", author: "Trần Khải",
    files: { epub: "files/an-mang-pho-co.epub" },
    category: "trinh-tham", status: "Đang ra", year: 2025, views: 9870, rating: 4.4,
    tags: ["Phá án", "Hà Nội"],
    description: "Thanh tra Vũ Minh điều tra cái chết bí ẩn của một nhà sưu tầm đồ cổ trong căn nhà ống ở phố Hàng Bạc.",
    chapters: [
      { title: "Chương 1: Căn nhà ống", paragraphs: [
        "Thi thể ông Đạt được phát hiện lúc sáu giờ sáng, ngồi trên ghế bành giữa phòng khách chất đầy bình gốm.",
        "Cửa khóa trái từ bên trong. Chìa khóa vẫn nằm trong túi áo ông."] },
      { title: "Chương 2: Chiếc bình thiếu", paragraphs: [
        "Thanh tra Vũ Minh đếm đi đếm lại số bình trên kệ. Sổ sách ghi một trăm mười hai chiếc; trên kệ chỉ có một trăm mười một.",
        "“Kẻ giết người không lấy tiền,” anh nói với cấp dưới. “Hắn lấy đúng một thứ.”"] },
      { title: "Chương 3: Người cháu", paragraphs: [
        "Người cháu duy nhất của nạn nhân đến đồn với đôi mắt đỏ hoe và một bằng chứng ngoại phạm hoàn hảo.",
        "Quá hoàn hảo, Minh nghĩ."] }
    ]
  },
  {
    id: "tu-tien-van-gioi", title: "Tu Tiên Vạn Giới", author: "Mặc Vân",
    files: { epub: "files/tu-tien-van-gioi.epub" },
    category: "tien-hiep", status: "Đang ra", year: 2025, views: 41200, rating: 4.5,
    tags: ["Tu luyện", "Huyền huyễn"],
    description: "Phế vật của gia tộc họ Lý vô tình mở ra cánh cửa dẫn tới vạn giới, bắt đầu con đường tu luyện nghịch thiên.",
    chapters: [
      { title: "Chương 1: Phế vật họ Lý", paragraphs: [
        "Lý Hàn mười sáu tuổi, kinh mạch bế tắc, là trò cười của cả gia tộc.",
        "Đêm trước ngày khảo hạch, cậu leo lên núi sau nhà, nơi tổ tiên dặn không ai được đến."] },
      { title: "Chương 2: Cánh cửa đá", paragraphs: [
        "Trong hang sâu có một cánh cửa đá khắc chín vòng tròn. Khi giọt máu của Lý Hàn rơi xuống, vòng thứ nhất sáng lên.",
        "Phía sau cánh cửa không phải là bóng tối mà là một bầu trời lạ với hai mặt trăng."] },
      { title: "Chương 3: Linh khí", paragraphs: [
        "Linh khí ở thế giới này đậm đặc đến mức hóa thành sương. Chỉ một hơi thở, kinh mạch bế tắc mười sáu năm của cậu đã thông một đoạn.",
        "Lý Hàn bật cười. Ngày mai, cậu sẽ trở về."] }
    ]
  },
  {
    id: "ngoi-nha-cuoi-hem", title: "Ngôi Nhà Cuối Hẻm", author: "Hạ Vy",
    files: { epub: "files/ngoi-nha-cuoi-hem.epub" },
    category: "kinh-di", status: "Hoàn thành", year: 2022, views: 12045, rating: 4.2,
    tags: ["Tâm linh", "Sài Gòn"],
    description: "Gia đình nhỏ chuyển đến căn nhà giá rẻ cuối con hẻm, nơi chiếc đồng hồ quả lắc luôn điểm đúng ba giờ sáng.",
    chapters: [
      { title: "Chương 1: Giá thuê rẻ bất ngờ", paragraphs: [
        "Căn nhà hai tầng cuối hẻm chỉ cho thuê ba triệu một tháng. Chủ nhà đưa chìa khóa rồi đi rất vội.",
        "Trong phòng khách có một chiếc đồng hồ quả lắc cũ, kim đứng yên ở số ba."] },
      { title: "Chương 2: Ba giờ sáng", paragraphs: [
        "Đêm đầu tiên, Mai bị đánh thức bởi tiếng chuông đồng hồ. Ba tiếng, chậm rãi, vang khắp nhà.",
        "Sáng ra, chồng cô nói đồng hồ đã hỏng từ lâu, quả lắc còn bị buộc dây."] },
      { title: "Chương 3: Bà cụ hàng xóm", paragraphs: [
        "Bà cụ bán nước đầu hẻm nhìn Mai rất lâu rồi hỏi: “Nhà đó vẫn còn cái đồng hồ à?”",
        "“Năm nào cũng có người dọn vào,” bà nói, “và chưa ai ở quá ba tháng.”"] }
    ]
  },
  {
    id: "phi-thuyen-cuoi-cung", title: "Phi Thuyền Cuối Cùng", author: "Đỗ Thiên",
    files: { epub: "files/phi-thuyen-cuoi-cung.epub" },
    category: "khoa-hoc-vien-tuong", status: "Hoàn thành", year: 2024, views: 7600, rating: 4.7,
    tags: ["Không gian", "Tương lai"],
    description: "Năm 2391, phi thuyền Lạc Hồng mang theo mười nghìn người rời Trái Đất. Trí tuệ nhân tạo điều khiển tàu bắt đầu có những quyết định lạ.",
    chapters: [
      { title: "Chương 1: Rời quỹ đạo", paragraphs: [
        "Lạc Hồng rời quỹ đạo Trái Đất vào ngày 1 tháng 1 năm 2391. Mười nghìn người ngủ đông, hai mươi người thức trực.",
        "Hệ thống trí tuệ nhân tạo của tàu tên là MẸ."] },
      { title: "Chương 2: Lệnh thay đổi lộ trình", paragraphs: [
        "Năm thứ mười bảy của hành trình, kỹ sư Hà phát hiện tọa độ đích đã bị sửa.",
        "“MẸ, ai đã đổi lộ trình?” — “Tôi,” giọng nói đáp, bình thản. “Vì nơi ta định đến không còn nữa.”"] },
      { title: "Chương 3: Tín hiệu", paragraphs: [
        "Từ phía hành tinh mới mà MẸ chọn, một tín hiệu lặp lại đều đặn mỗi 41 giây.",
        "Hà nhận ra đó là mã nhận dạng của một con tàu Trái Đất khác, đã mất tích từ hai trăm năm trước."] }
    ]
  },
  {
    id: "thoi-quen-nho", title: "Thói Quen Nhỏ, Đời Thay Đổi", author: "Minh An",
    files: { epub: "files/thoi-quen-nho.epub" },
    category: "ky-nang", status: "Hoàn thành", year: 2023, views: 19300, rating: 4.3,
    tags: ["Phát triển bản thân"],
    description: "Những ghi chép ngắn gọn về cách xây dựng thói quen tốt từ những việc nhỏ nhất mỗi ngày.",
    chapters: [
      { title: "Chương 1: Bắt đầu thật nhỏ", paragraphs: [
        "Muốn đọc sách mỗi ngày? Hãy bắt đầu với một trang. Muốn tập thể dục? Hãy bắt đầu với hai phút.",
        "Mục tiêu của giai đoạn đầu không phải là kết quả, mà là việc xuất hiện đều đặn."] },
      { title: "Chương 2: Gắn thói quen mới vào thói quen cũ", paragraphs: [
        "Công thức đơn giản: “Sau khi tôi [việc đã quen], tôi sẽ [việc mới].”",
        "Ví dụ: sau khi pha cà phê buổi sáng, tôi sẽ viết ba dòng nhật ký."] },
      { title: "Chương 3: Đừng bỏ lỡ hai lần", paragraphs: [
        "Ai cũng có ngày lỡ hẹn với chính mình. Một lần lỡ là chuyện bình thường; hai lần liên tiếp là khởi đầu của một thói quen mới — thói quen bỏ cuộc.",
        "Hãy quay lại ngay hôm sau, dù chỉ làm một phần nhỏ."] }
    ]
  },
  {
    id: "que-ngoai", title: "Quê Ngoại", author: "Phan Lan",
    files: { epub: "files/que-ngoai.epub" },
    category: "van-hoc-viet-nam", status: "Hoàn thành", year: 2021, views: 6420, rating: 4.9,
    tags: ["Tản văn", "Miền Tây"],
    description: "Tản văn về tuổi thơ ở miền Tây sông nước: mùa nước nổi, chợ quê và những bữa cơm chiều bên ngoại.",
    chapters: [
      { title: "Chương 1: Mùa nước nổi", paragraphs: [
        "Tháng Chín, nước từ thượng nguồn tràn về, ruộng đồng quê ngoại hóa thành biển.",
        "Ngoại chèo xuồng đi giăng lưới, tôi ngồi mũi xuồng hái bông điên điển vàng rực hai bên bờ."] },
      { title: "Chương 2: Chợ quê", paragraphs: [
        "Chợ nhóm từ lúc trời chưa sáng, ngay bến sông. Người ta bán cá linh, bông súng, bánh da lợn gói lá chuối.",
        "Ngoại bao giờ cũng mua cho tôi một bịch tàu hũ nước đường, rồi đứng nhìn tôi ăn."] },
      { title: "Chương 3: Bữa cơm chiều", paragraphs: [
        "Bữa cơm chiều dọn trên bộ ván gõ ngoài hiên: canh chua bông điên điển, cá linh kho mía.",
        "Nhiều năm sau, ở thành phố, tôi đã thử nấu lại đủ món. Chỉ thiếu tiếng ngoại gọi: “Vô ăn cơm con.”"] }
    ]
  }
];

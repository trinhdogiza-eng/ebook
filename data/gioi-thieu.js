/*
 * GIỚI THIỆU TRUYỆN — chỉ có lời giới thiệu ngắn (tự viết) và link tới nơi đăng / phát hành CHÍNH CHỦ.
 * Không đăng nội dung sách ở đây.
 *
 *  group : tên thư mục thể loại (giống kho "Ebook sách")
 *  orig  : tên gốc (nếu là truyện nước ngoài)
 *  links : nút liên kết; nút đầu tiên là nút chính
 *
 * Nguồn chính chủ:
 *  - Truyện mạng Trung Quốc: trang truyện trên nền tảng gốc nơi tác giả đăng (Khởi Điểm / Qidian, Tung Hoành / Zongheng).
 *  - Sách đã có bản tiếng Việt có bản quyền: trang tìm sách trên Fahasa / Tiki (nhà sách phát hành bản chính thức).
 *    Mỗi cuốn đã được kiểm tra là có bản tiếng Việt chính thức trên Fahasa (20/11/2026).
 */
(function () {
  const qd = (id) => ({ label: "Đọc bản gốc · Khởi Điểm (Qidian)", url: `https://www.qidian.com/book/${id}/` });
  const zh = (id) => ({ label: "Đọc bản gốc · Tung Hoành (Zongheng)", url: `https://www.zongheng.com/detail/${id}` });
  const fh = (q) => ({ label: "Bản tiếng Việt chính thức · Fahasa", url: `https://www.fahasa.com/searchengine?q=${encodeURIComponent(q)}` });
  const tk = (q) => ({ label: "Tiki", url: `https://tiki.vn/search?q=${encodeURIComponent(q)}` });
  const buy = (q) => [fh(q), tk(q)];
  const CN = "Bản gốc tiếng Trung, đăng chính thức trên nền tảng của tác giả.";
  let n = 0;
  const B = (group, title, author, summary, links, extra) => ({ id: "gt-" + (++n), group, title, author, summary, links, ...(extra || {}) });

  window.INTROS = [
    // ===== Tiên hiệp =====
    B("Tiên hiệp", "Phàm Nhân Tu Tiên", "Vong Ngữ", "Hàn Lập, cậu bé nhà nông tư chất tầm thường, bước vào con đường tu tiên nhờ một chiếc bình nhỏ bí ẩn. Không thiên phú, không chỗ dựa, cậu sống sót bằng sự cẩn trọng và kiên nhẫn — bộ truyện mở ra cả dòng “phàm nhân lưu”.", [qd(107580)], { orig: "凡人修仙传", note: CN }),
    B("Tiên hiệp", "Phàm Nhân Tu Tiên Chi Tiên Giới Thiên", "Vong Ngữ", "Phần tiếp theo của Phàm Nhân Tu Tiên: Hàn Lập phi thăng lên Tiên giới, một lần nữa bắt đầu từ con số không giữa những thế lực tiên nhân hùng mạnh.", [qd(1010734492)], { orig: "凡人修仙之仙界篇", note: CN }),
    B("Tiên hiệp", "Ma Thiên Ký", "Vong Ngữ", "Thiếu niên Liễu Minh lưu lạc giữa chốn tu luyện tàn khốc, phải dựa vào mưu trí và ý chí để từng bước vươn lên trong một thế giới yêu ma hỗn loạn.", [qd(3022294)], { orig: "魔天记", note: CN }),
    B("Tiên hiệp", "Đại Mộng Chủ", "Vong Ngữ", "Thẩm Lạc liên tục rơi vào những giấc mộng kỳ lạ, và mỗi giấc mộng lại giúp anh tiến thêm trên đường tu luyện, trong một thế giới thần thoại lấy cảm hứng từ Tây Du Ký.", [qd(1016534035)], { orig: "大梦主", note: CN }),
    B("Tiên hiệp", "Tiên Giả", "Vong Ngữ", "Tác phẩm mới của Vong Ngữ: một thiếu niên xuất thân danh gia bị truy sát, trôi dạt khỏi cuộc sống cũ rồi dấn thân vào con đường cầu tiên đầy hiểm nguy.", [qd(1034539101)], { orig: "仙者", note: CN }),
    B("Tiên hiệp", "Kiếm Lai", "Phong Hỏa Hí Chư Hầu", "Trần Bình An, cậu bé nghèo ở một trấn nhỏ hẻo lánh, rời quê ra thế giới rộng lớn với thanh kiếm và những đạo lý của riêng mình. Một bộ tiên hiệp giàu chất văn chương, nổi tiếng về chiều sâu nhân vật.", [zh(672340)], { orig: "剑来", note: CN }),
    B("Tiên hiệp", "Tru Tiên", "Tiêu Đỉnh", "Trương Tiểu Phàm, cậu bé làng Thảo Miếu sống sót sau thảm sát, được nhận vào Thanh Vân Môn. Giữa chính và tà, tình và nghĩa, cậu dần trở thành người mà chính mình cũng không ngờ tới — một tượng đài của tiên hiệp.", buy("Tru Tiên Thập Niên Nhất Mộng"), { orig: "诛仙" }),
    B("Tiên hiệp", "Huyền Giám Tiên Tộc", "Quý Việt Nhân", "Lục Giang Tiên tỉnh dậy trong hình hài một chiếc gương đồng, được một gia đình nông dân họ Lý nhặt về. Từ đó chiếc gương lặng lẽ dõi theo và dẫn dắt cả gia tộc qua nhiều thế hệ tu tiên.", [qd(1035420986)], { orig: "玄鉴仙族", note: CN }),
    B("Tiên hiệp", "Diệt Vận Đồ Lục", "Mực Thích Lặn Nước", "Một người xuyên không tình cờ có được bảo vật “Diệt Vận Đồ Lục”, cho phép đi qua vô số thế giới để tìm cổ pháp tu tiên, trên đường cầu đạo thành Chân nhân.", [qd(2182740)], { orig: "灭运图录", note: CN }),
    B("Tiên hiệp", "Ảo Thuật Thần Tọa", "Mực Thích Lặn Nước", "Một chàng trai hiện đại tỉnh dậy ở thế giới kiểu châu Âu trung cổ nơi giáo hội săn lùng pháp sư. Bằng âm nhạc và tư duy khoa học, anh học ma pháp và từng bước chạm tới đỉnh cao huyền thuật.", [qd(2643379)], { orig: "奥术神座", note: CN }),

    // ===== Huyền ảo =====
    B("Huyền ảo", "Quỷ Bí Chi Chủ", "Mực Thích Lặn Nước", "Chu Minh Thụy tỉnh dậy trong thân xác Klein Moretti, ở một thế giới thời hơi nước đầy ma dược, bói toán và những thực thể không thể gọi tên. Truyền thuyết về “Kẻ Khờ” bắt đầu — một trong những tiểu thuyết mạng hay nhất mọi thời.", [qd(1010868264)], { orig: "诡秘之主", note: CN }),
    B("Huyền ảo", "Túc Mệnh Chi Hoàn", "Mực Thích Lặn Nước", "Phần tiếp nối thế giới Quỷ Bí Chi Chủ, theo chân một nhân vật mới bị cuốn vào vòng lặp số mệnh và những bí ẩn còn sâu hơn.", [qd(1036370336)], { orig: "宿命之环", note: CN }),
    B("Huyền ảo", "Nhất Thế Chi Tôn", "Mực Thích Lặn Nước", "Mạnh Kỳ xuyên không thành nhị thiếu gia một gia tộc võ lâm, rồi bị kéo vào “Lục Đạo Luân Hồi” — nơi phải vượt qua các thế giới nhiệm vụ để sống sót và mạnh lên.", [qd(3249362)], { orig: "一世之尊", note: CN }),
    B("Huyền ảo", "Võ Đạo Tông Sư", "Mực Thích Lặn Nước", "Ở một thế giới hiện đại nơi võ đạo là con đường danh vọng, chàng sinh viên Lâu Thành từ câu lạc bộ võ đạo của trường bắt đầu hành trình trở thành tông sư.", [qd(1004142144)], { orig: "武道宗师", note: CN }),
    B("Huyền ảo", "Nghịch Thiên Tà Thần", "Hỏa Tinh Dẫn Lực", "Vân Triệt mang trong mình huyết mạch Tà Thần, bước trên con đường nghịch thiên giữa các đại lục và thần giới — một bộ huyền huyễn dài hơi, nhịp nhanh.", [zh(408586)], { orig: "逆天邪神", note: CN }),
    B("Huyền ảo", "Đạo Quỷ Dị Tiên", "Hồ Vĩ Đích Bút", "Lý Hỏa Vượng sống giữa hai thực tại: một thế giới tu tiên quỷ dị, máu me và một bệnh viện tâm thần hiện đại — mà không biết đâu mới là thật. Truyện kỳ ảo u tối, ám ảnh.", [qd(1031794030)], { orig: "道诡异仙", note: CN }),
    B("Huyền ảo", "Những Câu Chuyện Kỳ Lạ Của Darren Shan", "Darren Shan", "Cậu bé Darren trót dính líu tới một gánh xiếc quái dị và trở thành đệ tử của ma cà rồng. Bộ 12 tập kinh dị – phiêu lưu cho tuổi mới lớn.", buy("Những Câu Chuyện Kỳ Lạ Của Darren Shan")),

    // ===== Khoa Huyễn / Vô hạn lưu =====
    B("Khoa Huyễn", "Trường Dạ Dư Hỏa", "Mực Thích Lặn Nước", "Thế giới sau tận thế, con người sống trong những căn cứ ngầm khép kín. Một nhóm điều tra viên trẻ bước ra vùng đất hoang để tìm sự thật về thảm họa và về chính mình.", [qd(1023422452)], { orig: "长夜余火", note: CN }),
    B("Vô hạn lưu", "Luân Hồi Nhạc Viên", "Na Nhất Chỉ Văn Tử", "Tô Hiểu trở thành “Liệp Sát Giả” của Nhạc Viên, bị đưa vào hết thế giới này đến thế giới khác để hoàn thành nhiệm vụ, săn mồi và sống sót.", [qd(1009817672)], { orig: "轮回乐园", note: CN }),

    // ===== Best seller =====
    B("Best seller", "Harry Potter", "J. K. Rowling", "Cậu bé mồ côi Harry phát hiện mình là phù thủy và bước vào trường Hogwarts, nơi chờ cậu là tình bạn, phép thuật và cuộc đối đầu với Chúa tể Voldemort.", buy("Harry Potter")),
    B("Best seller", "1Q84", "Haruki Murakami", "Tokyo năm 1984 lệch sang một thế giới có hai mặt trăng: Aomame, nữ sát thủ, và Tengo, nhà văn trẻ, bị cuốn vào bí ẩn của một giáo phái và một câu chuyện tình chờ đợi suốt hai mươi năm.", buy("1Q84")),
    B("Best seller", "Hiệu Sách Nhỏ Ở Paris", "Nina George", "Ông Perdu kê “đơn thuốc” bằng sách cho khách trên chiếc thuyền-hiệu-sách ở sông Seine, nhưng chưa chữa được nỗi đau của chính mình — cho tới khi ông nhổ neo xuôi về miền Nam nước Pháp.", buy("Hiệu Sách Nhỏ Ở Paris")),

    // ===== Biên khảo / Lịch sử / Văn hóa =====
    B("Biên khảo - Địa Lý", "Những Tù Nhân Của Địa Lý", "Tim Marshall", "Mười tấm bản đồ giải thích vì sao núi, sông, biển lại quyết định chính sách của các cường quốc — một cách nhìn thời sự thế giới rất dễ hiểu.", buy("Những Tù Nhân Của Địa Lý")),
    B("Lịch sử - Quân sự", "Lịch Sử Giao Thương", "William J. Bernstein", "Thương mại đã định hình thế giới ra sao: từ con đường tơ lụa, gia vị đến container và toàn cầu hóa.", buy("Lịch Sử Giao Thương")),
    B("Lịch sử - Quân sự", "Phi Châu Thịnh Vượng", "Martin Meredith", "Năm nghìn năm lịch sử châu Phi qua vàng, ngà voi, nô lệ, kim cương và dầu mỏ — câu chuyện về sự giàu có và lòng tham.", buy("Phi Châu Thịnh Vượng")),
    B("Lịch sử - Quân sự", "Sống Sót Ở Berlin", "Erik Larson", "Câu chuyện có thật về một gia đình người Mỹ ở Berlin những năm đầu Hitler nắm quyền, chứng kiến nước Đức trượt dần vào bóng tối.", buy("Sống Sót Ở Berlin")),
    B("Lịch sử - Quân sự", "Không Phải Huyền Thoại", "Hữu Mai", "Tiểu thuyết lịch sử về Đại tướng Võ Nguyên Giáp và những quyết định then chốt trong chiến dịch Điện Biên Phủ.", buy("Không Phải Huyền Thoại")),
    B("Văn Hóa - Xã Hội", "Sự Giàu Và Nghèo Của Các Dân Tộc", "David S. Landes", "Vì sao có nước giàu, nước nghèo? Một khảo cứu lớn về văn hóa, địa lý và thể chế trong lịch sử kinh tế thế giới.", buy("Sự Giàu Và Nghèo Của Các Dân Tộc")),
    B("Danh Nhân", "Thiên Hoàng Minh Trị", "Donald Keene", "Tiểu sử vị thiên hoàng gắn với công cuộc Minh Trị Duy Tân, đưa Nhật Bản từ phong kiến khép kín thành cường quốc hiện đại.", buy("Thiên Hoàng Minh Trị")),
    B("Tiểu thuyết", "Bóng Nước Hồ Gươm", "Chu Thiên", "Tiểu thuyết lịch sử về Hà Nội cuối thế kỷ XIX, những năm thành thất thủ và các phong trào chống Pháp.", buy("Bóng Nước Hồ Gươm")),

    // ===== Khoa học / Kinh tế / Quản trị =====
    B("Khoa học - Tâm lý học", "Gen Vị Kỷ", "Richard Dawkins", "Cuốn sách kinh điển nhìn tiến hóa từ góc độ của gen, giải thích cả lòng vị tha lẫn sự cạnh tranh trong thế giới sống.", buy("Gen Vị Kỷ")),
    B("Kinh điển", "Tư Bản Thế Kỷ 21", "Thomas Piketty", "Phân tích dữ liệu hơn hai trăm năm để chỉ ra vì sao bất bình đẳng giàu nghèo có xu hướng tăng khi lợi nhuận vốn vượt tăng trưởng.", buy("Tư Bản Thế Kỷ 21")),
    B("Kinh Tế - Tài Chính", "Máu Bẩn", "John Carreyrou", "Phóng sự điều tra về Theranos — startup y tế từng được định giá chín tỉ đô và cú lừa lớn nhất Thung lũng Silicon.", buy("Máu Bẩn")),
    B("Kinh Tế - Tài Chính", "Cổ Phiếu Thường, Lợi Nhuận Phi Thường", "Philip A. Fisher", "Những nguyên tắc chọn cổ phiếu tăng trưởng của một trong những nhà đầu tư có ảnh hưởng nhất thế kỷ XX.", buy("Cổ Phiếu Thường Lợi Nhuận Phi Thường")),
    B("Kinh Tế - Tài Chính", "Bơi Cùng Cá Mập Mà Không Bị Nuốt Chửng", "Harvey B. Mackay", "Bí quyết bán hàng, đàm phán và hiểu người — viết ngắn gọn, thực tế, đúc kết từ kinh nghiệm kinh doanh.", buy("Bơi Cùng Cá Mập Mà Không Bị Nuốt Chửng")),
    B("Kinh Tế - Tài Chính", "Tiền Không Bao Giờ Là Đủ", "Laura Vanderkam", "Cách nghĩ khác về tiền: tiêu cho điều thật sự làm mình hạnh phúc thay vì chạy theo con số.", buy("Tiền Không Bao Giờ Là Đủ")),
    B("Quản trị - Kinh doanh", "Đạo Của Warren Buffett", "Mary Buffett & David Clark", "Những câu nói và nguyên tắc đầu tư, kinh doanh, sống của Warren Buffett, kèm giải thích dễ hiểu.", buy("Đạo Của Warren Buffett")),
    B("Quản trị - Kinh doanh", "Guanxi – Nghệ Thuật Tạo Dựng Quan Hệ Kinh Doanh", "Robert Buderi & Gregory T. Huang", "Câu chuyện Microsoft xây dựng phòng nghiên cứu ở Trung Quốc và vai trò của “quan hệ” trong làm ăn ở châu Á.", buy("Guanxi")),
    B("Quản trị - Kinh doanh", "Kẻ Làm Thay Đổi Cuộc Chơi", "A. G. Lafley & Ram Charan", "Cách P&G biến đổi mới sáng tạo thành quy trình để tăng trưởng bền vững.", buy("Kẻ Làm Thay Đổi Cuộc Chơi")),
    B("Quản trị - Kinh doanh", "Những Đế Chế Độc Quyền Thời Hiện Đại", "Alex Moazed & Nicholas L. Johnson", "Vì sao các nền tảng như Google, Uber, Airbnb thống trị — và cách mô hình nền tảng vận hành.", buy("Những Đế Chế Độc Quyền Thời Hiện Đại")),
    B("Quản trị - Kinh doanh", "Marketing Giỏi Phải Kiếm Được Tiền", "Sergio Zyman", "Cựu giám đốc marketing Coca-Cola khẳng định: marketing phải bán được hàng và đo được hiệu quả.", buy("Marketing Giỏi Phải Kiếm Được Tiền")),

    // ===== Kỹ năng / Tâm lý =====
    B("Self Help - Khởi nghiệp", "Bốn Thỏa Ước", "Don Miguel Ruiz", "Bốn lời hứa đơn giản với chính mình — nói lời chuẩn mực, đừng để bụng, đừng giả định, luôn làm hết sức — để sống nhẹ nhõm hơn.", buy("Bốn Thỏa Ước")),
    B("Self Help - Khởi nghiệp", "Người Nhạy Cảm – Món Quà Hay Lời Nguyền", "Elaine N. Aron", "Dành cho những người dễ xúc động, dễ bị quá tải: hiểu bản tính nhạy cảm và biến nó thành thế mạnh.", buy("Người Nhạy Cảm Món Quà Hay Lời Nguyền")),
    B("Self Help - Khởi nghiệp", "Tối Giản Tâm Trí", "S. J. Scott & Barrie Davenport", "Những thói quen nhỏ để dọn dẹp suy nghĩ rối rắm, bớt lo âu và tập trung vào điều quan trọng.", buy("Tối Giản Tâm Trí")),
    B("Self Help - Khởi nghiệp", "Sức Mạnh Của Việc Đặt Câu Hỏi Đúng", "Mihiro Matsuda", "Thay đổi câu hỏi mình tự đặt ra mỗi ngày để thay đổi cách nghĩ và hành động.", buy("Sức Mạnh Của Việc Đặt Câu Hỏi Đúng")),
    B("Self Help - Khởi nghiệp", "Tôi Thích Bản Thân Nỗ Lực Hơn", "Chu Xung", "Những bài viết ngắn khích lệ phụ nữ trẻ tự chủ, kỷ luật và yêu bản thân.", buy("Tôi Thích Bản Thân Nỗ Lực Hơn")),
    B("Self Help - Khởi nghiệp", "38 Lá Thư Rockefeller Gửi Cho Con Trai", "John D. Rockefeller", "Những lá thư về làm giàu, làm người và cách nhìn cuộc sống của ông vua dầu mỏ gửi con trai.", buy("38 Lá Thư Rockefeller Gửi Cho Con Trai")),
    B("Tâm Lý Học", "Nghệ Thuật Thuyết Phục", "Nick Kolenda", "Các nguyên lý tâm lý học đằng sau sự thuyết phục, trình bày như một quy trình từng bước.", buy("Nghệ Thuật Thuyết Phục")),
    B("Triết Học", "Schopenhauer Nhà Giáo Dục", "Friedrich Nietzsche", "Tiểu luận của Nietzsche về người thầy chân chính và con đường trở thành chính mình.", buy("Schopenhauer Nhà Giáo Dục")),

    // ===== Văn học nước ngoài =====
    B("Tiểu thuyết", "Mãi Đừng Xa Tôi", "Kazuo Ishiguro", "Kathy nhớ lại những năm tháng ở trường nội trú Hailsham cùng Ruth và Tommy, và dần hé lộ sự thật lặng lẽ, day dứt về số phận của họ.", buy("Mãi Đừng Xa Tôi")),
    B("Tiểu thuyết", "Kiếp Người", "W. Somerset Maugham", "Philip Carey, chàng trai mồ côi tật chân, đi tìm ý nghĩa đời mình qua nghệ thuật, y khoa và một mối tình đầy đau khổ.", buy("Kiếp Người Somerset Maugham")),
    B("Tiểu thuyết", "Diệt Chủng", "Takano Kazuaki", "Một sinh viên Nhật nhận di nguyện của cha phải chế thuốc chữa bệnh hiểm trong một tháng, trong khi ở Congo một đội lính đánh thuê được giao nhiệm vụ liên quan tới một dạng sống mới. Ly kỳ và đầy tính khoa học.", buy("Diệt Chủng")),
    B("Tiểu thuyết", "Giết Chỉ Huy Đội Kỵ Sĩ", "Haruki Murakami", "Một họa sĩ chân dung sống ẩn trên núi phát hiện bức tranh bí ẩn trên gác mái, mở ra chuỗi sự việc kỳ lạ.", buy("Giết Chỉ Huy Đội Kỵ Sĩ")),
    B("Tiểu thuyết", "Những Chuyện Lạ Ở Tokyo", "Haruki Murakami", "Năm truyện ngắn về những điều kỳ lạ len vào đời sống thường ngày ở Tokyo.", buy("Những Chuyện Lạ Ở Tokyo")),
    B("Tiểu thuyết", "Thành Phố Và Những Bức Tường Bất Định", "Haruki Murakami", "Tiểu thuyết gần đây của Murakami về một thành phố có tường bao quanh, nơi những cái bóng bị tách khỏi con người.", buy("Thành Phố Và Những Bức Tường Bất Định")),
    B("Tập Truyện Ngắn", "Bóng Ma Ở Lexington", "Haruki Murakami", "Tập truyện ngắn về cô đơn, mất mát và những vị khách bí ẩn trong đời thường.", buy("Bóng Ma Ở Lexington")),
    B("Tập Truyện Ngắn", "Ngôi Thứ Nhất Số Ít", "Haruki Murakami", "Tám truyện kể ở ngôi “tôi”, nửa hồi ức nửa kỳ ảo: âm nhạc, bóng chày, những cuộc gặp không thể giải thích.", buy("Ngôi Thứ Nhất Số Ít")),
    B("Tập Truyện Ngắn", "Sau Động Đất", "Haruki Murakami", "Sáu truyện ngắn về những con người bị ảnh hưởng gián tiếp bởi trận động đất Kobe năm 1995.", buy("Sau Động Đất")),
    B("Tập Truyện Ngắn", "Người TV", "Haruki Murakami", "Tập truyện ngắn đầu thập niên 1990, giữa hiện thực và giấc mơ.", buy("Người TV Murakami")),
    B("Tập Truyện Ngắn", "Có Một Ngày, Bố Mẹ Sẽ Già Đi", "Nhiều tác giả", "Những bài viết ngắn nhắc ta dành thời gian cho cha mẹ khi còn có thể.", buy("Có Một Ngày Bố Mẹ Sẽ Già Đi")),
    B("Kinh điển", "Người Tình", "Marguerite Duras", "Cô gái Pháp mười lăm tuổi và người tình Hoa kiều giàu có ở Sài Gòn thuộc địa — tiểu thuyết đoạt giải Goncourt.", buy("Người Tình Marguerite Duras")),
    B("Kinh điển", "Thế Giới Mới Tươi Đẹp", "Aldous Huxley", "Một xã hội tương lai nơi con người được “sản xuất” và giữ cho luôn hạnh phúc bằng thuốc — tiểu thuyết phản địa đàng kinh điển.", buy("Thế Giới Mới Tươi Đẹp")),
    B("Kinh điển", "Lời Nguyện Cầu Từ Chernobyl", "Svetlana Alexievich", "Những lời kể của người sống sót sau thảm họa hạt nhân Chernobyl, của tác giả đoạt giải Nobel Văn học.", buy("Lời Nguyện Cầu Từ Chernobyl")),
    B("Lãng mạn", "Hòm Thư Số 110", "Yi Do Woo", "Biên kịch radio Jin Sol, ngoài ba mươi, chỉ mong yên ổn — cho tới khi phải làm việc với một nhà sản xuất kiêm nhà thơ. Chuyện tình chậm rãi, ấm áp.", buy("Hòm Thư Số 110")),
    B("Lãng mạn", "Xuân Qua Hạ Đến", "Kim Ae-ran", "Tập truyện ngắn về những mất mát và cách con người Hàn Quốc hôm nay đi qua nỗi đau.", buy("Xuân Qua Hạ Đến")),
    B("Giả tưởng", "Len Chùi – Silo Tháp Giống", "Hugh Howey", "Loài người sống trong một tòa tháp ngầm khổng lồ; ai muốn ra ngoài sẽ bị bắt đi lau ống kính quan sát. Khởi đầu của bộ khoa học viễn tưởng Silo.", buy("Len Chùi Silo")),
    B("Bút Ký", "Dẫu Hóa Linh Hồn Xin Hãy Ở Bên Tôi", "Okuno Shuji", "Những câu chuyện người sống sót sau sóng thần Nhật Bản 2011 kể về các cuộc “gặp lại” người thân đã mất.", buy("Dẫu Hóa Linh Hồn Xin Hãy Ở Bên Tôi")),
    B("Tản Văn", "Mong Mẹ Hãy Yêu Lấy Chính Mình", "Jang Hae Joo", "Những dòng tản văn biết ơn gửi mẹ, mong mẹ cũng thương bản thân như đã thương con.", buy("Mong Mẹ Hãy Yêu Lấy Chính Mình")),
    B("Kịch Bản - Sân Khấu", "Sinh Vật Huyền Bí Và Nơi Tìm Ra Chúng", "J. K. Rowling", "Newt Scamander đến New York năm 1926 với chiếc va li chứa đầy sinh vật huyền bí — một câu chuyện trong thế giới Harry Potter.", buy("Sinh Vật Huyền Bí Và Nơi Tìm Ra Chúng")),

    // ===== Trinh thám / Kinh dị =====
    B("Trinh thám", "Thiên Nga Và Dơi", "Higashino Keigo", "Một luật sư bị sát hại, nghi phạm nhanh chóng nhận tội — nhưng con gái nạn nhân và con trai hung thủ đều không tin, và cùng nhau đi tìm sự thật.", buy("Thiên Nga Và Dơi")),
    B("Trinh thám", "Kẻ Sát Nhân Ở Số Nhà 21", "Stanislas-André Steeman", "London chao đảo vì kẻ giết người hàng loạt, và manh mối dẫn về một nhà trọ số 21 — trinh thám cổ điển kiểu “kẻ thủ ác là ai”.", buy("Kẻ Sát Nhân Ở Số Nhà 21")),
    B("Trinh thám", "Series “Quán”", "Ayatsuji Yukito", "Những vụ án trong các ngôi nhà kỳ quái do cùng một kiến trúc sư thiết kế — bộ trinh thám bản cách nổi tiếng của Nhật.", buy("Ayatsuji Yukito")),
    B("Trinh thám", "Thời Niên Thiếu Của Sherlock Holmes", "Shane Peacock", "Sherlock tuổi mười ba lang thang ở London thời Victoria, lần đầu dùng óc suy luận để minh oan cho chính mình.", buy("Thời Niên Thiếu Của Sherlock Holmes")),
    B("Trinh thám", "Tiệm Cắt Tóc Lúc Nửa Đêm", "Kousuke Sawamura", "Những câu chuyện bí ẩn quanh một tiệm cắt tóc chỉ mở cửa về đêm.", buy("Tiệm Cắt Tóc Lúc Nửa Đêm")),
    B("Kinh dị", "Ghi Chép Pháp Y", "Lưu Bát Bách", "Bác sĩ pháp y với hàng trăm ca khám nghiệm kể lại những vụ án có thật và cách tử thi “lên tiếng”.", buy("Ghi Chép Pháp Y")),

    // ===== Thiếu nhi / Tự truyện =====
    B("Thiếu Nhi", "Danny – Nhà Vô Địch Thế Giới", "Roald Dahl", "Danny sống cùng bố trong toa xe ở trạm xăng, cho tới ngày cậu phát hiện bí mật “săn trộm gà lôi” của bố.", buy("Danny Nhà Vô Địch Thế Giới")),
    B("Thiếu Nhi", "Ngón Tay Thần Kỳ", "Roald Dahl", "Cô bé có ngón tay phép thuật biến cả nhà hàng xóm mê săn bắn thành… những chú chim.", buy("Ngón Tay Thần Kỳ")),
    B("Thiếu Nhi", "Xứ Nevermoor Diệu Kỳ", "Jessica Townsend", "Morrigan Crow, cô bé bị nguyền rủa, được đưa tới thành phố kỳ diệu Nevermoor và phải vượt qua thử thách để ở lại.", buy("Xứ Nevermoor Diệu Kỳ")),
    B("Thiếu Nhi", "Crenshaw – Chú Mèo Lướt Ván", "Katherine Applegate", "Khi gia đình gặp khó khăn, người bạn tưởng tượng thời bé của Jackson — một chú mèo khổng lồ — quay trở lại.", buy("Crenshaw")),
    B("Thiếu Nhi", "Từ Anna", "Jean Little", "Cô bé Anna vụng về, mắt kém theo gia đình rời nước Đức sang Canada, và tìm thấy nơi mình thuộc về.", buy("Từ Anna")),
    B("Toán Học", "Toán Học Siêu Hay", "Katie Hewett & Tracie Young", "Toán học vui nhộn cho trẻ: mẹo tính, câu đố và những sự thật thú vị.", buy("Toán Học Siêu Hay")),
    B("Tự truyện", "Tôi Đi Học", "Nguyễn Ngọc Ký", "Hành trình đến trường bằng đôi chân viết chữ của thầy Nguyễn Ngọc Ký — tấm gương nghị lực của nhiều thế hệ học trò.", buy("Tôi Đi Học Nguyễn Ngọc Ký")),
    B("Tự truyện", "Bố Mẹ Đã “Cưa Đổ” Tớ", "Đỗ Nhật Nam", "Đỗ Nhật Nam kể chuyện học tập và cách bố mẹ đồng hành cùng mình.", buy("Bố Mẹ Đã Cưa Đổ Tớ")),

    // ===== Văn học Việt Nam =====
    B("Tiểu thuyết", "Miền Tây", "Tô Hoài", "Đời sống đồng bào miền núi Tây Bắc trong những năm đổi thay, qua ngòi bút của Tô Hoài.", buy("Miền Tây Tô Hoài")),
    B("Thơ Ca", "Truyện Kiều", "Nguyễn Du", "Kiệt tác thơ lục bát về cuộc đời mười lăm năm lưu lạc của Thúy Kiều. Bản in mới có chú giải giúp đọc dễ hơn.", buy("Truyện Kiều Nguyễn Du")),
    B("Tản Văn", "Cảm Ơn Người Đã Rời Xa Tôi", "Hà Thanh Phúc", "Tản văn về chia tay, tổn thương và cách tự chữa lành để bước tiếp.", buy("Cảm Ơn Người Đã Rời Xa Tôi")),
    B("Giáo dục", "Từ Điển Tiếng Việt", "GS. Hoàng Phê (chủ biên)", "Cuốn từ điển tiếng Việt uy tín, cần có trên giá sách mỗi nhà.", buy("Từ Điển Tiếng Việt Hoàng Phê"))
  ];
})();

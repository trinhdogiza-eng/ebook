# Tree Ebook (của Trình Đỗ) — app đọc sách đồng bộ trang giữa Android, iPhone/iPad và Mac

Web app cài được (PWA): mở bằng trình duyệt rồi "Thêm vào màn hình chính" là dùng như app thường, chạy được khi không có mạng.

## Tính năng
- **Đọc to** (từ v1.7): nút 🔊 trên thanh trên cùng; đọc từ trang đang xem, tô sáng câu đang đọc, tự lật trang và sang chương/trang sau; tốc độ mặc định **1.5×** (bấm "1.5×" trên thanh đọc để đổi, hoặc Aa → Tốc độ đọc); chọn giọng ở Aa → Giọng đọc. Dùng giọng có sẵn của máy (iPhone: Linh; Android: Google tiếng Việt; Windows/Edge: HoaiMy/NamMinh).
- **Đọc cả EPUB và PDF** (từ v1.6). PDF dùng pdf.js (Mozilla): lật trang trượt mượt / cuộn dọc, chụm 2 ngón hoặc A+/A− để phóng to (tối đa 400%), Ctrl + lăn chuột trên máy tính, mục lục nếu PDF có sẵn, nền tối/giấy. Vị trí PDF đồng bộ theo số trang.
- Đọc EPUB (epub.js): lật trang (chạm trái/phải, vuốt, phím ←/→) hoặc cuộn dọc; 2 trang trên màn hình rộng (Mac/iPad ngang).
- Mục lục, thanh kéo tiến độ (%), cỡ chữ, giãn dòng, phông chữ, nền Sáng / Giấy / Tối.
- Thư viện lưu ngay trong máy (IndexedDB).
- **Đồng bộ qua OneDrive hoặc Google Drive** (chọn một khi đăng nhập):
  - Vị trí đọc lưu dạng EPUB CFI (chính xác tới đoạn văn, không phụ thuộc kích thước màn hình) trong tệp `progress.json` ở thư mục riêng của app:
    OneDrive → `Ứng dụng/<tên app>/progress.json`; Google Drive → thư mục ẩn của app (không hiện trong Drive).
  - **Mở sách thẳng từ OneDrive / Google Drive** (nút ☁ trên thư viện). Sách mở từ đám mây được ghi nhớ, nên máy khác thấy mục “Đang đọc trên thiết bị khác” và bấm **Tải từ OneDrive/Google Drive** là đọc tiếp đúng trang.
  - Mở sách → tự lấy vị trí mới nhất. Đang đọc mà máy khác đọc tiếp → trong vòng ~30 giây (hoặc ngay khi quay lại app) sẽ hiện "iPhone đã đọc đến 42% — Chuyển đến".
  - Mất mạng / phiên đăng nhập hết hạn: tiến độ được giữ trong máy và tự gửi lên sau.

> Mỗi cuốn được nhận diện bằng mã băm nội dung tệp. Sách mở từ cùng một tệp trên OneDrive/Drive luôn khớp nhau. Nếu thêm từ máy thì phải là **cùng một tệp .epub** trên mọi thiết bị.

## 1a. Lấy Client ID cho OneDrive (Microsoft)
1. Vào <https://entra.microsoft.com> (hoặc <https://portal.azure.com>) → **App registrations** → **New registration**.
   - Name: `Doc EPUB` (đây cũng là tên thư mục trong `Ứng dụng/` trên OneDrive).
   - Supported account types: **Accounts in any organizational directory and personal Microsoft accounts**.
   - Redirect URI: chọn nền tảng **Single-page application (SPA)**, nhập địa chỉ app, ví dụ `https://ten-ban.github.io/ebook/` (có dấu `/` cuối). Thêm cả `http://localhost:8080/` nếu muốn chạy thử trên máy.
2. **API permissions → Add a permission → Microsoft Graph → Delegated**: thêm `Files.Read`, `Files.ReadWrite.AppFolder`, `User.Read`, `offline_access`.
3. Trang **Overview** → copy **Application (client) ID** → dán vào `onedriveClientId` trong [js/cloud-config.js](js/cloud-config.js).

Nếu tài khoản Microsoft cá nhân không tạo được app registration, Microsoft sẽ yêu cầu tạo một tenant miễn phí (đăng ký Azure miễn phí). Tài khoản công ty/trường (Microsoft 365) thường tạo được ngay.

> **Đã làm:** Client ID Google Drive đã được tạo (project Google Cloud **Doc EPUB**, tài khoản dovantrinh@hotmail.com) và điền sẵn trong `js/cloud-config.js`. Người dùng thử: dovantrinh@gmail.com, trinhdo.giza@gmail.com. Hiện chỉ cho phép `http://localhost:8080` — khi đưa app lên mạng, vào **Google Auth Platform → Clients → Web client 1** thêm địa chỉ thật vào *Authorized JavaScript origins* và *Authorized redirect URIs*. Muốn thêm người dùng: **Audience → Test users → Add users**.

## 1b. Lấy Client ID cho Google Drive
1. Vào <https://console.cloud.google.com> → tạo project mới.
2. **APIs & Services → Library** → bật **Google Drive API**.
3. **OAuth consent screen** (Google Auth Platform): loại **External**, điền tên app + email. Ở **Audience / Test users** thêm email Google của bạn (và người nhà nếu muốn dùng chung app). Để ở chế độ **Testing** là đủ dùng cá nhân.
4. **Credentials → Create credentials → OAuth client ID → Web application**:
   - Authorized JavaScript origins: `https://ten-ban.github.io` (và `http://localhost:8080`).
   - Authorized redirect URIs: đúng địa chỉ app, ví dụ `https://ten-ban.github.io/ebook/` (và `http://localhost:8080/`).
5. Copy **Client ID** → dán vào `googleClientId` trong [js/cloud-config.js](js/cloud-config.js).

Khi đăng nhập lần đầu Google sẽ báo *“Google hasn’t verified this app”* → bấm **Continue** (vì app của chính bạn, đang ở chế độ Testing).

Chỉ điền một trong hai cũng được — nút của dịch vụ để trống sẽ bị ẩn.

## 2. Đưa app lên mạng (bắt buộc HTTPS)
- **GitHub Pages**: tạo repo, đưa các tệp lên, bật **Settings → Pages**. Địa chỉ dạng `https://<tên>.github.io/<repo>/`.
- **Netlify Drop**: kéo thư mục vào <https://app.netlify.com/drop>.

Địa chỉ cuối cùng phải **khớp chính xác** với Redirect URI đã khai ở bước 1a/1b.
Không cần đưa thư mục `tools/` hay các tệp `.epub` lên.

## 3. Cài lên thiết bị
| Thiết bị | Cách cài |
|---|---|
| iPhone / iPad | Mở bằng **Safari** → nút Chia sẻ → **Thêm vào MH chính** |
| Android | Mở bằng **Chrome** → menu ⋮ → **Cài đặt ứng dụng** |
| Mac | Safari: **Tệp → Thêm vào Dock**; hoặc Chrome: biểu tượng cài đặt trên thanh địa chỉ |

Trên mỗi máy: bấm nút **Đồng bộ** (góc trên) → đăng nhập **cùng một tài khoản và cùng một dịch vụ** → đặt tên thiết bị → bấm **☁ Mở từ OneDrive/Google Drive** để chọn sách.

### Về việc đăng nhập lại
- Microsoft cấp phiên khoảng 24 giờ, Google khoảng 1 giờ. Khi mở app mà phiên đã hết hạn, app tự chuyển qua trang đăng nhập rồi quay về trong ~1 giây (không cần gõ gì nếu trình duyệt còn nhớ tài khoản).
- Nếu vẫn không được (ví dụ trình duyệt đã quên tài khoản), nút góc trên hiện **Kết nối lại** — bấm vào để đăng nhập. Tiến độ trong lúc đó vẫn được lưu trên máy và gửi lên sau.

## Địa chỉ app trên mạng
**https://trinhdogiza-eng.github.io/ebook/** (GitHub Pages, repo `trinhdogiza-eng/ebook`). Địa chỉ này đã được thêm vào Client ID Google.
Cập nhật app: sửa tệp ở đây → chép vào `publish/` → tải lên repo (trang GitHub: *Add file → Upload files*). Nhớ tăng `CACHE` trong `sw.js` để máy đã cài nhận bản mới.

## Dùng trên máy tính Windows này
Bấm đúp lối tắt **Tree Ebook** trên Desktop. Lối tắt chạy `tools/start-app.ps1`: bật máy chủ nhỏ ẩn ở `http://localhost:8080` (nếu chưa chạy), rồi mở app trong cửa sổ Edge riêng.
Giữ nguyên cổng 8080 — đó là địa chỉ đã khai với Google để đăng nhập Drive. Máy chủ chạy ngầm đến khi tắt máy; muốn tắt sớm: Task Manager → tắt tiến trình *Windows PowerShell* chạy nền.

## Chạy thử trên Windows
```powershell
powershell -ExecutionPolicy Bypass -File tools\serve.ps1
```
Mở <http://localhost:8080> và thêm tệp mẫu `tools/sach-thu.epub`.
<http://localhost:8080/tools/mock-test.html> chạy bộ kiểm thử đồng bộ với OneDrive/Google Drive giả lập (không cần tài khoản).

## Cấu trúc
```
index.html          giao diện
css/style.css       giao diện, 3 chủ đề màu
js/app.js           thư viện, trình đọc, duyệt sách trên đám mây, giải quyết xung đột
js/db.js            lưu trữ IndexedDB
js/sync.js          đăng nhập OAuth (Microsoft PKCE / Google) + đọc/ghi progress.json + duyệt/tải tệp
js/cloud-config.js  Client ID của bạn
sw.js               service worker (chạy ngoại tuyến)
tools/              máy chủ chạy thử, sách mẫu, trang kiểm thử
```

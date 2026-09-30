# Giữ tài khoản ổn định khi triển khai

Tài khoản thật phải nằm trong cùng một Supabase project: Authentication và bảng public.profiles. Không chạy seed, reset database hoặc tạo project mới khi chỉ sửa website. Code này không chạy migration hay ghi tài khoản khi khởi động.

## Cấu hình Vercel

Trong Project > Settings > Environment Variables, đặt:

- VITE_SUPABASE_URL: Project URL của Supabase hiện có.
- VITE_SUPABASE_ANON_KEY: anon/public key của cùng project (RLS phải bật).
- SUPABASE_URL: cùng Project URL cho backend.
- SUPABASE_SERVICE_ROLE_KEY: chỉ ở backend, không bao giờ có tiền tố VITE_ và không đưa vào GitHub.

Frontend cũng hỗ trợ NEXT_PUBLIC_SUPABASE_URL và NEXT_PUBLIC_SUPABASE_ANON_KEY qua vite.config.ts. Chọn một cặp tên nhất quán; đừng để các biến trỏ tới các project khác nhau. Đây là biến lúc build: đổi biến rồi redeploy.

Production nên dùng domain cố định https://hoc-eng.vercel.app. Mỗi domain Preview có localStorage và phiên đăng nhập riêng; việc phải đăng nhập lại không có nghĩa tài khoản đã mất. Preview có thể dùng database thử nghiệm riêng; nếu muốn thấy dữ liệu Production thì phải chủ động cấu hình cùng project và kiểm soát quyền ghi.

## Dữ liệu cũ

Không xóa localStorage hoặc đăng ký lại để chữa lỗi. app_registered_users và app_managed_accounts cũ có thể chứa tài khoản chỉ tồn tại trên trình duyệt. Bản sửa không tự nhập chúng vào database, không sửa UUID, mật khẩu, vai trò hoặc VIP của các tài khoản đã tồn tại. Lần đầu tải danh sách Supabase thành công, bản danh sách cũ được giữ ở app_managed_accounts_legacy_backup. Không chia sẻ giá trị app_registered_users vì có dữ liệu xác thực.

Dùng nút xuất JSON trong trang quản lý trên domain cũ để đối chiếu danh sách với Supabase Authentication/Profiles. Với tài khoản chỉ có trên trình duyệt, cần quy trình chuyển riêng: tạo/invite người dùng trong Supabase, xác nhận email, gắn profile vào UUID thật và chuyển VIP/quyền sau khi đối chiếu. Không thể cam kết giữ nguyên mật khẩu chỉ có bản hash cục bộ bằng cách chép profile.

## Hành vi quản trị

Danh sách Supabase tuân theo RLS: admin cần có role=admin trong database. Lỗi đọc giữ cache và báo lỗi; lỗi cập nhật không báo thành công. Sửa tên, role và VIP phải được database xác nhận. Tạo/xóa người dùng và đổi email đăng nhập thực hiện qua Supabase Authentication (hoặc chức năng Đăng ký), thay cho những nút cũ vốn chỉ sửa danh sách trình duyệt.

## Kiểm tra trước khi đưa lên Production

1. Sao lưu database theo quy trình Supabase đang dùng và xuất danh sách cũ trên domain chính.
2. Đối chiếu Project URL của Production với database đang chứa tài khoản. Không đổi sang project mới.
3. Đăng nhập bằng tài khoản thử đã có; ghi lại UUID, tên, role và VIP.
4. Redeploy cùng cấu hình, đăng nhập lại; các giá trị phải giữ nguyên.
5. Thử lỗi mạng/quyền: không được báo đã lưu, không tạo tài khoản cục bộ mới.

Không chạy lại toàn bộ supabase-schema.sql để sửa lỗi hiển thị tài khoản. Bản sửa không sửa schema, không xóa hay di chuyển dữ liệu Production. Cần xác minh cấu hình và dữ liệu thực tế trong tài khoản Vercel/Supabase trước khi hoàn tất chuyển các tài khoản cục bộ cũ.

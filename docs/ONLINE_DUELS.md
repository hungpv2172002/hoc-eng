# Kích hoạt đấu 1vs1 trực tuyến

## Triển khai

1. Mở project Supabase đang chứa các tài khoản cũ. Giữ nguyên project và các biến môi trường đang dùng.
2. Vào **SQL Editor → New query**, dán toàn bộ file `supabase/migrations/20260930050000_online_duels.sql` rồi bấm **Run** với role postgres.
3. Merge PR và chờ bản Production trên Vercel báo Ready. Nếu đang kiểm tra Preview, môi trường Preview phải kết nối cùng project Supabase thử nghiệm cho cả hai người.
4. Đăng nhập bằng hai tài khoản khác nhau ở hai trình duyệt/điện thoại. Vào **1vs1 → Ghép trận ngẫu nhiên**, chọn cùng chủ đề và số câu rồi bấm tìm. Hai người được đưa vào cùng phòng, đếm ngược và thi đấu.
5. Thử **Thách đấu bạn bè**: tạo phòng, gửi link/mã cho bạn; cả hai bấm Sẵn sàng, chủ phòng bấm Bắt đầu. Nút Thách đấu bên cạnh bạn bè hoặc người ở sảnh gửi lời mời thật; người nhận mở sảnh 1vs1 và bấm Chấp nhận.

Migration chỉ tạo schema riêng `duel_private`, các bảng trạng thái trận và hàm `public.duel_action`; không xóa, seed lại hay sửa tài khoản/mật khẩu trong Auth và profiles. Chạy lại migration không làm mất dữ liệu hiện có. Không cần khóa service role ở trình duyệt hoặc bật Supabase Realtime. Schema riêng không cần thêm vào Exposed schemas.

Database cần có bảng `profiles` (id, full_name, email, avatar_url) và `questions` (id, vi, hints, answers). answers là mảng JSON hoặc text[]. Ngân hàng phải có đủ 3/5/10 câu thuộc chủ đề được chọn. Dữ liệu câu hỏi chỉ nằm ở localStorage sẽ không dùng được cho trận trực tuyến; quản trị viên cần lưu câu hỏi lên Supabase.

## Hành vi

- Chỉ tài khoản đăng nhập được thi đấu; ID người chơi lấy từ phiên Supabase.
- Ghép người có cùng chủ đề và số câu. Database khóa giao dịch ghép cặp, mỗi tài khoản tối đa một phòng.
- Trình duyệt đồng bộ khoảng 1 giây/lần trong trận hoặc khi tìm đối thủ; 2,5 giây/lần ở sảnh. Đây là polling qua RPC, không dùng WebSocket trong bộ nhớ Express. Độ trễ mạng có thể khiến hiển thị chậm hơn.
- Lời mời riêng chỉ người nhận được vào, hết hạn hiển thị sau 5 phút. Người nhận phải ở sảnh 1vs1 để thấy lời mời, hoặc mở link được gửi.
- Tải lại trang khôi phục phòng. Mất liên lạc quá 45 giây trong trận bị xử thua khi người còn lại đồng bộ. Hàng chờ hết hiệu lực nếu không có heartbeat 20 giây. Phòng hết hạn sau 30 phút.
- Tổng thời gian trận bằng số câu × 60 giây. Hết giờ so điểm; bằng điểm là hòa.
- Đáp án được kiểm tra ở database. Người trả lời đúng trước được 125 điểm, người còn lại 100 điểm; bỏ qua được 0. Database ngăn lặp điểm, bỏ qua trùng, hành động từ ván trước. Snapshot không chứa đáp án chuẩn.
- Các bảng questions cũ của ứng dụng có thể vẫn công khai đáp án phục vụ tự học; tính năng này không cam kết chống gian lận thi cử.
- Nút Rời trận tính bỏ cuộc. Quay lại học trong màn hình duel thực hiện rời phòng. Điều hướng bên ngoài hoặc đóng trang được xử lý bằng thời hạn mất kết nối.

## Kiểm tra kỹ thuật

`node node_modules/typescript/bin/tsc --noEmit`

Workflow **Online duel transactions** chạy trên PostgreSQL dùng riêng cho test: xác thực, quyền truy cập, lời mời, điểm, tái đấu, hết giờ, kết nối lại; đồng thời 8 người tìm trận; hai người trả lời đúng cùng lúc; gửi trùng; hủy tìm đúng lúc được ghép.

Có thể chạy test tuần tự với PGlite bằng biến `PGLITE_MODULE` trỏ đến module `@electric-sql/pglite/dist/index.js`. Test tạo dữ liệu giả: **chỉ chạy trên database thử nghiệm trống**, tuyệt đối không dùng URL production cho `DUEL_TEST_DATABASE_URL`.

Nếu báo không tìm thấy hàm duel_action/schema cache: kiểm tra đã chạy migration đúng project. Migration gửi NOTIFY pgrst để tải lại schema. Nếu báo thiếu câu hỏi: chọn Tất cả hoặc bổ sung ngân hàng câu hỏi qua admin.


# Đấu 1vs1 trên Vercel

## Cách chơi

Hai người mở mục 1vs1, cùng bấm Tìm trận để được ghép với nhau. Cấu hình của người chờ trước được dùng cho trận. Có thể hủy hàng chờ.

Tab Bạn học hiển thị người đang ở sảnh. Bấm Thách đấu để gửi lời mời 60 giây. Người nhận chọn Chấp nhận/Từ chối. Với bạn bè đã đăng nhập Supabase, có thể mời theo email đã xác thực; khách hoặc người chưa mở sảnh dùng mã/link phòng. Bạn bè vẫn được lưu trên thiết bị như ứng dụng hiện tại.

Phòng riêng cần hai người: khách bật Sẵn sàng và chủ phòng bấm bắt đầu. Cả hai làm cùng bộ câu hỏi. Đáp án đúng được 100 điểm, người trả lời đúng đầu tiên mỗi câu thêm 50 điểm. Có bỏ qua, tái đấu và biểu cảm.

## Kiến trúc triển khai

Mặc định giao diện dùng HTTPS `/api/duel/sync`, đồng bộ khoảng 1,2 giây, không cần máy chủ WebSocket riêng. Mỗi request đọc trạng thái chung trong Supabase và ghi bằng compare-and-swap theo phiên bản; nếu request khác đã ghi trước, server đọc lại và thực hiện lại thao tác. Vì vậy các Vercel Function instance độc lập vẫn dùng một hàng chờ/phòng. Request có ID để tránh ghi điểm lặp khi gửi lại.

Migration: `supabase/migrations/20260930141521_durable_duels.sql` tạo bảng riêng `duel_state_store` và hàm `duel_compare_and_swap`. RLS bật, quyền đọc/ghi/execute bị thu hồi khỏi anon/authenticated. Chỉ API phía server dùng service_role. Không thay đổi bảng tài khoản/câu hỏi hiện hữu.

Biến môi trường Vercel cần có (đã dùng bởi API hiện tại):
- `NEXT_PUBLIC_SUPABASE_URL` hoặc `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (chỉ phía server)
- Các biến frontend Supabase hiện có để xác thực tài khoản.

Để trống `VITE_DUEL_WS_URL` cho Vercel. Nếu đặt biến này, giao diện dùng lại đường WebSocket riêng, tách biệt với phòng HTTP.

Phiên khách dùng token ngẫu nhiên 256 bit trên trình duyệt; server chỉ lưu hash. Tài khoản đăng nhập được xác thực qua Supabase Auth khi vào sảnh; ID/email do client khai báo không được dùng làm danh tính đã xác thực. Dữ liệu trả về không chứa khóa phiên hoặc email của người trong sảnh.

Giữ phiên qua kết nối lại bằng sessionStorage. Ngừng đồng bộ quá 60 giây: người chơi rời phòng, đối thủ thắng nếu trận đang chạy. Trạng thái được dọn khi có request tiếp theo, không phụ thuộc timer nền của Vercel. Phiên đang ở phòng sẽ được khôi phục khi kết nối lại trước hạn này.

Thiết kế dùng một bản ghi chung cho sảnh nhỏ, giới hạn 200 phiên đang hoạt động. Chưa kiểm thử tải lớn; khi mở rộng cần tách hàng chờ/phòng thành bản ghi riêng. Đáp án vẫn có trong dữ liệu luyện tập gửi xuống trình duyệt như ứng dụng gốc; không dùng làm thi đấu có giải thưởng.

## Kiểm thử

- `npm run lint`
- `npm run build`
- `node --import tsx tests/durable-duel.test.ts`: hai cặp độc lập, đáp án/request lặp, điểm, tái đấu, quyền nhận lời mời, readiness và hết hạn phiên.
- Kiểm tra SQL CAS và phân quyền trong transaction rollback.
- `tests/duel.integration.mjs` dành cho đường WebSocket tùy chọn.

# Đấu 1vs1 trực tuyến

## Cách dùng

- Cả hai người mở mục Đấu Trường 1vs1 trên website.
- Ghép ngẫu nhiên: cả hai bấm Tìm trận. Người vào hàng chờ trước quyết định số câu và chủ đề. Hai người nhận cùng bộ câu hỏi.
- Đấu bạn bè: thêm email bạn, bấm Thách đấu. Người nhận đang ở sảnh sẽ thấy lời mời trong 60 giây, có thể chấp nhận hoặc từ chối. Nếu bạn chưa vào sảnh, gửi link/mã phòng.
- Tab Bạn học chỉ hiển thị kết nối đang ở sảnh, không lấy danh sách tài khoản làm trạng thái online.
- Phòng riêng: khách bấm Sẵn sàng, chủ phòng bắt đầu. Một phòng tối đa hai người.
- Rời hoặc mất kết nối trong trận: người còn lại thắng; mất kết nối đưa người chơi về sảnh với nút kết nối lại. Không khôi phục trận đang chơi.
- Tài khoản chỉ mở một kết nối đấu trường tại một thời điểm. Bạn bè vẫn được lưu trên thiết bị theo cơ chế hiện tại của ứng dụng.

## Chạy và triển khai

Duel hiện dùng bộ nhớ của **một tiến trình Node chạy liên tục**. Tất cả người chơi phải dùng cùng endpoint và cùng tiến trình này; không chạy nhiều replica hoặc các function độc lập cho matchmaking. Restart tiến trình làm mất phòng đang chơi.

```sh
npm ci
npm run build
NODE_ENV=production npm start
```

Cấu hình các biến môi trường trong `.env.example` theo dịch vụ đang dùng. `PORT` mặc định 3000. Reverse proxy phải chuyển tiếp WebSocket Upgrade cho `/ws/duel`; website HTTPS cần endpoint `wss://`.

Nếu frontend vẫn được triển khai bằng cấu hình `vercel.json` hiện tại, thiết lập biến **build-time** `VITE_DUEL_WS_URL=wss://<duel-host>/ws/duel` trỏ tới tiến trình Node nói trên và build/deploy lại frontend. Cấu hình hiện tại rewrite `/ws/duel` về HTML, không nối endpoint này với `httpServer`; chỉ merge mã không tự tạo backend đấu hoặc đổi biến môi trường trên hosting.

Không có thông tin hosting/credentials của máy chủ đấu trong repo, nên cần cấu hình endpoint production trước khi xác nhận đã hoạt động trên website thật.

Danh tính ở giao thức đấu hiện kế thừa profile do client gửi (bao gồm chế độ khách), chưa phải danh tính được máy chủ xác thực. Không dùng kết quả trận này cho phần thưởng có giá trị hoặc bảng xếp hạng tin cậy trước khi nối xác thực tài khoản phía server. Đáp án có trong dữ liệu câu hỏi của giao diện luyện tập hiện tại.

## Kiểm thử

```sh
npm run lint
npm run build
# Terminal 1; test key only avoids AI initialization failure; tests do not call AI.
NODE_ENV=production GEMINI_API_KEY=test-only PORT=3100 npm start
# Terminal 2
node tests/duel.integration.mjs
```

Kiểm thử dùng các WebSocket client độc lập: presence, ghép trận, cả hai gửi đáp án, từ chối đáp án lặp, hủy hàng chờ, mã phòng sai, lời mời bằng email và ID, từ chối/chấp nhận, phòng đầy, sẵn sàng và mất kết nối.

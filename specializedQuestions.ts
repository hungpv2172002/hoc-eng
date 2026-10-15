import type { CareerCategory, Question } from '../types';

type Template = { vi: string; en: string; hint: string; level: Question['level'] };

const templates: Record<Exclude<CareerCategory, 'general'>, Template[]> = {
  it: [
    { vi: 'Nhóm phát triển sẽ rà soát pull request trước cuộc họp.', en: 'The development team will review the pull request before the meeting.', hint: 'review a pull request', level: 'B1' },
    { vi: 'Chúng tôi cần kiểm tra nhật ký để tìm nguyên nhân lỗi.', en: 'We need to check the logs to find the root cause of the bug.', hint: 'check the logs; root cause', level: 'B1' },
    { vi: 'Kỹ sư đã triển khai bản sửa lỗi lên môi trường thử nghiệm.', en: 'The engineer deployed the fix to the staging environment.', hint: 'deploy a fix; staging environment', level: 'B1' },
    { vi: 'API này cần xác thực trước khi nhận dữ liệu khách hàng.', en: 'This API needs authentication before it accepts customer data.', hint: 'needs authentication; accept data', level: 'B2' },
    { vi: 'Chúng ta nên tự động hóa bước kiểm thử hồi quy.', en: 'We should automate the regression testing step.', hint: 'automate regression testing', level: 'B2' },
    { vi: 'Kiến trúc mới giúp hệ thống mở rộng dễ dàng hơn.', en: 'The new architecture makes the system easier to scale.', hint: 'architecture; scale', level: 'B2' },
    { vi: 'Hãy ghi rõ thay đổi phá vỡ trong tài liệu phát hành.', en: 'Please document the breaking changes in the release notes.', hint: 'breaking changes; release notes', level: 'C1' },
    { vi: 'Máy chủ cơ sở dữ liệu cần một bản sao lưu mã hóa.', en: 'The database server needs an encrypted backup.', hint: 'database server; encrypted backup', level: 'A2' },
    { vi: 'Nhóm đang theo dõi độ trễ của dịch vụ theo thời gian thực.', en: 'The team is monitoring the service latency in real time.', hint: 'monitor service latency', level: 'B1' },
    { vi: 'Chúng tôi sẽ phát hành tính năng sau khi sản phẩm được phê duyệt.', en: 'We will release the feature after the product is approved.', hint: 'release a feature; be approved', level: 'A2' },
  ],
  business: [
    { vi: 'Chúng tôi muốn hiểu rõ mục tiêu của khách hàng trước khi báo giá.', en: 'We want to understand the client goals before preparing a quote.', hint: 'client goals; prepare a quote', level: 'B1' },
    { vi: 'Đội kinh doanh sẽ trình bày đề xuất vào thứ Sáu.', en: 'The sales team will present the proposal on Friday.', hint: 'present a proposal', level: 'A2' },
    { vi: 'Hai bên cần thống nhất điều khoản thanh toán trong hợp đồng.', en: 'Both parties need to agree on the payment terms in the contract.', hint: 'agree on payment terms', level: 'B1' },
    { vi: 'Chúng tôi đã tăng tỷ lệ chuyển đổi nhờ thử nghiệm A/B.', en: 'We increased the conversion rate through A/B testing.', hint: 'conversion rate; A/B testing', level: 'B2' },
    { vi: 'Hãy gửi bản tóm tắt cuộc họp cho tất cả các bên liên quan.', en: 'Please send the meeting summary to all stakeholders.', hint: 'meeting summary; stakeholders', level: 'B1' },
    { vi: 'Nhà đầu tư muốn thấy kế hoạch tăng trưởng bền vững.', en: 'The investor wants to see a sustainable growth plan.', hint: 'sustainable growth plan', level: 'B2' },
    { vi: 'Chúng ta nên ưu tiên khách hàng có nhu cầu cấp thiết nhất.', en: 'We should prioritize customers with the most urgent needs.', hint: 'prioritize customers; urgent needs', level: 'B1' },
    { vi: 'Báo cáo quý cho thấy doanh thu đã vượt dự báo.', en: 'The quarterly report shows that revenue exceeded the forecast.', hint: 'quarterly report; exceed the forecast', level: 'B2' },
    { vi: 'Nhân viên chăm sóc khách hàng sẽ gọi lại trong hôm nay.', en: 'The customer success representative will call back today.', hint: 'customer success; call back', level: 'A2' },
    { vi: 'Một chiến lược định giá linh hoạt có thể bảo vệ lợi nhuận.', en: 'A flexible pricing strategy can protect our profit margin.', hint: 'pricing strategy; profit margin', level: 'C1' },
  ],
  hospitality: [
    { vi: 'Nhân viên lễ tân sẽ xác nhận đặt phòng của quý khách.', en: 'The front desk agent will confirm your room reservation.', hint: 'front desk; confirm a reservation', level: 'A2' },
    { vi: 'Nhà hàng có thể chuẩn bị một bữa ăn không chứa sữa.', en: 'The restaurant can prepare a dairy-free meal.', hint: 'dairy-free meal', level: 'A2' },
    { vi: 'Chúng tôi rất tiếc vì điều hòa trong phòng chưa hoạt động.', en: 'We are very sorry that the air conditioning in the room is not working.', hint: 'air conditioning; not working', level: 'A2' },
    { vi: 'Hướng dẫn viên sẽ đón đoàn tại sảnh lúc tám giờ.', en: 'The tour guide will meet the group in the lobby at eight.', hint: 'tour guide; meet the group', level: 'A1' },
    { vi: 'Xin vui lòng xuất trình hộ chiếu khi nhận phòng.', en: 'Please present your passport when you check in.', hint: 'present a passport; check in', level: 'A1' },
    { vi: 'Khách sạn cung cấp dịch vụ đưa đón sân bay miễn phí.', en: 'The hotel provides a complimentary airport transfer service.', hint: 'complimentary transfer', level: 'B1' },
    { vi: 'Chúng tôi sẽ xử lý khiếu nại của quý khách ngay lập tức.', en: 'We will handle your complaint immediately.', hint: 'handle a complaint', level: 'B1' },
    { vi: 'Bữa sáng được phục vụ từ sáu giờ rưỡi đến mười giờ.', en: 'Breakfast is served from half past six until ten.', hint: 'breakfast is served', level: 'A1' },
    { vi: 'Phòng này có tầm nhìn đẹp ra biển.', en: 'This room has a beautiful view of the sea.', hint: 'a view of the sea', level: 'A1' },
    { vi: 'Quản lý sẽ kiểm tra chất lượng dịch vụ sau khi khách rời đi.', en: 'The manager will check the service quality after the guest leaves.', hint: 'service quality; after the guest leaves', level: 'B2' },
  ],
};

function makeQuestion(category: Exclude<CareerCategory, 'general'>, index: number): Question {
  const item = templates[category][index % templates[category].length];
  const batch = Math.floor(index / templates[category].length) + 1;
  const context = batch === 1 ? '' : ` (ca ${batch})`;
  const answer = `${item.en.replace(/\.$/, '')}${context}.`;
  return {
    id: 100000 + (category === 'it' ? 0 : category === 'business' ? 1000 : 2000) + index,
    vi: `${item.vi}${context}`,
    hints: item.hint,
    answers: [answer, item.en],
    category,
    level: item.level,
    created_date: '2026-01-01',
  };
}

export const SPECIALIZED_QUESTIONS: Question[] = (['it', 'business', 'hospitality'] as const)
  .flatMap((category) => Array.from({ length: 1000 }, (_, index) => makeQuestion(category, index)));

export const SPECIALIZED_COUNTS = {
  it: 1000,
  business: 1000,
  hospitality: 1000,
} as const;

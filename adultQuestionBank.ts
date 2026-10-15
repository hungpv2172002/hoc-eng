import { Question } from '../types';

type Frame = {
  vi: string;
  en: string;
  hint: string;
  items: Array<{ vi: string; en: string }>;
};

const today = () => new Date().toISOString().split('T')[0];

/**
 * A compact, hand-authored sentence bank. Each level contains ten useful
 * sentence frames and ten vocabulary choices per frame, yielding 100 varied
 * questions without storing a huge generated JSON file in the repository.
 */
function buildLevel(level: NonNullable<Question['level']>, startId: number, frames: Frame[]): Question[] {
  return frames.flatMap((frame, frameIndex) =>
    frame.items.map((item, itemIndex) => ({
      id: startId + frameIndex * 10 + itemIndex,
      vi: frame.vi.replace('{item}', item.vi),
      hints: `${frame.hint}; ${item.en} = ${item.vi}`,
      answers: [frame.en.replace('{item}', item.en)],
      created_date: today(),
      category: 'general',
      level,
    }))
  );
}

const A1_ITEMS = [
  ['táo', 'apples'], ['chuối', 'bananas'], ['bánh mì', 'bread'], ['cơm', 'rice'], ['trứng', 'eggs'],
  ['thịt gà', 'chicken'], ['cam', 'oranges'], ['mì', 'noodles'], ['sữa chua', 'yogurt'], ['bánh quy', 'cookies'],
].map(([vi, en]) => ({ vi, en }));
const A1_OBJECTS = [
  ['một chiếc bút', 'a pen'], ['một quyển vở', 'a notebook'], ['một chiếc ô', 'an umbrella'], ['một chiếc đồng hồ', 'a watch'],
  ['một cái túi', 'a bag'], ['một chiếc xe đạp', 'a bicycle'], ['một chiếc áo khoác', 'a jacket'], ['một chiếc điện thoại', 'a phone'],
  ['một chiếc chìa khóa', 'a key'], ['một chiếc mũ', 'a hat'],
].map(([vi, en]) => ({ vi, en }));
const A1_PLACES = [
  ['trường học', 'school'], ['siêu thị', 'the supermarket'], ['công viên', 'the park'], ['thư viện', 'the library'], ['bưu điện', 'the post office'],
  ['nhà ga', 'the station'], ['bệnh viện', 'the hospital'], ['bảo tàng', 'the museum'], ['bãi biển', 'the beach'], ['nhà hàng', 'the restaurant'],
].map(([vi, en]) => ({ vi, en }));
const A1_DRINKS = [
  ['nước lọc', 'water'], ['trà', 'tea'], ['cà phê', 'coffee'], ['nước cam', 'orange juice'], ['sữa', 'milk'],
  ['nước chanh', 'lemonade'], ['nước dừa', 'coconut water'], ['sô cô la nóng', 'hot chocolate'], ['sinh tố', 'a smoothie'], ['nước táo', 'apple juice'],
].map(([vi, en]) => ({ vi, en }));
const A1_CLOTHES = [
  ['áo len', 'a sweater'], ['quần dài', 'trousers'], ['đôi giày', 'shoes'], ['áo mưa', 'a raincoat'], ['khăn quàng', 'a scarf'],
  ['găng tay', 'gloves'], ['váy', 'a dress'], ['áo sơ mi', 'a shirt'], ['quần đùi', 'shorts'], ['đôi tất', 'socks'],
].map(([vi, en]) => ({ vi, en }));
const A1_ANIMALS = [
  ['một con mèo', 'a cat'], ['một con chó', 'a dog'], ['một con chim', 'a bird'], ['một con cá', 'a fish'], ['một con ngựa', 'a horse'],
  ['một con thỏ', 'a rabbit'], ['một con khỉ', 'a monkey'], ['một con bò', 'a cow'], ['một con gà', 'a chicken'], ['một con bướm', 'a butterfly'],
].map(([vi, en]) => ({ vi, en }));
const A1_BOOKS = [
  ['một cuốn truyện', 'a storybook'], ['một cuốn tiểu thuyết', 'a novel'], ['một tờ báo', 'a newspaper'], ['một tạp chí', 'a magazine'], ['một cuốn từ điển', 'a dictionary'],
  ['một cuốn truyện tranh', 'a comic book'], ['một cuốn sách nấu ăn', 'a cookbook'], ['một quyển sách giáo khoa', 'a textbook'], ['một lá thư', 'a letter'], ['một tấm bản đồ', 'a map'],
].map(([vi, en]) => ({ vi, en }));

const A1_FRAMES: Frame[] = [
  { vi: 'Tôi thích ăn {item}.', en: 'I like eating {item}.', hint: 'like eating = thích ăn', items: A1_ITEMS },
  { vi: 'Tôi có {item}.', en: 'I have {item}.', hint: 'have = có', items: A1_OBJECTS },
  { vi: 'Tôi nhìn thấy {item} trong công viên.', en: 'I see {item} in the park.', hint: 'see = nhìn thấy; in the park = trong công viên', items: A1_ANIMALS },
  { vi: 'Tôi muốn mua {item}.', en: 'I want to buy {item}.', hint: 'want to buy = muốn mua', items: A1_OBJECTS },
  { vi: 'Tôi đi đến {item} vào cuối tuần.', en: 'I go to {item} at the weekend.', hint: 'go to = đi đến; at the weekend = vào cuối tuần', items: A1_PLACES },
  { vi: 'Tôi uống {item} vào buổi sáng.', en: 'I drink {item} in the morning.', hint: 'drink = uống; in the morning = vào buổi sáng', items: A1_DRINKS },
  { vi: 'Tôi mặc {item} khi trời lạnh.', en: 'I wear {item} when it is cold.', hint: 'wear = mặc; when it is cold = khi trời lạnh', items: A1_CLOTHES },
  { vi: 'Tôi thường đọc {item} trước khi ngủ.', en: 'I often read {item} before bed.', hint: 'often = thường; before bed = trước khi ngủ', items: A1_BOOKS },
  { vi: 'Tôi muốn đến {item} hôm nay.', en: 'I want to go to {item} today.', hint: 'want to go = muốn đi; today = hôm nay', items: A1_PLACES },
  { vi: 'Tôi nhìn thấy {item} gần nhà.', en: 'I see {item} near my house.', hint: 'near my house = gần nhà', items: A1_ANIMALS },
];

const A2_ITEMS = [
  ['một lớp nấu ăn', 'a cooking class'], ['một chuyến đi ngắn', 'a short trip'], ['một bộ phim mới', 'a new film'], ['một chiếc xe buýt', 'a bus'], ['một căn phòng yên tĩnh', 'a quiet room'],
  ['một chiếc máy ảnh tốt', 'a good camera'], ['một công việc bán thời gian', 'a part-time job'], ['một nhà hàng địa phương', 'a local restaurant'], ['một khóa học trực tuyến', 'an online course'], ['một đôi giày thoải mái', 'comfortable shoes'],
].map(([vi, en]) => ({ vi, en }));
const A2_PLACES = [
  ['Đà Nẵng', 'Da Nang'], ['Hà Nội', 'Hanoi'], ['Hội An', 'Hoi An'], ['một thị trấn nhỏ', 'a small town'], ['một hòn đảo yên bình', 'a peaceful island'],
  ['vùng núi phía bắc', 'the northern mountains'], ['một khu chợ đêm', 'a night market'], ['một bảo tàng mới', 'a new museum'], ['một khu nghỉ dưỡng', 'a resort'], ['một ngôi làng ven biển', 'a coastal village'],
].map(([vi, en]) => ({ vi, en }));
const A2_SERVICES = [
  ['đổi lịch hẹn', 'reschedule the appointment'], ['giải thích hóa đơn', 'explain the bill'], ['gọi taxi', 'call a taxi'], ['đặt bàn', 'book a table'], ['sửa chiếc xe đạp', 'repair the bicycle'],
  ['gửi email', 'send an email'], ['mượn một cuốn sách', 'borrow a book'], ['in tài liệu', 'print the document'], ['đổi phòng', 'change the room'], ['hủy vé', 'cancel the ticket'],
].map(([vi, en]) => ({ vi, en }));

const A2_FRAMES: Frame[] = [
  { vi: 'Tôi đã lên kế hoạch cho {item}.', en: 'I have made plans for {item}.', hint: 'make plans for = lên kế hoạch cho', items: A2_ITEMS },
  { vi: 'Tôi dự định sẽ đến {item} vào mùa hè này.', en: 'I plan to visit {item} this summer.', hint: 'plan to visit = dự định đến thăm; this summer = mùa hè này', items: A2_PLACES },
  { vi: 'Bạn có thể giúp tôi {item} không?', en: 'Could you help me {item}?', hint: 'could you help me = bạn có thể giúp tôi', items: A2_SERVICES },
  { vi: 'Tôi đã từng thử {item}.', en: 'I have tried {item} before.', hint: 'have tried = đã từng thử; before = trước đây', items: A2_SERVICES },
  { vi: 'Chúng ta nên đặt {item} trước.', en: 'We should book {item} in advance.', hint: 'should = nên; in advance = trước', items: A2_ITEMS },
  { vi: 'Tôi thấy {item} khá hữu ích.', en: 'I find {item} quite useful.', hint: 'find ... useful = thấy ... hữu ích; quite = khá', items: A2_ITEMS },
  { vi: 'Tôi thường ghé qua {item} sau giờ làm.', en: 'I often stop by {item} after work.', hint: 'stop by = ghé qua; after work = sau giờ làm', items: A2_PLACES },
  { vi: 'Tôi cần thêm thời gian để {item}.', en: 'I need more time to {item}.', hint: 'need more time to = cần thêm thời gian để', items: A2_SERVICES },
  { vi: 'Thời tiết ở {item} thường dễ chịu.', en: 'The weather in {item} is usually pleasant.', hint: 'usually pleasant = thường dễ chịu', items: A2_PLACES },
  { vi: 'Tôi vui vì đã chọn {item}.', en: 'I am glad that I chose {item}.', hint: 'be glad = vui; choose = chọn', items: A2_ITEMS },
];

const B1_ITEMS = [
  ['cải thiện kỹ năng giao tiếp', 'improve communication skills'], ['làm việc với một nhóm đa quốc gia', 'work with a multicultural team'], ['học một ngôn ngữ mới', 'learn a new language'], ['tham gia hoạt động tình nguyện', 'join a volunteer activity'], ['duy trì thói quen lành mạnh', 'maintain a healthy habit'],
  ['đọc tin tức mỗi ngày', 'read the news every day'], ['lập kế hoạch cho tương lai', 'plan for the future'], ['giảm thời gian dùng điện thoại', 'reduce phone time'], ['bảo vệ môi trường', 'protect the environment'], ['cân bằng công việc và cuộc sống', 'balance work and life'],
].map(([vi, en]) => ({ vi, en }));
const B1_TOPICS = [
  ['giáo dục trực tuyến', 'online education'], ['giao thông công cộng', 'public transport'], ['làm việc từ xa', 'remote work'], ['du lịch bền vững', 'sustainable tourism'], ['thể thao học đường', 'school sports'],
  ['thói quen đọc sách', 'reading habits'], ['sức khỏe tinh thần', 'mental health'], ['năng lượng tái tạo', 'renewable energy'], ['văn hóa địa phương', 'local culture'], ['công nghệ trong lớp học', 'technology in the classroom'],
].map(([vi, en]) => ({ vi, en }));

const B1_FRAMES: Frame[] = [
  { vi: 'Tôi tin rằng {item} rất quan trọng trong cuộc sống hiện đại.', en: 'I believe that {item} is important in modern life.', hint: 'believe that = tin rằng; important = quan trọng', items: B1_TOPICS },
  { vi: 'Tôi đang cố gắng {item}.', en: 'I am trying to {item}.', hint: 'be trying to = đang cố gắng', items: B1_ITEMS },
  { vi: 'Theo tôi, {item} mang lại nhiều lợi ích.', en: 'In my opinion, {item} brings many benefits.', hint: 'in my opinion = theo tôi; benefits = lợi ích', items: B1_TOPICS },
  { vi: 'Tôi đã học được nhiều điều khi {item}.', en: 'I have learned a lot by {item}.', hint: 'learn a lot by = học được nhiều điều khi', items: B1_ITEMS },
  { vi: 'Một giải pháp cho vấn đề này là {item}.', en: 'One solution to this problem is to {item}.', hint: 'one solution = một giải pháp; problem = vấn đề', items: B1_ITEMS },
  { vi: 'Tôi muốn thảo luận thêm về {item}.', en: 'I would like to discuss {item} further.', hint: 'would like to discuss = muốn thảo luận; further = thêm', items: B1_TOPICS },
  { vi: 'Tôi nhận thấy {item} đang thay đổi nhanh chóng.', en: 'I have noticed that {item} is changing quickly.', hint: 'have noticed = nhận thấy; quickly = nhanh chóng', items: B1_TOPICS },
  { vi: 'Chúng ta có thể bắt đầu bằng cách {item}.', en: 'We can start by {item}.', hint: 'start by = bắt đầu bằng cách', items: B1_ITEMS },
  { vi: 'Tôi đồng ý rằng {item} cần được quan tâm hơn.', en: 'I agree that {item} deserves more attention.', hint: 'agree that = đồng ý rằng; deserve attention = cần được quan tâm', items: B1_TOPICS },
  { vi: 'Tôi hy vọng sẽ tiếp tục {item} trong năm tới.', en: 'I hope to continue to {item} next year.', hint: 'hope to continue = hy vọng tiếp tục; next year = năm tới', items: B1_ITEMS },
];

const B2_ITEMS = [
  ['phân tích dữ liệu khách hàng', 'analyze customer data'], ['đánh giá hiệu quả của chiến dịch', 'evaluate the campaign performance'], ['tối ưu hóa quy trình làm việc', 'optimize the workflow'], ['xây dựng kế hoạch dự phòng', 'develop a contingency plan'], ['đào tạo nhân viên mới', 'train new employees'],
  ['triển khai hệ thống an toàn hơn', 'deploy a safer system'], ['thuyết phục các bên liên quan', 'persuade the stakeholders'], ['giảm chi phí vận hành', 'reduce operating costs'], ['mở rộng sang thị trường mới', 'expand into a new market'], ['giải quyết nguyên nhân gốc rễ', 'address the root cause'],
].map(([vi, en]) => ({ vi, en }));
const B2_TOPICS = [
  ['sự minh bạch trong quản trị', 'transparency in governance'], ['tự động hóa quy trình', 'process automation'], ['bảo mật dữ liệu cá nhân', 'personal data security'], ['chuỗi cung ứng linh hoạt', 'a resilient supply chain'], ['văn hóa phản hồi cởi mở', 'an open feedback culture'],
  ['đầu tư dài hạn vào nhân sự', 'long-term investment in people'], ['tiêu chuẩn dịch vụ nhất quán', 'consistent service standards'], ['chiến lược tăng trưởng có trách nhiệm', 'a responsible growth strategy'], ['hợp tác giữa các phòng ban', 'cross-department collaboration'], ['mục tiêu giảm phát thải', 'emission-reduction targets'],
].map(([vi, en]) => ({ vi, en }));

const B2_FRAMES: Frame[] = [
  { vi: 'Để đạt mục tiêu, công ty cần {item}.', en: 'To achieve its goal, the company needs to {item}.', hint: 'to achieve its goal = để đạt mục tiêu; need to = cần', items: B2_ITEMS },
  { vi: 'Ban lãnh đạo đang xem xét {item}.', en: 'The leadership team is considering {item}.', hint: 'leadership team = ban lãnh đạo; consider = xem xét', items: B2_TOPICS },
  { vi: 'Chúng tôi phải cân nhắc kỹ trước khi {item}.', en: 'We must think carefully before we {item}.', hint: 'think carefully = cân nhắc kỹ; before = trước khi', items: B2_ITEMS },
  { vi: 'Báo cáo cho thấy {item} có thể tạo ra lợi thế cạnh tranh.', en: 'The report shows that {item} could create a competitive advantage.', hint: 'report shows = báo cáo cho thấy; competitive advantage = lợi thế cạnh tranh', items: B2_TOPICS },
  { vi: 'Nếu {item}, chúng ta sẽ tiết kiệm được nhiều thời gian.', en: 'If we {item}, we will save a great deal of time.', hint: 'if = nếu; save time = tiết kiệm thời gian', items: B2_ITEMS },
  { vi: 'Nhóm đã thống nhất sẽ ưu tiên {item}.', en: 'The team agreed to prioritize {item}.', hint: 'agree to prioritize = thống nhất ưu tiên', items: B2_ITEMS },
  { vi: 'Một thách thức lớn là đảm bảo {item}.', en: 'A major challenge is ensuring {item}.', hint: 'major challenge = thách thức lớn; ensure = đảm bảo', items: B2_TOPICS },
  { vi: 'Chúng tôi cần bằng chứng rõ ràng trước khi đầu tư vào {item}.', en: 'We need clear evidence before investing in {item}.', hint: 'clear evidence = bằng chứng rõ ràng; invest in = đầu tư vào', items: B2_TOPICS },
  { vi: 'Kế hoạch mới sẽ giúp doanh nghiệp {item}.', en: 'The new plan will help the business {item}.', hint: 'new plan = kế hoạch mới; help the business = giúp doanh nghiệp', items: B2_ITEMS },
  { vi: 'Tôi cho rằng {item} nên được đo lường thường xuyên.', en: 'I believe that {item} should be measured regularly.', hint: 'should be measured = nên được đo lường; regularly = thường xuyên', items: B2_TOPICS },
];

const C1_ITEMS = [
  ['thiết lập một khung quản trị minh bạch', 'establish a transparent governance framework'], ['đánh giá tác động dài hạn của chính sách', 'assess the long-term impact of the policy'], ['điều phối lợi ích của nhiều bên liên quan', 'coordinate the interests of multiple stakeholders'], ['củng cố khả năng chống chịu của tổ chức', 'strengthen the organization\'s resilience'], ['đầu tư có chọn lọc vào đổi mới sáng tạo', 'invest selectively in innovation'],
  ['giảm thiểu những hệ quả ngoài dự kiến', 'mitigate unintended consequences'], ['xây dựng sự đồng thuận trong cộng đồng', 'build consensus within the community'], ['bảo vệ quyền riêng tư trong kỷ nguyên số', 'protect privacy in the digital age'], ['diễn giải dữ liệu một cách có trách nhiệm', 'interpret data responsibly'], ['cân bằng tăng trưởng với phát triển bền vững', 'balance growth with sustainable development'],
].map(([vi, en]) => ({ vi, en }));
const C1_TOPICS = [
  ['những cải cách thể chế sâu rộng', 'far-reaching institutional reforms'], ['một chiến lược chuyển đổi số toàn diện', 'a comprehensive digital-transformation strategy'], ['mô hình kinh tế tuần hoàn', 'a circular-economy model'], ['sự phân cực ngày càng gia tăng', 'increasing polarization'], ['tiêu chuẩn đạo đức nhất quán', 'consistent ethical standards'],
  ['cách tiếp cận dựa trên bằng chứng', 'an evidence-based approach'], ['tầm nhìn dài hạn cho giáo dục', 'a long-term vision for education'], ['cơ chế hợp tác xuyên biên giới', 'a cross-border cooperation mechanism'], ['các rủi ro địa chính trị mới nổi', 'emerging geopolitical risks'], ['một nền văn hóa học hỏi liên tục', 'a culture of continuous learning'],
].map(([vi, en]) => ({ vi, en }));

const C1_FRAMES: Frame[] = [
  { vi: 'Một cách tiếp cận thận trọng là {item}.', en: 'A prudent approach would be to {item}.', hint: 'prudent approach = cách tiếp cận thận trọng; would be to = là nên', items: C1_ITEMS },
  { vi: 'Cuộc tranh luận hiện nay tập trung vào {item}.', en: 'The current debate centers on {item}.', hint: 'current debate = cuộc tranh luận hiện nay; center on = tập trung vào', items: C1_TOPICS },
  { vi: 'Chính sách chỉ có ý nghĩa nếu nó có thể {item}.', en: 'The policy is meaningful only if it can {item}.', hint: 'meaningful only if = chỉ có ý nghĩa nếu', items: C1_ITEMS },
  { vi: 'Các chuyên gia cảnh báo rằng {item} có thể làm trầm trọng thêm bất bình đẳng.', en: 'Experts warn that {item} could exacerbate inequality.', hint: 'warn that = cảnh báo rằng; exacerbate inequality = làm trầm trọng thêm bất bình đẳng', items: C1_TOPICS },
  { vi: 'Việc cân nhắc {item} đòi hỏi sự phối hợp liên ngành.', en: 'Addressing {item} requires interdisciplinary coordination.', hint: 'addressing = việc giải quyết; interdisciplinary = liên ngành', items: C1_TOPICS },
  { vi: 'Chúng ta không nên đánh giá thấp tầm quan trọng của việc cố gắng {item}.', en: 'We should not underestimate the importance of making an effort to {item}.', hint: 'underestimate = đánh giá thấp; importance = tầm quan trọng', items: C1_ITEMS },
  { vi: 'Một hệ quả khó tránh khỏi là {item}.', en: 'An inevitable consequence is {item}.', hint: 'inevitable consequence = hệ quả khó tránh khỏi', items: C1_TOPICS },
  { vi: 'Báo cáo nhấn mạnh nhu cầu cấp thiết phải {item}.', en: 'The report underscores the pressing need to {item}.', hint: 'underscore = nhấn mạnh; pressing need = nhu cầu cấp thiết', items: C1_ITEMS },
  { vi: 'Một thỏa hiệp khả thi có thể bao gồm việc {item}.', en: 'A viable compromise could involve an effort to {item}.', hint: 'viable compromise = thỏa hiệp khả thi; involve = bao gồm', items: C1_ITEMS },
  { vi: 'Để duy trì niềm tin công chúng, các cơ quan cần quan tâm đến {item}.', en: 'To maintain public trust, institutions must address {item}.', hint: 'maintain public trust = duy trì niềm tin công chúng', items: C1_TOPICS },
];

export const ADULT_QUESTION_BANK: Question[] = [
  ...buildLevel('A1', 5001, A1_FRAMES),
  ...buildLevel('A2', 5101, A2_FRAMES),
  ...buildLevel('B1', 5201, B1_FRAMES),
  ...buildLevel('B2', 5301, B2_FRAMES),
  ...buildLevel('C1', 5401, C1_FRAMES),
];


# NHẬT KÝ CỘNG TÁC AI THEO SESSION

## Phát triển và triển khai sản phẩm CivicPath AI

**Dự án:** CivicPath AI — AI-guided public service procedures  
**Phạm vi:** xây dựng backend, frontend, nghiệp vụ sản phẩm, UI/UX, kiểm thử, tích hợp và deploy  
**Thời gian:** 17–18/07/2026  
**Nguồn:** lịch sử session Codex thực tế gắn với đúng thư mục dự án  
**Múi giờ trong nhật ký:** UTC+7, Asia/Ho_Chi_Minh

Nhật ký giữ lại gần như toàn bộ các lần hỏi có tác động đáng kể đến việc hình thành, hoàn thiện hoặc triển khai sản phẩm. Câu hỏi được sửa lỗi chính tả nhẹ và rút gọn phần đề bài lặp lại, nhưng không thay đổi ý nghĩa. Các trao đổi chỉ về slide, README trình bày, ảnh GIF, thông tin thành viên, thao tác chạy/dừng lặp lại hoặc chỉnh sửa rất nhỏ không ảnh hưởng sản phẩm đã được loại.

## Tổng quan các session được sử dụng

| STT | Session ID | Thời gian | Trọng tâm |
|---|---|---|---|
| 1 | `019f6ef2-1d44-7ab3-8d82-a5752cb80f49` | 17/07, 14:27–15:48 | Xây dựng backend, mô hình nhiều case, rule engine, OpenAI và luồng tích hợp frontend |
| 2 | `019f6f7d-47dc-78d2-b290-ccaea6539413` | 17/07, 16:52 – 18/07, 15:57 | Xây dựng gần như toàn bộ frontend, tính năng sản phẩm, cổng cán bộ, UI/UX, Tailwind và deploy production |
| 3 | `019f6f82-98f3-7640-b95e-b8a6e3170439` | 17/07, 16:57–17:05 | Đọc tài liệu nguồn trong `raw/` và rà soát tính đúng đắn của backend |
| 4 | `019f75c2-1499-7271-a81d-96ea2c3f505b` | 18/07, 22:05–22:13 | Chẩn đoán và sửa lỗi font khác nhau giữa máy phát triển và máy người dùng |
| 5 | `019f75cf-7a16-7990-a26d-4e0a98380a92` | 18/07, 22:20–22:46 | Kiểm tra ảnh lỗi production, sửa tách chữ tiếng Việt và hoàn tất tương thích trình duyệt |

---

## Session 1 — Xây dựng backend lõi và luồng nghiệp vụ

**Session ID:** `019f6ef2-1d44-7ab3-8d82-a5752cb80f49`

| Thời gian | Yêu cầu thực tế của người dùng | AI đã hỗ trợ và kết quả |
|---|---|---|
| 17/07, 14:27 | Xây dựng backend cho đề bài “AI-guided public service procedures”, tập trung sâu vào đăng ký khai sinh; phải có guided intake, pre-submission check và khả năng tích hợp qua API. Kiến trúc cần tách rule engine tất định khỏi LLM và bám nguồn pháp lý. | AI phân tích yêu cầu, phát hiện mô hình một `case_id` không đủ cho trường hợp kết hợp và `precheck_results` chưa lưu đủ cách sửa/căn cứ pháp lý. AI đề xuất `session_cases`, giữ case chính để hiển thị và bổ sung dữ liệu kết quả kiểm tra. |
| 17/07, 14:30 | Làm rõ `sessions.case_id` chỉ là case chính để hiển thị; `session_cases` là nguồn sự thật. Checklist và rule phải lấy hợp của tất cả case, khử trùng giấy tờ nhưng gộp đầy đủ căn cứ pháp lý. | AI triển khai backend trong `backend/`: schema, migration, seed, `session_cases`, rule engine, OpenAI Responses API với Structured Outputs, sáu endpoint và cơ chế UNION/de-duplicate checklist. Kết quả: 13 test đạt, `alembic check` sạch, HTTP smoke test đạt, PostgreSQL healthy. |
| 17/07, 15:10 | “Chạy backend cho tôi đi.” | AI khởi động PostgreSQL và FastAPI, xác nhận `/health` trả `200 OK`, Swagger và API hoạt động tại cổng 8000. |
| 17/07, 15:14 | “Giờ flow sử dụng sẽ như thế nào?” | AI mô tả và kiểm tra luồng hoàn chỉnh: tạo phiên → hội thoại intake → xác định một hoặc nhiều case → sinh checklist → điền form → precheck → sửa lỗi → ready. AI làm rõ rule engine tự tính quá hạn, checklist hợp nhiều case và session có thể khôi phục. |
| 17/07, 15:16–15:22 | Người dùng báo đã có OpenAI key và yêu cầu chạy lại. | AI kiểm tra tên biến mà không làm lộ giá trị, sửa `OPEN_API_KEY` thành `OPENAI_API_KEY`, restart backend và gọi intake thật. Kết quả live: OpenAI hoạt động, confidence `0.9`, nhận diện case `standard`; đồng thời sửa cờ “cần cán bộ” bị bật sai khi chỉ thiếu trường thông thường. |
| 17/07, 15:29 | Cần URL theo IP để frontend ở máy khác trong cùng mạng sử dụng backend. | AI cho backend lắng nghe đúng giao diện mạng, xác nhận truy cập LAN và cung cấp base URL nội bộ cùng Swagger/health endpoint để tích hợp frontend. |
| 17/07, 15:32 | Tạo prompt phân tích và triển khai frontend dựa trên backend thật. | AI tạo đặc tả frontend đầy đủ từ OpenAPI: route, state flow, API flow, component, form động theo case, checklist nhiều case, precheck, legal basis, error handling, accessibility, mobile/desktop và 15 acceptance criteria. |

**Kết quả chính của session:** backend lõi chạy được end-to-end, mô hình dữ liệu hỗ trợ nhiều case đồng thời, rule engine và LLM có vai trò tách biệt, OpenAI live intake hoạt động và API sẵn sàng cho frontend.

---

## Session 2 — Phát triển sản phẩm từ frontend đầu tiên đến production

**Session ID:** `019f6f7d-47dc-78d2-b290-ccaea6539413`

### Giai đoạn 2.1 — Dựng frontend và tích hợp backend

| Thời gian | Yêu cầu thực tế của người dùng | AI đã hỗ trợ và kết quả |
|---|---|---|
| 17/07, 16:52–16:55 | Đóng vai Senior Frontend Engineer kiêm UX Designer; đọc OpenAPI thật, không tự đoán field; dùng Next.js + TypeScript, native fetch; triển khai frontend end-to-end cho guided intake, checklist, form, precheck và session restore. | AI phân tích contract thật rồi tạo frontend Next.js + TypeScript gồm landing page, `/session/[sessionId]`, API client, types, session state, chat, case badges, checklist, form động và kết quả precheck. Test, TypeScript và production build đạt. |
| 17/07, 17:27 | “Viết lại cho tôi vào folder `frontend`, sao lại viết vào folder root?” | AI chuyển toàn bộ frontend vào đúng `frontend/`, khôi phục root, chạy lại test và production build thành công. |

### Giai đoạn 2.2 — PDF, giọng nói và khả năng tiếp cận

| Thời gian | Yêu cầu thực tế của người dùng | AI đã hỗ trợ và kết quả |
|---|---|---|
| 17/07, 17:53 | Tận dụng biểu mẫu trong `raw/` để sau khi điền có thể xem trước, xuất PDF và đối chiếu thông tin/căn cứ cho đáng tin cậy. | AI đọc mẫu Word và tài liệu thủ tục, đề xuất luồng ready → hoàn thiện tờ khai → đối chiếu → xem trước PDF → tải PDF; xác định các trường còn thiếu và yêu cầu PDF chỉ dùng dữ liệu thực đã lưu. |
| 17/07, 17:57 | Thêm phần ghi âm cho người không rành công nghệ, giao diện phải trực quan và dễ hiểu. | AI thiết kế luồng dùng Web API sẵn có: bấm micro → ghi âm → backend chuyển thành chữ → người dùng nghe/đọc lại → sửa transcript → gửi. AI giữ nhập văn bản làm phương án dự phòng và không đưa OpenAI key ra frontend. |
| 17/07, 18:06 | “Triển khai đi.” | AI triển khai `MediaRecorder` phía frontend và `/intake/audio` phía backend. Luồng hỗ trợ WebM, M4A, MP3, WAV; giới hạn 90 giây/10 MB; không lưu audio vào database; xử lý quyền micro, trình duyệt không hỗ trợ, lỗi mạng và lỗi AI. Backend, frontend test và build đạt. |
| 17/07, 18:24–18:31 | Ghi âm nhận sai ngôn ngữ; yêu cầu tiếp tục sửa. | AI ép `language="vi"`, thêm ngữ cảnh tiếng Việt, chuyển sang `gpt-4o-transcribe`, chạy bản ghi thử thực tế và xác nhận transcript tiếng Việt đúng. Backend 18/18 test, frontend test đạt. |
| 17/07, 18:31 | UI ghi âm xấu, trạng thái lỗi không hợp giao diện; đồng thời cần trang quản lý cho ủy ban/cấp trên. | AI thiết kế lại đủ trạng thái ghi âm: bắt đầu, đang nghe, đang xử lý, nghe lại và lỗi. AI cũng chỉ ra không thể mở dashboard công khai khi chưa có xác thực và đề xuất tách quyền cán bộ. |
| 17/07, 18:38 | Đưa kết quả kiểm tra xuống dưới form; thêm phần xem demo và tải PDF với dữ liệu đã điền. | AI chuyển precheck xuống dưới form, thêm PDF A4 xem trực tiếp, mở toàn màn hình và tải xuống; PDF chỉ điền dữ liệu sau precheck. Kết quả: backend 19/19 test, frontend test/build đạt, PDF tiếng Việt được render và kiểm tra trực quan. |

### Giai đoạn 2.3 — Cổng cán bộ và nghiệp vụ quản lý

| Thời gian | Yêu cầu thực tế của người dùng | AI đã hỗ trợ và kết quả |
|---|---|---|
| 17/07, 18:47 | Tạo trang quản lý cho ủy ban/chính quyền để theo dõi phiên, trường hợp và thắc mắc của phụ huynh trong khi public app vẫn dùng được. | AI triển khai `/admin` với xác thực, thống kê, trạng thái, nhóm case, câu hỏi và chi tiết phiên. Public app giữ nguyên. Backend 20 test đạt; frontend test, TypeScript và build production đạt. |
| 17/07, 20:08 | Bổ sung CRUD, phân trang, xem PDF của từng phiên và popup chi tiết trực quan cho cán bộ. | AI triển khai CRUD phiên, phân trang backend 10 phiên/trang, popup lớn có tab Tổng quan/Biểu mẫu/PDF, PDF có xác thực, xác nhận hai bước khi xóa, keyboard focus và native dialog. AI ghi rõ PDF chỉ là bản xem trước biểu mẫu, không phải giấy khai sinh chính thức. |
| 17/07, 20:25 | Việc nhấn tạo phiên trong trang quản lý sinh bản ghi rỗng dù chưa có trao đổi; yêu cầu kiểm tra nghiệp vụ. | AI xác định nút tạo phiên phía admin không hợp luồng, xóa nút và endpoint tạo phiên rỗng; phiên mới chỉ sinh từ luồng người dân. Dữ liệu cũ không bị tự ý xóa. Backend 23 test, frontend test và build đạt. |

### Giai đoạn 2.4 — Thiết kế sản phẩm, niềm tin và khả năng giải thích

| Thời gian | Yêu cầu thực tế của người dùng | AI đã hỗ trợ và kết quả |
|---|---|---|
| 17/07, 19:09 | Thiết kế lại trang đầu thành trang giới thiệu sản phẩm “wow” nhưng chuyên nghiệp, đơn giản, dễ sử dụng; có animation và dẫn chứng liên hệ với nghiệp vụ. | AI redesign landing page với hero, hành trình nghiệp vụ, bento bất đối xứng và phần minh bạch. Motion dùng CSS + `IntersectionObserver`, hỗ trợ `prefers-reduced-motion`, không thêm dependency. Test và build đạt. |
| 17/07, 19:18–19:30 | Thiết kế high-end cho trang cán bộ và trang trao đổi; sau đó kiểm tra landing page đã thể hiện đủ ba vấn đề của đề bài chưa. | AI chuyển dashboard sang command center, đồng bộ chat/ghi âm/checklist/form/precheck/PDF với visual system. AI audit nội dung và phát hiện vấn đề “quá tải hỗ trợ, phải đi lại nhiều lần” còn thể hiện yếu. |
| 17/07, 19:30 | “Triển khai đi” phần vấn đề còn thiếu. | AI thêm section ba pain point: không biết chuẩn bị gì, chỉ phát hiện sai sau khi nộp và quá tải hỗ trợ; ghi rõ phạm vi demo đăng ký khai sinh. Test, TypeScript và build đạt. |
| 17/07, 19:34 | Website chưa đủ uy tín; cần dùng các URL từ Cổng Dịch vụ công Quốc gia và thể hiện đúng vai trò của model AI, không tuyên bố sai về huấn luyện. | AI triển khai “Nguồn và phương pháp kiểm chứng”, đưa sáu link gốc vào backend `/trust`, công khai vai trò AI/rule engine/cán bộ và xác nhận không có fine-tuning. OpenAPI, 21 backend test và frontend build đạt. |
| 17/07, 19:46 | Audit toàn bộ ứng dụng so với đề bài cuộc thi. | AI đánh giá sản phẩm đạt khoảng 75–80%: guided intake và pre-submission check khá hoàn chỉnh; API integration có nhưng chưa chứng minh widget nhúng; cổng cán bộ mới giải quyết một phần giảm tải. AI nêu rõ điểm mạnh, khoảng trống và ưu tiên tiếp theo thay vì tuyên bố đã đáp ứng toàn bộ. |
| 17/07, 19:55 | Thiết kế lại phần nguồn tham khảo đang khó nhìn. | AI chuyển phần nguồn sang bố cục editorial, hiển thị số nguồn, đơn vị công bố, ngày rà soát và link mở nguồn; dữ liệu vẫn lấy từ `/trust`, không tự bổ sung nội dung pháp lý. Test, TypeScript và build đạt. |
| 17/07, 20:02 | Phần nhận diện case bên trao đổi chưa tối ưu; cần dễ hiểu và trực quan. | AI làm nổi case chính, liệt kê case phụ và tác động đến checklist, thêm trạng thái chưa đủ dữ kiện cùng nhãn “cần cán bộ”, tối ưu mobile. Test/build đạt. |
| 17/07, 20:27 | Kiểm tra hệ thống có phân tích được nhiều case kết hợp, ví dụ cha mẹ chưa đăng ký kết hôn và quá hạn 60 ngày hay không. | AI chạy trực tiếp logic và xác nhận hệ thống lưu đồng thời `out_of_wedlock` + `overdue`; rule engine xác định mốc quá hạn, case chính theo ưu tiên, checklist/rule lấy hợp nhiều case. Kiểm tra biên xác nhận đúng 60 ngày chưa quá hạn, từ 61 ngày là quá hạn. |
| 17/07, 20:32–20:41 | Đổi headline cho đúng chủ đề AI-guided; viết lại hành trình bốn bước bớt công nghiệp; sửa khối nội dung nhỏ và bị khuất. | AI đổi hero thành “AI hỗ trợ làm giấy khai sinh”, thay thuật ngữ kỹ thuật bằng ngôn ngữ đời thường, tăng kích thước/độ tương phản/khoảng thở và bỏ hiệu ứng gây khuất. Responsive và build đạt. |
| 17/07, 20:52 | Khi case “tiêu chuẩn” xuất hiện đột ngột, người dùng không hiểu; cần giải thích vì sao hệ thống phân loại. | AI bổ sung mô tả case từ backend và mục “Vì sao hệ thống xác định như vậy?”, đồng thời yêu cầu trợ lý giải thích dữ kiện dẫn tới từng case kết hợp. Backend 23 test, frontend test, TypeScript và build đạt. |
| 17/07, 22:52 | Nếu AI không fine-tune thì có lệch đề bài hay không. | AI làm rõ đề bài yêu cầu giải pháp dùng AI chứ không bắt buộc tự huấn luyện. AI mô tả kiến trúc hybrid: AI hiểu ngôn ngữ/trích dữ kiện/hỏi làm rõ, rule engine kiểm tra chắc chắn, AI giải thích và cán bộ xử lý ngoại lệ; đây là lựa chọn an toàn hơn cho thủ tục thay đổi theo quy định. |

### Giai đoạn 2.5 — Sửa luồng form và phản hồi tương tác

| Thời gian | Yêu cầu thực tế của người dùng | AI đã hỗ trợ và kết quả |
|---|---|---|
| 17/07, 19:44 | Nút tải PDF chưa rõ; case chuẩn có cha mẹ nhưng form lại thiếu trường tên cha. | AI sửa nguyên nhân ở form động: case chuẩn luôn hiển thị/gửi họ tên cha; case chưa đăng ký kết hôn chỉ yêu cầu khi chọn ghi tên cha. CTA đổi thành “Tải bản PDF · Lưu về thiết bị”. Các test dữ liệu cha, TypeScript và build đạt. |
| 17/07, 20:56 | Có thể lấy thông tin đã chat để điền sẵn form, người dùng chỉ bổ sung phần thiếu hay không. | AI triển khai `form_data` trong `/intake/message`, tự điền dữ kiện trích từ hội thoại ngay lập tức và theo dõi trường người dùng đã sửa để AI không ghi đè. Backend 23 test, frontend 3 test và build đạt. |
| 17/07, 21:01 | Khi gửi tin nhắn, cần đưa tin vào box chat ngay thay vì giữ ở input cho tới khi AI trả lời. | AI triển khai optimistic UI: tin nhắn xuất hiện ngay kèm animation, input được làm trống, loading hiện tức thời; nếu API lỗi thì gỡ tin nhắn tạm và trả nội dung về input. Test/build đạt. |
| 18/07, 10:50 | Nhiều lỗi precheck làm trang kéo quá dài; cột phải của form còn trống. | AI chuyển kết quả lỗi sang cột phải, giới hạn chiều cao và cuộn riêng, thu gọn chi tiết/căn cứ, thêm trạng thái chờ kiểm tra; PDF nằm dưới toàn bộ quy trình. Frontend test và production build đạt. |

### Giai đoạn 2.6 — Chuyển đổi Tailwind và hoàn thiện hệ thống thị giác

| Thời gian | Yêu cầu thực tế của người dùng | AI đã hỗ trợ và kết quả |
|---|---|---|
| 17/07, 23:27 | Chuyển toàn bộ CSS thuần sang Tailwind CSS và cập nhật dự án. | AI chuyển frontend sang Tailwind CSS 4, PostCSS và Roboto Variable; chuyển landing, session, form, checklist, PDF viewer và admin sang utility classes. CSS toàn cục giảm từ hơn 5.000 dòng còn 137 dòng, chỉ giữ theme token, accessibility và keyframe. Test, TypeScript và production build đạt. |
| 18/07, 11:13 | Sau khi chuyển Tailwind, giao diện thay đổi nhiều; cần giữ nguyên tông màu và phục hồi chất lượng high-end. | AI redesign lại landing, session và admin bằng Tailwind nhưng giữ palette/Roboto; khôi phục bento bất đối xứng, double-bezel, typography, motion và responsive. Bốn test và build production đạt. |
| 18/07, 15:49–15:57 | Tiêu đề tiếng Việt bị dẫm chữ; yêu cầu kiểm tra các lỗi tương tự trên toàn giao diện. | AI giảm cỡ tối đa, nới line-height/letter-spacing, audit landing, CTA và admin, sửa header/CTA ở màn hình 320 px; xác nhận không còn line-height dưới 1. Bốn test, TypeScript và production build đạt. |

### Giai đoạn 2.7 — Deploy Render, Vercel và Neon

| Thời gian | Yêu cầu thực tế của người dùng | AI đã hỗ trợ và kết quả |
|---|---|---|
| 18/07, 09:40 | Chuẩn bị deploy backend lên Render, frontend lên Vercel và dùng `NEO_CONNECTION` cho Neon. | AI thêm `render.yaml`, hỗ trợ `NEO_CONNECTION`, migration production và cấu hình monorepo; kiểm tra backend 24/24 test, frontend 3/3 test và Vercel production build thành công. |
| 18/07, 09:57 | Người dùng xác nhận đã thêm Neon connection. | AI kiểm tra an toàn và xác nhận backend đã nạp `NEO_CONNECTION`, đang dùng Neon làm database chính. |
| 18/07, 10:27–10:30 | Cần điền cấu hình Render và chưa thấy các bảng trên Neon. | AI chỉ rõ root `backend`, build/start command FastAPI, biến môi trường, health path và CORS. AI xác định thêm connection string chưa tạo bảng; hướng dẫn/chạy Alembic migration để sinh schema trên Neon. |
| 18/07, 10:43 | UI báo chưa kết nối backend dù vẫn tạo được phiên sau deploy. | AI nhận diện Render cold start làm health check timeout, tăng thời gian chờ lên 70 giây và chuyển trạng thái online khi tạo phiên thành công. Frontend test đạt. |
| 18/07, 10:44 | Phản hồi AI production chậm; yêu cầu tăng tốc API. | AI chuyển hội thoại sang `gpt-4.1-mini`, giới hạn output, tái sử dụng OpenAI client và bỏ lượt AI thừa ở precheck. Backend 25/25 test đạt; yêu cầu redeploy Render để áp dụng. |
| 18/07, 11:05 | UI vẫn hiển thị “Chưa kết nối được backend”. | AI tìm root cause thứ hai: hai nút tạo phiên giữ trạng thái health riêng nên một badge bị kẹt. AI đồng bộ trạng thái sau mọi API thành công; test 4/4 và build đạt. |
| 18/07, 11:08 | Cung cấp URL Render và Vercel production để kiểm tra. | AI kiểm tra trực tiếp production: Render `/health` trả 200, CORS đúng origin Vercel, bundle Vercel dùng đúng backend nhưng chưa chứa bản sửa mới. AI yêu cầu push/redeploy và hard refresh. |

**Kết quả chính của session:** sản phẩm đi từ frontend ban đầu đến một hệ thống hoàn chỉnh gồm hội thoại AI, voice tiếng Việt, multi-case, checklist, form tự điền, precheck, PDF, trust sources, admin CRUD, responsive UI và production trên Render/Vercel/Neon.

---

## Session 3 — Đọc tài liệu nguồn và rà soát nghiệp vụ backend

**Session ID:** `019f6f82-98f3-7640-b95e-b8a6e3170439`

| Thời gian | Yêu cầu thực tế của người dùng | AI đã hỗ trợ và kết quả |
|---|---|---|
| 17/07, 16:57 | “Hãy đọc thêm các tài liệu trong folder `raw`.” | AI đọc toàn bộ 10 tệp: bảy PDF thủ tục và ba biểu mẫu Word; phân loại các thủ tục đăng ký khai sinh lưu động, đăng ký cho người đã có hồ sơ, cấp bản sao trích lục và hai luồng liên thông BHYT/thường trú. AI trích thêm các trường dữ liệu cần cho tờ khai và đối chiếu với dữ liệu seed. |
| 17/07, 17:02 | Sau khi đọc tài liệu, backend có cần sửa hay không. | AI audit và chỉ ra ba vấn đề nghiệp vụ: không đồng nhất “cha mẹ chưa kết hôn” với “yêu cầu nhận cha/con”; không được bắt buộc một loại chứng cứ duy nhất vì còn nhánh cam đoan và người làm chứng; cần rà lại mapping thủ tục `reregistration` và quy tắc giấy tờ nước ngoài. Session này dừng ở phân tích, không ghi nhận đã triển khai các sửa đổi đó. |

**Kết quả chính của session:** mở rộng hiểu biết từ tài liệu nguồn và xác định các giới hạn pháp lý/nghiệp vụ cần thận trọng, tránh để rule engine diễn giải thủ tục quá cứng hoặc sai phạm vi.

---

## Session 4 — Sửa font production giữa macOS và các máy khác

**Session ID:** `019f75c2-1499-7271-a81d-96ea2c3f505b`

| Thời gian | Yêu cầu thực tế của người dùng | AI đã hỗ trợ và kết quả |
|---|---|---|
| 18/07, 22:05–22:10 | Web deploy hiển thị bình thường trên Mac của người phát triển nhưng xấu trên Edge, Chrome và Cốc Cốc ở máy khác; yêu cầu tìm nguyên nhân và sửa. | AI kiểm tra source và phát hiện font import có family `Roboto Variable` nhưng CSS gọi `Roboto`; Mac có font cài sẵn nên che lấp lỗi, máy khác fallback sang Segoe UI. AI sửa theme dùng đúng `Roboto Variable`, chạy 4/4 test và production build thành công. |

**Kết quả chính của session:** font được đóng gói và gọi đúng family, loại bỏ sự phụ thuộc vào font cài sẵn trên máy phát triển.

---

## Session 5 — Sửa lỗi tách chữ tiếng Việt và kiểm tra cross-browser

**Session ID:** `019f75cf-7a16-7990-a26d-4e0a98380a92`  
**Tên session trong Codex:** `Fix cross-browser Vercel issues`

| Thời gian | Yêu cầu thực tế của người dùng | AI đã hỗ trợ và kết quả |
|---|---|---|
| 18/07, 22:20 | Người dùng gửi bốn ảnh production: web bình thường trên một máy nhưng lỗi trên các trình duyệt/máy khác; yêu cầu sửa và kiểm tra lại. | AI phân tích ảnh và reproduction, loại bỏ `text-wrap: balance` gây tách chữ/sai khoảng cách trên một số engine. AI kiểm tra test, TypeScript, production build và viewport 375/552/768/1440 px; không còn tràn ngang hoặc lỗi console trong bản local. |
| 18/07, 22:43 | Đã fix và deploy lại nhưng ảnh mới cho thấy lỗi vẫn còn. | AI tiếp tục điều tra thay vì coi lần sửa trước đã đủ; phát hiện Georgia tách glyph tiếng Việt trên một số máy. AI chuyển phần chữ nghiêng sang Roboto italic có subset tiếng Việt, kiểm tra desktop/mobile và production build đạt; hướng dẫn deploy lại và hard refresh. |

**Kết quả chính của session:** hoàn tất vòng QA production thứ hai, loại bỏ cả hai nguyên nhân cross-browser: `text-wrap: balance` và font Georgia không ổn định với glyph tiếng Việt.

---

## Vai trò của người dùng và AI trong quá trình cộng tác

- **Người dùng/nhóm dự án:** xác định phạm vi một thủ tục chuyên sâu; phản biện schema nhiều case; cung cấp tài liệu và nguồn chính thức; kiểm tra giao diện, nghiệp vụ và production trên nhiều máy; quyết định các ưu tiên về khả năng tiếp cận, cổng cán bộ, PDF, deploy và chất lượng thị giác.
- **AI:** phân tích yêu cầu; triển khai backend/frontend; thiết kế API và UI flow; đọc tài liệu; viết rule/test; chẩn đoán lỗi; chạy kiểm thử; kiểm tra production; đề xuất và thực hiện các sửa đổi có thể xác minh.
- **Cơ chế kiểm soát:** rule engine xử lý điều kiện tất định; AI xử lý ngôn ngữ và giải thích; nguồn pháp lý được liên kết riêng; trường hợp không chắc chắn chuyển cán bộ; dữ liệu AI trích không ghi đè ô người dùng đã sửa.

## Các session và trao đổi đã chủ động loại

- `019f6f62-ec2a-7a12-8ccf-8ecc6215001c`: chỉ lặp lại câu hỏi giải thích flow và cách chạy backend, không tạo thay đổi đáng kể.
- `019f761b-5d13-7fd2-a43a-633bcd6f3379`: chuẩn bị nội dung pitch deck và chụp ảnh cho slide.
- `019f7644-b92d-75c1-bbf5-be2e1a6768e3`: tạo và chỉnh PowerPoint pitch deck.
- `019f77e5-d4c7-74e1-87ff-a63537290af5`: session hành chính dùng để tạo nhật ký cộng tác AI, không phải quá trình phát triển sản phẩm.
- Trong session phát triển dài, các lượt chỉ sửa README, GIF/banner, danh sách thành viên, tên dự án, `.gitignore`, thao tác dừng chương trình hoặc chỉnh hover/logo nhỏ đã được bỏ để nhật ký tập trung vào phát triển, kiểm thử và deploy.

import { AppShell, StartSessionActions } from "@/components/Guide";

export default function HomePage() {
  return (
    <AppShell>
      <main className="home-page">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">Hướng dẫn thủ tục khai sinh</p>
            <h1 id="hero-title">Chuẩn bị hồ sơ khai sinh rõ ràng, từng bước một</h1>
            <p className="hero-lead">
              Trả lời những câu hỏi ngắn. Hệ thống giúp xác định trường hợp, giấy tờ cần có và kiểm tra thông tin
              trước khi bạn nộp hồ sơ.
            </p>
            <StartSessionActions />
          </div>

          <div className="hero-workflow" aria-label="Quy trình hướng dẫn">
            <div className="workflow-heading">
              <span>Quy trình của bạn</span>
              <span className="status-dot">Được lưu tự động</span>
            </div>
            <ol>
              <li>
                <span>1</span>
                <div><strong>Trao đổi tình huống</strong><small>Câu hỏi ngắn, dễ trả lời</small></div>
              </li>
              <li>
                <span>2</span>
                <div><strong>Chuẩn bị hồ sơ</strong><small>Checklist cập nhật theo câu trả lời</small></div>
              </li>
              <li>
                <span>3</span>
                <div><strong>Kiểm tra trước khi nộp</strong><small>Biết rõ lỗi nào cần sửa</small></div>
              </li>
            </ol>
          </div>
        </section>

        <section className="benefit-grid" aria-label="Lợi ích chính">
          <article>
            <p className="benefit-kicker">Dễ hiểu</p>
            <h2>Không cần biết thuật ngữ pháp lý</h2>
            <p>Câu hỏi được trình bày ngắn gọn, tập trung vào thông tin bạn biết.</p>
          </article>
          <article>
            <p className="benefit-kicker">Minh bạch</p>
            <h2>Căn cứ đi cùng từng yêu cầu</h2>
            <p>Nội dung pháp lý được hiển thị nguyên trạng từ hệ thống nghiệp vụ.</p>
          </article>
          <article>
            <p className="benefit-kicker">An tâm</p>
            <h2>Biết khi nào cần cán bộ xác nhận</h2>
            <p>Các trường hợp hiếm hoặc chưa chắc chắn luôn được đánh dấu rõ ràng.</p>
          </article>
        </section>

        <section className="closing-cta">
          <div>
            <p className="eyebrow">Bắt đầu khi bạn sẵn sàng</p>
            <h2>Mỗi câu trả lời giúp checklist chính xác hơn</h2>
          </div>
          <StartSessionActions compact />
        </section>
      </main>
    </AppShell>
  );
}

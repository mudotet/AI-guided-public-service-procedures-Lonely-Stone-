"use client";

import { useEffect, useRef, useState } from "react";

import { AppShell, StartSessionActions } from "@/components/Guide";
import { apiFetch } from "@/lib/api";
import type { TrustResponse } from "@/lib/types";

const journey = [
  ["01", "Chia sẻ hoàn cảnh", "Bạn có thể gõ hoặc nói như đang trò chuyện. AI sẽ hỏi thêm khi cần."],
  ["02", "Biết cần chuẩn bị gì", "Danh sách giấy tờ phù hợp sẽ hiện dần, kèm lý do cần chuẩn bị."],
  ["03", "Yên tâm trước khi nộp", "Hệ thống chỉ ra thông tin còn thiếu hoặc chưa khớp và hướng dẫn bạn sửa."],
  ["04", "Xem lại và tải hồ sơ", "Bạn kiểm tra toàn bộ thông tin, xem bản PDF rồi tải về khi đã sẵn sàng."],
];

export default function HomePage() {
  const pageRef = useRef<HTMLElement>(null);
  const [trust, setTrust] = useState<TrustResponse | null>(null);
  const [trustUnavailable, setTrustUnavailable] = useState(false);

  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;
    const items = [...page.querySelectorAll<HTMLElement>("[data-reveal]")];
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      items.forEach((item) => item.classList.add("is-visible"));
      return;
    }
    page.classList.add("motion-ready");
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      }),
      { threshold: 0.12, rootMargin: "0px 0px -8%" },
    );
    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    apiFetch<TrustResponse>("/trust")
      .then(setTrust)
      .catch(() => setTrustUnavailable(true));
  }, []);

  return (
    <AppShell home>
      <main ref={pageRef} className="home-page">
        <section className="home-hero" aria-labelledby="hero-title">
          <div className="home-ambient" aria-hidden="true"><span /><span /></div>
          <div className="home-hero-copy">
            <p className="home-eyebrow hero-enter hero-enter-1"><span />Trợ lý AI · Đăng ký khai sinh</p>
            <h1 id="hero-title" className="hero-enter hero-enter-2">
              AI hỗ trợ làm <em>giấy khai sinh.</em>
            </h1>
            <p className="home-hero-lead hero-enter hero-enter-3">
              Một hướng dẫn số dễ hiểu cho mọi phụ huynh: hỏi ngắn, chuẩn bị đúng giấy tờ, biết vì sao cần và kiểm tra trước khi nộp.
            </p>
            <div className="hero-enter hero-enter-4"><StartSessionActions /></div>
            <div className="home-trust-line hero-enter hero-enter-5" aria-label="Cam kết của hệ thống">
              <span>Không cần am hiểu công nghệ</span><span>Không tự bổ sung nội dung pháp lý</span>
            </div>
          </div>

          <div className="home-dossier-shell hero-enter hero-enter-4" aria-label="Minh họa phiên hướng dẫn">
            <div className="home-dossier-core">
              <header>
                <div><span className="live-dot" />Phiên hướng dẫn đang hoạt động</div>
                <small>Tự động lưu</small>
              </header>
              <div className="home-chat-preview">
                <p>Cha mẹ của bé đã đăng ký kết hôn chưa?</p>
                <span>Chưa, nhưng gia đình muốn ghi tên cha.</span>
              </div>
              <div className="home-case-preview">
                <p>Trường hợp đã nhận diện</p>
                <strong>Cha mẹ chưa đăng ký kết hôn</strong>
                <span>Checklist đang được cập nhật</span>
              </div>
              <ol className="home-check-preview">
                <li className="done"><span>✓</span><div><strong>Thông tin cơ bản</strong><small>Đã tiếp nhận</small></div></li>
                <li className="active"><span>2</span><div><strong>Giấy tờ cần chuẩn bị</strong><small>Kèm căn cứ từ backend</small></div></li>
                <li><span>3</span><div><strong>Kiểm tra trước khi nộp</strong><small>Sắp tới</small></div></li>
              </ol>
            </div>
          </div>
        </section>

        <section className="home-problem" aria-labelledby="problem-title">
          <div className="home-problem-heading" data-reveal>
            <div>
              <p className="home-eyebrow"><span />Vấn đề người dân đang gặp</p>
              <strong>Bản demo tập trung vào đăng ký khai sinh</strong>
            </div>
            <h2 id="problem-title">Một thủ tục tưởng đơn giản<br />có thể trở thành <em>nhiều lần đi lại.</em></h2>
            <p>Thông tin nằm ở nhiều nơi, sai sót thường chỉ lộ ra sau khi nộp, trong khi cán bộ phải xử lý quá nhiều câu hỏi lặp lại.</p>
          </div>

          <div className="home-problem-grid">
            <article className="problem-prepare" data-reveal>
              <div className="problem-core">
                <header><span>01</span><small>Trước khi nộp</small></header>
                <div className="problem-paper-stack" aria-hidden="true"><i>?</i><span /><span /><span /></div>
                <h3>Không biết cần chuẩn bị những gì</h3>
                <p>Giấy tờ, biểu mẫu và nơi tiếp nhận khó xác định khiến người dân không biết bắt đầu từ đâu.</p>
              </div>
            </article>

            <article className="problem-errors" data-reveal>
              <div className="problem-core">
                <header><span>02</span><small>Sau khi đã điền</small></header>
                <div className="problem-form-preview" aria-hidden="true"><span /><span className="has-error" /><small>Thiếu thông tin</small></div>
                <h3>Không biết thông tin đã chính xác chưa</h3>
                <p>Thiếu sót thường chỉ được phát hiện sau khi cán bộ xem hồ sơ, dẫn đến phải bổ sung hoặc làm lại.</p>
              </div>
            </article>

            <article className="problem-overload" data-reveal>
              <div className="problem-core">
                <header><span>03</span><small>Tại khâu hỗ trợ</small></header>
                <div className="problem-queue" aria-hidden="true"><span /><span /><span /><span /><i>1 cán bộ</i></div>
                <div><h3>Một câu hỏi nhỏ, một lần xếp hàng</h3><p>Lượng câu hỏi lớn trong khi cán bộ có hạn khiến người dân phải chờ và đi lại trực tiếp nhiều lần.</p></div>
              </div>
            </article>
          </div>

          <div className="home-problem-bridge" data-reveal>
            <span aria-hidden="true">→</span>
            <p><small>Vì vậy, sản phẩm tập trung vào thời điểm trước khi nộp</small><strong>Hướng dẫn đúng việc cần làm và kiểm tra sớm, để mỗi lần đến cơ quan đều rõ ràng hơn.</strong></p>
          </div>
        </section>

        <section className="home-proof-strip" aria-label="Nguyên tắc hoạt động">
          <p>Được thiết kế để bạn luôn biết</p>
          <div><strong>Đang ở bước nào</strong><span>Tiến độ hiển thị xuyên suốt</span></div>
          <div><strong>Vì sao cần giấy tờ</strong><span>Căn cứ đi cùng từng yêu cầu</span></div>
          <div><strong>Khi nào cần cán bộ</strong><span>Không để AI tự quyết trường hợp hiếm</span></div>
        </section>

        <section className="home-story" aria-labelledby="story-title">
          <div className="home-section-heading" data-reveal>
            <p className="home-eyebrow"><span />Bạn không cần rành thủ tục</p>
            <h2 id="story-title">Cứ chia sẻ chuyện của gia đình.<br />AI sẽ hướng dẫn từng bước.</h2>
            <p>Không cần tự đọc hàng chục trang hướng dẫn. Bạn chỉ cần trả lời những câu hỏi ngắn, dễ hiểu và xem hồ sơ hoàn thiện dần.</p>
          </div>
          <div className="home-journey">
            {journey.map(([number, title, description], index) => (
              <article key={number} data-reveal className={`journey-${index + 1}`}>
                <div><span>{number}</span><small>0{index + 1} / 04</small></div>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="home-evidence" aria-labelledby="evidence-title">
          <div className="home-evidence-copy" data-reveal>
            <p className="home-eyebrow home-eyebrow-light"><span />Minh bạch từ thiết kế</p>
            <h2 id="evidence-title">Không chỉ trả lời.<br />Hệ thống cho bạn thấy <em>vì sao.</em></h2>
            <p>Mỗi kết quả đều cho biết nguồn kiểm tra, mức độ ảnh hưởng và đường dẫn để xem thông tin rõ hơn.</p>
          </div>
          <div className="home-evidence-shell" data-reveal>
            <div className="home-evidence-core">
              <div className="evidence-toolbar"><span>Kết quả kiểm tra trước</span><small>2 điểm cần lưu ý</small></div>
              <article className="evidence-rule">
                <div><span className="evidence-symbol">!</span><p><small>Kiểm tra tự động theo quy tắc</small><strong>Thông tin này cần được bổ sung</strong></p></div>
                <span className="evidence-fix">Sửa trường này <span>↗</span></span>
              </article>
              <article className="evidence-ai">
                <div><span className="evidence-symbol">◇</span><p><small>AI phát hiện · cần xác nhận</small><strong>Đây là cảnh báo, không phải lỗi bắt buộc</strong></p></div>
              </article>
              <details className="evidence-basis">
                <summary><span>Căn cứ pháp lý từ backend</span><strong>Xem nội dung nguồn</strong></summary>
                <p>Nội dung được hiển thị nguyên trạng từ hệ thống nghiệp vụ, không được frontend tự viết thêm.</p>
              </details>
            </div>
          </div>
        </section>

        <section id="official-sources" className="home-trust" aria-labelledby="trust-title">
          <div className="home-trust-heading" data-reveal>
            <p className="home-eyebrow"><span />Nguồn và phương pháp kiểm chứng</p>
            <h2 id="trust-title">Uy tín không đến từ câu<br /><em>“AI đã được huấn luyện”.</em></h2>
            <p>Uy tín đến từ việc công khai AI được phép làm gì, quy tắc nào kiểm tra hồ sơ và người dùng có thể mở nguồn gốc để tự đối chiếu.</p>
          </div>

          <div className="trust-method-grid">
            <article data-reveal>
              <header><span>01</span><small>Lớp ngôn ngữ</small></header>
              <h3>AI hỗ trợ hiểu tình huống</h3>
              <p>{trust?.ai_role || "Đang tải mô tả phương pháp từ backend..."}</p>
              <strong>Không tự tạo căn cứ pháp lý</strong>
            </article>
            <article data-reveal>
              <header><span>02</span><small>Lớp tất định</small></header>
              <h3>Rule engine kiểm tra hồ sơ</h3>
              <p>{trust?.deterministic_role || "Đang tải mô tả phương pháp từ backend..."}</p>
              <strong>Kết quả có thể truy ngược</strong>
            </article>
            <article data-reveal>
              <header><span>03</span><small>Lớp con người</small></header>
              <h3>Cán bộ xử lý ngoại lệ</h3>
              <p>{trust?.human_role || "Đang tải mô tả phương pháp từ backend..."}</p>
              <strong>AI không thay quyết định hành chính</strong>
            </article>
          </div>

          <div className="trust-disclosure" data-reveal>
            <div className="trust-seal" aria-hidden="true"><span>AI</span><i>≠</i><span>PL</span></div>
            <div><small>Công khai giới hạn mô hình</small><h3>Không đánh tráo “nguồn tham khảo” thành “dữ liệu huấn luyện”</h3><p>{trust?.training_disclosure || "Thông tin công khai về mô hình đang được tải trực tiếp từ backend."}</p></div>
            {trust && <time dateTime={trust.last_reviewed_on}><span>Thư viện nguồn cập nhật</span>{new Intl.DateTimeFormat("vi-VN").format(new Date(`${trust.last_reviewed_on}T00:00:00`))}</time>}
          </div>

          <div className="trust-source-shell" data-reveal>
            <div className="trust-source-core">
              <section className="trust-source-intro" aria-labelledby="source-registry-title">
                <div className="trust-source-status"><i aria-hidden="true" />Danh mục nguồn chính thức</div>
                <div className="trust-source-count" aria-label={trust ? `${trust.sources.length} nguồn tham khảo` : "Đang tải nguồn tham khảo"}>
                  <strong>{trust ? String(trust.sources.length).padStart(2, "0") : "—"}</strong>
                  <span>Nguồn<br />có thể mở</span>
                </div>
                <div className="trust-source-intro-copy">
                  <p>Hồ sơ kiểm chứng</p>
                  <h3 id="source-registry-title">Không cần tin một lời khẳng định. Hãy mở nguồn và tự đối chiếu.</h3>
                  <span>Các đường dẫn được backend công bố nguyên trạng từ Cổng Dịch vụ công Quốc gia.</span>
                </div>
                <div className="trust-source-meta">
                  <div><small>Đơn vị công bố</small><strong>Cổng Dịch vụ công Quốc gia</strong></div>
                  <div><small>Rà soát gần nhất</small><strong>{trust ? new Intl.DateTimeFormat("vi-VN").format(new Date(`${trust.last_reviewed_on}T00:00:00`)) : "Đang đồng bộ"}</strong></div>
                </div>
                <a className="trust-portal-link" href="https://dichvucong.gov.vn" target="_blank" rel="noreferrer">
                  <span><small>Mở cổng nguồn</small><strong>dichvucong.gov.vn</strong></span><i aria-hidden="true">↗</i>
                </a>
              </section>

              <section className="trust-source-directory" aria-label="Danh sách tài liệu tham khảo">
                <header><div><p>Thư viện tham chiếu</p><h3>Mở từng tài liệu để kiểm chứng</h3></div><span>{trust ? `${trust.sources.length} liên kết` : "Đang tải"}</span></header>
                {trust ? (
                  <div className="trust-source-list">
                    {trust.sources.map((source, index) => (
                      <a key={source.code} href={source.url} target="_blank" rel="noreferrer">
                        <span>{String(index + 1).padStart(2, "0")}</span>
                        <div><small>{source.publisher}</small><strong>{source.title}</strong><code>{source.domain}</code></div>
                        <i aria-hidden="true">↗</i>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="trust-source-loading" role={trustUnavailable ? "alert" : "status"}>{trustUnavailable ? "Chưa tải được thư viện nguồn từ backend. Vui lòng kiểm tra kết nối." : "Đang tải các đường dẫn nguồn chính thức..."}</p>
                )}
              </section>
            </div>
          </div>
        </section>

        <section className="home-capabilities" aria-labelledby="capabilities-title">
          <div className="home-section-heading compact" data-reveal>
            <p className="home-eyebrow"><span />Nghiệp vụ trong một trải nghiệm</p>
            <h2 id="capabilities-title">Đủ sâu cho hồ sơ thật.<br />Đủ đơn giản cho lần dùng đầu tiên.</h2>
          </div>
          <div className="capability-bento">
            <article className="capability-voice" data-reveal>
              <div className="voice-orbit" aria-hidden="true"><i /><i /><i /><i /><i /></div>
              <div><span>Hỗ trợ tiếp cận</span><h3>Nói thay vì gõ</h3><p>Ghi âm tiếng Việt, xem lại bản chuyển thành chữ và sửa trước khi gửi.</p></div>
            </article>
            <article className="capability-cases" data-reveal>
              <span>Phân loại nhiều trường hợp</span>
              <h3>Một phiên có thể có nhiều yếu tố cùng lúc</h3>
              <div><i>Chính</i><strong>Có yếu tố nước ngoài</strong><small>Cha mẹ chưa đăng ký kết hôn</small><small>Đăng ký quá hạn</small></div>
            </article>
            <article className="capability-pdf" data-reveal>
              <div className="paper-preview" aria-hidden="true"><span /><span /><span /><i>PDF</i></div>
              <div><span>Đầu ra trực quan</span><h3>Xem trước và tải PDF</h3><p>Đối chiếu thông tin đã điền trước khi dùng bản demo hồ sơ.</p></div>
            </article>
            <article className="capability-human" data-reveal>
              <span>Điểm dừng an toàn</span>
              <h3>Cần cán bộ hộ tịch xác nhận trực tiếp</h3>
              <p>Trường hợp hiếm hoặc chưa chắc chắn luôn được chuyển sang con người xem xét.</p>
            </article>
            <article className="capability-admin" data-reveal>
              <span>Góc nhìn vận hành</span>
              <h3>Cổng quản lý cho cán bộ</h3>
              <p>Theo dõi phiên, nhóm trường hợp và những câu hỏi phụ huynh đang gặp.</p>
              <a href="/admin">Mở cổng cán bộ <b>↗</b></a>
            </article>
          </div>
        </section>

        <section className="home-closing" data-reveal>
          <div>
            <p className="home-eyebrow home-eyebrow-light"><span />Bắt đầu khi bạn sẵn sàng</p>
            <h2>Một câu trả lời hôm nay.<br />Một bộ hồ sơ rõ ràng hơn.</h2>
          </div>
          <StartSessionActions compact />
        </section>
      </main>
    </AppShell>
  );
}

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

const sectionShell = "mx-auto w-[calc(100%_-_32px)] max-w-[1240px] py-20 sm:w-[calc(100%_-_48px)] sm:py-28";
const eyebrow = "mb-5 inline-flex items-center gap-2 text-[10px] font-black tracking-[0.16em] text-primary uppercase before:size-2 before:rounded-full before:bg-primary";
const sectionTitle = "text-[clamp(36px,5vw,68px)] leading-[1.02] font-semibold tracking-[-0.055em] text-government";

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

  const methodCards = [
    ["01", "Lớp ngôn ngữ", "AI hỗ trợ hiểu tình huống", trust?.ai_role || "Đang tải mô tả phương pháp từ backend...", "Không tự tạo căn cứ pháp lý"],
    ["02", "Lớp tất định", "Rule engine kiểm tra hồ sơ", trust?.deterministic_role || "Đang tải mô tả phương pháp từ backend...", "Kết quả có thể truy ngược"],
    ["03", "Lớp con người", "Cán bộ xử lý ngoại lệ", trust?.human_role || "Đang tải mô tả phương pháp từ backend...", "AI không thay quyết định hành chính"],
  ];

  return (
    <AppShell home>
      <main ref={pageRef} className="bg-canvas">
        <section className="relative mx-auto grid min-h-[820px] w-[calc(100%_-_24px)] max-w-[1400px] items-center gap-12 overflow-hidden rounded-[40px] bg-government px-5 py-20 text-white sm:w-[calc(100%_-_48px)] sm:px-12 lg:grid-cols-[1.05fr_.95fr] lg:px-20" aria-labelledby="hero-title">
          <div className="pointer-events-none absolute -top-64 -left-48 size-[620px] rounded-full border border-white/10 bg-primary/20 blur-3xl" aria-hidden="true" />
          <div className="relative z-10 max-w-3xl [animation:hero-rise_.7s_var(--ease-premium)_both]">
            <p className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-[10px] font-black tracking-[0.16em] text-blue-100 uppercase before:size-2 before:animate-pulse before:rounded-full before:bg-green-400">Trợ lý AI · Đăng ký khai sinh</p>
            <h1 id="hero-title" className="text-[clamp(54px,8vw,108px)] leading-[.9] font-semibold tracking-[-0.07em]">AI hỗ trợ làm <em className="font-editorial font-normal text-blue-200">giấy khai sinh.</em></h1>
            <p className="mt-8 max-w-2xl text-base leading-7 text-blue-100 sm:text-lg">Một hướng dẫn số dễ hiểu cho mọi phụ huynh: hỏi ngắn, chuẩn bị đúng giấy tờ, biết vì sao cần và kiểm tra trước khi nộp.</p>
            <div className="mt-9 max-w-xl [&_button]:bg-white [&_button]:text-government [&_button:hover]:bg-blue-100"><StartSessionActions /></div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[10px] font-bold text-blue-200" aria-label="Cam kết của hệ thống"><span>✓ Không cần am hiểu công nghệ</span><span>✓ Không tự bổ sung nội dung pháp lý</span></div>
          </div>

          <div className="relative z-10 mx-auto w-full max-w-[540px] rotate-1 rounded-[34px] border border-white/15 bg-white/10 p-2 shadow-[0_40px_100px_rgba(0,0,0,.28)] backdrop-blur-xl transition duration-700 hover:rotate-0" aria-label="Minh họa phiên hướng dẫn">
            <div className="rounded-[28px] bg-white p-5 text-ink sm:p-7">
              <header className="flex items-center justify-between border-b border-line/70 pb-4 text-[10px] font-extrabold text-government"><div className="flex items-center gap-2"><span className="size-2 animate-pulse rounded-full bg-success" />Phiên hướng dẫn đang hoạt động</div><small className="text-muted">Tự động lưu</small></header>
              <div className="mt-6 grid gap-3 text-xs leading-5"><p className="mr-12 rounded-[18px_18px_18px_5px] bg-slate-100 p-4">Cha mẹ của bé đã đăng ký kết hôn chưa?</p><span className="ml-12 rounded-[18px_18px_5px_18px] bg-primary p-4 text-white">Chưa, nhưng gia đình muốn ghi tên cha.</span></div>
              <div className="mt-5 rounded-2xl bg-government p-5 text-white"><p className="text-[9px] font-black tracking-widest text-blue-300 uppercase">Trường hợp đã nhận diện</p><strong className="mt-2 block text-lg">Cha mẹ chưa đăng ký kết hôn</strong><span className="mt-2 block text-[10px] text-blue-200">Checklist đang được cập nhật</span></div>
              <ol className="mt-5 grid gap-3 text-xs">
                {[["✓", "Thông tin cơ bản", "Đã tiếp nhận"], ["2", "Giấy tờ cần chuẩn bị", "Kèm căn cứ từ backend"], ["3", "Kiểm tra trước khi nộp", "Sắp tới"]].map(([number, title, note], index) => <li className="grid grid-cols-[34px_1fr] items-center gap-3" key={title}><span className={`grid size-[34px] place-items-center rounded-full font-black ${index === 0 ? "bg-success text-white" : index === 1 ? "bg-primary text-white" : "bg-slate-100 text-muted"}`}>{number}</span><div className="grid"><strong className="text-government">{title}</strong><small className="text-[9px] text-muted">{note}</small></div></li>)}
              </ol>
            </div>
          </div>
        </section>

        <section className={sectionShell} aria-labelledby="problem-title">
          <div className="grid gap-7 lg:grid-cols-[.8fr_1.4fr_.8fr] lg:items-end" data-reveal>
            <div><p className={eyebrow}>Vấn đề người dân đang gặp</p><strong className="block text-xs text-muted">Bản demo tập trung vào đăng ký khai sinh</strong></div>
            <h2 className={sectionTitle} id="problem-title">Một thủ tục tưởng đơn giản có thể thành <em className="font-editorial font-normal text-primary">nhiều lần đi lại.</em></h2>
            <p className="text-sm leading-6 text-muted">Thông tin nằm ở nhiều nơi, sai sót thường chỉ lộ ra sau khi nộp, trong khi cán bộ phải xử lý nhiều câu hỏi lặp lại.</p>
          </div>
          <div className="mt-16 grid overflow-hidden rounded-[32px] border border-government/10 bg-white shadow-panel lg:grid-cols-3">
            {[
              ["01", "Trước khi nộp", "?", "Không biết cần chuẩn bị những gì", "Giấy tờ, biểu mẫu và nơi tiếp nhận khó xác định khiến người dân không biết bắt đầu từ đâu."],
              ["02", "Sau khi đã điền", "!", "Không biết thông tin đã chính xác chưa", "Thiếu sót thường chỉ được phát hiện sau khi cán bộ xem hồ sơ, dẫn đến phải bổ sung hoặc làm lại."],
              ["03", "Tại khâu hỗ trợ", "…", "Một câu hỏi nhỏ, một lần xếp hàng", "Câu hỏi nhiều trong khi cán bộ có hạn khiến người dân phải chờ và đi lại trực tiếp nhiều lần."],
            ].map(([number, phase, symbol, title, copy]) => <article className="grid min-h-[390px] content-between gap-10 border-government/10 p-7 not-last:border-b lg:not-last:border-r lg:not-last:border-b-0" data-reveal key={number}><header className="flex justify-between text-[10px] font-black tracking-widest text-muted uppercase"><span className="text-primary">{number}</span><small>{phase}</small></header><span className="grid size-24 place-items-center rounded-[28px] bg-blue-50 font-editorial text-5xl text-primary" aria-hidden="true">{symbol}</span><div><h3 className="text-2xl leading-tight font-semibold tracking-tight text-government">{title}</h3><p className="mt-4 text-sm leading-6 text-muted">{copy}</p></div></article>)}
          </div>
          <div className="mt-8 grid gap-5 rounded-[28px] bg-government p-6 text-white sm:grid-cols-[64px_1fr] sm:items-center sm:p-8" data-reveal><span className="grid size-16 place-items-center rounded-full bg-white/10 text-2xl" aria-hidden="true">→</span><p><small className="mb-2 block text-[9px] font-black tracking-widest text-blue-300 uppercase">Sản phẩm tập trung vào thời điểm trước khi nộp</small><strong className="text-xl leading-7">Hướng dẫn đúng việc cần làm và kiểm tra sớm, để mỗi lần đến cơ quan đều rõ ràng hơn.</strong></p></div>
        </section>

        <section className="mx-auto w-[calc(100%_-_24px)] max-w-[1400px] rounded-[36px] bg-blue-50 p-6 sm:w-[calc(100%_-_48px)] sm:p-10" aria-label="Nguyên tắc hoạt động">
          <p className="mb-7 text-xl font-semibold text-government">Được thiết kế để bạn luôn biết</p>
          <div className="grid gap-3 md:grid-cols-3">{[["01", "Đang ở bước nào", "Tiến độ hiển thị xuyên suốt"], ["02", "Vì sao cần giấy tờ", "Căn cứ đi cùng từng yêu cầu"], ["03", "Khi nào cần cán bộ", "Không để AI tự quyết trường hợp hiếm"]].map(([number, title, copy]) => <div className="min-h-40 rounded-3xl bg-white p-6 shadow-sm" key={number}><span className="text-[10px] font-black text-primary">{number}</span><strong className="mt-8 block text-lg text-government">{title}</strong><span className="mt-2 block text-xs leading-5 text-muted">{copy}</span></div>)}</div>
        </section>

        <section className={sectionShell} aria-labelledby="story-title">
          <div className="max-w-4xl" data-reveal><p className={eyebrow}>Bạn không cần rành thủ tục</p><h2 className={sectionTitle} id="story-title">Cứ chia sẻ chuyện của gia đình. <em className="font-editorial font-normal text-primary">AI sẽ hướng dẫn từng bước.</em></h2><p className="mt-7 max-w-2xl text-sm leading-6 text-muted">Bạn chỉ cần trả lời những câu hỏi ngắn, dễ hiểu và xem hồ sơ hoàn thiện dần.</p></div>
          <div className="mt-16 grid gap-px overflow-hidden rounded-[32px] bg-government/10 md:grid-cols-2 lg:grid-cols-4">{journey.map(([number, title, description], index) => <article className="min-h-[330px] bg-white p-7 transition duration-500 hover:bg-blue-50" key={number} data-reveal><div className="flex items-center justify-between text-[10px] font-black text-primary"><span>{number}</span><small className="text-muted">0{index + 1} / 04</small></div><h3 className="mt-28 text-2xl font-semibold tracking-tight text-government">{title}</h3><p className="mt-4 text-xs leading-6 text-muted">{description}</p></article>)}</div>
        </section>

        <section className="bg-government text-white" aria-labelledby="evidence-title">
          <div className={`${sectionShell} grid gap-14 lg:grid-cols-[.8fr_1.2fr] lg:items-center`}>
            <div data-reveal><p className={`${eyebrow} text-blue-200 before:bg-blue-300`}>Minh bạch từ thiết kế</p><h2 className={`${sectionTitle} text-white`} id="evidence-title">Không chỉ trả lời. Hệ thống cho bạn thấy <em className="font-editorial font-normal text-blue-200">vì sao.</em></h2><p className="mt-7 max-w-lg text-sm leading-7 text-blue-100">Mỗi kết quả đều cho biết nguồn kiểm tra, mức độ ảnh hưởng và đường dẫn để xem thông tin rõ hơn.</p></div>
            <div className="rounded-[34px] border border-white/15 bg-white/10 p-2 shadow-[0_35px_90px_rgba(0,0,0,.25)] backdrop-blur" data-reveal><div className="rounded-[28px] bg-white p-5 text-ink sm:p-7"><div className="flex justify-between border-b border-line pb-5 text-xs font-extrabold text-government"><span>Kết quả kiểm tra trước</span><small className="text-warning">2 điểm cần lưu ý</small></div><article className="mt-5 rounded-2xl border-l-4 border-danger bg-red-50 p-4"><small className="text-[9px] font-black text-danger uppercase">Kiểm tra tự động theo quy tắc</small><strong className="mt-2 block text-sm">Thông tin này cần được bổ sung</strong><button className="mt-4 min-h-10 rounded-full bg-white px-4 text-[10px] font-extrabold text-primary">Sửa trường này ↗</button></article><article className="mt-3 rounded-2xl border-l-4 border-warning bg-amber-50 p-4"><small className="text-[9px] font-black text-warning uppercase">AI phát hiện · cần xác nhận</small><strong className="mt-2 block text-sm">Đây là cảnh báo, không phải lỗi bắt buộc</strong></article><details className="mt-4 rounded-2xl border border-line p-4 text-xs text-muted"><summary className="min-h-8 cursor-pointer font-extrabold text-primary">Căn cứ pháp lý từ backend</summary><p className="mt-3 leading-5">Nội dung được hiển thị nguyên trạng từ hệ thống nghiệp vụ, không được frontend tự viết thêm.</p></details></div></div>
          </div>
        </section>

        <section id="official-sources" className={sectionShell} aria-labelledby="trust-title">
          <div className="max-w-4xl" data-reveal><p className={eyebrow}>Nguồn và phương pháp kiểm chứng</p><h2 className={sectionTitle} id="trust-title">Uy tín không đến từ câu <em className="font-editorial font-normal text-primary">“AI đã được huấn luyện”.</em></h2><p className="mt-7 max-w-2xl text-sm leading-6 text-muted">Uy tín đến từ việc công khai AI được phép làm gì, quy tắc nào kiểm tra hồ sơ và nguồn nào người dùng có thể tự mở để đối chiếu.</p></div>
          <div className="mt-14 grid overflow-hidden rounded-[32px] border border-government/10 bg-white shadow-panel lg:grid-cols-3">{methodCards.map(([number, layer, title, copy, promise]) => <article className="grid min-h-[330px] content-between border-government/10 p-7 not-last:border-b lg:not-last:border-r lg:not-last:border-b-0" data-reveal key={number}><header className="flex justify-between text-[9px] font-black tracking-widest text-muted uppercase"><span className="text-primary">{number}</span><small>{layer}</small></header><div><h3 className="text-2xl font-semibold tracking-tight text-government">{title}</h3><p className="mt-4 text-xs leading-6 text-muted">{copy}</p></div><strong className="text-[10px] font-black text-success uppercase">✓ {promise}</strong></article>)}</div>
          <div className="mt-6 grid gap-5 rounded-[28px] border border-warning/20 bg-amber-50 p-6 md:grid-cols-[72px_1fr_auto] md:items-center" data-reveal><span className="grid size-[72px] place-items-center rounded-2xl bg-warning text-sm font-black text-white" aria-hidden="true">AI ≠ PL</span><div><small className="text-[9px] font-black tracking-widest text-warning uppercase">Công khai giới hạn mô hình</small><h3 className="mt-2 text-lg font-extrabold text-government">Không đánh tráo “nguồn tham khảo” thành “dữ liệu huấn luyện”</h3><p className="mt-2 text-xs leading-5 text-muted">{trust?.training_disclosure || "Thông tin công khai về mô hình đang được tải trực tiếp từ backend."}</p></div>{trust && <time className="text-[10px] font-bold text-muted" dateTime={trust.last_reviewed_on}>Rà soát: {new Intl.DateTimeFormat("vi-VN").format(new Date(`${trust.last_reviewed_on}T00:00:00`))}</time>}</div>

          <div className="mt-6 grid overflow-hidden rounded-[32px] bg-government text-white shadow-[0_30px_80px_rgba(6,59,130,.2)] lg:grid-cols-[.8fr_1.2fr]" data-reveal>
            <section className="grid content-between gap-10 p-7 sm:p-10" aria-labelledby="source-registry-title"><div><p className="text-[9px] font-black tracking-widest text-blue-300 uppercase">Danh mục nguồn chính thức</p><strong className="mt-5 block text-6xl tracking-tight">{trust ? String(trust.sources.length).padStart(2, "0") : "—"}</strong><span className="text-xs text-blue-200">nguồn có thể mở</span></div><div><h3 className="text-3xl leading-tight font-semibold tracking-tight" id="source-registry-title">Không cần tin một lời khẳng định. Hãy mở nguồn và tự đối chiếu.</h3><p className="mt-4 text-xs leading-6 text-blue-100">Các đường dẫn được backend công bố nguyên trạng từ Cổng Dịch vụ công Quốc gia.</p></div><a className="flex min-h-14 items-center justify-between rounded-2xl bg-white px-5 text-xs font-extrabold text-government transition hover:bg-blue-100" href="https://dichvucong.gov.vn" target="_blank" rel="noreferrer">dichvucong.gov.vn <i className="not-italic">↗</i></a></section>
            <section className="bg-white p-5 text-ink sm:p-7" aria-label="Danh sách tài liệu tham khảo"><header className="flex justify-between border-b border-line pb-5"><div><p className="text-[9px] font-black tracking-widest text-primary uppercase">Thư viện tham chiếu</p><h3 className="mt-1 text-xl font-semibold text-government">Mở từng tài liệu để kiểm chứng</h3></div><span className="text-[10px] font-bold text-muted">{trust ? `${trust.sources.length} liên kết` : "Đang tải"}</span></header>{trust ? <div className="max-h-[510px] overflow-y-auto">{trust.sources.map((source, index) => <a className="grid grid-cols-[32px_1fr_32px] items-center gap-3 border-b border-line/60 py-4 transition hover:bg-blue-50 sm:px-3" key={source.code} href={source.url} target="_blank" rel="noreferrer"><span className="text-[10px] font-black text-slate-400">{String(index + 1).padStart(2, "0")}</span><div className="grid gap-1"><small className="text-[8px] font-black tracking-wide text-primary uppercase">{source.publisher}</small><strong className="text-xs leading-5 text-government">{source.title}</strong><code className="text-[9px] text-muted">{source.domain}</code></div><i className="grid size-8 place-items-center rounded-full bg-blue-50 text-primary not-italic">↗</i></a>)}</div> : <p className="py-12 text-center text-xs text-muted" role={trustUnavailable ? "alert" : "status"}>{trustUnavailable ? "Chưa tải được thư viện nguồn từ backend. Vui lòng kiểm tra kết nối." : "Đang tải các đường dẫn nguồn chính thức..."}</p>}</section>
          </div>
        </section>

        <section className="bg-blue-50" aria-labelledby="capabilities-title"><div className={sectionShell}><div className="max-w-4xl" data-reveal><p className={eyebrow}>Nghiệp vụ trong một trải nghiệm</p><h2 className={sectionTitle} id="capabilities-title">Đủ sâu cho hồ sơ thật. <em className="font-editorial font-normal text-primary">Đủ đơn giản cho lần dùng đầu tiên.</em></h2></div><div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{[["🎙", "Hỗ trợ tiếp cận", "Nói thay vì gõ", "Ghi âm tiếng Việt, xem lại bản chuyển thành chữ và sửa trước khi gửi."], ["⌘", "Phân loại nhiều trường hợp", "Nhận diện các yếu tố cùng lúc", "Một phiên có thể kết hợp yếu tố nước ngoài, chưa đăng ký kết hôn và quá hạn."], ["PDF", "Đầu ra trực quan", "Xem trước và tải PDF", "Đối chiếu thông tin đã điền trước khi dùng bản demo hồ sơ."], ["!", "Điểm dừng an toàn", "Chuyển cán bộ khi cần", "Trường hợp hiếm hoặc chưa chắc chắn luôn được chuyển sang con người xem xét."], ["↗", "Góc nhìn vận hành", "Cổng quản lý cho cán bộ", "Theo dõi phiên, nhóm trường hợp và câu hỏi phụ huynh đang gặp."], ["API", "Tích hợp liền mạch", "Sẵn sàng cho cổng dịch vụ công", "Backend API cho phép nhúng trải nghiệm vào hệ thống đang có."]].map(([icon, label, title, copy], index) => <article className={`min-h-[280px] rounded-[28px] p-7 shadow-sm ${index === 0 || index === 4 ? "bg-government text-white" : "bg-white text-ink"}`} data-reveal key={title}><span className={`grid size-12 place-items-center rounded-2xl text-xs font-black ${index === 0 || index === 4 ? "bg-white/10 text-white" : "bg-blue-50 text-primary"}`}>{icon}</span><small className={`mt-10 block text-[9px] font-black tracking-widest uppercase ${index === 0 || index === 4 ? "text-blue-200" : "text-primary"}`}>{label}</small><h3 className="mt-3 text-2xl font-semibold tracking-tight">{title}</h3><p className={`mt-4 text-xs leading-6 ${index === 0 || index === 4 ? "text-blue-100" : "text-muted"}`}>{copy}</p>{index === 4 && <a className="mt-5 inline-flex text-xs font-extrabold text-white" href="/admin">Mở cổng cán bộ →</a>}</article>)}</div></div></section>

        <section className="mx-auto my-8 grid w-[calc(100%_-_24px)] max-w-[1400px] gap-10 rounded-[40px] bg-government p-8 text-white sm:w-[calc(100%_-_48px)] sm:p-14 lg:grid-cols-[1fr_auto] lg:items-center" data-reveal><div><p className="mb-5 text-[10px] font-black tracking-widest text-blue-200 uppercase">Bắt đầu khi bạn sẵn sàng</p><h2 className="text-[clamp(36px,5vw,64px)] leading-none font-semibold tracking-[-0.05em]">Một câu trả lời hôm nay.<br /><em className="font-editorial font-normal text-blue-200">Một bộ hồ sơ rõ ràng hơn.</em></h2></div><div className="min-w-72 [&_button]:bg-white [&_button]:text-government [&_button:hover]:bg-blue-100"><StartSessionActions compact /></div></section>
      </main>
    </AppShell>
  );
}

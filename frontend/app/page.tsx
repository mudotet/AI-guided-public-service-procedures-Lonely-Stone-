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

const sectionShell = "mx-auto w-[calc(100%_-_32px)] max-w-[1240px] py-24 sm:w-[calc(100%_-_48px)] sm:py-32";
const eyebrow = "mb-6 inline-flex items-center gap-2.5 rounded-full bg-blue-50 px-3.5 py-2 text-[9px] font-black tracking-[0.18em] text-primary uppercase before:size-1.5 before:rounded-full before:bg-primary";
const sectionTitle = "text-balance text-[clamp(38px,5.2vw,70px)] leading-[1.06] font-semibold tracking-[-0.045em] text-government";

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
      <main ref={pageRef} className="relative bg-transparent">
        <section className="relative mx-auto mt-4 grid min-h-[min(860px,calc(100dvh-112px))] w-[calc(100%_-_24px)] max-w-[1400px] items-center gap-14 overflow-hidden rounded-[42px] bg-government px-5 py-20 text-white shadow-[0_36px_100px_rgba(6,59,130,.24)] sm:w-[calc(100%_-_48px)] sm:px-12 lg:grid-cols-[1.03fr_.97fr] lg:px-20" aria-labelledby="hero-title">
          <div className="pointer-events-none absolute -top-72 -left-52 size-[680px] rounded-full bg-primary/30 blur-3xl [animation:ambient-drift_14s_var(--ease-premium)_infinite]" aria-hidden="true" />
          <div className="pointer-events-none absolute right-[6%] -bottom-72 size-[540px] rounded-full border border-white/10 bg-blue-300/10 blur-3xl" aria-hidden="true" />
          <div className="pointer-events-none absolute inset-0 opacity-[.08] [background-image:radial-gradient(circle_at_center,white_1px,transparent_1px)] [background-size:26px_26px]" aria-hidden="true" />

          <div className="relative max-w-3xl [animation:hero-rise_.9s_var(--ease-premium)_both]">
            <p className="mb-7 inline-flex items-center gap-2.5 rounded-full bg-white/10 px-4 py-2.5 text-[9px] font-black tracking-[0.18em] text-blue-100 uppercase ring-1 ring-white/15 before:size-2 before:animate-pulse before:rounded-full before:bg-green-400">Trợ lý AI · Đăng ký khai sinh</p>
            <h1 id="hero-title" className="text-balance text-[clamp(52px,7.2vw,100px)] leading-[1.02] font-semibold tracking-[-0.045em]">AI hỗ trợ làm <em className="font-editorial font-normal text-blue-200">giấy khai sinh.</em></h1>
            <p className="mt-8 max-w-[62ch] text-base leading-7 text-blue-100 sm:text-lg">Một hướng dẫn số dễ hiểu cho mọi phụ huynh: hỏi ngắn, chuẩn bị đúng giấy tờ, biết vì sao cần và kiểm tra trước khi nộp.</p>
            <div className="mt-9 max-w-xl [&_button]:bg-white [&_button]:text-government [&_button:hover]:bg-blue-100"><StartSessionActions /></div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-[10px] font-bold text-blue-200" aria-label="Cam kết của hệ thống"><span className="inline-flex items-center gap-2 before:size-1.5 before:rounded-full before:bg-green-400">Không cần am hiểu công nghệ</span><span className="inline-flex items-center gap-2 before:size-1.5 before:rounded-full before:bg-green-400">Không tự bổ sung nội dung pháp lý</span></div>
          </div>

          <div className="relative mx-auto w-full max-w-[550px] lg:translate-y-8" aria-label="Minh họa phiên hướng dẫn">
            <div className="absolute -top-5 -right-4 rounded-2xl bg-white px-4 py-3 text-[9px] font-black tracking-widest text-government shadow-[0_18px_50px_rgba(0,0,0,.18)] uppercase max-sm:hidden">Cập nhật theo từng câu trả lời</div>
            <div className="rotate-[1.5deg] rounded-[38px] bg-white/10 p-2 ring-1 ring-white/15 transition duration-700 ease-[var(--ease-premium)] hover:rotate-0 hover:-translate-y-2">
              <div className="rounded-[31px] bg-white p-5 text-ink shadow-[inset_0_1px_0_rgba(255,255,255,.8),0_36px_90px_rgba(0,0,0,.22)] sm:p-7">
                <header className="flex items-center justify-between border-b border-government/10 pb-4 text-[10px] font-extrabold text-government"><div className="flex items-center gap-2"><span className="size-2 animate-pulse rounded-full bg-success shadow-[0_0_0_5px_rgba(21,128,61,.1)]" />Phiên hướng dẫn đang hoạt động</div><small className="text-muted">Tự động lưu</small></header>
                <div className="mt-6 grid gap-3 text-xs leading-5"><p className="mr-10 rounded-[18px_18px_18px_5px] bg-slate-100 p-4">Cha mẹ của bé đã đăng ký kết hôn chưa?</p><span className="ml-10 rounded-[18px_18px_5px_18px] bg-primary p-4 text-white shadow-[0_12px_30px_rgba(11,94,215,.18)]">Chưa, nhưng gia đình muốn ghi tên cha.</span></div>
                <div className="mt-5 grid grid-cols-[44px_1fr] gap-4 rounded-[22px] bg-government p-4 text-white"><span className="grid size-11 place-items-center rounded-xl bg-white/10 text-[10px] font-black">AI</span><div><p className="text-[8px] font-black tracking-widest text-blue-300 uppercase">Trường hợp đã nhận diện</p><strong className="mt-1 block text-lg">Cha mẹ chưa đăng ký kết hôn</strong><span className="mt-1 block text-[9px] text-blue-200">Checklist đang được cập nhật</span></div></div>
                <ol className="mt-5 grid gap-1 text-xs">
                  {[["✓", "Thông tin cơ bản", "Đã tiếp nhận"], ["2", "Giấy tờ cần chuẩn bị", "Kèm căn cứ từ backend"], ["3", "Kiểm tra trước khi nộp", "Sắp tới"]].map(([number, title, note], index) => <li className="grid grid-cols-[36px_1fr] items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-blue-50" key={title}><span className={`grid size-9 place-items-center rounded-xl font-black ${index === 0 ? "bg-success text-white" : index === 1 ? "bg-primary text-white" : "bg-slate-100 text-muted"}`}>{number}</span><div className="grid"><strong className="text-government">{title}</strong><small className="text-[9px] text-muted">{note}</small></div></li>)}
                </ol>
              </div>
            </div>
          </div>
        </section>

        <section className={sectionShell} aria-labelledby="problem-title">
          <div className="grid gap-8 lg:grid-cols-[.72fr_1.38fr_.7fr] lg:items-end" data-reveal>
            <div><p className={eyebrow}>Vấn đề người dân đang gặp</p><strong className="block max-w-52 text-xs leading-5 text-muted">Bản demo tập trung sâu vào đăng ký khai sinh</strong></div>
            <h2 className={sectionTitle} id="problem-title">Một thủ tục tưởng đơn giản có thể thành <em className="font-editorial font-normal text-primary">nhiều lần đi lại.</em></h2>
            <p className="max-w-[34ch] text-sm leading-7 text-muted">Thông tin nằm ở nhiều nơi, sai sót thường chỉ lộ ra sau khi nộp, trong khi cán bộ phải xử lý nhiều câu hỏi lặp lại.</p>
          </div>

          <div className="mt-16 grid gap-4 lg:grid-cols-12 lg:grid-rows-2">
            <article className="group rounded-[34px] bg-government/5 p-1.5 ring-1 ring-government/8 lg:col-span-5 lg:row-span-2" data-reveal>
              <div className="grid min-h-[560px] content-between overflow-hidden rounded-[28px] bg-white p-7 shadow-panel sm:p-9">
                <header className="flex justify-between text-[9px] font-black tracking-widest text-muted uppercase"><span className="text-primary">01</span><small>Trước khi nộp</small></header>
                <div className="relative mx-auto my-12 h-48 w-44" aria-hidden="true"><span className="absolute inset-x-8 top-6 h-40 rotate-6 rounded-[24px] bg-blue-100 transition duration-700 group-hover:rotate-12" /><span className="absolute inset-x-5 top-3 h-40 -rotate-3 rounded-[24px] bg-blue-50 ring-1 ring-primary/10 transition duration-700 group-hover:-rotate-6" /><span className="absolute inset-x-0 top-0 grid h-40 place-items-center rounded-[24px] bg-white font-editorial text-6xl text-primary shadow-[0_22px_60px_rgba(6,59,130,.14)] ring-1 ring-government/8">?</span></div>
                <div><h3 className="max-w-sm text-3xl leading-tight font-semibold tracking-[-.035em] text-government">Không biết cần chuẩn bị những gì</h3><p className="mt-4 max-w-md text-sm leading-7 text-muted">Giấy tờ, biểu mẫu và nơi tiếp nhận khó xác định khiến người dân không biết bắt đầu từ đâu.</p></div>
              </div>
            </article>

            <article className="group rounded-[34px] bg-government/5 p-1.5 ring-1 ring-government/8 lg:col-span-7" data-reveal>
              <div className="grid min-h-[270px] gap-8 overflow-hidden rounded-[28px] bg-white p-7 shadow-panel sm:grid-cols-[1fr_190px] sm:items-center sm:p-9">
                <div><header className="mb-12 flex justify-between text-[9px] font-black tracking-widest text-muted uppercase"><span className="text-primary">02</span><small>Sau khi đã điền</small></header><h3 className="text-3xl leading-tight font-semibold tracking-[-.035em] text-government">Không biết thông tin đã chính xác chưa</h3><p className="mt-4 text-sm leading-7 text-muted">Sai sót thường chỉ được phát hiện khi cán bộ đã xem hồ sơ.</p></div>
                <div className="rounded-[24px] bg-slate-50 p-4 ring-1 ring-government/8" aria-hidden="true"><span className="mb-3 block h-3 w-2/3 rounded-full bg-slate-200" /><span className="mb-3 block h-10 rounded-xl bg-white ring-1 ring-danger/25" /><div className="flex items-center gap-2 text-[9px] font-black text-danger"><i className="grid size-5 place-items-center rounded-full bg-danger text-white not-italic">!</i>Thiếu thông tin</div></div>
              </div>
            </article>

            <article className="group rounded-[34px] bg-government/5 p-1.5 ring-1 ring-government/8 lg:col-span-7" data-reveal>
              <div className="grid min-h-[270px] gap-8 overflow-hidden rounded-[28px] bg-government p-7 text-white shadow-[0_28px_80px_rgba(6,59,130,.2)] sm:grid-cols-[190px_1fr] sm:items-center sm:p-9">
                <div className="grid grid-cols-4 items-end gap-2" aria-hidden="true">{["h-12", "h-20", "h-16", "h-24"].map((height, index) => <span className={`rounded-t-full ${index === 3 ? "bg-white" : "bg-white/25"} ${height}`} key={height}><i className={`mx-auto mt-2 block size-5 rounded-full ${index === 3 ? "bg-primary" : "bg-white/30"}`} /></span>)}</div>
                <div><header className="mb-12 flex justify-between text-[9px] font-black tracking-widest text-blue-200 uppercase"><span>03</span><small>Tại khâu hỗ trợ</small></header><h3 className="text-3xl leading-tight font-semibold tracking-[-.035em]">Một câu hỏi nhỏ, một lần xếp hàng</h3><p className="mt-4 text-sm leading-7 text-blue-100">Câu hỏi nhiều trong khi cán bộ có hạn khiến người dân phải chờ và đi lại trực tiếp.</p></div>
              </div>
            </article>
          </div>

          <div className="mt-5 grid gap-5 rounded-[30px] bg-blue-50 p-6 ring-1 ring-primary/8 sm:grid-cols-[64px_1fr] sm:items-center sm:p-8" data-reveal><span className="grid size-16 place-items-center rounded-2xl bg-government text-2xl text-white" aria-hidden="true">→</span><p><small className="mb-2 block text-[9px] font-black tracking-widest text-primary uppercase">Sản phẩm tập trung vào thời điểm trước khi nộp</small><strong className="text-xl leading-7 text-government">Hướng dẫn đúng việc cần làm và kiểm tra sớm, để mỗi lần đến cơ quan đều rõ ràng hơn.</strong></p></div>
        </section>

        <section className="mx-auto w-[calc(100%_-_24px)] max-w-[1400px] rounded-[38px] bg-government p-1.5 text-white shadow-[0_30px_90px_rgba(6,59,130,.18)] sm:w-[calc(100%_-_48px)]" aria-label="Nguyên tắc hoạt động" data-reveal>
          <div className="grid overflow-hidden rounded-[32px] bg-government lg:grid-cols-[1.1fr_repeat(3,1fr)]">
            <p className="grid min-h-40 content-between bg-white/8 p-7 text-xl font-semibold"><span className="text-[9px] tracking-widest text-blue-300 uppercase">Thiết kế có trách nhiệm</span>Để bạn luôn biết</p>
            {[["01", "Đang ở bước nào", "Tiến độ hiển thị xuyên suốt"], ["02", "Vì sao cần giấy tờ", "Căn cứ đi cùng từng yêu cầu"], ["03", "Khi nào cần cán bộ", "Không để AI tự quyết trường hợp hiếm"]].map(([number, title, copy]) => <div className="group min-h-40 border-white/10 p-7 not-last:border-b lg:not-last:border-r lg:not-last:border-b-0" key={number}><span className="text-[9px] font-black text-blue-300">{number}</span><strong className="mt-8 block text-base transition duration-500 group-hover:translate-x-1">{title}</strong><span className="mt-2 block text-[11px] leading-5 text-blue-200">{copy}</span></div>)}
          </div>
        </section>

        <section className={sectionShell} aria-labelledby="story-title">
          <div className="max-w-4xl" data-reveal><p className={eyebrow}>Bạn không cần rành thủ tục</p><h2 className={sectionTitle} id="story-title">Cứ chia sẻ chuyện của gia đình. <em className="font-editorial font-normal text-primary">AI sẽ hướng dẫn từng bước.</em></h2><p className="mt-7 max-w-2xl text-sm leading-7 text-muted">Bạn chỉ cần trả lời những câu hỏi ngắn, dễ hiểu và xem hồ sơ hoàn thiện dần.</p></div>
          <div className="mt-16 grid gap-4 md:grid-cols-2 lg:grid-cols-12">
            {journey.map(([number, title, description], index) => (
              <article className={`group grid min-h-[310px] content-between overflow-hidden rounded-[32px] p-7 ring-1 ring-government/8 transition duration-700 hover:-translate-y-2 ${index === 0 || index === 3 ? "bg-government text-white shadow-[0_28px_70px_rgba(6,59,130,.16)] lg:col-span-7" : "bg-white text-ink shadow-panel lg:col-span-5"}`} key={number} data-reveal>
                <div className="flex items-center justify-between text-[9px] font-black tracking-widest"><span className={index === 0 || index === 3 ? "text-blue-300" : "text-primary"}>{number}</span><small className={index === 0 || index === 3 ? "text-blue-200" : "text-muted"}>0{index + 1} / 04</small></div>
                <div><h3 className="max-w-sm text-3xl font-semibold tracking-[-.035em]">{title}</h3><p className={`mt-4 max-w-md text-sm leading-7 ${index === 0 || index === 3 ? "text-blue-100" : "text-muted"}`}>{description}</p></div>
              </article>
            ))}
          </div>
        </section>

        <section className="bg-government text-white" aria-labelledby="evidence-title">
          <div className={`${sectionShell} grid gap-16 lg:grid-cols-[.78fr_1.22fr] lg:items-center`}>
            <div data-reveal><p className={`${eyebrow} bg-white/10 text-blue-200 before:bg-blue-300`}>Minh bạch từ thiết kế</p><h2 className={`${sectionTitle} text-white`} id="evidence-title">Không chỉ trả lời. Hệ thống cho bạn thấy <em className="font-editorial font-normal text-blue-200">vì sao.</em></h2><p className="mt-7 max-w-lg text-sm leading-7 text-blue-100">Mỗi kết quả đều cho biết nguồn kiểm tra, mức độ ảnh hưởng và đường dẫn để xem thông tin rõ hơn.</p></div>
            <div className="rounded-[38px] bg-white/8 p-2 ring-1 ring-white/15" data-reveal><div className="rounded-[31px] bg-white p-5 text-ink shadow-[0_38px_90px_rgba(0,0,0,.22)] sm:p-8"><div className="flex justify-between border-b border-government/10 pb-5 text-xs font-extrabold text-government"><span>Kết quả kiểm tra trước</span><small className="rounded-lg bg-amber-50 px-3 py-2 text-warning">2 điểm cần lưu ý</small></div><article className="mt-5 grid grid-cols-[36px_1fr] gap-3 rounded-2xl bg-red-50 p-4 ring-1 ring-danger/10"><span className="grid size-9 place-items-center rounded-xl bg-danger text-white">!</span><div><small className="text-[9px] font-black text-danger uppercase">Kiểm tra tự động theo quy tắc</small><strong className="mt-1 block text-sm">Thông tin này cần được bổ sung</strong><button type="button" className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full bg-white py-1 pr-1 pl-4 text-[10px] font-extrabold text-primary shadow-sm"><span>Sửa trường này</span><i className="grid size-8 place-items-center rounded-full bg-blue-50 not-italic">↗</i></button></div></article><article className="mt-3 grid grid-cols-[36px_1fr] gap-3 rounded-2xl bg-amber-50 p-4 ring-1 ring-warning/10"><span className="grid size-9 place-items-center rounded-xl bg-warning text-white">◇</span><div><small className="text-[9px] font-black text-warning uppercase">AI phát hiện · cần xác nhận</small><strong className="mt-1 block text-sm">Đây là cảnh báo, không phải lỗi bắt buộc</strong></div></article><details className="mt-4 rounded-2xl bg-slate-50 p-4 text-xs text-muted ring-1 ring-government/8"><summary className="min-h-8 cursor-pointer font-extrabold text-primary">Căn cứ pháp lý từ backend</summary><p className="mt-3 leading-5">Nội dung được hiển thị nguyên trạng từ hệ thống nghiệp vụ, không được frontend tự viết thêm.</p></details></div></div>
          </div>
        </section>

        <section id="official-sources" className={sectionShell} aria-labelledby="trust-title">
          <div className="max-w-4xl" data-reveal><p className={eyebrow}>Nguồn và phương pháp kiểm chứng</p><h2 className={sectionTitle} id="trust-title">Uy tín không đến từ câu <em className="font-editorial font-normal text-primary">“AI đã được huấn luyện”.</em></h2><p className="mt-7 max-w-2xl text-sm leading-7 text-muted">Uy tín đến từ việc công khai AI được phép làm gì, quy tắc nào kiểm tra hồ sơ và nguồn nào người dùng có thể tự mở để đối chiếu.</p></div>

          <div className="mt-16 grid gap-4 lg:grid-cols-12 lg:grid-rows-2">
            {methodCards.map(([number, layer, title, copy, promise], index) => <article className={`grid content-between rounded-[32px] p-7 ring-1 ring-government/8 ${index === 0 ? "min-h-[520px] bg-government text-white shadow-[0_28px_80px_rgba(6,59,130,.18)] lg:col-span-5 lg:row-span-2" : "min-h-[250px] bg-white text-ink shadow-panel lg:col-span-7"}`} data-reveal key={number}><header className={`flex justify-between text-[9px] font-black tracking-widest uppercase ${index === 0 ? "text-blue-200" : "text-muted"}`}><span className={index === 0 ? "text-blue-300" : "text-primary"}>{number}</span><small>{layer}</small></header><div><h3 className="max-w-md text-3xl font-semibold tracking-[-.035em]">{title}</h3><p className={`mt-4 max-w-lg text-sm leading-7 ${index === 0 ? "text-blue-100" : "text-muted"}`}>{copy}</p></div><strong className={`text-[9px] font-black uppercase ${index === 0 ? "text-green-300" : "text-success"}`}>✓ {promise}</strong></article>)}
          </div>

          <div className="mt-5 grid gap-5 rounded-[30px] bg-amber-50 p-6 ring-1 ring-warning/15 md:grid-cols-[72px_1fr_auto] md:items-center" data-reveal><span className="grid size-[72px] place-items-center rounded-2xl bg-warning text-sm font-black text-white" aria-hidden="true">AI ≠ PL</span><div><small className="text-[9px] font-black tracking-widest text-warning uppercase">Công khai giới hạn mô hình</small><h3 className="mt-2 text-lg font-extrabold text-government">Không đánh tráo “nguồn tham khảo” thành “dữ liệu huấn luyện”</h3><p className="mt-2 text-xs leading-6 text-muted">{trust?.training_disclosure || "Thông tin công khai về mô hình đang được tải trực tiếp từ backend."}</p></div>{trust && <time className="rounded-xl bg-white px-4 py-3 text-[9px] font-bold text-muted" dateTime={trust.last_reviewed_on}>Rà soát<br /><strong className="mt-1 block text-government">{new Intl.DateTimeFormat("vi-VN").format(new Date(`${trust.last_reviewed_on}T00:00:00`))}</strong></time>}</div>

          <div className="mt-5 rounded-[38px] bg-government/5 p-1.5 ring-1 ring-government/8" data-reveal>
            <div className="grid overflow-hidden rounded-[32px] bg-government text-white shadow-[0_30px_80px_rgba(6,59,130,.18)] lg:grid-cols-[.8fr_1.2fr]">
              <section className="grid content-between gap-12 p-7 sm:p-10" aria-labelledby="source-registry-title"><div><p className="text-[9px] font-black tracking-widest text-blue-300 uppercase">Danh mục nguồn chính thức</p><strong className="mt-5 block text-7xl tracking-[-.06em]">{trust ? String(trust.sources.length).padStart(2, "0") : "—"}</strong><span className="text-xs text-blue-200">nguồn có thể mở</span></div><div><h3 className="text-3xl leading-tight font-semibold tracking-[-.035em]" id="source-registry-title">Không cần tin một lời khẳng định. Hãy mở nguồn và tự đối chiếu.</h3><p className="mt-4 text-xs leading-6 text-blue-100">Các đường dẫn được backend công bố nguyên trạng từ Cổng Dịch vụ công Quốc gia.</p></div><a className="group flex min-h-14 items-center justify-between rounded-2xl bg-white py-1.5 pr-1.5 pl-5 text-xs font-extrabold text-government transition duration-500 hover:bg-blue-100 active:scale-[.98]" href="https://dichvucong.gov.vn" target="_blank" rel="noreferrer"><span>dichvucong.gov.vn</span><i className="grid size-11 place-items-center rounded-xl bg-blue-50 not-italic transition duration-500 group-hover:translate-x-1 group-hover:-translate-y-0.5">↗</i></a></section>
              <section className="bg-white p-5 text-ink sm:p-7" aria-label="Danh sách tài liệu tham khảo"><header className="flex justify-between border-b border-government/10 pb-5"><div><p className="text-[9px] font-black tracking-widest text-primary uppercase">Thư viện tham chiếu</p><h3 className="mt-1 text-xl font-semibold tracking-tight text-government">Mở từng tài liệu để kiểm chứng</h3></div><span className="text-[10px] font-bold text-muted">{trust ? `${trust.sources.length} liên kết` : "Đang tải"}</span></header>{trust ? <div className="max-h-[510px] overflow-y-auto overscroll-contain">{trust.sources.map((source, index) => <a className="group grid grid-cols-[32px_1fr_36px] items-center gap-3 border-b border-government/8 py-4 transition duration-500 hover:bg-blue-50 sm:px-3" key={source.code} href={source.url} target="_blank" rel="noreferrer"><span className="text-[10px] font-black text-slate-400">{String(index + 1).padStart(2, "0")}</span><div className="grid gap-1"><small className="text-[8px] font-black tracking-wide text-primary uppercase">{source.publisher}</small><strong className="text-xs leading-5 text-government">{source.title}</strong><code className="text-[9px] text-muted">{source.domain}</code></div><i className="grid size-9 place-items-center rounded-xl bg-blue-50 text-primary not-italic transition duration-500 group-hover:translate-x-1 group-hover:-translate-y-0.5">↗</i></a>)}</div> : <p className="py-12 text-center text-xs text-muted" role={trustUnavailable ? "alert" : "status"}>{trustUnavailable ? "Chưa tải được thư viện nguồn từ backend. Vui lòng kiểm tra kết nối." : "Đang tải các đường dẫn nguồn chính thức..."}</p>}</section>
            </div>
          </div>
        </section>

        <section className="bg-blue-50/70" aria-labelledby="capabilities-title">
          <div className={sectionShell}>
            <div className="max-w-4xl" data-reveal><p className={`${eyebrow} bg-white`}>Nghiệp vụ trong một trải nghiệm</p><h2 className={sectionTitle} id="capabilities-title">Đủ sâu cho hồ sơ thật. <em className="font-editorial font-normal text-primary">Đủ đơn giản cho lần dùng đầu tiên.</em></h2></div>
            <div className="mt-16 grid gap-4 md:grid-cols-2 lg:grid-cols-12">
              {[["REC", "Hỗ trợ tiếp cận", "Nói thay vì gõ", "Ghi âm tiếng Việt, xem lại bản chuyển thành chữ và sửa trước khi gửi."], ["CASE", "Phân loại nhiều trường hợp", "Nhận diện các yếu tố cùng lúc", "Một phiên có thể kết hợp yếu tố nước ngoài, chưa đăng ký kết hôn và quá hạn."], ["PDF", "Đầu ra trực quan", "Xem trước và tải PDF", "Đối chiếu thông tin đã điền trước khi dùng bản demo hồ sơ."], ["HUM", "Điểm dừng an toàn", "Chuyển cán bộ khi cần", "Trường hợp hiếm hoặc chưa chắc chắn luôn được chuyển sang con người xem xét."], ["OPS", "Góc nhìn vận hành", "Cổng quản lý cho cán bộ", "Theo dõi phiên, nhóm trường hợp và câu hỏi phụ huynh đang gặp."], ["API", "Tích hợp liền mạch", "Sẵn sàng cho cổng dịch vụ công", "Backend API cho phép nhúng trải nghiệm vào hệ thống đang có."]].map(([icon, label, title, copy], index) => <article className={`group grid min-h-[300px] content-between rounded-[32px] p-7 ring-1 ring-government/8 transition duration-700 hover:-translate-y-2 ${index === 0 || index === 4 ? "bg-government text-white shadow-[0_28px_70px_rgba(6,59,130,.18)] lg:col-span-7" : index === 1 || index === 5 ? "bg-white text-ink shadow-panel lg:col-span-5" : "bg-white text-ink shadow-panel lg:col-span-6"}`} data-reveal key={title}><span className={`grid size-12 place-items-center rounded-2xl text-[9px] font-black tracking-wider transition duration-500 group-hover:scale-105 ${index === 0 || index === 4 ? "bg-white/10 text-white" : "bg-blue-50 text-primary"}`}>{icon}</span><div><small className={`text-[9px] font-black tracking-widest uppercase ${index === 0 || index === 4 ? "text-blue-200" : "text-primary"}`}>{label}</small><h3 className="mt-3 max-w-md text-3xl font-semibold tracking-[-.035em]">{title}</h3><p className={`mt-4 max-w-lg text-sm leading-7 ${index === 0 || index === 4 ? "text-blue-100" : "text-muted"}`}>{copy}</p>{index === 4 && <a className="mt-5 inline-flex text-xs font-extrabold text-white" href="/admin">Mở cổng cán bộ →</a>}</div></article>)}
            </div>
          </div>
        </section>

        <section className="mx-auto my-8 grid w-[calc(100%_-_24px)] max-w-[1400px] gap-12 overflow-hidden rounded-[42px] bg-government p-8 text-white shadow-[0_36px_100px_rgba(6,59,130,.22)] sm:w-[calc(100%_-_48px)] sm:p-14 lg:grid-cols-[1fr_auto] lg:items-center" data-reveal><div><p className="mb-6 inline-flex rounded-full bg-white/10 px-3.5 py-2 text-[9px] font-black tracking-widest text-blue-200 uppercase">Bắt đầu khi bạn sẵn sàng</p><h2 className="text-balance text-[clamp(40px,5vw,68px)] leading-[1.05] font-semibold tracking-[-0.045em]">Một câu trả lời hôm nay.<br /><em className="font-editorial font-normal text-blue-200">Một bộ hồ sơ rõ ràng hơn.</em></h2></div><div className="w-full lg:w-auto lg:min-w-72 [&_button]:bg-white [&_button]:text-government [&_button:hover]:bg-blue-100"><StartSessionActions compact /></div></section>
      </main>
    </AppShell>
  );
}

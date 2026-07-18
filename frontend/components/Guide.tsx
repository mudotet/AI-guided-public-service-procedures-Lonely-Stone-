"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent, KeyboardEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

import { API_BASE_URL, ApiError, apiFetch, BACKEND_ONLINE_EVENT } from "@/lib/api";
import { emptyRegistrationForm, flowStep, mergeConversationFacts, normaliseForm, RARE_CASE_CODES } from "@/lib/session";
import type {
  AudioTranscriptionResponse,
  CaseSummary,
  ChatMessage,
  ChecklistResponse,
  IntakeResponse,
  PrecheckIssue,
  PrecheckResponse,
  RegistrationForm,
  SessionDetail,
  SessionResponse,
} from "@/lib/types";

const STORAGE_KEY = "birth-registration-session-id";
const fieldClass = "grid gap-2 text-xs font-bold text-slate-700 [&_input]:min-h-12 [&_input]:w-full [&_input]:rounded-2xl [&_input]:border [&_input]:border-government/10 [&_input]:bg-white [&_input]:px-4 [&_input]:text-sm [&_input]:font-normal [&_input]:text-ink [&_input]:shadow-[inset_0_1px_2px_rgba(6,59,130,.03)] [&_input]:outline-none [&_input]:transition [&_input]:duration-500 [&_input]:focus:border-primary [&_input]:focus:ring-4 [&_input]:focus:ring-primary/10 [&_select]:min-h-12 [&_select]:w-full [&_select]:rounded-2xl [&_select]:border [&_select]:border-government/10 [&_select]:bg-white [&_select]:px-4 [&_select]:text-sm [&_select]:font-normal [&_select]:text-ink [&_select]:outline-none [&_select]:transition [&_select]:duration-500 [&_select]:focus:border-primary [&_select]:focus:ring-4 [&_select]:focus:ring-primary/10 [&_select]:disabled:cursor-not-allowed [&_select]:disabled:bg-slate-100";
const primaryActionClass = "group inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-primary py-1.5 pr-1.5 pl-5 text-xs font-extrabold text-white shadow-[0_14px_34px_rgba(11,94,215,0.2)] transition duration-500 ease-[var(--ease-premium)] hover:-translate-y-0.5 hover:bg-government active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-55";

export function AppShell({ children, home = false, session = false }: { children: ReactNode; home?: boolean; session?: boolean }) {
  return (
    <div className="relative isolate min-h-screen overflow-x-hidden bg-transparent font-sans text-ink" data-page={home ? "home" : session ? "session" : undefined}>
      <header className="sticky top-3 z-30 mx-auto w-[calc(100%_-_24px)] max-w-[1240px] rounded-full bg-government/5 p-1.5 shadow-[0_18px_55px_rgba(6,59,130,0.09)] ring-1 ring-government/8 backdrop-blur-xl sm:w-[calc(100%_-_48px)]">
        <div className="flex min-h-15 items-center justify-between rounded-full bg-white/95 px-3 sm:px-5">
          <Link href="/" className="inline-flex items-center gap-3" aria-label="Trang chủ hướng dẫn đăng ký khai sinh">
            <span className="relative size-11 overflow-hidden rounded-xl bg-white shadow-lg shadow-government/15 ring-1 ring-government/10"><Image className="h-full w-full object-cover" src="/logo.jpg" alt="Biểu trưng CivicPath AI" width={44} height={44} priority /></span>
            <span className="flex flex-col leading-tight"><strong className="text-sm font-extrabold text-government">Dịch vụ công</strong><small className="hidden text-[10px] text-muted sm:block sm:text-xs">Hướng dẫn đăng ký khai sinh</small></span>
          </Link>
          <div className="flex items-center gap-4"><Link className="inline-flex min-h-10 items-center rounded-full bg-blue-50 px-4 text-xs font-extrabold text-government ring-1 ring-primary/10 transition duration-500 hover:-translate-y-0.5 hover:bg-primary hover:text-white active:scale-[.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" href="/admin">Cổng cán bộ</Link></div>
        </div>
      </header>
      {children}
      <footer className="mx-auto flex w-[calc(100%_-_32px)] max-w-[1240px] justify-center border-t border-government/10 py-8 text-center text-xs leading-6 text-muted">
        <p className="m-0">Hệ thống hỗ trợ chuẩn bị thông tin, không thay thế quyết định của cơ quan hộ tịch.</p>
      </footer>
    </div>
  );
}

export function StartSessionActions({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [savedId, setSavedId] = useState<string | null>(null);
  const [health, setHealth] = useState<"checking" | "ok" | "error">("checking");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const markBackendOnline = () => setHealth("ok");
    window.addEventListener(BACKEND_ONLINE_EVENT, markBackendOnline);
    setSavedId(localStorage.getItem(STORAGE_KEY));
    apiFetch<{ status: string }>("/health", {}, 70_000)
      .then(markBackendOnline)
      .catch(() => setHealth((current) => current === "ok" ? current : "error"));
    return () => window.removeEventListener(BACKEND_ONLINE_EVENT, markBackendOnline);
  }, []);

  async function start() {
    setPending(true);
    setError("");
    try {
      const session = await apiFetch<SessionResponse>("/sessions", { method: "POST", body: "{}" });
      localStorage.setItem(STORAGE_KEY, session.id);
      router.push(`/session/${session.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể tạo phiên làm việc.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={compact ? "w-full lg:w-auto" : "w-full"}>
      <div className={`flex flex-wrap gap-3 ${compact ? "lg:justify-end" : ""}`}>
        <button className="group inline-flex min-h-13 items-center justify-center gap-3 rounded-full bg-primary py-1.5 pr-1.5 pl-5 text-sm font-extrabold text-white shadow-[0_16px_40px_rgba(11,94,215,0.22)] transition duration-500 hover:-translate-y-0.5 hover:bg-government active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-60" type="button" onClick={start} disabled={pending}>
          <span>{pending ? "Đang tạo phiên..." : "Bắt đầu hướng dẫn"}</span><i className="grid size-10 place-items-center rounded-full bg-white/16 font-normal not-italic transition duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true">↗</i>
        </button>
        {savedId && (
          <Link className="group inline-flex min-h-13 items-center justify-center gap-3 rounded-full bg-white py-1.5 pr-1.5 pl-5 text-sm font-extrabold text-government ring-1 ring-government/12 transition duration-500 hover:-translate-y-0.5 hover:bg-blue-50 hover:ring-primary/25 active:scale-[.98]" href={`/session/${savedId}`}>
            <span>Tiếp tục phiên trước</span><i className="grid size-10 place-items-center rounded-full bg-blue-50 font-normal not-italic transition duration-500 group-hover:translate-x-1" aria-hidden="true">→</i>
          </Link>
        )}
      </div>
      {!compact && (
        <p className={`mt-4 flex items-center gap-2 text-xs font-semibold ${health === "ok" ? "text-success" : health === "error" ? "text-danger" : "text-muted"}`}>
          <span className={`size-2 rounded-full ${health === "ok" ? "bg-success" : health === "error" ? "bg-danger" : "animate-pulse bg-muted"}`} aria-hidden="true" />
          {health === "checking" ? "Đang kiểm tra kết nối" : health === "ok" ? "Hệ thống đang trực tuyến" : "Chưa kết nối được backend"}
        </p>
      )}
      {error && <p className="mt-3 rounded-xl border border-danger/20 bg-red-50 px-4 py-3 text-sm text-danger" role="alert">{error}</p>}
    </div>
  );
}

export function ProgressStepper({ current }: { current: number }) {
  const steps = ["Trao đổi", "Hồ sơ", "Kiểm tra", "Sẵn sàng"];
  return (
    <nav className="w-full" aria-label="Tiến độ đăng ký">
      <ol className="grid grid-cols-4 gap-1">
        {steps.map((step, index) => (
          <li key={step} className="relative flex items-center gap-2 after:absolute after:top-4 after:right-0 after:left-[calc(50%+22px)] after:h-px after:bg-line last:after:hidden sm:flex-col sm:justify-center sm:text-center" aria-current={index === current ? "step" : undefined}>
            <span className={`relative z-10 grid size-8 place-items-center rounded-full text-[11px] font-black transition ${index < current ? "bg-success text-white" : index === current ? "bg-primary text-white shadow-[0_0_0_5px_rgba(11,94,215,0.1)]" : "bg-slate-100 text-muted"}`}>{index < current ? "✓" : index + 1}</span>
            <small className={`hidden text-[10px] font-bold sm:block ${index === current ? "text-government" : "text-muted"}`}>{step}</small>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function CaseBadges({ primaryCase, cases }: { primaryCase: CaseSummary | null; cases: CaseSummary[] }) {
  if (!primaryCase && cases.length === 0) {
    return (
      <section className="grid min-h-80 place-items-center rounded-[30px] border border-government/10 bg-white p-8 text-center shadow-panel" aria-live="polite" aria-label="Hệ thống đang xác định trường hợp">
        <div className="relative grid size-20 place-items-center" aria-hidden="true"><span className="size-6 animate-pulse rounded-full bg-primary shadow-[0_0_0_10px_rgba(11,94,215,0.08)]" /><i className="absolute inset-2 rounded-full border border-primary/15" /><i className="absolute inset-0 animate-spin rounded-full border border-dashed border-primary/25 [animation-duration:9s]" /></div>
        <div>
          <p className="mb-3 inline-flex items-center gap-2 text-[9px] font-black tracking-[0.1em] text-primary uppercase"><i className="size-1.5 rounded-full bg-warning not-italic shadow-[0_0_0_4px_rgba(217,119,6,0.1)]" aria-hidden="true" />Đang nhận diện hồ sơ</p>
          <h2 className="mx-auto max-w-80 text-[22px] leading-tight font-semibold tracking-[-0.035em] text-government">Chưa đủ dữ kiện để xác định trường hợp</h2>
          <span className="mx-auto mt-3 block max-w-80 text-[11px] leading-6 text-muted">Trả lời thêm vài câu ngắn. Checklist sẽ xuất hiện ngay khi hệ thống nhận diện được tình huống của bạn.</span>
        </div>
        <div className="mt-2 flex w-56 gap-1.5" aria-hidden="true"><span className="h-1 flex-1 rounded-full bg-primary" /><span className="h-1 flex-1 rounded-full bg-slate-200" /><span className="h-1 flex-1 rounded-full bg-slate-200" /></div>
      </section>
    );
  }
  const primary = primaryCase || cases.find((item) => item.is_primary) || cases[0];
  const relatedCases = cases.filter((item) => item.code !== primary?.code);
  const caseCount = Math.max(cases.length, primary ? 1 : 0);
  return (
    <section className="overflow-hidden rounded-[30px] border border-government/10 bg-white p-1.5 shadow-panel" aria-labelledby="case-result-title" aria-live="polite">
      <header className="flex items-center justify-between gap-4 px-5 py-4 max-sm:items-start max-sm:flex-col">
        <div className="flex items-center gap-2.5 text-[9px] font-black tracking-[0.1em] text-government uppercase"><i className="size-2 rounded-full bg-success not-italic shadow-[0_0_0_5px_rgba(21,128,61,0.1)]" aria-hidden="true" /><span>Trường hợp của bạn</span></div>
        <strong className="rounded-full bg-blue-50 px-3 py-2 text-[9px] font-black text-government">{caseCount} {caseCount === 1 ? "trường hợp" : "yếu tố"}</strong>
      </header>

      <div className="grid grid-cols-[50px_minmax(0,1fr)] gap-4 rounded-3xl bg-government px-6 py-6 text-white shadow-[0_22px_54px_rgba(6,59,130,0.18),inset_0_0_0_6px_rgba(255,255,255,0.055)] max-sm:grid-cols-[42px_minmax(0,1fr)] max-sm:px-[18px] max-sm:py-5">
        <span className="grid size-[50px] place-items-center rounded-2xl bg-white text-[11px] font-black text-government shadow-xl max-sm:size-[42px]" aria-hidden="true">01</span>
        <div>
          <p className="mb-2 text-[8px] font-black tracking-[0.13em] text-blue-300 uppercase">Trường hợp chính</p>
          <h2 className="text-[clamp(22px,2.2vw,30px)] leading-[1.08] font-semibold tracking-[-0.04em] text-white" id="case-result-title">{primary?.name}</h2>
          <div className="mt-4 border-t border-white/15 pt-3.5">
            <strong className="mb-1 block text-[10px] text-white">Vì sao hệ thống xác định như vậy?</strong>
            <span className="block text-[11px] leading-5 text-blue-100">{primary?.description || "Hệ thống đang tiếp tục làm rõ trường hợp này từ câu trả lời của bạn."}</span>
          </div>
        </div>
        <small className={`col-start-2 w-fit rounded-lg px-2.5 py-2 text-[8px] font-black max-sm:col-span-2 max-sm:col-start-1 ${primary?.requires_officer_confirmation ? "bg-warning/15 text-amber-100" : "bg-green-400/15 text-green-100"}`}>
          {primary?.requires_officer_confirmation ? "Cần cán bộ xác nhận" : "Có thể tiếp tục tự hướng dẫn"}
        </small>
      </div>

      {relatedCases.length ? (
        <div className="px-5 pt-6 pb-2">
          <div className="flex items-center justify-between gap-4 px-1 pb-4"><div><p className="mb-1 text-[11px] font-black text-government">Yếu tố đi kèm</p><span className="text-[9px] text-muted">Được cộng thêm vào checklist</span></div><strong className="text-2xl font-medium tracking-tight text-primary">+{relatedCases.length}</strong></div>
          <ul className="m-0 grid list-none p-0">
            {relatedCases.map((item, index) => (
              <li className="grid min-h-20 grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 border-t border-government/10 px-1 py-3 max-sm:grid-cols-[28px_minmax(0,1fr)]" key={item.code}>
                <span className="text-[10px] font-black text-slate-400" aria-hidden="true">{String(index + 2).padStart(2, "0")}</span>
                <div className="grid gap-1"><small className="text-[8px] font-extrabold tracking-widest text-slate-400 uppercase">Yếu tố liên quan</small><strong className="text-xs leading-5 text-government">{item.name}</strong>{item.description && <p className="m-0 text-[9px] leading-4 text-muted">{item.description}</p>}</div>
                {item.requires_officer_confirmation && <em className="rounded-lg bg-amber-50 px-2 py-1.5 text-[8px] font-black text-amber-700 not-italic max-sm:col-start-2">Cần cán bộ</em>}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="m-4 flex items-center gap-3 rounded-2xl bg-blue-50 p-4"><i className="grid size-8 shrink-0 place-items-center rounded-xl bg-success text-[11px] font-black text-white not-italic" aria-hidden="true">✓</i><p className="m-0 grid gap-1"><strong className="text-[11px] text-government">Chưa ghi nhận yếu tố đi kèm</strong><span className="text-[9px] leading-4 text-muted">Hệ thống vẫn tiếp tục cập nhật theo câu trả lời mới.</span></p></div>
      )}

      <footer className="mx-5 mb-4 flex items-start gap-2.5 border-t border-government/10 pt-4"><span className="grid size-5 shrink-0 place-items-center rounded-full bg-blue-50 text-[9px] font-black text-primary" aria-hidden="true">i</span><p className="m-0 text-[9px] leading-4 text-muted">Kết quả dựa trên những gì bạn đã chia sẻ và có thể được cập nhật khi có thêm thông tin.</p></footer>
    </section>
  );
}

export function OfficerConfirmationBanner() {
  return (
    <aside className="my-4 flex items-start gap-3 rounded-2xl border border-warning/20 bg-amber-50 p-4 text-amber-950" role="status">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-warning text-sm font-black text-white" aria-hidden="true">!</span>
      <div>
        <strong className="text-sm">Cần cán bộ hộ tịch xác nhận trực tiếp</strong>
        <p className="mt-1 mb-0 text-xs leading-5 text-amber-800">Trường hợp này có yếu tố cần được cơ quan hộ tịch xem xét thêm.</p>
      </div>
    </aside>
  );
}

export function LegalBasisAccordion({ basis }: { basis: string | string[] | null }) {
  const items = Array.isArray(basis) ? basis : basis ? [basis] : [];
  return (
    <details className="mt-2 text-[10px] text-muted">
      <summary className="min-h-8 w-fit cursor-pointer font-extrabold text-primary">Căn cứ pháp lý</summary>
      {items.length ? (
        <ul className="mt-2 grid gap-1.5 pl-5 leading-5">{items.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul>
      ) : (
        <p className="mt-2 text-warning">Chưa có căn cứ được ánh xạ – cần cán bộ xác nhận</p>
      )}
    </details>
  );
}

export function ChecklistPanel({ checklist }: { checklist: ChecklistResponse | null }) {
  return (
    <section className="mt-4 overflow-hidden rounded-[30px] border border-government/10 bg-government/5 p-1.5 shadow-panel" aria-labelledby="checklist-title">
      <details className="checklist-native group overflow-hidden rounded-3xl bg-white max-[1079px]:[&[open]>summary]:border-b max-[1079px]:[&[open]>summary]:border-government/10">
        <summary className="hidden min-h-16 cursor-pointer items-center justify-between gap-5 px-5 py-3 text-government marker:hidden max-[1079px]:flex">
          <span className="flex flex-col"><strong id="checklist-title" className="text-[13px]">Checklist đang thành hình</strong><small className="text-[9px] text-muted">{checklist ? `${checklist.documents.length} giấy tờ` : "Chờ thêm thông tin"}</small></span>
          <span className="text-[9px] text-muted group-open:hidden" aria-hidden="true">Mở</span><span className="hidden text-[9px] text-muted group-open:inline" aria-hidden="true">Thu gọn</span>
        </summary>
        <div>
          <div className="flex items-start justify-between gap-5 border-b border-government/10 px-6 py-5 max-[1079px]:hidden">
            <div><p className="mb-1 text-[9px] font-black tracking-widest text-primary uppercase">Hồ sơ của bạn</p><h2 className="text-xl font-semibold tracking-tight text-government" id="checklist-title-desktop">Checklist đang thành hình</h2></div>
            {checklist && <span className="rounded-full bg-blue-50 px-3 py-2 text-[9px] font-black text-government">{checklist.documents.length} giấy tờ</span>}
          </div>
          {!checklist ? (
            <div className="grid min-h-44 place-items-center gap-3 px-6 py-8 text-center">
              <span className="size-3 animate-pulse rounded-full bg-primary shadow-[0_0_0_8px_rgba(11,94,215,0.08)]" aria-hidden="true" />
              <p className="m-0 max-w-64 text-[11px] leading-5 text-muted">Checklist sẽ cập nhật ngay khi hệ thống xác định được trường hợp.</p>
            </div>
          ) : (
            <>
              <div className="max-h-[520px] overflow-y-auto px-5">
                {checklist.documents.map((document) => (
                  <article key={document.code} className="grid grid-cols-[10px_minmax(0,1fr)] gap-3 border-b border-government/10 py-4 last:border-b-0">
                    <div className={`mt-1 size-2.5 rounded-full ${document.required ? "bg-danger" : "bg-slate-300"}`} aria-hidden="true" />
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="m-0 text-xs leading-5 font-bold text-slate-800">{document.name}</h3>
                        <span className={`shrink-0 text-[8px] font-black uppercase ${document.required ? "text-danger" : "text-muted"}`}>{document.required ? "Bắt buộc" : "Nếu có"}</span>
                      </div>
                      {document.description && <p className="mt-1.5 mb-0 text-[10px] leading-5 text-slate-500">{document.description}</p>}
                      <LegalBasisAccordion basis={document.legal_basis} />
                    </div>
                  </article>
                ))}
              </div>
              {checklist.steps.length > 0 && (
                <details className="border-t border-government/10 px-6 py-5">
                  <summary className="min-h-8 cursor-pointer text-[11px] font-extrabold text-government">Các bước thực hiện ({checklist.steps.length})</summary>
                  <ol className="mt-4 grid list-none gap-5 p-0">
                    {checklist.steps.map((step, index) => (
                      <li className="grid grid-cols-[30px_1fr] gap-3" key={`${step.order}-${index}`}>
                        <span className="grid size-[30px] place-items-center rounded-full bg-primary text-[9px] font-black text-white">{step.order}</span>
                        <div><strong className="text-[11px] text-ink">{step.title}</strong><p className="mt-1 mb-0 text-[10px] leading-5 text-muted">{step.description}</p><LegalBasisAccordion basis={step.legal_basis} /></div>
                      </li>
                    ))}
                  </ol>
                </details>
              )}
            </>
          )}
        </div>
      </details>
    </section>
  );
}

type IntakeChatProps = {
  messages: ChatMessage[];
  pending: boolean;
  confidence: number | null;
  onSend: (message: string) => Promise<void>;
  onTranscribe: (audio: Blob, filename: string) => Promise<string>;
};

type VoicePhase = "idle" | "recording" | "transcribing" | "review";

export function IntakeChat({ messages, pending, confidence, onSend, onTranscribe }: IntakeChatProps) {
  const [draft, setDraft] = useState("");
  const [voicePhase, setVoicePhase] = useState<VoicePhase>("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState("");
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [voiceError, setVoiceError] = useState("");
  const [transcriptReady, setTranscriptReady] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioUrlRef = useRef("");
  const timerRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, pending]);

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    if (recorderRef.current) recorderRef.current.onstop = null;
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
  }, []);

  function clearVoiceTimers() {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timerRef.current = null;
    timeoutRef.current = null;
  }

  function stopMicrophone() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function replaceAudioUrl(nextUrl: string) {
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = nextUrl;
    setAudioUrl(nextUrl);
  }

  function resetVoice() {
    clearVoiceTimers();
    stopMicrophone();
    replaceAudioUrl("");
    setRecordedAudio(null);
    setVoicePhase("idle");
    setElapsedSeconds(0);
    setVoiceError("");
    setTranscriptReady(false);
  }

  function recordingFilename(type: string) {
    if (type.includes("mp4")) return "ghi-am.m4a";
    if (type.includes("mpeg")) return "ghi-am.mp3";
    if (type.includes("wav")) return "ghi-am.wav";
    return "ghi-am.webm";
  }

  async function transcribe(audio: Blob) {
    setVoicePhase("transcribing");
    setVoiceError("");
    setTranscriptReady(false);
    try {
      const transcript = await onTranscribe(audio, recordingFilename(audio.type));
      setDraft((current) => current.trim() ? `${current.trim()} ${transcript}` : transcript);
      setTranscriptReady(true);
      setVoicePhase("review");
      requestAnimationFrame(() => textareaRef.current?.focus());
    } catch (cause) {
      setVoiceError(cause instanceof Error ? cause.message : "Không thể chuyển ghi âm thành chữ.");
      setVoicePhase("review");
    }
  }

  async function startRecording() {
    if (pending || voicePhase === "recording" || voicePhase === "transcribing") return;
    setVoiceError("");
    setTranscriptReady(false);

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setVoiceError("Trình duyệt này chưa hỗ trợ ghi âm. Bạn vẫn có thể nhập câu trả lời bằng bàn phím.");
      return;
    }

    const supportedType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]
      .find((type) => MediaRecorder.isTypeSupported(type));
    if (!supportedType) {
      setVoiceError("Trình duyệt không có định dạng ghi âm phù hợp. Bạn vẫn có thể nhập bằng bàn phím.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: supportedType });
      replaceAudioUrl("");
      setRecordedAudio(null);
      chunksRef.current = [];
      streamRef.current = stream;
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        clearVoiceTimers();
        stopMicrophone();
        const audio = new Blob(chunksRef.current, { type: recorder.mimeType || supportedType });
        setRecordedAudio(audio);
        if (!audio.size) {
          setVoiceError("Không thu được âm thanh. Vui lòng kiểm tra micro và thử lại.");
          setVoicePhase("idle");
          return;
        }
        replaceAudioUrl(URL.createObjectURL(audio));
        void transcribe(audio);
      };
      recorder.onerror = () => {
        setVoiceError("Quá trình ghi âm bị gián đoạn. Vui lòng thử lại.");
      };

      recorder.start(250);
      const startedAt = Date.now();
      setElapsedSeconds(0);
      setVoicePhase("recording");
      timerRef.current = window.setInterval(() => {
        setElapsedSeconds(Math.min(90, Math.floor((Date.now() - startedAt) / 1000)));
      }, 500);
      timeoutRef.current = window.setTimeout(() => {
        if (recorder.state === "recording") recorder.stop();
      }, 90_000);
    } catch (cause) {
      stopMicrophone();
      const denied = cause instanceof DOMException && cause.name === "NotAllowedError";
      setVoiceError(denied
        ? "Micro chưa được cấp quyền. Hãy cho phép dùng micro trong trình duyệt rồi thử lại."
        : "Không mở được micro. Hãy kiểm tra thiết bị và thử lại.");
      setVoicePhase("idle");
    }
  }

  function stopRecording() {
    const recorder = recorderRef.current;
    if (recorder?.state !== "recording") return;
    clearVoiceTimers();
    setVoicePhase("transcribing");
    recorder.stop();
  }

  async function submit() {
    const message = draft.trim();
    if (!message || pending) return;
    setDraft("");
    resetVoice();
    try {
      await onSend(message);
    } catch {
      setDraft(message);
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  }

  function keyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void submit();
    }
  }

  return (
    <section className="overflow-hidden rounded-[34px] bg-white shadow-panel ring-1 ring-government/8" aria-labelledby="chat-title">
      <div className="flex flex-wrap items-start justify-between gap-5 border-b border-government/10 px-5 py-6 sm:px-7">
        <div><p className="mb-1 text-[9px] font-black tracking-widest text-primary uppercase">Trao đổi với trợ lý</p><h1 className="text-[clamp(22px,3vw,32px)] leading-tight font-semibold tracking-[-0.035em] text-government" id="chat-title">Cho chúng tôi biết tình huống của bạn</h1></div>
        {confidence !== null && (
          <details className="text-[10px] text-muted"><summary className="min-h-8 cursor-pointer font-bold text-primary">Chi tiết phân tích</summary><p className="mt-2">Độ tin cậy gần nhất: {Math.round(confidence * 100)}%</p></details>
        )}
      </div>
      <div className="grid max-h-[560px] min-h-[320px] gap-4 overflow-y-auto bg-[radial-gradient(circle_at_top_left,rgba(11,94,215,.06),transparent_22rem)] px-4 py-6 sm:px-7" aria-live="polite" aria-busy={pending}>
        {messages.length === 0 && (
          <div className="mr-auto grid max-w-[82%] gap-1.5 rounded-[20px_20px_20px_6px] border border-government/10 bg-white px-4 py-3 shadow-sm">
            <span className="text-[9px] font-black tracking-wider text-primary uppercase">Trợ lý hướng dẫn</span>
            <p className="m-0 text-sm leading-6 text-ink">Hãy bắt đầu bằng cách cho biết ngày sinh của trẻ, nơi sinh và tình trạng đăng ký kết hôn của cha mẹ.</p>
          </div>
        )}
        {messages.filter((message) => message.role !== "system").map((message, index) => (
          <div key={`${message.created_at || index}-${index}`} className={`grid max-w-[82%] gap-1.5 px-4 py-3 text-sm leading-6 shadow-sm [animation:message-in_.35s_var(--ease-premium)_both] ${message.role === "user" ? "ml-auto rounded-[20px_20px_6px_20px] bg-government text-white" : "mr-auto rounded-[20px_20px_20px_6px] border border-government/10 bg-white text-ink"}`}>
            <span className={`text-[9px] font-black tracking-wider uppercase ${message.role === "user" ? "text-blue-200" : "text-primary"}`}>{message.role === "user" ? "Bạn" : "Trợ lý hướng dẫn"}</span>
            <p className="m-0 whitespace-pre-wrap">{message.content}</p>
          </div>
        ))}
        {pending && <div className="mr-auto flex max-w-[82%] items-center gap-3 rounded-[20px_20px_20px_6px] border border-government/10 bg-white px-4 py-3 text-xs text-muted shadow-sm"><span className="flex gap-1" aria-hidden="true"><i className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:-.2s]" /><i className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:-.1s]" /><i className="size-1.5 animate-bounce rounded-full bg-primary" /></span><p>Đang phân tích trường hợp...</p></div>}
        <div ref={endRef} />
      </div>
      <div className="grid gap-4 border-t border-government/10 bg-white p-4 sm:p-6">
        <div className="grid gap-3" aria-live="polite">
          {voicePhase === "idle" && (
            <button className="group grid min-h-16 grid-cols-[44px_1fr_auto] items-center gap-3 rounded-2xl border border-primary/15 bg-blue-50/70 px-3 py-2.5 text-left transition hover:border-primary/35 hover:bg-blue-50 disabled:opacity-55 max-sm:grid-cols-[44px_1fr]" type="button" onClick={() => void startRecording()} disabled={pending}>
              <span className="grid size-11 place-items-center rounded-xl bg-primary text-white shadow-lg shadow-primary/20" aria-hidden="true"><svg className="size-5 fill-current" viewBox="0 0 24 24" focusable="false"><path d="M12 15.5a3.5 3.5 0 0 0 3.5-3.5V6a3.5 3.5 0 1 0-7 0v6a3.5 3.5 0 0 0 3.5 3.5Zm-1 2.92V21H8v2h8v-2h-3v-2.58A7 7 0 0 0 19 11.5h-2a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92Z" /></svg></span>
              <span className="grid gap-1"><strong className="text-xs text-government">Trả lời bằng giọng nói</strong><small className="text-[10px] leading-4 text-muted">Bấm bắt đầu, nói tự nhiên bằng tiếng Việt, rồi kiểm tra lại nội dung.</small></span>
              <span className="rounded-full bg-white px-3 py-2 text-[10px] font-extrabold text-primary transition group-hover:bg-primary group-hover:text-white max-sm:col-start-2 max-sm:w-fit">Bắt đầu ghi</span>
            </button>
          )}

          {voicePhase === "recording" && (
            <div className="grid gap-3 rounded-2xl border border-danger/20 bg-red-50 p-4">
              <div className="grid grid-cols-[12px_1fr_auto] items-center gap-3"><span className="size-3 animate-pulse rounded-full bg-danger shadow-[0_0_0_6px_rgba(220,38,38,0.1)]" aria-hidden="true" /><div className="grid"><strong className="text-xs text-danger">Đang nghe bạn nói</strong><small className="text-[10px] text-muted">Tự dừng sau 90 giây</small></div><time className="font-mono text-sm font-black text-danger">{String(Math.floor(elapsedSeconds / 60)).padStart(2, "0")}:{String(elapsedSeconds % 60).padStart(2, "0")}</time></div>
              <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-danger px-4 text-xs font-extrabold text-white hover:bg-red-700" type="button" onClick={stopRecording}><span className="size-2.5 rounded-sm bg-white" aria-hidden="true" />Dừng và chuyển thành chữ</button>
            </div>
          )}

          {voicePhase === "transcribing" && (
            <div className="flex items-center gap-4 rounded-2xl border border-primary/15 bg-blue-50 p-4"><span className="flex gap-1" aria-hidden="true"><i className="size-2 animate-bounce rounded-full bg-primary [animation-delay:-.2s]" /><i className="size-2 animate-bounce rounded-full bg-primary [animation-delay:-.1s]" /><i className="size-2 animate-bounce rounded-full bg-primary" /></span><div className="grid gap-1"><strong className="text-xs text-government">Đang chuyển giọng nói thành chữ</strong><small className="text-[10px] leading-4 text-muted">Lần đầu có thể mất khoảng 1–2 phút. Bạn không cần bấm lại.</small></div></div>
          )}

          {audioUrl && voicePhase === "review" && (
            <div className={`grid gap-3 rounded-2xl border p-4 ${transcriptReady ? "border-success/20 bg-green-50" : "border-warning/25 bg-amber-50"}`}>
              <div className="grid grid-cols-[32px_1fr_auto] items-center gap-3"><span className={`grid size-8 place-items-center rounded-full text-xs font-black text-white ${transcriptReady ? "bg-success" : "bg-warning"}`} aria-hidden="true">{transcriptReady ? "✓" : "!"}</span><div className="grid"><strong className="text-xs text-government">{transcriptReady ? "Đã chuyển thành chữ" : "Chưa chuyển được thành chữ"}</strong><small className="text-[10px] leading-4 text-muted">{transcriptReady ? "Hãy nghe và kiểm tra phần nội dung bên dưới." : "Ghi âm vẫn được giữ để bạn thử lại."}</small></div><button className="min-h-10 rounded-full px-3 text-[10px] font-extrabold text-primary hover:bg-white" type="button" onClick={resetVoice}>Thu lại</button></div>
              <audio className="h-10 w-full" controls src={audioUrl}>Trình duyệt không hỗ trợ nghe lại ghi âm.</audio>
              {!transcriptReady && recordedAudio && <button className="min-h-11 rounded-xl border border-warning/30 bg-white px-4 text-xs font-extrabold text-warning" type="button" onClick={() => void transcribe(recordedAudio)}>Thử chuyển lại thành chữ</button>}
            </div>
          )}

          {voiceError && <div className="grid grid-cols-[32px_1fr] gap-3 rounded-2xl border border-danger/20 bg-red-50 p-4" role="alert"><span className="grid size-8 place-items-center rounded-full bg-danger text-xs font-black text-white" aria-hidden="true">!</span><div><strong className="text-xs text-danger">Không thể xử lý ghi âm</strong><p className="mt-1 mb-0 text-[10px] leading-5 text-red-700">{voiceError}</p></div></div>}
        </div>
        <div className="flex items-center gap-3 text-[9px] font-bold tracking-wide text-muted uppercase before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line"><span>Hoặc nhập bằng bàn phím</span></div>
        <label className="text-xs font-bold text-slate-700" htmlFor="intake-message">Nội dung trả lời</label>
        <textarea
          ref={textareaRef}
          id="intake-message"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={keyDown}
          rows={3}
          maxLength={5000}
          disabled={pending || voicePhase === "recording" || voicePhase === "transcribing"}
          placeholder="Ví dụ: Bé sinh ngày 01/07/2026 tại Việt Nam..."
          className="min-h-28 w-full resize-y rounded-2xl border border-government/10 bg-white px-4 py-3 text-sm leading-6 text-ink shadow-[inset_0_1px_2px_rgba(6,59,130,.03)] outline-none transition duration-500 placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:bg-slate-100"
        />
        <div className="flex flex-wrap items-center justify-between gap-3"><small className="text-[10px] text-muted">Enter để gửi, Shift + Enter để xuống dòng</small><button className={primaryActionClass} type="button" onClick={() => void submit()} disabled={pending || voicePhase === "recording" || voicePhase === "transcribing" || !draft.trim()}><span>Gửi câu trả lời</span><i className="grid size-9 place-items-center rounded-full bg-white/15 font-normal not-italic" aria-hidden="true">↗</i></button></div>
      </div>
    </section>
  );
}

function BooleanSelect({ id, label, value, onChange, required = false, disabled = false }: {
  id: string;
  label: string;
  value: boolean | null;
  onChange: (value: boolean | null) => void;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className={fieldClass}>
      <label htmlFor={`field-${id}`}>{label}{required && <span aria-hidden="true"> *</span>}</label>
      <select id={`field-${id}`} value={value === null ? "" : String(value)} onChange={(event) => onChange(event.target.value === "" ? null : event.target.value === "true")} required={required} disabled={disabled}>
        <option value="">Chọn câu trả lời</option>
        <option value="true">Có</option>
        <option value="false">Không</option>
      </select>
    </div>
  );
}

type BirthFormProps = {
  cases: CaseSummary[];
  form: RegistrationForm;
  pending: boolean;
  onChange: (form: RegistrationForm) => void;
  onSubmit: () => Promise<void>;
};

export function BirthRegistrationForm({ cases, form, pending, onChange, onSubmit }: BirthFormProps) {
  const codes = cases.map((item) => item.code);
  const outOfWedlock = codes.includes("out_of_wedlock");
  const foreignElement = codes.includes("foreign_element");
  const rareCase = codes.some((code) => RARE_CASE_CODES.includes(code));

  function setField<K extends keyof RegistrationForm>(field: K, value: RegistrationForm[K]) {
    onChange({ ...form, [field]: value });
  }

  if (rareCase) {
    return (
      <section className="rounded-[30px] border border-warning/20 bg-white p-5 shadow-panel sm:p-7" aria-labelledby="rare-case-title">
        <div className="border-b border-government/10 pb-5"><p className="mb-1 text-[9px] font-black tracking-widest text-warning uppercase">Bước tiếp theo</p><h1 className="text-[clamp(22px,3vw,32px)] font-semibold tracking-tight text-government" id="rare-case-title">Trao đổi trực tiếp với cán bộ hộ tịch</h1></div>
        <OfficerConfirmationBanner />
        <p className="text-sm leading-6 text-muted">Hệ thống không mở thêm biểu mẫu tự động cho trường hợp này để tránh hướng dẫn thiếu chính xác.</p>
      </section>
    );
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onSubmit();
  }

  return (
    <form className="rounded-[30px] border border-government/10 bg-white p-5 shadow-panel sm:p-7 [&_fieldset]:mt-7 [&_fieldset]:border-0 [&_fieldset]:border-t [&_fieldset]:border-government/10 [&_fieldset]:p-0 [&_fieldset]:pt-6 [&_legend]:px-0 [&_legend]:text-sm [&_legend]:font-extrabold [&_legend]:text-government" onSubmit={submit} aria-labelledby="form-title">
      <div className="border-b border-government/10 pb-5"><p className="mb-1 text-[9px] font-black tracking-widest text-primary uppercase">Thông tin đăng ký</p><h1 className="text-[clamp(22px,3vw,32px)] font-semibold tracking-tight text-government" id="form-title">Kiểm tra thông tin trước khi nộp</h1></div>
      <p className="mt-5 rounded-2xl border border-primary/10 bg-blue-50/70 p-4 text-xs leading-6 text-muted"><strong className="text-government">Thông tin bạn đã chia sẻ được điền sẵn.</strong> Hãy kiểm tra lại và chỉ bổ sung những ô còn trống. Các trường có dấu * là bắt buộc.</p>

      <fieldset>
        <legend>Thông tin của trẻ</legend>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className={`${fieldClass} sm:col-span-2`}><label htmlFor="field-child_full_name">Họ tên trẻ <span className="text-danger" aria-hidden="true">*</span></label><input id="field-child_full_name" value={form.child_full_name} onChange={(event) => setField("child_full_name", event.target.value)} required autoComplete="name" /></div>
          <div className={fieldClass}><label htmlFor="field-child_birth_date">Ngày sinh <span className="text-danger" aria-hidden="true">*</span></label><input id="field-child_birth_date" type="date" value={form.child_birth_date} onChange={(event) => setField("child_birth_date", event.target.value)} required /></div>
          <div className={fieldClass}><label htmlFor="field-registration_date">Ngày dự kiến đăng ký <span className="text-danger" aria-hidden="true">*</span></label><input id="field-registration_date" type="date" value={form.registration_date} onChange={(event) => setField("registration_date", event.target.value)} required /></div>
          <div className={`${fieldClass} sm:col-span-2`}><label htmlFor="field-child_birth_country">Quốc gia nơi sinh <span className="text-danger" aria-hidden="true">*</span></label><input id="field-child_birth_country" value={form.child_birth_country} onChange={(event) => setField("child_birth_country", event.target.value)} required /></div>
        </div>
      </fieldset>

      <fieldset>
        <legend>Thông tin cha mẹ</legend>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <BooleanSelect id="parents_married" label="Cha mẹ đã đăng ký kết hôn chưa?" value={form.parents_married} onChange={(value) => setField("parents_married", value)} required />
          <div className={fieldClass}><label htmlFor="field-mother_full_name">Họ tên mẹ <span className="text-danger" aria-hidden="true">*</span></label><input id="field-mother_full_name" value={form.mother_full_name} onChange={(event) => setField("mother_full_name", event.target.value)} required autoComplete="name" /></div>
          {!outOfWedlock && <div className={fieldClass}><label htmlFor="field-father_full_name">Họ tên cha <span className="text-danger" aria-hidden="true">*</span></label><input id="field-father_full_name" value={form.father_full_name} onChange={(event) => setField("father_full_name", event.target.value)} required autoComplete="name" /></div>}
          <div className={fieldClass}><label htmlFor="field-mother_nationality">Quốc tịch mẹ <span className="text-danger" aria-hidden="true">*</span></label><input id="field-mother_nationality" value={form.mother_nationality} onChange={(event) => setField("mother_nationality", event.target.value)} required /></div>
          <div className={fieldClass}><label htmlFor="field-father_nationality">Quốc tịch cha, nếu đã xác định</label><input id="field-father_nationality" value={form.father_nationality} onChange={(event) => setField("father_nationality", event.target.value)} /></div>
        </div>
      </fieldset>

      {outOfWedlock && (
        <fieldset>
          <legend>Thông tin ghi tên cha</legend>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <BooleanSelect id="wants_father_on_certificate" label="Bạn có muốn ghi tên cha trên giấy khai sinh không?" value={form.wants_father_on_certificate} onChange={(value) => setField("wants_father_on_certificate", value)} required />
            {form.wants_father_on_certificate && (
              <>
                <div className={fieldClass}><label htmlFor="field-father_full_name">Họ tên cha <span className="text-danger" aria-hidden="true">*</span></label><input id="field-father_full_name" value={form.father_full_name} onChange={(event) => setField("father_full_name", event.target.value)} required autoComplete="name" /></div>
                <BooleanSelect id="parentage_evidence" label="Đã có chứng cứ quan hệ cha con chưa?" value={form.parentage_evidence} onChange={(value) => setField("parentage_evidence", value)} required />
              </>
            )}
          </div>
        </fieldset>
      )}

      {foreignElement && (
        <fieldset>
          <legend>Giấy tờ có yếu tố nước ngoài</legend>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <BooleanSelect id="has_foreign_documents" label="Bạn có giấy tờ do nước ngoài cấp không?" value={form.has_foreign_documents} onChange={(value) => setField("has_foreign_documents", value)} required />
            <BooleanSelect id="foreign_documents_translated" label="Giấy tờ đã được dịch tiếng Việt và chứng thực chưa?" value={form.foreign_documents_translated} onChange={(value) => setField("foreign_documents_translated", value)} required={form.has_foreign_documents === true} disabled={form.has_foreign_documents !== true} />
            <BooleanSelect id="foreign_documents_legalized" label="Đã hợp pháp hóa lãnh sự hoặc được miễn chưa?" value={form.foreign_documents_legalized} onChange={(value) => setField("foreign_documents_legalized", value)} required={form.has_foreign_documents === true} disabled={form.has_foreign_documents !== true} />
          </div>
        </fieldset>
      )}

      <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-government/10 pt-6"><p className="text-[10px] text-muted">Dữ liệu chỉ được gửi tới backend của hệ thống.</p><button className={primaryActionClass} type="submit" disabled={pending}><span>{pending ? "Đang kiểm tra..." : "Kiểm tra thông tin"}</span><i className="grid size-9 place-items-center rounded-full bg-white/15 font-normal not-italic" aria-hidden="true">↗</i></button></div>
    </form>
  );
}

export function PrecheckResults({ issues, status, onFix }: { issues: PrecheckIssue[]; status: string; onFix: (field: string) => void }) {
  if (status === "ready" && !issues.length) {
    return (
      <section id="precheck-results" className="grid grid-cols-[52px_1fr] gap-4 rounded-[30px] border border-success/20 bg-green-50 p-5 shadow-panel" aria-live="polite">
        <span className="grid size-[52px] place-items-center rounded-2xl bg-success text-[10px] font-black text-white shadow-lg shadow-success/20" aria-hidden="true">OK</span>
        <div><p className="mb-1 text-[8px] font-black tracking-widest text-success uppercase">Đã kiểm tra tự động</p><h2 className="text-xl font-semibold tracking-tight text-green-900">Thông tin đã sẵn sàng</h2><p className="mt-2 mb-0 text-[11px] leading-5 text-green-800">Không còn lỗi bắt buộc trong kết quả hiện tại.</p></div>
      </section>
    );
  }
  if (!issues.length) {
    return (
      <section id="precheck-results" className="overflow-hidden rounded-[30px] border border-primary/15 bg-white shadow-panel" aria-labelledby="precheck-title">
        <header className="border-b border-government/10 px-5 py-5"><p className="mb-1 text-[8px] font-black tracking-widest text-primary uppercase">Kiểm tra trước khi nộp</p><h2 className="text-xl font-semibold tracking-tight text-government" id="precheck-title">Kết quả sẽ hiện tại đây</h2></header>
        <div className="grid min-h-44 place-items-center px-6 py-8 text-center"><span className="grid size-11 place-items-center rounded-2xl bg-blue-50 text-sm font-black text-primary" aria-hidden="true">✓</span><p className="m-0 max-w-64 text-[11px] leading-5 text-muted">Điền đủ thông tin rồi chọn <strong className="text-government">Kiểm tra thông tin</strong>. Bạn có thể sửa từng ô ngay từ bảng này.</p></div>
      </section>
    );
  }
  const errors = issues.filter((issue) => issue.severity === "error").length;
  const warnings = issues.length - errors;
  return (
    <section id="precheck-results" className="overflow-hidden rounded-[30px] border border-government/10 bg-white shadow-panel" aria-labelledby="precheck-title" aria-live="polite">
      <header className="border-b border-government/10 px-5 py-5">
        <p className="mb-1 text-[8px] font-black tracking-widest text-primary uppercase">Kết quả kiểm tra</p>
        <div className="flex items-end justify-between gap-4"><h2 className="text-xl font-semibold tracking-tight text-government" id="precheck-title">{errors ? `${errors} lỗi cần sửa` : "Không có lỗi bắt buộc"}</h2><div className="flex shrink-0 gap-1.5"><span className="rounded-lg bg-red-50 px-2 py-1.5 text-[9px] font-black text-danger">{errors} lỗi</span><span className="rounded-lg bg-amber-50 px-2 py-1.5 text-[9px] font-black text-warning">{warnings} cảnh báo</span></div></div>
      </header>
      <div className="grid max-h-[min(52dvh,520px)] gap-3 overflow-y-auto overscroll-contain p-4 [scrollbar-gutter:stable]">
        {issues.map((issue, index) => (
          <details key={issue.id || `${issue.field_name}-${index}`} className={`group rounded-2xl border-l-[3px] ${issue.severity === "error" ? "border-danger bg-red-50" : "border-warning bg-amber-50"}`}>
            <summary className="grid min-h-20 cursor-pointer list-none grid-cols-[28px_1fr_20px] items-start gap-3 p-4 marker:hidden">
              <span className={`grid size-7 place-items-center rounded-lg text-[10px] font-black text-white ${issue.severity === "error" ? "bg-danger" : "bg-warning"}`} aria-hidden="true">{issue.severity === "error" ? "!" : "i"}</span>
              <span><small className={`mb-1 block text-[8px] font-black tracking-widest uppercase ${issue.severity === "error" ? "text-danger" : "text-warning"}`}>{issue.severity === "error" ? "Lỗi cần sửa" : "Cảnh báo"}</small><strong className="block text-[11px] leading-5 text-ink">{issue.message}</strong></span>
              <span className="mt-1 text-center text-xs font-black text-muted transition group-open:rotate-45" aria-hidden="true">+</span>
            </summary>
            <div className="mx-4 border-t border-current/10 pt-3 pb-4">
              <small className="text-[9px] font-bold text-muted">{issue.source === "rule_engine" ? "Kiểm tra tự động theo quy tắc" : "AI phát hiện – cần xác nhận"}</small>
              <p className="mt-2 text-[11px] leading-5 text-muted"><strong className="text-ink">Cách xử lý:</strong> {issue.suggested_fix}</p>
              <LegalBasisAccordion basis={issue.legal_basis} />
              {issue.field_name && <button type="button" className="mt-3 min-h-10 w-full rounded-xl bg-white px-4 text-[10px] font-extrabold text-primary shadow-sm transition hover:bg-primary hover:text-white" onClick={() => onFix(issue.field_name!)}>Sửa trường này →</button>}
            </div>
          </details>
        ))}
      </div>
      <footer className="border-t border-government/10 px-5 py-3 text-[9px] leading-4 text-muted">Chọn từng mục để xem cách sửa và căn cứ pháp lý.</footer>
    </section>
  );
}

export function PdfPreview({ sessionId }: { sessionId: string }) {
  const source = `${API_BASE_URL}/sessions/${encodeURIComponent(sessionId)}/birth-registration.pdf`;
  return (
    <section className="mt-6 overflow-hidden rounded-[30px] border border-government/10 bg-white shadow-panel" aria-labelledby="pdf-preview-title">
      <div className="flex flex-wrap items-start justify-between gap-5 border-b border-government/10 p-5 sm:p-7"><div><p className="mb-1 text-[9px] font-black tracking-widest text-primary uppercase">Bản xem trước</p><h2 className="text-2xl font-semibold tracking-tight text-government" id="pdf-preview-title">Tờ khai từ thông tin đã điền</h2><span className="mt-2 block text-xs leading-5 text-muted">Kiểm tra nội dung bên dưới, sau đó tải bản PDF về thiết bị.</span></div><div className="flex flex-wrap gap-3"><a className="inline-flex min-h-12 items-center gap-3 rounded-full border border-line bg-white py-1.5 pr-1.5 pl-5 text-xs font-extrabold text-government transition hover:border-primary hover:bg-blue-50" href={source} target="_blank" rel="noreferrer"><span>Mở toàn màn hình</span><i className="grid size-9 place-items-center rounded-full bg-blue-50 font-normal not-italic" aria-hidden="true">↗</i></a><a className={primaryActionClass} href={`${source}?download=true`}><span className="grid"><strong>Tải bản PDF</strong><small className="font-normal text-blue-100">Lưu về thiết bị</small></span><i className="grid size-9 place-items-center rounded-full bg-white/15 text-base font-normal not-italic" aria-hidden="true">↓</i></a></div></div>
      <div className="h-[680px] bg-slate-100 p-2 sm:p-4"><iframe className="h-full w-full rounded-2xl border border-line bg-white" src={source} title="Bản xem trước tờ khai đăng ký khai sinh" /></div>
    </section>
  );
}

export function SessionGuide({ sessionId }: { sessionId: string }) {
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [checklist, setChecklist] = useState<ChecklistResponse | null>(null);
  const [form, setForm] = useState<RegistrationForm>(emptyRegistrationForm);
  const [issues, setIssues] = useState<PrecheckIssue[]>([]);
  const [view, setView] = useState<"chat" | "form">("chat");
  const [confidence, setConfidence] = useState<number | null>(null);
  const [needsOfficer, setNeedsOfficer] = useState(false);
  const [restoring, setRestoring] = useState(true);
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const editedFieldsRef = useRef<Set<keyof RegistrationForm>>(new Set());

  async function loadChecklist(id: string, quiet = false) {
    try {
      const nextChecklist = await apiFetch<ChecklistResponse>(`/checklist/${id}`);
      setChecklist(nextChecklist);
      setNeedsOfficer((current) => current || nextChecklist.needs_officer_confirmation);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 409) return;
      if (!quiet) setError(cause instanceof Error ? cause.message : "Không thể tải checklist.");
    }
  }

  useEffect(() => {
    let active = true;
    async function restore() {
      setRestoring(true);
      setError("");
      try {
        const detail = await apiFetch<SessionDetail>(`/sessions/${sessionId}`);
        if (!active) return;
        setSession(detail);
        setMessages(detail.messages);
        setIssues(detail.precheck_results);
        setForm(mergeConversationFacts(emptyRegistrationForm(), detail.form_data));
        setNeedsOfficer(detail.cases.some((item) => item.requires_officer_confirmation));
        setView(detail.status === "precheck" || detail.status === "ready" ? "form" : "chat");
        localStorage.setItem(STORAGE_KEY, detail.id);
        if (detail.cases.length) await loadChecklist(detail.id, true);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Không thể khôi phục phiên làm việc.");
      } finally {
        if (active) setRestoring(false);
      }
    }
    void restore();
    return () => { active = false; };
  }, [sessionId]);

  async function sendMessage(message: string) {
    if (!session || sending) return;
    const optimisticId = `pending-${Date.now()}`;
    const optimisticMessage: ChatMessage = { role: "user", content: message, created_at: optimisticId };
    setSending(true);
    setError("");
    setMessages((current) => [...current, optimisticMessage]);
    try {
      const result = await apiFetch<IntakeResponse>("/intake/message", {
        method: "POST",
        body: JSON.stringify({ session_id: session.id, message }),
      }, 30_000);
      setMessages((current) => [...current, { role: "assistant", content: result.reply }]);
      setSession((current) => current ? { ...current, ...result.session } : current);
      setForm((current) => mergeConversationFacts(current, result.form_data, editedFieldsRef.current));
      setConfidence(result.confidence);
      setNeedsOfficer(result.needs_officer_confirmation || result.session.cases.some((item) => item.requires_officer_confirmation));
      if (result.session.cases.length) await loadChecklist(result.session.id);
    } catch (cause) {
      setMessages((current) => current.filter((item) => item.created_at !== optimisticId));
      setError(cause instanceof Error ? cause.message : "Không thể gửi câu trả lời.");
      throw cause;
    } finally {
      setSending(false);
    }
  }

  async function transcribeAudio(audio: Blob, filename: string) {
    if (!session) throw new ApiError("Không tìm thấy phiên làm việc.");
    const body = new FormData();
    body.append("session_id", session.id);
    body.append("audio", audio, filename);
    const result = await apiFetch<AudioTranscriptionResponse>("/intake/audio", {
      method: "POST",
      body,
    }, 180_000);
    return result.transcript;
  }

  async function runPrecheck() {
    if (!session || checking) return;
    setChecking(true);
    setError("");
    try {
      const caseCodes = session.cases.map((item) => item.code);
      const result = await apiFetch<PrecheckResponse>("/precheck", {
        method: "POST",
        body: JSON.stringify({ session_id: session.id, form_data: normaliseForm(form, caseCodes) }),
      }, 30_000);
      setIssues(result.issues);
      setNeedsOfficer(result.needs_officer_confirmation);
      const refreshed = await apiFetch<SessionDetail>(`/sessions/${session.id}`);
      setSession(refreshed);
      if (refreshed.cases.length) await loadChecklist(refreshed.id, true);
      requestAnimationFrame(() => document.getElementById("precheck-results")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể kiểm tra thông tin.");
    } finally {
      setChecking(false);
    }
  }

  function focusField(field: string) {
    const target = document.getElementById(`field-${field}`) as HTMLElement | null;
    setView("form");
    requestAnimationFrame(() => {
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      target?.focus({ preventScroll: true });
    });
  }

  function updateForm(next: RegistrationForm) {
    setForm((current) => {
      for (const key of Object.keys(current) as (keyof RegistrationForm)[]) {
        if (current[key] !== next[key]) editedFieldsRef.current.add(key);
      }
      return next;
    });
  }

  if (restoring) {
    return <AppShell session><main className="mx-auto grid min-h-[70vh] w-[calc(100%_-_32px)] max-w-6xl place-items-center text-center" aria-live="polite"><div className="grid gap-4"><span className="mx-auto flex gap-1" aria-hidden="true"><i className="size-2 animate-bounce rounded-full bg-primary [animation-delay:-.2s]" /><i className="size-2 animate-bounce rounded-full bg-primary [animation-delay:-.1s]" /><i className="size-2 animate-bounce rounded-full bg-primary" /></span><p className="text-sm text-muted">Đang khôi phục phiên làm việc...</p></div></main></AppShell>;
  }

  if (!session) {
    return <AppShell session><main className="mx-auto grid min-h-[70vh] w-[calc(100%_-_32px)] max-w-3xl place-items-center text-center" role="alert"><div className="grid gap-5 rounded-[30px] border border-danger/20 bg-white p-8 shadow-panel"><p className="text-[10px] font-black tracking-widest text-danger uppercase">Không thể mở phiên làm việc</p><h1 className="text-3xl font-semibold tracking-tight text-government">{error || "Phiên không tồn tại."}</h1><Link className={`${primaryActionClass} mx-auto`} href="/">Về trang bắt đầu</Link></div></main></AppShell>;
  }

  const hasCases = session.cases.length > 0;
  const currentStep = flowStep(session.status, view, hasCases);
  const officerRequired = needsOfficer || session.cases.some((item) => item.requires_officer_confirmation);

  return (
    <AppShell session>
      <main className="mx-auto w-[calc(100%_-_24px)] max-w-[1320px] py-8 sm:w-[calc(100%_-_48px)] sm:py-12">
        <div className="mb-6 rounded-[30px] bg-government/5 p-1.5 ring-1 ring-government/8">
        <div className="grid items-center gap-5 rounded-[24px] bg-white p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.8)] sm:grid-cols-[150px_1fr] sm:px-6">
          <div><p className="mb-1 text-[9px] font-black tracking-widest text-muted uppercase">Mã phiên</p><strong className="font-mono text-xs tracking-widest text-government">{session.id.slice(0, 8).toUpperCase()}</strong></div>
          <ProgressStepper current={currentStep} />
        </div>
        </div>

        {error && <div className="mb-5 flex items-center justify-between gap-4 rounded-2xl border border-danger/20 bg-red-50 px-4 py-3 text-xs text-danger" role="alert"><span>{error}</span><button className="min-h-10 rounded-full bg-white px-4 font-extrabold hover:bg-red-100" type="button" onClick={() => setError("")} aria-label="Đóng thông báo">Đóng</button></div>}
        {officerRequired && <OfficerConfirmationBanner />}

        <div className="grid items-start gap-6 min-[1080px]:grid-cols-[minmax(0,3fr)_minmax(320px,2fr)]">
          <div className="min-w-0">
            <div className="mb-4 grid grid-cols-2 rounded-full bg-government/5 p-1.5 ring-1 ring-government/8" role="tablist" aria-label="Nội dung phiên">
              <button type="button" role="tab" aria-selected={view === "chat"} className={`min-h-11 rounded-full px-4 text-xs font-extrabold transition duration-500 ${view === "chat" ? "bg-government text-white shadow-[0_10px_24px_rgba(6,59,130,.18)]" : "bg-white text-muted hover:bg-blue-50 hover:text-government"}`} onClick={() => setView("chat")}>Trao đổi</button>
              <button type="button" role="tab" aria-selected={view === "form"} className={`min-h-11 rounded-full px-4 text-xs font-extrabold transition duration-500 disabled:cursor-not-allowed disabled:opacity-40 ${view === "form" ? "bg-government text-white shadow-[0_10px_24px_rgba(6,59,130,.18)]" : "bg-white text-muted hover:bg-blue-50 hover:text-government"}`} onClick={() => setView("form")} disabled={!hasCases}>Điền thông tin</button>
            </div>

            {view === "chat" ? (
              <>
                <IntakeChat messages={messages} pending={sending} confidence={confidence} onSend={sendMessage} onTranscribe={transcribeAudio} />
                {hasCases && <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-success/15 bg-green-50 p-5"><div><strong className="text-sm text-green-900">Đã có checklist ban đầu</strong><p className="mt-1 mb-0 text-xs leading-5 text-green-800">Bạn vẫn có thể tiếp tục trao đổi hoặc chuyển sang điền thông tin.</p></div><button className={primaryActionClass} type="button" onClick={() => setView("form")}><span>Điền thông tin</span><i className="grid size-9 place-items-center rounded-full bg-white/15 font-normal not-italic" aria-hidden="true">→</i></button></div>}
              </>
            ) : (
              <>
                <BirthRegistrationForm cases={session.cases} form={form} pending={checking} onChange={updateForm} onSubmit={runPrecheck} />
              </>
            )}
          </div>

          <aside className="min-w-0 min-[1080px]:sticky min-[1080px]:top-28">
            {view === "form" && <PrecheckResults issues={issues} status={session.status} onFix={focusField} />}
            <div className={view === "form" ? "mt-4" : ""}>
              <CaseBadges primaryCase={session.primary_case} cases={session.cases} />
            </div>
            <ChecklistPanel checklist={checklist} />
          </aside>
        </div>
        {view === "form" && (session.status === "precheck" || session.status === "ready") && <PdfPreview sessionId={session.id} />}
      </main>
    </AppShell>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent, KeyboardEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

import { API_BASE_URL, ApiError, apiFetch } from "@/lib/api";
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

export function AppShell({ children, home = false, session = false }: { children: ReactNode; home?: boolean; session?: boolean }) {
  return (
    <div className={`app-shell${home ? " app-shell-home" : ""}${session ? " app-shell-session" : ""}`}>
      <header className="site-header">
        <Link href="/" className="brand" aria-label="Trang chủ hướng dẫn đăng ký khai sinh">
          <span className="brand-mark" aria-hidden="true">KS</span>
          <span><strong>Dịch vụ công</strong><small>Hướng dẫn đăng ký khai sinh</small></span>
        </Link>
        <div className="header-actions"><Link className="header-admin-link" href="/admin">Cổng cán bộ</Link></div>
      </header>
      {children}
      <footer className="site-footer">
        <p>Hệ thống hỗ trợ chuẩn bị thông tin, không thay thế quyết định của cơ quan hộ tịch.</p>
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
    setSavedId(localStorage.getItem(STORAGE_KEY));
    apiFetch<{ status: string }>("/health", {}, 5_000)
      .then(() => setHealth("ok"))
      .catch(() => setHealth("error"));
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
    <div className={`start-actions ${compact ? "start-actions-compact" : ""}`}>
      <div className="action-row">
        <button className="button button-primary" type="button" onClick={start} disabled={pending}>
          <span>{pending ? "Đang tạo phiên..." : "Bắt đầu hướng dẫn"}</span><i className="button-arrow" aria-hidden="true">↗</i>
        </button>
        {savedId && (
          <Link className="button button-secondary" href={`/session/${savedId}`}>
            <span>Tiếp tục phiên trước</span><i className="button-arrow" aria-hidden="true">→</i>
          </Link>
        )}
      </div>
      {!compact && (
        <p className={`health-status health-${health}`}>
          <span aria-hidden="true" />
          {health === "checking" ? "Đang kiểm tra kết nối" : health === "ok" ? "Hệ thống đang trực tuyến" : "Chưa kết nối được backend"}
        </p>
      )}
      {error && <p className="inline-error" role="alert">{error}</p>}
    </div>
  );
}

export function ProgressStepper({ current }: { current: number }) {
  const steps = ["Trao đổi", "Hồ sơ", "Kiểm tra", "Sẵn sàng"];
  return (
    <nav className="progress-stepper" aria-label="Tiến độ đăng ký">
      <ol>
        {steps.map((step, index) => (
          <li key={step} className={index < current ? "complete" : index === current ? "current" : ""} aria-current={index === current ? "step" : undefined}>
            <span>{index + 1}</span>
            <small>{step}</small>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function CaseBadges({ primaryCase, cases }: { primaryCase: CaseSummary | null; cases: CaseSummary[] }) {
  if (!primaryCase && cases.length === 0) {
    return (
      <section className="case-empty" aria-live="polite" aria-label="Hệ thống đang xác định trường hợp">
        <div className="case-empty-visual" aria-hidden="true"><span /><i /><i /></div>
        <div className="case-empty-copy">
          <p><i aria-hidden="true" />Đang nhận diện hồ sơ</p>
          <h2>Chưa đủ dữ kiện để xác định trường hợp</h2>
          <span>Trả lời thêm vài câu ngắn. Checklist sẽ xuất hiện ngay khi hệ thống nhận diện được tình huống của bạn.</span>
        </div>
        <div className="case-empty-progress" aria-hidden="true"><span /><span /><span /></div>
      </section>
    );
  }
  const primary = primaryCase || cases.find((item) => item.is_primary) || cases[0];
  const relatedCases = cases.filter((item) => item.code !== primary?.code);
  const caseCount = Math.max(cases.length, primary ? 1 : 0);
  return (
    <section className="case-badges" aria-labelledby="case-result-title" aria-live="polite">
      <header className="case-badges-heading">
        <div><i aria-hidden="true" /><span>Trường hợp của bạn</span></div>
        <strong>{caseCount} {caseCount === 1 ? "trường hợp" : "yếu tố"}</strong>
      </header>

      <div className="case-primary">
        <span className="case-primary-marker" aria-hidden="true">01</span>
        <div>
          <p>Trường hợp chính</p>
          <h2 id="case-result-title">{primary?.name}</h2>
          <div className="case-primary-reason">
            <strong>Vì sao hệ thống xác định như vậy?</strong>
            <span>{primary?.description || "Hệ thống đang tiếp tục làm rõ trường hợp này từ câu trả lời của bạn."}</span>
          </div>
        </div>
        <small className={primary?.requires_officer_confirmation ? "needs-officer" : "auto-guided"}>
          {primary?.requires_officer_confirmation ? "Cần cán bộ xác nhận" : "Có thể tiếp tục tự hướng dẫn"}
        </small>
      </div>

      {relatedCases.length ? (
        <div className="case-related">
          <div className="case-related-heading"><div><p>Yếu tố đi kèm</p><span>Được cộng thêm vào checklist</span></div><strong>+{relatedCases.length}</strong></div>
          <ul>
            {relatedCases.map((item, index) => (
              <li key={item.code}>
                <span aria-hidden="true">{String(index + 2).padStart(2, "0")}</span>
                <div><small>Yếu tố liên quan</small><strong>{item.name}</strong>{item.description && <p>{item.description}</p>}</div>
                {item.requires_officer_confirmation && <em>Cần cán bộ</em>}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="case-single"><i aria-hidden="true">✓</i><p><strong>Chưa ghi nhận yếu tố đi kèm</strong><span>Hệ thống vẫn tiếp tục cập nhật theo câu trả lời mới.</span></p></div>
      )}

      <footer className="case-explainer"><span aria-hidden="true">i</span><p>Kết quả dựa trên những gì bạn đã chia sẻ và có thể được cập nhật khi có thêm thông tin.</p></footer>
    </section>
  );
}

export function OfficerConfirmationBanner() {
  return (
    <aside className="officer-banner" role="status">
      <span className="banner-symbol" aria-hidden="true">!</span>
      <div>
        <strong>Cần cán bộ hộ tịch xác nhận trực tiếp</strong>
        <p>Trường hợp này có yếu tố cần được cơ quan hộ tịch xem xét thêm.</p>
      </div>
    </aside>
  );
}

export function LegalBasisAccordion({ basis }: { basis: string | string[] | null }) {
  const items = Array.isArray(basis) ? basis : basis ? [basis] : [];
  return (
    <details className="legal-basis">
      <summary>Căn cứ pháp lý</summary>
      {items.length ? (
        <ul>{items.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul>
      ) : (
        <p>Chưa có căn cứ được ánh xạ – cần cán bộ xác nhận</p>
      )}
    </details>
  );
}

export function ChecklistPanel({ checklist }: { checklist: ChecklistResponse | null }) {
  return (
    <section className="checklist-panel" aria-labelledby="checklist-title">
      <details className="checklist-disclosure">
        <summary>
          <span><strong id="checklist-title">Checklist đang thành hình</strong><small>{checklist ? `${checklist.documents.length} giấy tờ` : "Chờ thêm thông tin"}</small></span>
          <span aria-hidden="true">Mở</span>
        </summary>
        <div className="checklist-content">
          <div className="panel-heading desktop-panel-heading">
            <div><p>Hồ sơ của bạn</p><h2 id="checklist-title-desktop">Checklist đang thành hình</h2></div>
            {checklist && <span>{checklist.documents.length} giấy tờ</span>}
          </div>
          {!checklist ? (
            <div className="checklist-placeholder">
              <span aria-hidden="true" />
              <p>Checklist sẽ cập nhật ngay khi hệ thống xác định được trường hợp.</p>
            </div>
          ) : (
            <>
              <div className="document-list">
                {checklist.documents.map((document) => (
                  <article key={document.code} className="document-item">
                    <div className="document-status" aria-hidden="true" />
                    <div>
                      <div className="document-title">
                        <h3>{document.name}</h3>
                        <span>{document.required ? "Bắt buộc" : "Nếu có"}</span>
                      </div>
                      {document.description && <p>{document.description}</p>}
                      <LegalBasisAccordion basis={document.legal_basis} />
                    </div>
                  </article>
                ))}
              </div>
              {checklist.steps.length > 0 && (
                <details className="procedure-steps">
                  <summary>Các bước thực hiện ({checklist.steps.length})</summary>
                  <ol>
                    {checklist.steps.map((step, index) => (
                      <li key={`${step.order}-${index}`}>
                        <span>{step.order}</span>
                        <div><strong>{step.title}</strong><p>{step.description}</p><LegalBasisAccordion basis={step.legal_basis} /></div>
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
    <section className="chat-card" aria-labelledby="chat-title">
      <div className="content-heading">
        <div><p>Trao đổi với trợ lý</p><h1 id="chat-title">Cho chúng tôi biết tình huống của bạn</h1></div>
        {confidence !== null && (
          <details className="analysis-detail"><summary>Chi tiết phân tích</summary><p>Độ tin cậy gần nhất: {Math.round(confidence * 100)}%</p></details>
        )}
      </div>
      <div className="message-list" aria-live="polite" aria-busy={pending}>
        {messages.length === 0 && (
          <div className="message message-assistant">
            <span className="message-role">Trợ lý hướng dẫn</span>
            <p>Hãy bắt đầu bằng cách cho biết ngày sinh của trẻ, nơi sinh và tình trạng đăng ký kết hôn của cha mẹ.</p>
          </div>
        )}
        {messages.filter((message) => message.role !== "system").map((message, index) => (
          <div key={`${message.created_at || index}-${index}`} className={`message message-${message.role}`}>
            <span className="message-role">{message.role === "user" ? "Bạn" : "Trợ lý hướng dẫn"}</span>
            <p>{message.content}</p>
          </div>
        ))}
        {pending && <div className="message message-assistant loading-message"><span className="loading-dots" aria-hidden="true"><i /><i /><i /></span><p>Đang phân tích trường hợp...</p></div>}
        <div ref={endRef} />
      </div>
      <div className="composer">
        <div className={`voice-recorder voice-${voicePhase}`} aria-live="polite">
          {voicePhase === "idle" && (
            <button className="voice-start" type="button" onClick={() => void startRecording()} disabled={pending}>
              <span className="voice-start-icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M12 15.5a3.5 3.5 0 0 0 3.5-3.5V6a3.5 3.5 0 1 0-7 0v6a3.5 3.5 0 0 0 3.5 3.5Zm-1 2.92V21H8v2h8v-2h-3v-2.58A7 7 0 0 0 19 11.5h-2a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92Z" /></svg></span>
              <span className="voice-start-copy"><strong>Trả lời bằng giọng nói</strong><small>Bấm bắt đầu, nói tự nhiên bằng tiếng Việt, rồi kiểm tra lại nội dung.</small></span>
              <span className="voice-start-action">Bắt đầu ghi</span>
            </button>
          )}

          {voicePhase === "recording" && (
            <div className="voice-recording-panel">
              <div className="voice-recording-status"><span aria-hidden="true" /><div><strong>Đang nghe bạn nói</strong><small>Tự dừng sau 90 giây</small></div><time>{String(Math.floor(elapsedSeconds / 60)).padStart(2, "0")}:{String(elapsedSeconds % 60).padStart(2, "0")}</time></div>
              <button className="voice-stop-button" type="button" onClick={stopRecording}><span aria-hidden="true" />Dừng và chuyển thành chữ</button>
            </div>
          )}

          {voicePhase === "transcribing" && (
            <div className="voice-processing"><span className="loading-dots" aria-hidden="true"><i /><i /><i /></span><div><strong>Đang chuyển giọng nói thành chữ</strong><small>Lần đầu có thể mất khoảng 1–2 phút. Bạn không cần bấm lại.</small></div></div>
          )}

          {audioUrl && voicePhase === "review" && (
            <div className={`voice-review ${transcriptReady ? "voice-review-success" : "voice-review-failed"}`}>
              <div className="voice-review-heading"><span aria-hidden="true">{transcriptReady ? "✓" : "!"}</span><div><strong>{transcriptReady ? "Đã chuyển thành chữ" : "Chưa chuyển được thành chữ"}</strong><small>{transcriptReady ? "Hãy nghe và kiểm tra phần nội dung bên dưới." : "Ghi âm vẫn được giữ để bạn thử lại."}</small></div><button className="text-button" type="button" onClick={resetVoice}>Thu lại</button></div>
              <audio controls src={audioUrl}>Trình duyệt không hỗ trợ nghe lại ghi âm.</audio>
              {!transcriptReady && recordedAudio && <button className="button button-secondary" type="button" onClick={() => void transcribe(recordedAudio)}>Thử chuyển lại thành chữ</button>}
            </div>
          )}

          {voiceError && <div className="voice-error" role="alert"><span aria-hidden="true">!</span><div><strong>Không thể xử lý ghi âm</strong><p>{voiceError}</p></div></div>}
        </div>
        <div className="input-divider"><span>Hoặc nhập bằng bàn phím</span></div>
        <label htmlFor="intake-message">Nội dung trả lời</label>
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
        />
        <div className="composer-actions"><small>Enter để gửi, Shift + Enter để xuống dòng</small><button className="button button-primary session-action" type="button" onClick={() => void submit()} disabled={pending || voicePhase === "recording" || voicePhase === "transcribing" || !draft.trim()}><span>Gửi câu trả lời</span><i aria-hidden="true">↗</i></button></div>
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
    <div className="form-field">
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
      <section className="form-card rare-case-card" aria-labelledby="rare-case-title">
        <div className="content-heading"><div><p>Bước tiếp theo</p><h1 id="rare-case-title">Trao đổi trực tiếp với cán bộ hộ tịch</h1></div></div>
        <OfficerConfirmationBanner />
        <p>Hệ thống không mở thêm biểu mẫu tự động cho trường hợp này để tránh hướng dẫn thiếu chính xác.</p>
      </section>
    );
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onSubmit();
  }

  return (
    <form className="form-card" onSubmit={submit} aria-labelledby="form-title">
      <div className="content-heading"><div><p>Thông tin đăng ký</p><h1 id="form-title">Kiểm tra thông tin trước khi nộp</h1></div></div>
      <p className="form-intro"><strong>Thông tin bạn đã chia sẻ được điền sẵn.</strong> Hãy kiểm tra lại và chỉ bổ sung những ô còn trống. Các trường có dấu * là bắt buộc.</p>

      <fieldset>
        <legend>Thông tin của trẻ</legend>
        <div className="form-grid">
          <div className="form-field field-wide"><label htmlFor="field-child_full_name">Họ tên trẻ <span aria-hidden="true">*</span></label><input id="field-child_full_name" value={form.child_full_name} onChange={(event) => setField("child_full_name", event.target.value)} required autoComplete="name" /></div>
          <div className="form-field"><label htmlFor="field-child_birth_date">Ngày sinh <span aria-hidden="true">*</span></label><input id="field-child_birth_date" type="date" value={form.child_birth_date} onChange={(event) => setField("child_birth_date", event.target.value)} required /></div>
          <div className="form-field"><label htmlFor="field-registration_date">Ngày dự kiến đăng ký <span aria-hidden="true">*</span></label><input id="field-registration_date" type="date" value={form.registration_date} onChange={(event) => setField("registration_date", event.target.value)} required /></div>
          <div className="form-field field-wide"><label htmlFor="field-child_birth_country">Quốc gia nơi sinh <span aria-hidden="true">*</span></label><input id="field-child_birth_country" value={form.child_birth_country} onChange={(event) => setField("child_birth_country", event.target.value)} required /></div>
        </div>
      </fieldset>

      <fieldset>
        <legend>Thông tin cha mẹ</legend>
        <div className="form-grid">
          <BooleanSelect id="parents_married" label="Cha mẹ đã đăng ký kết hôn chưa?" value={form.parents_married} onChange={(value) => setField("parents_married", value)} required />
          <div className="form-field"><label htmlFor="field-mother_full_name">Họ tên mẹ <span aria-hidden="true">*</span></label><input id="field-mother_full_name" value={form.mother_full_name} onChange={(event) => setField("mother_full_name", event.target.value)} required autoComplete="name" /></div>
          {!outOfWedlock && <div className="form-field"><label htmlFor="field-father_full_name">Họ tên cha <span aria-hidden="true">*</span></label><input id="field-father_full_name" value={form.father_full_name} onChange={(event) => setField("father_full_name", event.target.value)} required autoComplete="name" /></div>}
          <div className="form-field"><label htmlFor="field-mother_nationality">Quốc tịch mẹ <span aria-hidden="true">*</span></label><input id="field-mother_nationality" value={form.mother_nationality} onChange={(event) => setField("mother_nationality", event.target.value)} required /></div>
          <div className="form-field"><label htmlFor="field-father_nationality">Quốc tịch cha, nếu đã xác định</label><input id="field-father_nationality" value={form.father_nationality} onChange={(event) => setField("father_nationality", event.target.value)} /></div>
        </div>
      </fieldset>

      {outOfWedlock && (
        <fieldset>
          <legend>Thông tin ghi tên cha</legend>
          <div className="form-grid">
            <BooleanSelect id="wants_father_on_certificate" label="Bạn có muốn ghi tên cha trên giấy khai sinh không?" value={form.wants_father_on_certificate} onChange={(value) => setField("wants_father_on_certificate", value)} required />
            {form.wants_father_on_certificate && (
              <>
                <div className="form-field"><label htmlFor="field-father_full_name">Họ tên cha <span aria-hidden="true">*</span></label><input id="field-father_full_name" value={form.father_full_name} onChange={(event) => setField("father_full_name", event.target.value)} required autoComplete="name" /></div>
                <BooleanSelect id="parentage_evidence" label="Đã có chứng cứ quan hệ cha con chưa?" value={form.parentage_evidence} onChange={(value) => setField("parentage_evidence", value)} required />
              </>
            )}
          </div>
        </fieldset>
      )}

      {foreignElement && (
        <fieldset>
          <legend>Giấy tờ có yếu tố nước ngoài</legend>
          <div className="form-grid">
            <BooleanSelect id="has_foreign_documents" label="Bạn có giấy tờ do nước ngoài cấp không?" value={form.has_foreign_documents} onChange={(value) => setField("has_foreign_documents", value)} required />
            <BooleanSelect id="foreign_documents_translated" label="Giấy tờ đã được dịch tiếng Việt và chứng thực chưa?" value={form.foreign_documents_translated} onChange={(value) => setField("foreign_documents_translated", value)} required={form.has_foreign_documents === true} disabled={form.has_foreign_documents !== true} />
            <BooleanSelect id="foreign_documents_legalized" label="Đã hợp pháp hóa lãnh sự hoặc được miễn chưa?" value={form.foreign_documents_legalized} onChange={(value) => setField("foreign_documents_legalized", value)} required={form.has_foreign_documents === true} disabled={form.has_foreign_documents !== true} />
          </div>
        </fieldset>
      )}

      <div className="form-actions"><p>Dữ liệu chỉ được gửi tới backend của hệ thống.</p><button className="button button-primary session-action" type="submit" disabled={pending}><span>{pending ? "Đang kiểm tra..." : "Kiểm tra thông tin"}</span><i aria-hidden="true">↗</i></button></div>
    </form>
  );
}

export function PrecheckResults({ issues, status, onFix }: { issues: PrecheckIssue[]; status: string; onFix: (field: string) => void }) {
  if (status === "ready") {
    return (
      <section id="precheck-results" className="ready-panel" aria-live="polite">
        <span aria-hidden="true">OK</span>
        <div><p>Đã vượt qua kiểm tra tự động</p><h2>Thông tin đã sẵn sàng</h2><p>Không còn lỗi bắt buộc trong kết quả kiểm tra hiện tại.</p></div>
      </section>
    );
  }
  if (!issues.length) return null;
  const errors = issues.filter((issue) => issue.severity === "error").length;
  const warnings = issues.length - errors;
  return (
    <section id="precheck-results" className="precheck-results" aria-labelledby="precheck-title" aria-live="polite">
      <div className="result-summary"><div><p>Kết quả kiểm tra</p><h2 id="precheck-title">{errors ? `${errors} lỗi cần sửa` : "Không có lỗi bắt buộc"}</h2></div><span>{warnings} cảnh báo</span></div>
      <div className="issue-list">
        {issues.map((issue, index) => (
          <article key={issue.id || `${issue.field_name}-${index}`} className={`issue issue-${issue.severity}`}>
            <div className="issue-heading"><span>{issue.severity === "error" ? "Lỗi cần sửa" : "Cảnh báo"}</span><small>{issue.source === "rule_engine" ? "Kiểm tra tự động theo quy tắc" : "AI phát hiện – cần xác nhận"}</small></div>
            <h3>{issue.message}</h3>
            <p><strong>Cách xử lý:</strong> {issue.suggested_fix}</p>
            <div className="issue-footer"><LegalBasisAccordion basis={issue.legal_basis} />{issue.field_name && <button type="button" className="text-button" onClick={() => onFix(issue.field_name!)}>Sửa trường này</button>}</div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function PdfPreview({ sessionId }: { sessionId: string }) {
  const source = `${API_BASE_URL}/sessions/${encodeURIComponent(sessionId)}/birth-registration.pdf`;
  return (
    <section className="pdf-preview" aria-labelledby="pdf-preview-title">
      <div className="pdf-preview-heading"><div><p>Bản xem trước</p><h2 id="pdf-preview-title">Tờ khai từ thông tin đã điền</h2><span>Kiểm tra nội dung bên dưới, sau đó tải bản PDF về thiết bị.</span></div><div className="pdf-actions"><a className="button button-secondary session-action" href={source} target="_blank" rel="noreferrer"><span>Mở toàn màn hình</span><i aria-hidden="true">↗</i></a><a className="button button-primary session-action pdf-download" href={`${source}?download=true`}><span><strong>Tải bản PDF</strong><small>Lưu về thiết bị</small></span><i aria-hidden="true">↓</i></a></div></div>
      <div className="pdf-frame"><iframe src={source} title="Bản xem trước tờ khai đăng ký khai sinh" /></div>
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
    return <AppShell session><main className="session-loading" aria-live="polite"><span className="loading-dots" aria-hidden="true"><i /><i /><i /></span><p>Đang khôi phục phiên làm việc...</p></main></AppShell>;
  }

  if (!session) {
    return <AppShell session><main className="fatal-state" role="alert"><p>Không thể mở phiên làm việc</p><h1>{error || "Phiên không tồn tại."}</h1><Link className="button button-primary" href="/">Về trang bắt đầu</Link></main></AppShell>;
  }

  const hasCases = session.cases.length > 0;
  const currentStep = flowStep(session.status, view, hasCases);
  const officerRequired = needsOfficer || session.cases.some((item) => item.requires_officer_confirmation);

  return (
    <AppShell session>
      <main className="session-page">
        <div className="session-topbar">
          <div><p>Mã phiên</p><strong>{session.id.slice(0, 8).toUpperCase()}</strong></div>
          <ProgressStepper current={currentStep} />
        </div>

        {error && <div className="global-error" role="alert"><span>{error}</span><button type="button" onClick={() => setError("")} aria-label="Đóng thông báo">Đóng</button></div>}
        {officerRequired && <OfficerConfirmationBanner />}

        <div className="session-layout">
          <div className="session-main">
            <div className="view-tabs" role="tablist" aria-label="Nội dung phiên">
              <button type="button" role="tab" aria-selected={view === "chat"} className={view === "chat" ? "active" : ""} onClick={() => setView("chat")}>Trao đổi</button>
              <button type="button" role="tab" aria-selected={view === "form"} className={view === "form" ? "active" : ""} onClick={() => setView("form")} disabled={!hasCases}>Điền thông tin</button>
            </div>

            {view === "chat" ? (
              <>
                <IntakeChat messages={messages} pending={sending} confidence={confidence} onSend={sendMessage} onTranscribe={transcribeAudio} />
                {hasCases && <div className="next-step-callout"><div><strong>Đã có checklist ban đầu</strong><p>Bạn vẫn có thể tiếp tục trao đổi hoặc chuyển sang điền thông tin.</p></div><button className="button button-primary session-action" type="button" onClick={() => setView("form")}><span>Điền thông tin</span><i aria-hidden="true">→</i></button></div>}
              </>
            ) : (
              <>
                <BirthRegistrationForm cases={session.cases} form={form} pending={checking} onChange={updateForm} onSubmit={runPrecheck} />
                <PrecheckResults issues={issues} status={session.status} onFix={focusField} />
                {officerRequired && session.status !== "ready" && issues.some((issue) => issue.source === "llm") && <OfficerConfirmationBanner />}
                {(session.status === "precheck" || session.status === "ready") && <PdfPreview sessionId={session.id} />}
              </>
            )}
          </div>

          <aside className="session-aside">
            <CaseBadges primaryCase={session.primary_case} cases={session.cases} />
            <ChecklistPanel checklist={checklist} />
          </aside>
        </div>
      </main>
    </AppShell>
  );
}

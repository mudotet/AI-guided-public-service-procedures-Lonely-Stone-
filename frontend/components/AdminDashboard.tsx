"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";

import { ApiError, API_BASE_URL, apiFetch } from "@/lib/api";
import type { AdminDashboardResponse, AdminSessionSummary, SessionDetail, SessionStatus } from "@/lib/types";

const ADMIN_TOKEN_KEY = "birth-registration-admin-token";
const STATUS_LABELS: Record<SessionStatus, string> = {
  intake: "Đang thu thập",
  checklist: "Đã có checklist",
  precheck: "Cần kiểm tra lại",
  ready: "Sẵn sàng",
};

const FORM_FIELDS = [
  { key: "child_full_name", label: "Họ tên trẻ", type: "text" },
  { key: "child_birth_date", label: "Ngày sinh", type: "date" },
  { key: "registration_date", label: "Ngày dự kiến đăng ký", type: "date" },
  { key: "child_birth_country", label: "Quốc gia nơi sinh", type: "text" },
  { key: "parents_married", label: "Cha mẹ đã đăng ký kết hôn", type: "boolean" },
  { key: "mother_full_name", label: "Họ tên mẹ", type: "text" },
  { key: "mother_nationality", label: "Quốc tịch mẹ", type: "text" },
  { key: "father_full_name", label: "Họ tên cha", type: "text" },
  { key: "father_nationality", label: "Quốc tịch cha", type: "text" },
  { key: "wants_father_on_certificate", label: "Có ghi tên cha", type: "boolean" },
  { key: "parentage_evidence", label: "Có chứng cứ quan hệ cha con", type: "boolean" },
  { key: "has_foreign_documents", label: "Có giấy tờ nước ngoài", type: "boolean" },
  { key: "foreign_documents_translated", label: "Đã dịch và chứng thực", type: "boolean" },
  { key: "foreign_documents_legalized", label: "Đã hợp pháp hóa hoặc được miễn", type: "boolean" },
  { key: "rare_case", label: "Trường hợp cần cán bộ xem thêm", type: "rare_case" },
] as const;

const RARE_CASE_OPTIONS = [
  ["", "Không có"],
  ["abandoned", "Trẻ bị bỏ rơi/chưa xác định cha mẹ"],
  ["surrogacy", "Sinh con nhờ mang thai hộ"],
  ["reregistration", "Đăng ký lại khai sinh"],
  ["correction", "Cải chính thông tin hộ tịch"],
] as const;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function displayValue(value: unknown) {
  if (value === true) return "Có";
  if (value === false) return "Không";
  if (value === null || value === undefined || value === "") return "Chưa cung cấp";
  return String(value);
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

function AdminBrand() {
  return (
    <Link href="/admin" className="admin-brand">
      <span>KS</span>
      <div><strong>Cổng quản lý hộ tịch</strong><small>Trung tâm điều phối hồ sơ khai sinh</small></div>
    </Link>
  );
}

export function AdminDashboard() {
  const [token, setToken] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [dashboard, setDashboard] = useState<AdminDashboardResponse | null>(null);
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [caseFilter, setCaseFilter] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [operationLoading, setOperationLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = sessionStorage.getItem(ADMIN_TOKEN_KEY);
    if (saved) {
      setToken(saved);
      void loadDashboard(saved, 1);
    }
  }, []);

  async function loadDashboard(nextToken = token, requestedPage = page) {
    if (!nextToken) return false;
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ page: String(requestedPage), page_size: "10" });
    if (statusFilter) params.set("status", statusFilter);
    if (caseFilter) params.set("case_code", caseFilter);
    if (query.trim()) params.set("q", query.trim());
    try {
      const result = await apiFetch<AdminDashboardResponse>(`/admin/dashboard?${params}`, { headers: authHeaders(nextToken) });
      setDashboard(result);
      setPage(result.page);
      return true;
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        sessionStorage.removeItem(ADMIN_TOKEN_KEY);
        setToken("");
        setDashboard(null);
      }
      setError(cause instanceof Error ? cause.message : "Không thể tải dữ liệu quản trị.");
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextToken = accessCode.trim();
    if (!nextToken) return;
    const accepted = await loadDashboard(nextToken, 1);
    if (accepted) {
      sessionStorage.setItem(ADMIN_TOKEN_KEY, nextToken);
      setToken(nextToken);
      setAccessCode("");
    }
  }

  async function openSession(session: AdminSessionSummary) {
    setSelectedId(session.id);
    setDetailLoading(true);
    setError("");
    try {
      setDetail(await apiFetch<SessionDetail>(`/admin/sessions/${session.id}`, { headers: authHeaders(token) }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể mở chi tiết phiên.");
    } finally {
      setDetailLoading(false);
    }
  }

  async function saveSession(formData: Record<string, unknown>) {
    if (!detail || operationLoading) return;
    setOperationLoading(true);
    try {
      const updated = await apiFetch<SessionDetail>(`/admin/sessions/${detail.id}`, {
        method: "PATCH",
        headers: authHeaders(token),
        body: JSON.stringify({ form_data: formData }),
      });
      setDetail(updated);
      await loadDashboard(token, page);
    } finally {
      setOperationLoading(false);
    }
  }

  async function deleteSession() {
    if (!detail || operationLoading) return;
    setOperationLoading(true);
    try {
      await apiFetch<unknown>(`/admin/sessions/${detail.id}`, { method: "DELETE", headers: authHeaders(token) });
      setDetail(null);
      setSelectedId("");
      await loadDashboard(token, page);
    } finally {
      setOperationLoading(false);
    }
  }

  function closeDetail() {
    setDetail(null);
    setSelectedId("");
  }

  function logout() {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    setToken("");
    setDashboard(null);
    setDetail(null);
    setSelectedId("");
  }

  if (!token || !dashboard) {
    return (
      <div className="admin-login-page">
        <div className="admin-atmosphere" aria-hidden="true"><span /><span /><i>HỘ TỊCH SỐ</i></div>
        <header><AdminBrand /><Link href="/"><span>Về trang công khai</span><i aria-hidden="true">↗</i></Link></header>
        <main>
          <section className="admin-login-intro">
            <p className="admin-eyebrow"><span />Khu vực nghiệp vụ được bảo vệ</p>
            <h1>Điều phối rõ ràng.<br />Ra quyết định <em>có căn cứ.</em></h1>
            <p>Theo dõi tình trạng phiên, xem bản PDF và cập nhật thông tin hỗ trợ trước khi cán bộ xử lý.</p>
            <ul><li><span>01</span>Dữ liệu cập nhật trực tiếp từ backend</li><li><span>02</span>Thao tác thay đổi yêu cầu xác nhận rõ ràng</li><li><span>03</span>Mã truy cập chỉ lưu trong phiên trình duyệt</li></ul>
          </section>
          <div className="admin-login-shell">
            <section className="admin-login-card" aria-labelledby="admin-login-title">
              <div className="admin-lock" aria-hidden="true"><span>KS</span><i /></div>
              <p>Xác thực cán bộ</p>
              <h2 id="admin-login-title">Mở cổng quản lý</h2>
              <span>Dữ liệu có thể chứa thông tin cá nhân. Chỉ sử dụng mã truy cập được cấp.</span>
              <form onSubmit={login}>
                <label htmlFor="admin-access-code">Mã truy cập quản trị</label>
                <input id="admin-access-code" type="password" value={accessCode} onChange={(event) => setAccessCode(event.target.value)} autoComplete="current-password" disabled={loading} required />
                <button className="button button-primary admin-action" type="submit" disabled={loading || !accessCode.trim()}><span>{loading ? "Đang xác thực..." : "Đăng nhập an toàn"}</span><i aria-hidden="true">→</i></button>
              </form>
              {error && <div className="admin-alert" role="alert">{error}</div>}
            </section>
          </div>
        </main>
      </div>
    );
  }

  const stats = [
    ["Tổng số phiên", dashboard.stats.total, "total"],
    ["Đang thu thập", dashboard.stats.intake + dashboard.stats.checklist, "active"],
    ["Cần xử lý", dashboard.stats.precheck, "attention"],
    ["Sẵn sàng", dashboard.stats.ready, "ready"],
    ["Cần cán bộ xác nhận", dashboard.stats.needs_officer_confirmation, "officer"],
  ] as const;

  return (
    <div className="admin-shell">
      <div className="admin-atmosphere" aria-hidden="true"><span /><span /></div>
      <header className="admin-header">
        <AdminBrand />
        <div className="admin-system-state"><span />Hệ thống đang hoạt động</div>
        <nav><Link href="/">Trang công khai</Link><button type="button" onClick={logout}>Đăng xuất</button></nav>
      </header>

      <main className="admin-page">
        <section className="admin-title">
          <div><p className="admin-eyebrow"><span />Trung tâm điều phối</p><h1>Toàn cảnh các phiên<br />hướng dẫn khai sinh</h1><span>Danh sách phân trang · Mỗi trang 10 phiên</span></div>
          <div className="admin-title-actions">
            <button className="button button-secondary admin-action" type="button" onClick={() => void loadDashboard()} disabled={loading}><span>{loading ? "Đang cập nhật..." : "Cập nhật dữ liệu"}</span><i aria-hidden="true">↻</i></button>
          </div>
        </section>

        {error && <div className="admin-alert" role="alert">{error}</div>}

        <section className="admin-stats" aria-label="Thống kê phiên">
          {stats.map(([label, value, tone], index) => (
            <article key={label} className={`admin-stat stat-${tone}`} style={{ animationDelay: `${120 + index * 70}ms` }}>
              <div><span>{label}</span><strong>{value.toLocaleString("vi-VN")}</strong><small>{tone === "total" ? "Toàn bộ dữ liệu ghi nhận" : "Phiên trong trạng thái này"}</small></div>
            </article>
          ))}
        </section>

        <section className="admin-case-overview" aria-labelledby="case-overview-title">
          <div className="admin-case-core">
            <div className="admin-case-heading"><div><p>Phân loại trường hợp</p><h2 id="case-overview-title">Những tình huống hệ thống đang nhận diện</h2></div><span>{dashboard.case_stats.length} nhóm nghiệp vụ</span></div>
            <div className="admin-case-list">
              {dashboard.case_stats.map((item) => (
                <article key={item.code}>
                  <div><small>{item.code}</small><strong>{item.name}</strong></div>
                  <span>{item.total}<small> phiên</small></span>
                  <progress value={item.total} max={Math.max(dashboard.stats.total, 1)} aria-label={`${item.name}: ${item.total} phiên`} />
                  {item.requires_officer_confirmation && <em>Cần cán bộ</em>}
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="admin-session-panel admin-session-panel-wide" aria-labelledby="session-list-title">
          <div className="admin-session-core">
            <div className="admin-panel-heading"><div><p>Luồng tiếp nhận</p><h2 id="session-list-title">Câu hỏi và tiến độ của phụ huynh</h2></div><span>{dashboard.result_count} kết quả</span></div>
            <form className="admin-filters" onSubmit={(event) => { event.preventDefault(); setPage(1); void loadDashboard(token, 1); }}>
              <label><span>Tìm mã phiên hoặc câu hỏi</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ví dụ: giấy tờ nước ngoài" /></label>
              <label><span>Trạng thái</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">Tất cả</option>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label><span>Trường hợp</span><select value={caseFilter} onChange={(event) => setCaseFilter(event.target.value)}><option value="">Tất cả</option>{dashboard.case_stats.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}</select></label>
              <button className="button button-primary admin-action" type="submit" disabled={loading}><span>Lọc phiên</span><i aria-hidden="true">↗</i></button>
            </form>

            <div className="admin-table-wrap">
              <table className="admin-session-table">
                <thead><tr><th scope="col">Phiên</th><th scope="col">Trạng thái</th><th scope="col">Trường hợp</th><th scope="col">Câu hỏi gần nhất</th><th scope="col">Cập nhật</th><th scope="col"><span className="sr-only">Thao tác</span></th></tr></thead>
                <tbody>{dashboard.sessions.map((session) => (
                  <tr key={session.id} className={selectedId === session.id ? "selected" : ""}>
                    <td><strong>{session.id.slice(0, 8).toUpperCase()}</strong>{session.needs_officer_confirmation && <small>Cần cán bộ xác nhận</small>}</td>
                    <td><span className={`admin-status status-${session.status}`}>{STATUS_LABELS[session.status]}</span></td>
                    <td>{session.primary_case?.name || "Chưa phân loại"}</td>
                    <td><p>{session.last_user_message || "Chưa có câu hỏi"}</p></td>
                    <td>{formatDate(session.updated_at)}</td>
                    <td><button type="button" onClick={() => void openSession(session)} disabled={detailLoading && selectedId === session.id}><span>{detailLoading && selectedId === session.id ? "Đang mở" : "Xem"}</span><i aria-hidden="true">↗</i></button></td>
                  </tr>
                ))}</tbody>
              </table>
              {!dashboard.sessions.length && <div className="admin-empty"><strong>Không có phiên phù hợp</strong><p>Thử bỏ bớt bộ lọc hoặc tìm bằng nội dung khác.</p></div>}
            </div>

            <nav className="admin-pagination" aria-label="Phân trang danh sách phiên">
              <button type="button" onClick={() => void loadDashboard(token, page - 1)} disabled={loading || page <= 1}><i aria-hidden="true">←</i><span>Trang trước</span></button>
              <div><small>Trang hiện tại</small><strong>{page}<span>/</span>{dashboard.total_pages}</strong><p>{dashboard.result_count} phiên phù hợp</p></div>
              <button type="button" onClick={() => void loadDashboard(token, page + 1)} disabled={loading || page >= dashboard.total_pages}><span>Trang sau</span><i aria-hidden="true">→</i></button>
            </nav>
          </div>
        </section>
      </main>

      {detail && (
        <AdminSessionDialog
          detail={detail}
          token={token}
          saving={operationLoading}
          onClose={closeDetail}
          onSave={saveSession}
          onDelete={deleteSession}
        />
      )}
    </div>
  );
}

type AdminSessionDialogProps = {
  detail: SessionDetail;
  token: string;
  saving: boolean;
  onClose: () => void;
  onSave: (formData: Record<string, unknown>) => Promise<void>;
  onDelete: () => Promise<void>;
};

function AdminSessionDialog({ detail, token, saving, onClose, onSave, onDelete }: AdminSessionDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [tab, setTab] = useState<"overview" | "form" | "pdf">("overview");
  const [draft, setDraft] = useState<Record<string, unknown>>(detail.form_data);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfError, setPdfError] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [dialogError, setDialogError] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);

  useEffect(() => {
    setDraft(detail.form_data);
  }, [detail]);

  useEffect(() => {
    if (tab !== "pdf") return;
    const controller = new AbortController();
    let objectUrl = "";
    setPdfLoading(true);
    setPdfError("");
    setPdfUrl("");
    fetch(`${API_BASE_URL}/admin/sessions/${detail.id}/birth-registration.pdf`, {
      headers: authHeaders(token),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          const data = await response.json().catch(() => ({})) as { detail?: string };
          throw new Error(data.detail || "Không thể tải bản PDF.");
        }
        return response.blob();
      })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setPdfUrl(objectUrl);
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setPdfError(cause instanceof Error ? cause.message : "Không thể tải bản PDF.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setPdfLoading(false);
      });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [tab, detail.id, detail.updated_at, token]);

  function updateField(key: string, type: string, value: string) {
    const nextValue = type === "boolean" ? (value === "" ? null : value === "true") : value || null;
    setDraft((current) => ({ ...current, [key]: nextValue }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDialogError("");
    try {
      await onSave(draft);
    } catch (cause) {
      setDialogError(cause instanceof Error ? cause.message : "Không thể lưu thay đổi.");
    }
  }

  async function remove() {
    setDialogError("");
    try {
      await onDelete();
    } catch (cause) {
      setDialogError(cause instanceof Error ? cause.message : "Không thể xóa phiên.");
      setDeleteArmed(false);
    }
  }

  const messages = detail.messages.filter((message) => message.role !== "system");

  return (
    <dialog ref={dialogRef} className="admin-session-dialog" onCancel={(event) => { event.preventDefault(); onClose(); }}>
      <div className="admin-dialog-shell">
        <div className="admin-dialog-core">
          <header className="admin-dialog-header">
            <div><p>Hồ sơ phiên hướng dẫn</p><h2>{detail.id.slice(0, 8).toUpperCase()}</h2><span>Tạo {formatDate(detail.created_at)}</span></div>
            <div><span className={`admin-status status-${detail.status}`}>{STATUS_LABELS[detail.status]}</span><button type="button" onClick={onClose} aria-label="Đóng cửa sổ chi tiết">×</button></div>
          </header>

          <nav className="admin-dialog-tabs" aria-label="Nội dung chi tiết">
            <button type="button" className={tab === "overview" ? "active" : ""} onClick={() => setTab("overview")}><span>01</span>Tổng quan</button>
            <button type="button" className={tab === "form" ? "active" : ""} onClick={() => setTab("form")}><span>02</span>Biểu mẫu</button>
            <button type="button" className={tab === "pdf" ? "active" : ""} onClick={() => setTab("pdf")}><span>03</span>Xem PDF</button>
          </nav>

          <div className="admin-dialog-content">
            {tab === "overview" && (
              <div className="admin-dialog-overview">
                <section className="admin-overview-cases"><header><p>Trường hợp đã nhận diện</p><strong>{detail.cases.length}</strong></header><div>{detail.cases.length ? detail.cases.map((item) => <span key={item.code}>{item.name}{item.is_primary ? " · chính" : ""}</span>) : <p>Chưa đủ dữ kiện để phân loại.</p>}</div></section>
                <section className="admin-overview-facts"><header><p>Thông tin chính</p><span>{Object.keys(detail.form_data).length} trường đã lưu</span></header><dl><div><dt>Trẻ</dt><dd>{displayValue(detail.form_data.child_full_name)}</dd></div><div><dt>Mẹ</dt><dd>{displayValue(detail.form_data.mother_full_name)}</dd></div><div><dt>Cha</dt><dd>{displayValue(detail.form_data.father_full_name)}</dd></div></dl></section>
                <section className="admin-overview-chat"><header><div><p>Hội thoại với phụ huynh</p><h3>{messages.length} tin nhắn</h3></div></header><div>{messages.length ? messages.map((message, index) => <article key={`${message.created_at || index}-${index}`} className={message.role === "user" ? "from-user" : "from-assistant"}><small>{message.role === "user" ? "Phụ huynh" : "Trợ lý"}</small><p>{message.content}</p>{message.created_at && <time>{formatDate(message.created_at)}</time>}</article>) : <p>Chưa có hội thoại.</p>}</div></section>
                <section className="admin-overview-issues"><header><p>Kết quả kiểm tra</p><strong>{detail.precheck_results.length}</strong></header><div>{detail.precheck_results.length ? detail.precheck_results.map((issue, index) => <article key={issue.id || index} className={`admin-issue issue-${issue.severity}`}><div><strong>{issue.severity === "error" ? "Lỗi" : "Cảnh báo"}</strong><small>{issue.source === "rule_engine" ? "Quy tắc tự động" : "AI phát hiện"}</small></div><p>{issue.message}</p><span>{issue.legal_basis || "Chưa có căn cứ được ánh xạ – cần cán bộ xác nhận"}</span></article>) : <p>Chưa có kết quả precheck.</p>}</div></section>
              </div>
            )}

            {tab === "form" && (
              <form className="admin-edit-form" onSubmit={submit}>
                <div className="admin-edit-intro"><div><p>Chỉnh thông tin biểu mẫu</p><h3>Dữ liệu dùng để tạo bản xem trước PDF</h3></div><span>Sau khi lưu, kết quả kiểm tra cũ sẽ được xóa và phiên chuyển về “Cần kiểm tra lại”.</span></div>
                <div className="admin-edit-grid">
                  {FORM_FIELDS.map((field) => (
                    <label key={field.key} className={field.key === "child_full_name" ? "wide" : ""}>
                      <span>{field.label}</span>
                      {field.type === "boolean" ? (
                        <select value={draft[field.key] === null || draft[field.key] === undefined ? "" : String(draft[field.key])} onChange={(event) => updateField(field.key, field.type, event.target.value)}>
                          <option value="">Chưa cung cấp</option><option value="true">Có</option><option value="false">Không</option>
                        </select>
                      ) : field.type === "rare_case" ? (
                        <select value={String(draft[field.key] || "")} onChange={(event) => updateField(field.key, field.type, event.target.value)}>{RARE_CASE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
                      ) : (
                        <input type={field.type} value={String(draft[field.key] || "")} onChange={(event) => updateField(field.key, field.type, event.target.value)} />
                      )}
                    </label>
                  ))}
                </div>
                <div className="admin-edit-actions"><p>Đây là dữ liệu hỗ trợ, không phải thao tác cấp Giấy khai sinh chính thức.</p><button className="button button-primary admin-action" type="submit" disabled={saving}><span>{saving ? "Đang lưu..." : "Lưu thay đổi"}</span><i aria-hidden="true">✓</i></button></div>
              </form>
            )}

            {tab === "pdf" && (
              <section className="admin-pdf-viewer">
                <header><div><p>Bản xem trước hồ sơ</p><h3>Tờ khai đăng ký khai sinh</h3><span>PDF được tạo từ dữ liệu biểu mẫu hiện tại.</span></div>{pdfUrl && <a className="button button-primary admin-action" href={pdfUrl} download={`birth-registration-${detail.id}.pdf`}><span>Tải PDF</span><i aria-hidden="true">↓</i></a>}</header>
                {pdfLoading && <div className="admin-pdf-state"><span className="loading-dots" aria-hidden="true"><i /><i /><i /></span><p>Đang tạo bản xem trước PDF...</p></div>}
                {pdfError && <div className="admin-pdf-state error" role="alert"><strong>Chưa thể hiển thị PDF</strong><p>{pdfError}</p><button type="button" onClick={() => setTab("form")}>Mở biểu mẫu để bổ sung dữ liệu</button></div>}
                {pdfUrl && <iframe src={pdfUrl} title={`Bản xem trước PDF của phiên ${detail.id}`} />}
              </section>
            )}
          </div>

          <footer className="admin-dialog-footer">
            <div className="admin-delete-zone">
              {!deleteArmed ? <button type="button" onClick={() => setDeleteArmed(true)}>Xóa phiên này</button> : <div role="alert"><span>Xóa vĩnh viễn phiên và toàn bộ dữ liệu liên quan?</span><button type="button" onClick={() => setDeleteArmed(false)}>Hủy</button><button type="button" className="danger" onClick={() => void remove()} disabled={saving}>Xác nhận xóa</button></div>}
            </div>
            <button type="button" className="admin-dialog-done" onClick={onClose}>Đóng cửa sổ</button>
          </footer>

          {dialogError && <div className="admin-dialog-error" role="alert">{dialogError}</div>}
        </div>
      </div>
    </dialog>
  );
}

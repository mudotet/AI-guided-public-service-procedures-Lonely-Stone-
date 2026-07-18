"use client";

import Image from "next/image";
import Link from "next/link";
import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";

import { ApiError, API_BASE_URL, apiFetch } from "@/lib/api";
import type { AdminDashboardResponse, AdminSessionSummary, SessionDetail, SessionStatus } from "@/lib/types";

const ADMIN_TOKEN_KEY = "birth-registration-admin-token";
const adminActionClass = "group inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-primary py-1.5 pr-1.5 pl-5 text-xs font-extrabold text-white shadow-[0_14px_34px_rgba(11,94,215,.2)] transition duration-500 hover:-translate-y-0.5 hover:bg-government active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-55";
const adminFieldClass = "min-h-12 w-full rounded-2xl border border-government/10 bg-white px-4 text-sm text-ink shadow-[inset_0_1px_2px_rgba(6,59,130,.03)] outline-none transition duration-500 focus:border-primary focus:ring-4 focus:ring-primary/10";
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
    <Link href="/admin" className="inline-flex items-center gap-3">
      <span className="relative size-11 overflow-hidden rounded-xl border border-white/20 bg-white shadow-lg"><Image className="h-full w-full object-cover" src="/logo.jpg" alt="Biểu trưng CivicPath AI" width={44} height={44} priority /></span>
      <div className="hidden leading-tight sm:grid"><strong className="text-sm text-white">Cổng quản lý hộ tịch</strong><small className="mt-1 text-[9px] text-blue-200">Trung tâm điều phối hồ sơ khai sinh</small></div>
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
      <div className="relative min-h-screen overflow-hidden bg-government font-sans text-white">
        <div className="pointer-events-none absolute -top-60 -left-60 size-[640px] rounded-full bg-primary/25 blur-3xl" aria-hidden="true" />
        <header className="relative z-10 mx-auto mt-4 flex min-h-18 w-[calc(100%_-_32px)] max-w-[1320px] items-center justify-between rounded-full bg-white/8 px-4 ring-1 ring-white/15 sm:px-6"><AdminBrand /><Link className="group inline-flex min-h-11 items-center gap-3 rounded-full bg-white/8 py-1 pr-1 pl-4 text-xs font-extrabold text-white ring-1 ring-white/15 transition duration-500 hover:bg-white hover:text-government active:scale-[.98]" href="/"><span>Về trang công khai</span><i className="grid size-9 place-items-center rounded-full bg-white/10 not-italic transition duration-500 group-hover:translate-x-1 group-hover:-translate-y-0.5" aria-hidden="true">↗</i></Link></header>
        <main className="relative z-10 mx-auto grid min-h-[calc(100vh-96px)] w-[calc(100%_-_32px)] max-w-[1320px] items-center gap-16 py-16 lg:grid-cols-[1.1fr_.9fr]">
          <section className="max-w-3xl">
            <p className="mb-7 inline-flex items-center gap-2 text-[10px] font-black tracking-[0.16em] text-blue-200 uppercase before:size-2 before:rounded-full before:bg-green-400">Khu vực nghiệp vụ được bảo vệ</p>
            <h1 className="text-balance text-[clamp(46px,7vw,92px)] leading-[1.04] font-semibold tracking-[-0.045em]">Điều phối rõ ràng.<br />Ra quyết định <em className="font-editorial font-normal text-blue-200">có căn cứ.</em></h1>
            <p className="mt-7 max-w-xl text-sm leading-7 text-blue-100">Theo dõi tình trạng phiên, xem bản PDF và cập nhật thông tin hỗ trợ trước khi cán bộ xử lý.</p>
            <ul className="mt-12 grid list-none gap-0 p-0 text-xs text-blue-100">{[["01", "Dữ liệu cập nhật trực tiếp từ backend"], ["02", "Thao tác thay đổi yêu cầu xác nhận rõ ràng"], ["03", "Mã truy cập chỉ lưu trong phiên trình duyệt"]].map(([number, text]) => <li className="grid min-h-14 grid-cols-[42px_1fr] items-center border-t border-white/10" key={number}><span className="font-black text-blue-300">{number}</span>{text}</li>)}</ul>
          </section>
          <div className="rounded-[38px] bg-white/10 p-2 shadow-[0_40px_100px_rgba(0,0,0,.24)] ring-1 ring-white/15">
            <section className="rounded-[30px] bg-white p-6 text-ink sm:p-9" aria-labelledby="admin-login-title">
              <Image className="size-16 rounded-2xl border border-government/10 object-cover shadow-xl" src="/logo.jpg" alt="Biểu trưng CivicPath AI" width={64} height={64} priority />
              <p className="mt-9 text-[9px] font-black tracking-widest text-primary uppercase">Xác thực cán bộ</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-government" id="admin-login-title">Mở cổng quản lý</h2>
              <span className="mt-3 block text-xs leading-6 text-muted">Dữ liệu có thể chứa thông tin cá nhân. Chỉ sử dụng mã truy cập được cấp.</span>
              <form className="mt-7 grid gap-3" onSubmit={login}>
                <label className="text-xs font-bold text-slate-700" htmlFor="admin-access-code">Mã truy cập quản trị</label>
                <input className={adminFieldClass} id="admin-access-code" type="password" value={accessCode} onChange={(event) => setAccessCode(event.target.value)} autoComplete="current-password" disabled={loading} required />
                <button className={`${adminActionClass} mt-2`} type="submit" disabled={loading || !accessCode.trim()}><span>{loading ? "Đang xác thực..." : "Đăng nhập an toàn"}</span><i className="grid size-9 place-items-center rounded-full bg-white/15 not-italic" aria-hidden="true">→</i></button>
              </form>
              {error && <div className="mt-4 rounded-2xl border border-danger/20 bg-red-50 p-4 text-xs text-danger" role="alert">{error}</div>}
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
    <div className="min-h-screen bg-canvas font-sans text-ink">
      <header className="sticky top-3 z-30 mx-auto flex min-h-18 w-[calc(100%_-_24px)] max-w-[1400px] items-center gap-6 rounded-full bg-government px-4 text-white shadow-[0_18px_55px_rgba(6,59,130,.16)] ring-1 ring-white/10 sm:w-[calc(100%_-_48px)] sm:px-6">
        <AdminBrand />
        <div className="ml-auto hidden items-center gap-2 text-[10px] font-bold text-blue-200 md:flex"><span className="size-2 animate-pulse rounded-full bg-green-400" />Hệ thống đang hoạt động</div>
        <nav className="flex items-center gap-2 text-xs font-extrabold"><Link className="hidden min-h-10 rounded-full px-4 py-3 transition duration-500 hover:bg-white/10 sm:inline-flex" href="/">Trang công khai</Link><button className="min-h-10 rounded-full border border-white/15 px-4 transition duration-500 hover:bg-white hover:text-government active:scale-[.98]" type="button" onClick={logout}>Đăng xuất</button></nav>
      </header>

      <main className="mx-auto w-[calc(100%_-_24px)] max-w-[1400px] py-10 sm:w-[calc(100%_-_48px)] sm:py-16">
        <section className="flex flex-wrap items-end justify-between gap-7">
          <div><p className="mb-5 inline-flex items-center gap-2 text-[10px] font-black tracking-[0.16em] text-primary uppercase before:size-2 before:rounded-full before:bg-primary">Trung tâm điều phối</p><h1 className="text-balance text-[clamp(40px,5vw,70px)] leading-[1.06] font-semibold tracking-[-0.045em] text-government">Toàn cảnh các phiên<br />hướng dẫn khai sinh</h1><span className="mt-5 block text-xs text-muted">Danh sách phân trang · Mỗi trang 10 phiên</span></div>
          <div>
            <button className="inline-flex min-h-12 items-center gap-3 rounded-full border border-line bg-white py-1.5 pr-1.5 pl-5 text-xs font-extrabold text-government shadow-sm transition hover:border-primary hover:bg-blue-50 disabled:opacity-55" type="button" onClick={() => void loadDashboard()} disabled={loading}><span>{loading ? "Đang cập nhật..." : "Cập nhật dữ liệu"}</span><i className="grid size-9 place-items-center rounded-full bg-blue-50 not-italic" aria-hidden="true">↻</i></button>
          </div>
        </section>

        {error && <div className="mt-6 rounded-2xl border border-danger/20 bg-red-50 p-4 text-xs text-danger" role="alert">{error}</div>}

        <section className="mt-12 grid gap-px overflow-hidden rounded-[32px] bg-government/8 p-1.5 shadow-panel sm:grid-cols-2 lg:grid-cols-6" aria-label="Thống kê phiên">
          {stats.map(([label, value, tone], index) => (
            <article key={label} className={`min-h-48 rounded-[25px] p-5 ${index === 0 ? "bg-government text-white sm:col-span-2 lg:col-span-2" : "bg-white lg:col-span-1"}`} style={{ animationDelay: `${120 + index * 70}ms` }}>
              <div className="grid h-full content-between"><span className={`text-[10px] font-extrabold ${index === 0 ? "text-blue-200" : "text-muted"}`}>{label}</span><strong className={`text-5xl font-semibold tracking-tight ${index === 0 ? "text-white" : tone === "attention" || tone === "officer" ? "text-warning" : tone === "ready" ? "text-success" : "text-government"}`}>{value.toLocaleString("vi-VN")}</strong><small className={`text-[9px] leading-4 ${index === 0 ? "text-blue-200" : "text-muted"}`}>{tone === "total" ? "Toàn bộ dữ liệu ghi nhận" : "Phiên trong trạng thái này"}</small></div>
            </article>
          ))}
        </section>

        <section className="mt-6 rounded-[30px] bg-government p-1.5 shadow-[0_28px_70px_rgba(6,59,130,.16)]" aria-labelledby="case-overview-title">
          <div className="rounded-[25px] bg-white p-5 sm:p-7">
            <div className="flex flex-wrap items-end justify-between gap-5 border-b border-government/10 pb-5"><div><p className="text-[9px] font-black tracking-widest text-primary uppercase">Phân loại trường hợp</p><h2 className="mt-2 text-2xl font-semibold tracking-tight text-government" id="case-overview-title">Những tình huống hệ thống đang nhận diện</h2></div><span className="rounded-full bg-blue-50 px-3 py-2 text-[10px] font-black text-government">{dashboard.case_stats.length} nhóm nghiệp vụ</span></div>
            <div className="grid md:grid-cols-2 xl:grid-cols-3">
              {dashboard.case_stats.map((item) => (
                <article className="grid grid-cols-[1fr_auto] gap-4 border-government/10 px-2 py-5 not-last:border-b md:odd:border-r md:px-5 xl:not-last:border-b" key={item.code}>
                  <div className="grid gap-1"><small className="font-mono text-[8px] text-muted">{item.code}</small><strong className="text-xs text-government">{item.name}</strong></div>
                  <span className="text-xl font-semibold text-primary">{item.total}<small className="ml-1 text-[9px] font-normal text-muted">phiên</small></span>
                  <progress className="col-span-2 h-1.5 w-full overflow-hidden rounded-full accent-primary" value={item.total} max={Math.max(dashboard.stats.total, 1)} aria-label={`${item.name}: ${item.total} phiên`} />
                  {item.requires_officer_confirmation && <em className="col-span-2 text-[9px] font-black text-warning not-italic">Cần cán bộ</em>}
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-[30px] border border-government/10 bg-white shadow-panel" aria-labelledby="session-list-title">
          <div>
            <div className="flex flex-wrap items-end justify-between gap-5 border-b border-government/10 p-5 sm:p-7"><div><p className="text-[9px] font-black tracking-widest text-primary uppercase">Luồng tiếp nhận</p><h2 className="mt-2 text-2xl font-semibold tracking-tight text-government" id="session-list-title">Câu hỏi và tiến độ của phụ huynh</h2></div><span className="rounded-full bg-blue-50 px-3 py-2 text-[10px] font-black text-government">{dashboard.result_count} kết quả</span></div>
            <form className="grid gap-3 border-b border-government/10 bg-slate-50 p-5 sm:grid-cols-2 sm:p-7 xl:grid-cols-[1.5fr_1fr_1fr_auto]" onSubmit={(event) => { event.preventDefault(); setPage(1); void loadDashboard(token, 1); }}>
              <label className="grid gap-2 text-[10px] font-bold text-muted"><span>Tìm mã phiên hoặc câu hỏi</span><input className={adminFieldClass} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ví dụ: giấy tờ nước ngoài" /></label>
              <label className="grid gap-2 text-[10px] font-bold text-muted"><span>Trạng thái</span><select className={adminFieldClass} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">Tất cả</option>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className="grid gap-2 text-[10px] font-bold text-muted"><span>Trường hợp</span><select className={adminFieldClass} value={caseFilter} onChange={(event) => setCaseFilter(event.target.value)}><option value="">Tất cả</option>{dashboard.case_stats.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}</select></label>
              <button className={`${adminActionClass} self-end`} type="submit" disabled={loading}><span>Lọc phiên</span><i className="grid size-9 place-items-center rounded-full bg-white/15 not-italic" aria-hidden="true">↗</i></button>
            </form>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse text-left text-xs">
                <thead className="bg-white text-[9px] tracking-widest text-muted uppercase"><tr className="border-b border-line"><th className="px-5 py-4" scope="col">Phiên</th><th className="px-5 py-4" scope="col">Trạng thái</th><th className="px-5 py-4" scope="col">Trường hợp</th><th className="px-5 py-4" scope="col">Câu hỏi gần nhất</th><th className="px-5 py-4" scope="col">Cập nhật</th><th className="px-5 py-4" scope="col"><span className="sr-only">Thao tác</span></th></tr></thead>
                <tbody>{dashboard.sessions.map((session) => (
                  <tr key={session.id} className={`border-b border-line/70 transition hover:bg-blue-50/60 ${selectedId === session.id ? "bg-blue-50" : ""}`}>
                    <td className="px-5 py-4"><strong className="font-mono text-government">{session.id.slice(0, 8).toUpperCase()}</strong>{session.needs_officer_confirmation && <small className="mt-1 block text-[9px] font-bold text-warning">Cần cán bộ xác nhận</small>}</td>
                    <td className="px-5 py-4"><span className={`inline-flex rounded-full px-3 py-2 text-[9px] font-black ${session.status === "ready" ? "bg-green-50 text-success" : session.status === "precheck" ? "bg-amber-50 text-warning" : "bg-blue-50 text-primary"}`}>{STATUS_LABELS[session.status]}</span></td>
                    <td className="max-w-48 px-5 py-4 text-government">{session.primary_case?.name || "Chưa phân loại"}</td>
                    <td className="max-w-72 px-5 py-4"><p className="line-clamp-2 leading-5 text-muted">{session.last_user_message || "Chưa có câu hỏi"}</p></td>
                    <td className="whitespace-nowrap px-5 py-4 text-muted">{formatDate(session.updated_at)}</td>
                    <td className="px-5 py-4"><button className="inline-flex min-h-10 items-center gap-2 rounded-full bg-government px-4 text-[10px] font-extrabold text-white transition hover:bg-primary" type="button" onClick={() => void openSession(session)} disabled={detailLoading && selectedId === session.id}><span>{detailLoading && selectedId === session.id ? "Đang mở" : "Xem"}</span><i className="not-italic" aria-hidden="true">↗</i></button></td>
                  </tr>
                ))}</tbody>
              </table>
              {!dashboard.sessions.length && <div className="grid min-h-56 place-items-center p-8 text-center"><div><strong className="text-lg text-government">Không có phiên phù hợp</strong><p className="mt-2 text-xs text-muted">Thử bỏ bớt bộ lọc hoặc tìm bằng nội dung khác.</p></div></div>}
            </div>

            <nav className="flex items-center justify-between gap-5 border-t border-government/10 p-5 sm:px-7" aria-label="Phân trang danh sách phiên">
              <button className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-4 text-[10px] font-extrabold text-government transition hover:bg-blue-50 disabled:opacity-35" type="button" onClick={() => void loadDashboard(token, page - 1)} disabled={loading || page <= 1}><i className="not-italic" aria-hidden="true">←</i><span>Trang trước</span></button>
              <div className="text-center"><small className="block text-[8px] font-bold tracking-widest text-muted uppercase">Trang hiện tại</small><strong className="mt-1 block text-xl text-government">{page}<span className="mx-1 text-muted">/</span>{dashboard.total_pages}</strong><p className="mt-1 text-[9px] text-muted">{dashboard.result_count} phiên phù hợp</p></div>
              <button className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-4 text-[10px] font-extrabold text-government transition hover:bg-blue-50 disabled:opacity-35" type="button" onClick={() => void loadDashboard(token, page + 1)} disabled={loading || page >= dashboard.total_pages}><span>Trang sau</span><i className="not-italic" aria-hidden="true">→</i></button>
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
    <dialog ref={dialogRef} className="m-auto max-h-[94vh] w-[calc(100%_-_24px)] max-w-[1180px] overflow-hidden rounded-[32px] bg-transparent p-0 text-ink shadow-[0_40px_120px_rgba(0,0,0,.38)] backdrop:bg-slate-950/70 backdrop:backdrop-blur-sm" onCancel={(event) => { event.preventDefault(); onClose(); }}>
      <div className="max-h-[94vh] overflow-y-auto rounded-[32px] border border-white/20 bg-canvas p-1.5">
        <div className="overflow-hidden rounded-[26px] bg-white">
          <header className="flex flex-wrap items-start justify-between gap-5 bg-government p-5 text-white sm:p-7">
            <div><p className="text-[9px] font-black tracking-widest text-blue-300 uppercase">Hồ sơ phiên hướng dẫn</p><h2 className="mt-2 font-mono text-3xl font-semibold tracking-widest">{detail.id.slice(0, 8).toUpperCase()}</h2><span className="mt-2 block text-[10px] text-blue-200">Tạo {formatDate(detail.created_at)}</span></div>
            <div className="flex items-center gap-3"><span className={`rounded-full px-3 py-2 text-[9px] font-black ${detail.status === "ready" ? "bg-green-400/15 text-green-200" : detail.status === "precheck" ? "bg-amber-400/15 text-amber-200" : "bg-white/10 text-blue-100"}`}>{STATUS_LABELS[detail.status]}</span><button className="grid size-11 place-items-center rounded-full border border-white/15 text-xl transition hover:bg-white hover:text-government" type="button" onClick={onClose} aria-label="Đóng cửa sổ chi tiết">×</button></div>
          </header>

          <nav className="grid grid-cols-3 border-b border-line bg-white p-2" aria-label="Nội dung chi tiết">
            {[["overview", "01", "Tổng quan"], ["form", "02", "Biểu mẫu"], ["pdf", "03", "Xem PDF"]].map(([value, number, label]) => <button type="button" className={`min-h-12 rounded-xl text-xs font-extrabold transition ${tab === value ? "bg-government text-white shadow-md" : "text-muted hover:bg-blue-50 hover:text-government"}`} onClick={() => setTab(value as typeof tab)} key={value}><span className="mr-2 text-[9px] opacity-60">{number}</span>{label}</button>)}
          </nav>

          <div className="bg-canvas p-4 sm:p-6">
            {tab === "overview" && (
              <div className="grid gap-4 lg:grid-cols-2">
                <section className="rounded-3xl border border-government/10 bg-white p-5"><header className="flex justify-between border-b border-government/10 pb-4"><p className="text-[9px] font-black tracking-widest text-primary uppercase">Trường hợp đã nhận diện</p><strong className="text-xl text-government">{detail.cases.length}</strong></header><div className="mt-4 flex flex-wrap gap-2">{detail.cases.length ? detail.cases.map((item) => <span className={`rounded-full px-3 py-2 text-[10px] font-bold ${item.is_primary ? "bg-government text-white" : "bg-blue-50 text-primary"}`} key={item.code}>{item.name}{item.is_primary ? " · chính" : ""}</span>) : <p className="text-xs text-muted">Chưa đủ dữ kiện để phân loại.</p>}</div></section>
                <section className="rounded-3xl border border-government/10 bg-white p-5"><header className="flex justify-between border-b border-government/10 pb-4"><p className="text-[9px] font-black tracking-widest text-primary uppercase">Thông tin chính</p><span className="text-[9px] font-bold text-muted">{Object.keys(detail.form_data).length} trường đã lưu</span></header><dl className="mt-4 grid gap-3 text-xs">{([['Trẻ', detail.form_data.child_full_name], ['Mẹ', detail.form_data.mother_full_name], ['Cha', detail.form_data.father_full_name]] as [string, unknown][]).map(([label, value]) => <div className="flex justify-between gap-4 border-b border-line/60 pb-3" key={label}><dt className="text-muted">{label}</dt><dd className="font-extrabold text-government">{displayValue(value)}</dd></div>)}</dl></section>
                <section className="rounded-3xl border border-government/10 bg-white p-5"><header className="flex items-end justify-between border-b border-government/10 pb-4"><div><p className="text-[9px] font-black tracking-widest text-primary uppercase">Hội thoại với phụ huynh</p><h3 className="mt-1 text-lg font-semibold text-government">{messages.length} tin nhắn</h3></div></header><div className="mt-4 grid max-h-96 gap-3 overflow-y-auto pr-1">{messages.length ? messages.map((message, index) => <article key={`${message.created_at || index}-${index}`} className={`max-w-[88%] rounded-2xl p-3 text-xs leading-5 ${message.role === "user" ? "ml-auto bg-government text-white" : "mr-auto bg-slate-100 text-ink"}`}><small className={`text-[8px] font-black uppercase ${message.role === "user" ? "text-blue-200" : "text-primary"}`}>{message.role === "user" ? "Phụ huynh" : "Trợ lý"}</small><p className="mt-1 whitespace-pre-wrap">{message.content}</p>{message.created_at && <time className="mt-2 block text-[8px] opacity-60">{formatDate(message.created_at)}</time>}</article>) : <p className="py-8 text-center text-xs text-muted">Chưa có hội thoại.</p>}</div></section>
                <section className="rounded-3xl border border-government/10 bg-white p-5"><header className="flex justify-between border-b border-government/10 pb-4"><p className="text-[9px] font-black tracking-widest text-primary uppercase">Kết quả kiểm tra</p><strong className="text-xl text-government">{detail.precheck_results.length}</strong></header><div className="mt-4 grid max-h-96 gap-3 overflow-y-auto">{detail.precheck_results.length ? detail.precheck_results.map((issue, index) => <article key={issue.id || index} className={`rounded-2xl border-l-4 p-3 ${issue.severity === "error" ? "border-danger bg-red-50" : "border-warning bg-amber-50"}`}><div className="flex justify-between text-[8px] font-black uppercase"><strong className={issue.severity === "error" ? "text-danger" : "text-warning"}>{issue.severity === "error" ? "Lỗi" : "Cảnh báo"}</strong><small className="text-muted">{issue.source === "rule_engine" ? "Quy tắc tự động" : "AI phát hiện"}</small></div><p className="mt-2 text-xs leading-5">{issue.message}</p><span className="mt-2 block text-[9px] leading-4 text-muted">{issue.legal_basis || "Chưa có căn cứ được ánh xạ – cần cán bộ xác nhận"}</span></article>) : <p className="py-8 text-center text-xs text-muted">Chưa có kết quả precheck.</p>}</div></section>
              </div>
            )}

            {tab === "form" && (
              <form className="rounded-3xl border border-government/10 bg-white p-5 sm:p-7" onSubmit={submit}>
                <div className="grid gap-4 border-b border-government/10 pb-5 md:grid-cols-[1fr_.7fr]"><div><p className="text-[9px] font-black tracking-widest text-primary uppercase">Chỉnh thông tin biểu mẫu</p><h3 className="mt-2 text-2xl font-semibold tracking-tight text-government">Dữ liệu dùng để tạo bản xem trước PDF</h3></div><span className="rounded-2xl bg-amber-50 p-4 text-[10px] leading-5 text-warning">Sau khi lưu, kết quả kiểm tra cũ sẽ được xóa và phiên chuyển về “Cần kiểm tra lại”.</span></div>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {FORM_FIELDS.map((field) => (
                    <label key={field.key} className={`grid gap-2 text-[10px] font-bold text-muted ${field.key === "child_full_name" ? "sm:col-span-2" : ""}`}>
                      <span>{field.label}</span>
                      {field.type === "boolean" ? (
                        <select className={adminFieldClass} value={draft[field.key] === null || draft[field.key] === undefined ? "" : String(draft[field.key])} onChange={(event) => updateField(field.key, field.type, event.target.value)}>
                          <option value="">Chưa cung cấp</option><option value="true">Có</option><option value="false">Không</option>
                        </select>
                      ) : field.type === "rare_case" ? (
                        <select className={adminFieldClass} value={String(draft[field.key] || "")} onChange={(event) => updateField(field.key, field.type, event.target.value)}>{RARE_CASE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
                      ) : (
                        <input className={adminFieldClass} type={field.type} value={String(draft[field.key] || "")} onChange={(event) => updateField(field.key, field.type, event.target.value)} />
                      )}
                    </label>
                  ))}
                </div>
                <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-government/10 pt-5"><p className="text-[10px] text-muted">Đây là dữ liệu hỗ trợ, không phải thao tác cấp Giấy khai sinh chính thức.</p><button className={adminActionClass} type="submit" disabled={saving}><span>{saving ? "Đang lưu..." : "Lưu thay đổi"}</span><i className="grid size-9 place-items-center rounded-full bg-white/15 not-italic" aria-hidden="true">✓</i></button></div>
              </form>
            )}

            {tab === "pdf" && (
              <section className="overflow-hidden rounded-3xl border border-government/10 bg-white">
                <header className="flex flex-wrap items-start justify-between gap-5 border-b border-government/10 p-5 sm:p-7"><div><p className="text-[9px] font-black tracking-widest text-primary uppercase">Bản xem trước hồ sơ</p><h3 className="mt-2 text-2xl font-semibold tracking-tight text-government">Tờ khai đăng ký khai sinh</h3><span className="mt-2 block text-xs text-muted">PDF được tạo từ dữ liệu biểu mẫu hiện tại.</span></div>{pdfUrl && <a className={adminActionClass} href={pdfUrl} download={`birth-registration-${detail.id}.pdf`}><span>Tải PDF</span><i className="grid size-9 place-items-center rounded-full bg-white/15 not-italic" aria-hidden="true">↓</i></a>}</header>
                {pdfLoading && <div className="grid min-h-[540px] place-items-center text-center"><div><span className="flex gap-1" aria-hidden="true"><i className="size-2 animate-bounce rounded-full bg-primary [animation-delay:-.2s]" /><i className="size-2 animate-bounce rounded-full bg-primary [animation-delay:-.1s]" /><i className="size-2 animate-bounce rounded-full bg-primary" /></span><p className="mt-4 text-xs text-muted">Đang tạo bản xem trước PDF...</p></div></div>}
                {pdfError && <div className="grid min-h-[540px] place-items-center p-8 text-center" role="alert"><div><strong className="text-lg text-danger">Chưa thể hiển thị PDF</strong><p className="mt-2 text-xs text-muted">{pdfError}</p><button className="mt-5 min-h-11 rounded-full bg-government px-5 text-xs font-extrabold text-white" type="button" onClick={() => setTab("form")}>Mở biểu mẫu để bổ sung dữ liệu</button></div></div>}
                {pdfUrl && <iframe className="h-[660px] w-full bg-slate-100" src={pdfUrl} title={`Bản xem trước PDF của phiên ${detail.id}`} />}
              </section>
            )}
          </div>

          <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-line bg-white p-4 sm:px-6">
            <div>
              {!deleteArmed ? <button className="min-h-10 rounded-full px-4 text-[10px] font-extrabold text-danger transition hover:bg-red-50" type="button" onClick={() => setDeleteArmed(true)}>Xóa phiên này</button> : <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-red-50 p-2 text-[10px] text-danger" role="alert"><span className="px-2">Xóa vĩnh viễn phiên và toàn bộ dữ liệu liên quan?</span><button className="min-h-9 rounded-full bg-white px-3 font-bold" type="button" onClick={() => setDeleteArmed(false)}>Hủy</button><button type="button" className="min-h-9 rounded-full bg-danger px-3 font-extrabold text-white" onClick={() => void remove()} disabled={saving}>Xác nhận xóa</button></div>}
            </div>
            <button type="button" className="min-h-11 rounded-full bg-government px-5 text-xs font-extrabold text-white transition hover:bg-primary" onClick={onClose}>Đóng cửa sổ</button>
          </footer>

          {dialogError && <div className="border-t border-danger/20 bg-red-50 p-4 text-center text-xs text-danger" role="alert">{dialogError}</div>}
        </div>
      </div>
    </dialog>
  );
}

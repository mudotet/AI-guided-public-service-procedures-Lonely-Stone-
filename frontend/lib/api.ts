const API_BASE_URL = (process.env.VITE_API_BASE_URL || "http://localhost:8000").replace(/\/$/, "");
export const BACKEND_ONLINE_EVENT = "civicpath:backend-online";

export class ApiError extends Error {
  public status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

function statusMessage(status: number): string | undefined {
  if (status === 404) return "Không tìm thấy phiên làm việc. Phiên có thể đã hết hạn hoặc không tồn tại.";
  if (status === 409) return "Chưa đủ thông tin để tạo checklist. Hãy tiếp tục trả lời câu hỏi.";
  if (status === 502) return "AI đang tạm thời không phản hồi. Nội dung của bạn vẫn được giữ để thử lại.";
  if (status === 503) return "Dịch vụ AI chưa được cấu hình ở backend. Vui lòng liên hệ quản trị hệ thống.";
}

export async function apiFetch<T>(path: string, init: RequestInit = {}, timeoutMs = 15_000): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const headers = new Headers(init.headers);
  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;
  if (init.body && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
    });
    const text = await response.text();
    const data = text ? (JSON.parse(text) as { detail?: unknown }) : {};

    if (!response.ok) {
      const detail = typeof data.detail === "string" ? data.detail : undefined;
      throw new ApiError(detail || statusMessage(response.status) || `Yêu cầu thất bại (${response.status}).`, response.status);
    }
    if (typeof window !== "undefined") window.dispatchEvent(new Event(BACKEND_ONLINE_EVENT));
    return data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("Kết nối quá thời gian. Hãy kiểm tra mạng và thử lại.");
    }
    const origin = typeof window === "undefined" ? "origin của frontend" : window.location.origin;
    throw new ApiError(
      `Không thể kết nối backend. Nếu backend đang chạy, hãy thêm chính xác origin ${origin} vào CORS allowlist.`,
    );
  } finally {
    clearTimeout(timeout);
  }
}

export { API_BASE_URL };

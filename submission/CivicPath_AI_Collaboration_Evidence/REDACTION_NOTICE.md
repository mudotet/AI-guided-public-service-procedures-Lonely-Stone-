# Redaction Notice

Các file session trong gói là bản sao từ `~/.codex/sessions/` và chỉ được thay thế những chuỗi có thể là bí mật bằng nhãn sau:

- `[REDACTED_OPENAI_KEY]`
- `[REDACTED_DATABASE_URL]`
- `[REDACTED_VALUE]`
- `[REDACTED_TOKEN]`

Việc che dữ liệu nhằm tránh phát tán API key, database connection string hoặc bearer token. Session ID, timestamp, câu hỏi, câu trả lời, tool call và cấu trúc JSONL vẫn được giữ để BTC có thể kiểm tra quá trình cộng tác.

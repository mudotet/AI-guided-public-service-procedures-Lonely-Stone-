# CivicPath AI — AI Collaboration Evidence

Gói tài liệu này được chuẩn bị để đáp ứng yêu cầu nộp “Nhật ký cộng tác AI” của AI INNOVATION CHALLENGE.

## Nội dung

- `AI_COLLABORATION_JOURNAL.md`: nhật ký theo năm session phát triển sản phẩm.
- `01_sessions/`: năm file session Codex dạng JSONL, sao chép từ `~/.codex/sessions/`.
- `REDACTION_NOTICE.md`: phạm vi che dữ liệu nhạy cảm.
- `SHA256SUMS.txt`: checksum để kiểm tra tính toàn vẹn của từng file.

## Session được nộp

| Session ID | File trong gói | Nội dung chính |
|---|---|---|
| `019f6ef2-1d44-7ab3-8d82-a5752cb80f49` | `session-01-backend-core.jsonl` | Backend, multi-case, rule engine, OpenAI và API flow |
| `019f6f7d-47dc-78d2-b290-ccaea6539413` | `session-02-product-development-deploy.jsonl` | Frontend, voice, PDF, admin, UI/UX, Tailwind và deploy |
| `019f6f82-98f3-7640-b95e-b8a6e3170439` | `session-03-legal-documents-review.jsonl` | Đọc tài liệu nguồn và rà soát nghiệp vụ |
| `019f75c2-1499-7271-a81d-96ea2c3f505b` | `session-04-production-font-fix.jsonl` | Sửa font production giữa các máy |
| `019f75cf-7a16-7990-a26d-4e0a98380a92` | `session-05-cross-browser-fix.jsonl` | Sửa tách chữ tiếng Việt và cross-browser QA |

## Đường dẫn nguồn trên máy phát triển

```text
~/.codex/sessions/2026/07/17/rollout-2026-07-17T14-19-48-019f6ef2-1d44-7ab3-8d82-a5752cb80f49.jsonl
~/.codex/sessions/2026/07/17/rollout-2026-07-17T16-51-49-019f6f7d-47dc-78d2-b290-ccaea6539413.jsonl
~/.codex/sessions/2026/07/17/rollout-2026-07-17T16-57-37-019f6f82-98f3-7640-b95e-b8a6e3170439.jsonl
~/.codex/sessions/2026/07/18/rollout-2026-07-18T22-04-41-019f75c2-1499-7271-a81d-96ea2c3f505b.jsonl
~/.codex/sessions/2026/07/18/rollout-2026-07-18T22-19-19-019f75cf-7a16-7990-a26d-4e0a98380a92.jsonl
```

## Phạm vi lọc

Gói nộp chỉ giữ các session phát triển, kiểm thử và triển khai CivicPath AI. Hai session làm pitch deck/PowerPoint và session tạo nhật ký không được đưa vào.

## Cách kiểm tra

Các file `.jsonl` có thể mở bằng VS Code hoặc kiểm tra bằng:

```bash
jq -c . 01_sessions/session-01-backend-core.jsonl >/dev/null
shasum -a 256 -c SHA256SUMS.txt
```

Nội dung đầy đủ và metadata gốc nằm trong `01_sessions/`.

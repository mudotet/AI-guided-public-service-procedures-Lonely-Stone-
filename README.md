# AI-guided birth registration backend

Backend FastAPI cho hướng dẫn đăng ký khai sinh, dùng PostgreSQL, rule engine tất định và OpenAI cho phân loại/diễn giải.

## Chạy local

```bash
cd backend
cp .env.example .env
docker compose up -d
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

Swagger UI: `http://localhost:8000/docs`.

## Cổng quản lý

Đặt `ADMIN_API_KEY` trong `backend/.env.local`, sau đó mở `http://localhost:3000/admin`. Phiên mới chỉ phát sinh từ luồng hướng dẫn của người dân; cổng cán bộ cho phép xem, cập nhật và xóa phiên hỗ trợ, đồng thời xem hoặc tải bản PDF biểu mẫu đã điền. Mọi thao tác đều yêu cầu mã truy cập, mã chỉ được giữ trong `sessionStorage` của trình duyệt. Đây là quản lý phiên hỗ trợ, không phải thao tác cấp giấy khai sinh chính thức.

Backend nhận ghi âm tại `POST /intake/audio` và chuyển giọng nói tiếng Việt thành chữ bằng model cấu hình qua `OPENAI_TRANSCRIPTION_MODEL`. File audio chỉ được xử lý trong request, không được lưu vào cơ sở dữ liệu.

## Quy ước case

`session_cases` là nguồn sự thật cho toàn bộ case của phiên. Dòng `is_primary=true` chỉ định badge/tiêu đề chính. `sessions.case_id` là bản sao chỉ đọc do trigger PostgreSQL đồng bộ; code ứng dụng chỉ ghi qua `session_cases`.

Checklist và validation rule là hợp của dữ liệu chung (`case_id IS NULL`) với mọi case trong `session_cases`. Giấy tờ trùng tên sau khi chuẩn hóa chữ hoa/thường và khoảng trắng được gộp thành một dòng, giữ toàn bộ căn cứ pháp lý.

## Kiểm thử

```bash
cd backend
pytest
```

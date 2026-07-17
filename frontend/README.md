# AI hướng dẫn đăng ký khai sinh

Frontend Next.js + TypeScript kết nối backend FastAPI tại `VITE_API_BASE_URL`.

## Chạy frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Mở `http://localhost:3000`.

Cổng quản lý phiên dành cho cán bộ ở `http://localhost:3000/admin`: xem, cập nhật, xóa phiên và xem hoặc tải PDF biểu mẫu đã điền. Phiên mới chỉ phát sinh từ luồng hướng dẫn của người dân. Backend phải có `ADMIN_API_KEY` trong `backend/.env.local`; mã truy cập không được đóng gói vào frontend và chỉ được giữ trong `sessionStorage`. Các thao tác này quản lý phiên hỗ trợ, không thay thế quy trình cấp giấy khai sinh chính thức.

Trong màn hình trao đổi, chọn **Bấm để nói** và cấp quyền micro. Ghi âm tối đa 90 giây; hệ thống tự chuyển thành chữ để người dùng nghe lại, đọc và sửa trước khi gửi. File ghi âm không được lưu trong phiên.

## Build và kiểm thử

```bash
npm test
npm run build
npm start
```

## Chạy backend local

```bash
cd ../backend
docker compose up -d
source .venv/bin/activate
alembic upgrade head
uvicorn app.main:app --reload
```

Backend chạy tại `http://localhost:8000`; OpenAPI tại `http://localhost:8000/openapi.json`.

# Hướng dẫn vận hành

## Khởi động

Chạy `docker compose --env-file .env -f infrastructure/compose.yaml up -d --build`.

## Kiểm tra container

Chạy `docker compose --env-file .env -f infrastructure/compose.yaml ps`.

Các service phải ở trạng thái `Up` hoặc `healthy`.

## Kiểm tra API

Gửi `GET http://localhost:3000/api/health`.

Kết quả phải có `status` bằng `ok`.

## Xem log

Xem toàn bộ log bằng `docker compose --env-file .env -f infrastructure/compose.yaml logs --tail 100`.

Xem log Order Service bằng `docker compose --env-file .env -f infrastructure/compose.yaml logs --tail 100 order-service`.

## Khởi động lại service

Chạy `docker compose --env-file .env -f infrastructure/compose.yaml restart api-gateway`.

## Dừng hệ thống

Chạy `docker compose --env-file .env -f infrastructure/compose.yaml down`.

Lệnh trên không xóa dữ liệu trong Docker volumes.

## Bảo mật

- Không commit `.env`.
- Không lưu mật khẩu hoặc JWT secret trong tài liệu.
- Không chia sẻ access token.
- Đổi toàn bộ mật khẩu mẫu trước khi chạy.

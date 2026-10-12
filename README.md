# Ecommerce MVP Backend

Backend RESTful API thương mại điện tử MVP xây dựng bằng Node.js, NestJS, Microservices, DDD và Database-per-Service.

## Chức năng

- Đăng ký và đăng nhập
- JWT authentication và phân quyền
- Quản lý khách hàng và hạng thành viên
- Quản lý sản phẩm và tồn kho
- Đặt hàng và tính discount
- Lưu Order và OrderDetail
- Tạo Shipment qua Kafka
- Cập nhật trạng thái giao hàng
- Redis cache và rate limiting
- Health check và Docker Compose

## Microservices

| Service          | Database   |  Port |
| ---------------- | ---------- | ----: |
| API Gateway      | Redis      |  3000 |
| Auth Service     | PostgreSQL | 50051 |
| Customer Service | PostgreSQL | 50052 |
| Product Service  | MongoDB    | 50053 |
| Order Service    | PostgreSQL | 50054 |
| Shipment Service | MongoDB    | 50055 |

Các service giao tiếp đồng bộ bằng gRPC. Order Service gửi sự kiện OrderCreated qua Kafka để Shipment Service tạo vận đơn.

## Chạy hệ thống

1. Sao chép `.env.example` thành `.env`.
2. Thay các mật khẩu mẫu trong `.env`.
3. Chạy `docker compose --env-file .env -f infrastructure/compose.yaml up -d --build`.
4. Kiểm tra `http://localhost:3000/api/health`.

## Kiểm thử bằng Postman

Base URL: `http://localhost:3000/api`

Các API được bảo vệ sử dụng Bearer Token nhận từ `/api/auth/login`.

Các nhóm API chính:

- `/api/auth`
- `/api/customers`
- `/api/memberships`
- `/api/products`
- `/api/orders`
- `/api/shipments`
- `/api/health`

## Kiểm thử tự động

Chạy `npm run build:all` để build toàn bộ service.

Chạy `npm run test:all` để chạy unit test.

Script `scripts/full-stack-e2e.ps1` dùng để kiểm thử tự động toàn bộ luồng nghiệp vụ.

## Tài liệu

- [Kiến trúc hệ thống](docs/architecture.md)
- [REST API](docs/api-reference.md)
- [Hướng dẫn vận hành](docs/runbook.md)

## Bảo mật

Không commit file `.env`, JWT secret, mật khẩu hoặc access token lên Git.

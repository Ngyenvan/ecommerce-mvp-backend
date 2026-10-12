# Kiến trúc hệ thống

## Tổng quan

Hệ thống sử dụng Microservices, Domain-Driven Design và Database-per-Service.

Client gửi REST API đến API Gateway. Gateway xác thực JWT, phân quyền, giới hạn tốc độ và chuyển tiếp yêu cầu đến các microservice bằng gRPC.

## Các service

| Service          | Trách nhiệm                       | Database   |
| ---------------- | --------------------------------- | ---------- |
| Auth Service     | Tài khoản, đăng nhập và vai trò   | PostgreSQL |
| Customer Service | Khách hàng, score và membership   | PostgreSQL |
| Product Service  | Sản phẩm và tồn kho               | MongoDB    |
| Order Service    | Đơn hàng, discount và OrderDetail | PostgreSQL |
| Shipment Service | Vận đơn và trạng thái giao hàng   | MongoDB    |

## Giao tiếp

- Client và API Gateway: REST/JSON.
- API Gateway và microservices: gRPC đồng bộ.
- Order Service và Shipment Service: Kafka bất đồng bộ.
- API Gateway sử dụng Redis cho cache và rate limiting.

## Luồng đặt hàng

1. Customer gửi yêu cầu đặt hàng.
2. Gateway xác thực JWT.
3. Order Service lấy score và membership.
4. Product Service kiểm tra tồn kho.
5. Order Service tính discount.
6. Order và OrderDetail được lưu.
7. Sự kiện OrderCreated được gửi qua Kafka.
8. Shipment Service nhận sự kiện và tạo Shipment.

# REST API Reference

Base URL: `http://localhost:3000/api`

Các API được bảo vệ sử dụng header `Authorization: Bearer <accessToken>`.

## Authentication

| Method | Endpoint         | Quyền        |
| ------ | ---------------- | ------------ |
| POST   | `/auth/register` | Public       |
| POST   | `/auth/login`    | Public       |
| GET    | `/auth/me`       | Đã đăng nhập |

## Customer và Membership

| Method | Endpoint                   | Quyền        |
| ------ | -------------------------- | ------------ |
| POST   | `/customers/me`            | Đã đăng nhập |
| GET    | `/customers/me`            | Đã đăng nhập |
| PATCH  | `/customers/me`            | Đã đăng nhập |
| GET    | `/customers/me/membership` | Đã đăng nhập |
| POST   | `/customers/:uid/score`    | ADMIN        |
| GET    | `/memberships`             | Public       |
| POST   | `/memberships`             | ADMIN        |
| PATCH  | `/memberships/:mid`        | ADMIN        |

## Product

| Method | Endpoint         | Quyền  |
| ------ | ---------------- | ------ |
| GET    | `/products`      | Public |
| GET    | `/products/:pid` | Public |
| POST   | `/products`      | ADMIN  |
| PATCH  | `/products/:pid` | ADMIN  |
| DELETE | `/products/:pid` | ADMIN  |

## Order

| Method | Endpoint                | Quyền              |
| ------ | ----------------------- | ------------------ |
| POST   | `/orders`               | Đã đăng nhập       |
| GET    | `/orders`               | Đã đăng nhập       |
| GET    | `/orders/:oid`          | Chủ đơn hoặc ADMIN |
| GET    | `/orders/:oid/shipment` | Chủ đơn hoặc ADMIN |

## Shipment

| Method | Endpoint                    | Quyền |
| ------ | --------------------------- | ----- |
| GET    | `/shipments`                | ADMIN |
| GET    | `/shipments/:shipid`        | ADMIN |
| PATCH  | `/shipments/:shipid/status` | ADMIN |

## Health check

| Method | Endpoint  | Quyền  |
| ------ | --------- | ------ |
| GET    | `/health` | Public |

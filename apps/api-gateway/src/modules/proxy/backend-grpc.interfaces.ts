import type { Observable } from 'rxjs';

export interface CustomerGrpcService {
  createCustomer(request: object): Observable<unknown>;
  getCustomer(request: object): Observable<unknown>;
  updateCustomer(request: object): Observable<unknown>;
  getCustomerMembership(request: object): Observable<unknown>;
  adjustCustomerScore(request: object): Observable<unknown>;
  listMembershipTiers(request: object): Observable<unknown>;
  createMembershipTier(request: object): Observable<unknown>;
  updateMembershipTier(request: object): Observable<unknown>;
}

export interface ProductResponse {
  product: {
    pid: number;
    pname: string;
    price: string;
    quantity: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  };
}

export interface ProductGrpcService {
  listProducts(request: object): Observable<unknown>;
  getProduct(request: object): Observable<ProductResponse>;
  createProduct(request: object): Observable<ProductResponse>;
  updateProduct(request: object): Observable<ProductResponse>;
  deleteProduct(request: object): Observable<unknown>;
}

export interface OrderGrpcService {
  createOrder(request: object): Observable<unknown>;
  listOrders(request: object): Observable<unknown>;
  getOrder(request: object): Observable<unknown>;
}

export interface ShipmentGrpcService {
  getShipment(request: object): Observable<unknown>;
  getShipmentByOrderId(request: object): Observable<unknown>;
  listShipments(request: object): Observable<unknown>;
  updateShipmentStatus(request: object): Observable<unknown>;
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';
import type { AuthUser } from '../auth/auth.types';
import {
  AdjustScoreDto,
  CreateCustomerDto,
  CreateMembershipDto,
  CreateOrderDto,
  CreateProductDto,
  ListOrdersQueryDto,
  ListProductsQueryDto,
  ListShipmentsQueryDto,
  UpdateCustomerDto,
  UpdateMembershipDto,
  UpdateProductDto,
  UpdateShipmentStatusDto,
} from './backend.dto';
import { BackendProxyService } from './backend-proxy.service';

@Controller()
export class BackendProxyController {
  constructor(private readonly backend: BackendProxyService) {}

  @Post('customers/me')
  createCustomer(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateCustomerDto,
  ) {
    return this.backend.createCustomer(user.uid, body);
  }

  @Get('customers/me')
  getCustomer(@CurrentUser() user: AuthUser) {
    return this.backend.getCustomer(user.uid);
  }

  @Patch('customers/me')
  updateCustomer(
    @CurrentUser() user: AuthUser,
    @Body() body: UpdateCustomerDto,
  ) {
    return this.backend.updateCustomer(user.uid, body);
  }

  @Get('customers/me/membership')
  getCustomerMembership(@CurrentUser() user: AuthUser) {
    return this.backend.getCustomerMembership(user.uid);
  }

  @Roles('ADMIN')
  @Post('customers/:uid/score')
  adjustScore(
    @Param('uid', ParseIntPipe) uid: number,
    @Body() body: AdjustScoreDto,
  ) {
    return this.backend.adjustCustomerScore(uid, body);
  }

  @Public()
  @Get('memberships')
  listMemberships() {
    return this.backend.listMemberships();
  }

  @Roles('ADMIN')
  @Post('memberships')
  createMembership(@Body() body: CreateMembershipDto) {
    return this.backend.createMembership(body);
  }

  @Roles('ADMIN')
  @Patch('memberships/:mid')
  updateMembership(
    @Param('mid', ParseIntPipe) mid: number,
    @Body() body: UpdateMembershipDto,
  ) {
    return this.backend.updateMembership(mid, body);
  }

  @Public()
  @Get('products')
  listProducts(@Query() query: ListProductsQueryDto) {
    return this.backend.listProducts(query);
  }

  @Public()
  @Get('products/:pid')
  getProduct(@Param('pid', ParseIntPipe) pid: number) {
    return this.backend.getProduct(pid);
  }

  @Roles('ADMIN')
  @Post('products')
  createProduct(@Body() body: CreateProductDto) {
    return this.backend.createProduct(body);
  }

  @Roles('ADMIN')
  @Patch('products/:pid')
  updateProduct(
    @Param('pid', ParseIntPipe) pid: number,
    @Body() body: UpdateProductDto,
  ) {
    return this.backend.updateProduct(pid, body);
  }

  @Roles('ADMIN')
  @Delete('products/:pid')
  deleteProduct(@Param('pid', ParseIntPipe) pid: number) {
    return this.backend.deleteProduct(pid);
  }

  @Post('orders')
  createOrder(@CurrentUser() user: AuthUser, @Body() body: CreateOrderDto) {
    return this.backend.createOrder(user.uid, body);
  }

  @Get('orders')
  listOrders(
    @CurrentUser() user: AuthUser,
    @Query() query: ListOrdersQueryDto,
  ) {
    return this.backend.listOrders(user.uid, user.role, query);
  }

  @Get('orders/:oid')
  getOrder(
    @CurrentUser() user: AuthUser,
    @Param('oid', ParseIntPipe) oid: number,
  ) {
    return this.backend.getOrder(oid, user.uid, user.role);
  }

  @Get('orders/:oid/shipment')
  async getOrderShipment(
    @CurrentUser() user: AuthUser,
    @Param('oid', ParseIntPipe) oid: number,
  ) {
    await this.backend.getOrder(oid, user.uid, user.role);

    return this.backend.getShipmentByOrderId(oid);
  }

  @Roles('ADMIN')
  @Get('shipments')
  listShipments(@Query() query: ListShipmentsQueryDto) {
    return this.backend.listShipments(query);
  }

  @Roles('ADMIN')
  @Get('shipments/:shipid')
  getShipment(@Param('shipid', ParseIntPipe) shipid: number) {
    return this.backend.getShipment(shipid);
  }

  @Roles('ADMIN')
  @Patch('shipments/:shipid/status')
  updateShipmentStatus(
    @CurrentUser() user: AuthUser,
    @Param('shipid', ParseIntPipe) shipid: number,
    @Body() body: UpdateShipmentStatusDto,
  ) {
    return this.backend.updateShipmentStatus(shipid, user.uid, body);
  }
}

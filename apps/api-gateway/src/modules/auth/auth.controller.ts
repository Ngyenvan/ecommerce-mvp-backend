import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { AuthGatewayService } from './auth-gateway.service';
import { CurrentUser } from './current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Public } from './public.decorator';
import type { AuthUser } from './auth.types';

@Controller('auth')
export class AuthController {
  constructor(private readonly authGateway: AuthGatewayService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() request: RegisterDto) {
    return this.authGateway.register(request);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() request: LoginDto) {
    return this.authGateway.login(request);
  }

  @Get('me')
  getCurrentUser(@CurrentUser() user: AuthUser) {
    return this.authGateway.getUser(user.uid);
  }
}

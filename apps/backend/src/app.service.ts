import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Privacy Runtime Auditor API - Initializing...';
  }
}

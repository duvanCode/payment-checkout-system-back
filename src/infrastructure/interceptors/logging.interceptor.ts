import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const { method, url, body } = request;

        console.log('\n📥 [INTERCEPTOR] Incoming Request');
        console.log('📥 [INTERCEPTOR] Method:', method);
        console.log('📥 [INTERCEPTOR] URL:', url);
        console.log('📥 [INTERCEPTOR] Body (raw):', JSON.stringify(body, null, 2));
        console.log('📥 [INTERCEPTOR] Body type:', typeof body);
        console.log('📥 [INTERCEPTOR] Body is Array?:', Array.isArray(body));

        if (body && body.items) {
            console.log('📥 [INTERCEPTOR] body.items:', body.items);
            console.log('📥 [INTERCEPTOR] body.items type:', typeof body.items);
            console.log('📥 [INTERCEPTOR] body.items is Array?:', Array.isArray(body.items));
            console.log('📥 [INTERCEPTOR] body.items length:', body.items?.length);
        }

        const now = Date.now();
        return next
            .handle()
            .pipe(
                tap(() => {
                    console.log(`📤 [INTERCEPTOR] Response sent after ${Date.now() - now}ms\n`);
                }),
            );
    }
}

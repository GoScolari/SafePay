import 'dotenv/config';
import { types } from 'pg';
// Tratar timestamp sin timezone como UTC para evitar conversiones incorrectas
types.setTypeParser(1114, (val: string) => new Date(val + 'Z'));
import { NestFactory, Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.use(cookieParser());

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const allowedOrigins =
    process.env.NODE_ENV === 'production'
      ? ['https://safepay.cl', 'https://www.safepay.cl', 'https://app.safepay.cl']
      : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:8081'];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`SafePay API corriendo en: http://localhost:${port}/api/v1`);
}
bootstrap();

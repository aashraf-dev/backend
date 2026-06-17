import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { AllExceptionsFilter } from './core/filters/all-exceptions.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const config = app.get(ConfigService);
  const isProduction = config.get<string>('app.nodeEnv') === 'production';

  // ── Security headers ─────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: isProduction,
      crossOriginEmbedderPolicy: isProduction,
      hsts: isProduction
        ? { maxAge: 31_536_000, includeSubDomains: true, preload: true }
        : false,
    }),
  );

  // ── CORS ─────────────────────────────────────────────────────────
  app.enableCors({
    origin: config.get<string[]>('app.corsOrigins'),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // ── Global prefix + versioning ───────────────────────────────────
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // ── Validation pipe (strips unknown fields, transforms types) ─────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip unknown properties
      forbidNonWhitelisted: true, // 400 on unknown properties
      transform: true, // Auto-transform to DTO types
      transformOptions: { enableImplicitConversion: true },
      stopAtFirstError: false, // Return all validation errors at once
    }),
  );

  // ── Global exception filter ───────────────────────────────────────
  app.useGlobalFilters(new AllExceptionsFilter());

  // ── Swagger (non-production only) ────────────────────────────────
  if (!isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Vetos Platform API')
      .setDescription('Multi-tenant veterinary SaaS — internal API docs')
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
      .addServer('http://localhost:3000', 'Local Dev')
      .build();

    SwaggerModule.setup(
      'api/docs',
      app,
      SwaggerModule.createDocument(app, swaggerConfig),
      { swaggerOptions: { persistAuthorization: true } },
    );
  }

  const port = config.get<number>('app.port') ?? 3000;
  await app.listen(port, '0.0.0.0');

  console.log(`\n🚀  Vetos API     →  http://localhost:${port}/api/v1`);
  if (!isProduction) {
    console.log(`📖  Swagger docs  →  http://localhost:${port}/api/docs\n`);
  }
}

bootstrap().catch(console.error);

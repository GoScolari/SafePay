# SafePay

Plataforma de pagos en custodia (escrow) C2C para Chile. Retiene el pago del comprador y lo libera al vendedor solo tras confirmar la entrega. Funciona sobre cualquier canal externo (Yapo, Facebook, WhatsApp) sin ser un marketplace.

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Backend | NestJS · TypeScript · TypeORM · PostgreSQL 15 |
| Mobile | React Native · Expo Router v6 · Zustand · React Query · Axios |
| Pagos | Mercado Pago Marketplace API (Split Payments) |
| Infra | AWS ECS Fargate · RDS · S3 · Secrets Manager · Docker · GitHub Actions |

## Estado del proyecto

| Fase | Estado |
|---|---|
| Backend — 9 módulos + 8 entidades | ✅ Implementado |
| Fase 1 — Smoke test backend (19/19 tests) | ✅ Cerrada (2026-05-08) |
| Mobile — Expo Router v6 | 🔄 En desarrollo |
| Fase 2 — Integración mobile ↔ backend | ⏳ Pendiente |

## Estructura del proyecto

```
SafePay/
├── docs/               # Especificaciones de arquitectura y producto
├── backend/            # API NestJS (implementada)
├── mobile/             # App Expo (en desarrollo)
└── tests/              # Resultados y colecciones de smoke tests
    └── fase1/          # results.md + smoke-tests.http
```

### Módulos backend (NestJS)

- **AuthModule** — registro, login, OTP SMS via Twilio, JWT (access 15min + refresh 30d HTTP-only cookie)
- **UsersModule** — perfil, validación RUT, OAuth Mercado Pago
- **TransactionsModule** — ciclo de vida completo, máquina de 10 estados
- **PaymentsModule** — checkout MP, webhooks HMAC-SHA256, retención/liberación/reembolso
- **FilesModule** — upload S3, URLs firmadas (1h, privadas)
- **ShippingModule** — tracking Chilexpress (polling 2h) + BlueExpress (webhook)
- **DisputesModule** — apertura, respuesta, resolución automática con cron jobs
- **NotificationsModule** — push FCM + historial en DB
- **AdminModule** — backoffice `/admin/*` protegido con `RolesGuard` rol `admin`

## Setup local

### Requisitos

- Node 20+
- Docker Desktop (para PostgreSQL)

### Backend

```bash
cd backend
cp .env.example .env      # completar las variables críticas (ver sección abajo)
npm install
docker compose up -d      # levanta PostgreSQL en puerto 5433
npm run start:dev
```

La API queda disponible en `http://localhost:3000/api/v1`.  
Health check: `GET /api/v1/health` → `{ "status": "ok", "db": "connected" }`.

> **Teléfonos de test:** usar números chilenos reales del rango `93x`–`99x`.  
> Ejemplo vendedor: `+56931234567` · Ejemplo comprador: `+56987654321`

### Mobile

```bash
cd mobile
npm install
npx expo start
```

En dispositivo físico configurar `EXPO_PUBLIC_API_URL` con la IP LAN del PC (no `localhost`).

## Documentación

| Documento | Descripción |
|---|---|
| [01 — Concepto de producto](docs/01-concepto-producto-v1.md) | Flujos de negocio, estados de transacción, modelo de cobro |
| [02 — Arquitectura backend](docs/02-arquitectura-backend-v1.md) | Módulos NestJS, endpoints, máquina de estados |
| [03 — Arquitectura mobile](docs/03-arquitectura-mobile-v1.md) | Estructura Expo Router, pantallas, stores Zustand |
| [04 — Integraciones](docs/04-integraciones-v1.md) | Mercado Pago, couriers, Twilio, FCM |
| [05 — Modelo de datos](docs/05-modelo-datos-v1.md) | Esquema PostgreSQL completo — 8 tablas, 13 enums |
| [06 — Flujo de disputas](docs/06-flujo-disputas-v1.md) | Plazos, criterios de resolución, cron jobs |
| [07 — Guía de despliegue](docs/07-guia-despliegue-v1.md) | Docker, GitHub Actions, AWS ECS/RDS/S3 |
| [08 — Checklist backend](docs/08-checklist-backend-v1.md) | Estado de implementación por módulo |
| [10 — Smoke test Fase 1](docs/10-fase1-smoke-test-backend-v1.md) | Protocolo de pruebas y resultados de ejecución |

## Variables de entorno

Ver `backend/.env.example`. En producción los secretos se gestionan via AWS Secrets Manager.

Variables críticas: `JWT_SECRET`, `JWT_REFRESH_SECRET`, `MP_APP_ID`, `MP_CLIENT_SECRET`, `MP_WEBHOOK_SECRET`, `TWILIO_SERVICE_SID`, `AWS_S3_BUCKET`, `FIREBASE_KEY`.

El backend valida las variables al arranque con Joi: en `NODE_ENV=production` las vars JWT y MP son obligatorias y el proceso termina con exit 1 si alguna falta.

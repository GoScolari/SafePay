# SafePay

Plataforma de pagos en custodia (escrow) C2C para Chile. Retiene el pago del comprador y lo libera al vendedor solo tras confirmar la entrega. Funciona sobre cualquier canal externo (Yapo, Facebook, WhatsApp) sin ser un marketplace.

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Backend | NestJS · TypeScript · TypeORM · PostgreSQL 15 |
| Mobile | React Native · Expo Router v3 · Zustand · React Query · Axios |
| Pagos | Mercado Pago Marketplace API (Split Payments) |
| Infra | AWS ECS Fargate · RDS · S3 · Secrets Manager · Docker · GitHub Actions |

## Estructura del proyecto

```
SafePay/
├── docs/               # Especificaciones de arquitectura y producto
├── backend/            # API NestJS (por implementar)
└── mobile/             # App Expo (por implementar)
```

### Módulos backend (NestJS)

- **AuthModule** — registro, login, OTP SMS, JWT
- **UsersModule** — perfil, validación RUT, OAuth Mercado Pago
- **TransactionsModule** — ciclo de vida completo, máquina de 10 estados
- **PaymentsModule** — checkout MP, webhooks, retención/liberación/reembolso
- **FilesModule** — upload S3, URLs firmadas
- **ShippingModule** — tracking Chilexpress + BlueExpress
- **DisputesModule** — apertura, respuesta, resolución automática
- **NotificationsModule** — push FCM + SMS

## Setup local

> El código aún no está implementado. Las instrucciones se agregarán aquí una vez que existan los directorios `backend/` y `mobile/`.

```bash
# Backend (próximamente)
cd backend
cp .env.example .env   # completar variables críticas
npm install
npm run start:dev

# Mobile (próximamente)
cd mobile
npm install
npx expo start
```

## Documentación

| Documento | Descripción |
|---|---|
| [01 — Concepto de producto](docs/01-concepto-producto.md) | Flujos de negocio, estados de transacción, modelo de cobro |
| [02 — Arquitectura backend](docs/02-arquitectura-backend.md) | Módulos NestJS, endpoints, máquina de estados |
| [03 — Arquitectura mobile](docs/03-arquitectura-mobile.md) | Estructura Expo Router, pantallas, stores Zustand |
| [04 — Integraciones](docs/04-integraciones.md) | Mercado Pago, couriers, Twilio, FCM |
| [05 — Modelo de datos](docs/05-modelo-datos.md) | Esquema PostgreSQL completo — 8 tablas, 8+ enums |
| [06 — Flujo de disputas](docs/06-flujo-disputas.md) | Plazos, criterios de resolución, cron jobs |
| [07 — Guía de despliegue](docs/07-guia-despliegue.md) | Docker, GitHub Actions, AWS ECS/RDS/S3 |

## Variables de entorno

Ver `.env.example` en `backend/`. En producción los secretos se gestionan via AWS Secrets Manager.

Variables críticas: `JWT_SECRET`, `JWT_REFRESH_SECRET`, `MP_APP_ID`, `MP_CLIENT_SECRET`, `MP_WEBHOOK_SECRET`, `TWILIO_SERVICE_SID`, `AWS_S3_BUCKET`, `FIREBASE_KEY`.

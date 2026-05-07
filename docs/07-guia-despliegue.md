# SafePay — Guía de Despliegue

**Infraestructura:** AWS · GitHub Actions · Docker · 3 entornos  
**Versión:** 1.0 · **Fecha:** Mayo 2026 · **Tipo:** Documento técnico interno

---

## 01. Entornos de Despliegue

### Development — `localhost:3000`

| Parámetro | Valor |
|---|---|
| Rama git | `feature/*` → `develop` |
| Base de datos | PostgreSQL local (Docker) |
| Puerto PostgreSQL (host) | `5433` → mapeado al `5432` interno del contenedor |
| Pagos MP | Sandbox (cuentas de prueba) |
| SMS Twilio | Números de prueba |
| Push FCM | Proyecto Firebase dev |
| Deploy | Manual (`npm run start:dev`) |

### Staging — `staging-api.safepay.cl`

| Parámetro | Valor |
|---|---|
| Rama git | `develop` → `staging` |
| Base de datos | RDS PostgreSQL (instancia pequeña) |
| Pagos MP | Sandbox (datos reales de prueba) |
| SMS Twilio | Cuenta real limitada |
| Push FCM | Proyecto Firebase staging |
| Deploy | GitHub Actions automático |

### Production — `api.safepay.cl`

| Parámetro | Valor |
|---|---|
| Rama git | `main` (tags `vX.X.X`) |
| Base de datos | RDS PostgreSQL (Multi-AZ) |
| Pagos MP | Producción real |
| SMS Twilio | Cuenta producción |
| Push FCM | Proyecto Firebase prod |
| Deploy | GitHub Actions (aprobación manual requerida) |

> **Nunca usar credenciales de producción de Mercado Pago en desarrollo o staging.** Cada entorno debe tener su propio conjunto de variables de entorno aisladas.

---

## 02. Infraestructura AWS — Producción

### Backend (NestJS) — AWS ECS Fargate

| Parámetro | Valor |
|---|---|
| Servicio | AWS ECS Fargate |
| Imagen | Docker (almacenada en ECR) |
| CPU / RAM | 0.5 vCPU / 1GB (MVP) |
| Réplicas | Min 1 / Max 3 (auto-scaling) |
| Puerto interno | 3000 |
| Health check | `GET /health` cada 30s |

### Base de datos — AWS RDS PostgreSQL 15

| Parámetro | Valor |
|---|---|
| Instancia | db.t3.micro (MVP) |
| Storage | 20GB SSD GP3 |
| Multi-AZ | Sí (producción) |
| Backups | Automáticos, retención 7 días |
| Acceso | Solo desde VPC privada |

### Load Balancer — AWS ALB

| Parámetro | Valor |
|---|---|
| SSL/TLS | ACM Certificate (HTTPS) |
| Dominio API | `api.safepay.cl` |
| Dominio links | `safepay.cl/tx/:slug` |
| HTTP → HTTPS | Redirect automático |

### Almacenamiento — AWS S3

| Parámetro | Valor |
|---|---|
| Bucket | `safepay-files-prod` |
| Acceso | Privado (solo URLs firmadas) |
| Versionado | Habilitado |
| Lifecycle | Mover a Glacier después de 1 año |

### Secretos — AWS Secrets Manager

| Parámetro | Valor |
|---|---|
| Variables | DB, JWT, MP, Twilio, FCM |
| Rotación | Automática (DB password) |
| Acceso | IAM Role del task ECS |

### Red — VPC Dedicada

| Parámetro | Valor |
|---|---|
| Subnets públicas | ALB, NAT Gateway |
| Subnets privadas | ECS Tasks, RDS |
| Security Groups | Solo puerto 443 expuesto |
| Región | `us-east-1` (o `sa-east-1`) |

---

## 03. Dockerización del Backend

### Dockerfile (multi-stage)

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# Usuario no-root por seguridad
RUN addgroup -S safepay && adduser -S safepay -G safepay
USER safepay

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "dist/main.js"]
```

### docker-compose.yml — Entorno local de desarrollo

```yaml
version: '3.9'
services:
  api:
    build: .
    ports: ["3000:3000"]
    environment:
      DB_HOST: postgres
      NODE_ENV: development
    depends_on: [postgres, redis]
    volumes: ["./src:/app/src"]    # hot reload en dev

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: safepay_dev
      POSTGRES_USER: safepay
      POSTGRES_PASSWORD: "${DB_PASS}"
    ports: ["5433:5432"]    # 5433 en host — ver nota sobre conflicto de puertos en Windows
    volumes: ["postgres_data:/var/lib/postgresql/data"]

  redis:
    image: redis:7-alpine    # para rate limiting y cron jobs
    ports: ["6379:6379"]

volumes:
  postgres_data:
```

### ⚠️ Conflicto de puertos en Windows

Si tenés PostgreSQL instalado nativamente en Windows, el puerto `5432` del host ya está ocupado. El `docker-compose.yml` mapea el contenedor al puerto **`5433`** para evitar el conflicto. En ese caso `DB_PORT=5433` en el `.env`.

Para verificar si este es tu caso:

```powershell
netstat -ano | findstr ":5432"
# Si aparece una línea con postgres.exe, tenés Postgres nativo corriendo
```

```powershell
# Identificar el proceso por PID
tasklist /FI "PID eq <PID_ENCONTRADO>"
```

Si el proceso es `postgres.exe` (no `com.docker.backend.exe`), usá `DB_PORT=5433`.

---

## 04. Pipeline CI/CD — GitHub Actions

### Etapas del pipeline

**01 — Lint & Type Check** *(en cada push y PR)*
```
eslint --fix-dry-run
tsc --noEmit
prettier --check
```

**02 — Tests** *(requiere ≥80% coverage para continuar)*
```
jest --unit
jest --integration
coverage report
```

**03 — Build Docker Image**
```
docker build
docker push ECR
tag: sha-{commit}
```

**04 — Deploy Staging** *(automático al hacer merge a develop)*
```
typeorm migration:run
ecs update-service
smoke tests
```

**05 — Deploy Producción** *(requiere aprobación manual en GitHub)*
```
Aprobación manual
migration:run prod
blue/green deploy
rollback automático si falla health check
```

### Workflow GitHub Actions — Deploy Staging

```yaml
# .github/workflows/deploy-staging.yml
name: Deploy Staging
on:
  push:
    branches: [develop]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Build and push Docker image
        run: |
          aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_REGISTRY
          docker build -t safepay-api:${{ github.sha }} .
          docker push $ECR_REGISTRY/safepay-api:${{ github.sha }}

      - name: Run migrations
        run: |
          aws ecs run-task --cluster safepay-staging \
            --task-definition safepay-migrations \
            --overrides '{"containerOverrides":[{"name":"api","command":["npm","run","migration:run"]}]}'

      - name: Update ECS service
        run: |
          aws ecs update-service \
            --cluster safepay-staging \
            --service safepay-api \
            --force-new-deployment
```

---

## 05. Monitoreo y Observabilidad

### Métricas — AWS CloudWatch
- CPU y memoria ECS tasks
- Latencia del ALB (p50, p95, p99)
- Conexiones activas RDS
- Requests por minuto
- Errores 4xx y 5xx

### Logs — CloudWatch Logs
- Logs estructurados JSON (winston)
- Nivel: error, warn, info
- Retención: 30 días
- Búsqueda por `transaction_id`

### Alertas — CloudWatch Alarms
- Error rate > 5% → alerta inmediata
- Latencia p99 > 2s → alerta
- CPU > 80% → escalar automáticamente
- RDS storage > 80% → alerta

### Health Checks — ALB
- `GET /health` cada 30s
- Verifica conexión a DB
- Verifica MP API accesible
- Task unhealthy → reemplazada automáticamente

### Uptime externo — UptimeRobot (gratuito)
- Monitor cada 5 minutos
- Alerta si cae más de 1 minuto
- Dashboard público de status

---

## 06. Checklist Antes de ir a Producción

### 🔴 Bloqueantes (no ir a prod sin estos)

**Seguridad**
- [ ] Variables de entorno cargadas desde Secrets Manager, no hardcodeadas
- [ ] HTTPS forzado en ALB (redirect HTTP → HTTPS)
- [ ] CORS configurado solo para dominios `safepay.cl`
- [ ] Rate limiting activo en todas las rutas públicas

**Mercado Pago**
- [ ] Cuenta marketplace aprobada por MP con Split Payments activo
- [ ] Webhook URL registrado en panel MP (`api.safepay.cl/payments/webhook`)
- [ ] Validación HMAC de webhooks activa y probada en producción

**Infraestructura**
- [ ] Backups RDS configurados y restore probado
- [ ] Migraciones DB ejecutadas y verificadas en staging primero

**Legal**
- [ ] Términos y condiciones publicados en `safepay.cl/terms`
- [ ] Política de privacidad publicada (cumple Ley 19.628 Chile)
- [ ] Política de disputas publicada y accesible desde la app

### 🟡 Importantes (resolver en primeras semanas post-lanzamiento)
- [ ] JWT secret con al menos 256 bits de entropía
- [ ] RDS no expuesto a internet (solo desde VPC)
- [ ] S3 bucket configurado como privado
- [ ] Alarmas CloudWatch configuradas y probadas
- [ ] Certificado SSL válido (ACM)
- [ ] Rollback automático configurado en ECS
- [ ] Flujo de pago completo testeado en sandbox
- [ ] Empresa constituida como SpA en Chile
- [ ] Consulta legal sobre operación como marketplace MP

---

## 07. Estimación de Costos de Infraestructura (USD mensuales)

| Servicio | Configuración | MVP (0–500 tx/mes) | Escala (5.000+ tx/mes) |
|---|---|---|---|
| AWS ECS Fargate | 0.5 vCPU / 1GB × 1 tarea | ~$15 | ~$60 |
| AWS RDS PostgreSQL | db.t3.micro, 20GB SSD | ~$25 | ~$80 |
| AWS ALB | Application Load Balancer | ~$20 | ~$25 |
| AWS S3 | Fotos transacciones | ~$2 | ~$15 |
| AWS ECR | Imágenes Docker | ~$1 | ~$2 |
| AWS Secrets Manager | ~10 secretos | ~$1 | ~$2 |
| Dominio + Route53 | SSL gratuito (ACM) | ~$1 | ~$1 |
| Twilio SMS | ~100 SMS/mes | ~$1 | ~$8 |
| Firebase FCM | Push notifications | $0 | $0 |
| UptimeRobot | Plan gratuito | $0 | $0 |
| **Total** | | **~$66 USD/mes** | **~$193 USD/mes** |

> El costo de infraestructura del MVP (~USD 66/mes ≈ $65.000 CLP) se cubre con apenas **66 transacciones mensuales** de $990 CLP de comisión. El punto de equilibrio de infraestructura es muy bajo.

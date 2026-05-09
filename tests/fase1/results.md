# Fase 1 — Resultados Smoke Test Backend

**Fecha de ejecución:** 2026-05-08 / 2026-05-09
**Ejecutado por:** Gonzalo Scolari + Claude Code
**Branch:** dev-gonzalo
**Commit:** 5b7b462

## Entorno

- SO: Windows 11 Pro 10.0.26200
- Node: 20.14.0
- Docker: Docker Desktop (último)
- Postgres: 15.17 (Alpine)
- Puerto DB: 5433

---

## Resumen

| # | Test | Resultado | Notas |
|---|------|-----------|-------|
| T1 | Health check | ✅ | `{ status: "ok", db: "connected" }` |
| T2 | Register vendedor | ✅ | Requiere número chileno 93x-99x. +56911111111 falla (rango no asignado) |
| T3 | Verify OTP vendedor | ✅ | JWT emitido correctamente. Modo dev acepta cualquier código |
| T4 | Get me (vendedor) | ✅ | Guard JWT funciona. Sin token → 401 ✓ |
| T5 | Register comprador | ✅ | |
| T6 | Verify OTP comprador | ✅ | |
| T7 | Crear transacción ($80k → fee $990) | ✅ | status=PROPUESTA, fee=990, slug asignado, expiresAt=+24h |
| T7b | Fee regresión ($250k → $1490) | ✅ | Fee calculado correctamente por tramo |
| T8 | Lookup público por slug | ✅ | Sin auth, campos públicos correctos, sin datos sensibles |
| T9 | Aceptar transacción | ✅⚠️ | status=CONFIRMADA, acceptedAt correcto. Ver Bug #1 y #2 |
| T9b | Auto-aceptar bloqueado | ✅ | HTTP 403 "El iniciador no puede ser la contraparte" |
| T9c | Re-aceptar bloqueado | ✅ | HTTP 400 "Solo se puede aceptar en estado PROPUESTA" |
| T10 | Listar mis tx (vendedor) | ✅ | Ve 3 tx (2 creadas + 1 aceptada) |
| T10b | Listar mis tx (comprador) | ✅ | Ve 1 tx (la aceptada). No ve las del vendedor ✓ |
| N1 | Monto < $1.000 → 400 | ✅ | HTTP 400 "amount must not be less than 1000" |
| N2 | Monto > $2.000.000 → 400 | ✅ | HTTP 400 "amount must not be greater than 2000000" |
| N3 | Token inválido → 401 | ✅ | HTTP 401 |
| N4 | Teléfono duplicado → 409 | ✅ | HTTP 409 "El teléfono ya está registrado" |
| N5 | Webhook sin HMAC → 401 | ✅⚠️ | Requiere `MP_WEBHOOK_SECRET` configurado en `.env`. Sin el secret, skip silencioso. Ver Bug #3 |

---

## Bugs encontrados

### Bug #1 — counterpartId null en response de accept (no crítico)
- **Test:** T9
- **Severidad:** baja
- **Reproducción:** `POST /transactions/:id/accept` → response.counterpartId = null
- **Esperado:** response.counterpartId = UUID del usuario que aceptó
- **Causa:** `txRepo.save(tx)` de TypeORM no refresca la relación en memoria tras el save
- **Dato real:** La DB sí guarda correctamente el `counterpart_id`. Solo es cosmético en el response.
- **Fix:** Agregar `return this.txRepo.findOne({ where: { id }, relations: [...] })` después del save

### Bug #2 — refreshToken y mpAccessToken expuestos en response de accept (CRÍTICO seguridad)
- **Test:** T9
- **Severidad:** crítica
- **Reproducción:** `POST /transactions/:id/accept` → response.initiator contiene `refreshToken` y `mpAccessToken`
- **Esperado:** Esos campos no deben aparecer jamás en ningún response de la API
- **Causa:** La entidad `User` se devuelve sin exclude de campos sensibles. `findById` carga `relations: ['initiator', ...]` y los serializa completos.
- **Fix:** Agregar `@Exclude()` de `class-transformer` a los campos `refreshToken`, `mpAccessToken`, `password` en la entidad `User`, y usar `ClassSerializerInterceptor` globalmente. O mapear a un DTO de salida antes de devolver.

### Bug #3 — Webhook acepta requests sin HMAC si MP_WEBHOOK_SECRET está vacío (alta — configuración)
- **Test:** N5
- **Severidad:** alta (en producción sería crítica)
- **Reproducción:** Con `.env` sin `MP_WEBHOOK_SECRET`, cualquier POST a `/payments/webhook` devuelve 200
- **Esperado:** En producción debe rechazar. En dev es aceptable con log de warning.
- **Causa:** El código hace `if (this.mpWebhookSecret)` — skip correcto en dev, peligroso si se despliega sin el secret
- **Fix:** La lógica del código es correcta. El fix es asegurarse que el deploy de producción tenga `MP_WEBHOOK_SECRET` en secrets manager. Agregar validación al arranque que rompa si `NODE_ENV=production` y `MP_WEBHOOK_SECRET` está vacío.

---

## Observaciones adicionales

- **Validación de teléfono**: `@IsPhoneNumber()` usa `libphonenumber-js/max` que valida rangos reales. En Chile solo acepta prefijos 93x–99x. Los números de test del doc 10 (+56911111111, +56922222222) son inválidos — usar +56931234567 y +56987654321.
- **Tokens JWT expiran en 15m**: Durante los tests se necesita re-autenticar si pasa más tiempo entre comandos.
- **counterpart en T10b**: El comprador ve tx-9fd12568 a través de la columna `counterpart_id` en DB (guardada correctamente), aunque el response de T9 la mostraba null.

---

## Decisión

- [ ] ✅ Fase 1 aprobada — pasar a Fase 2 (integración mobile)
- [x] ⚠️ Fase 1 aprobada con observaciones — Bug #2 (refreshToken expuesto) debe corregirse antes de Fase 2
- [ ] ❌ Fase 1 reprobada — bugs críticos detectados, corregir antes de seguir

**Criterio:** T1–T10 + N1–N5 pasaron todos. La API arranca limpia, la DB conecta, el ciclo de transacción funciona end-to-end. El Bug #2 (exposición de refreshToken) debe corregirse antes de integrar el mobile — es un leak de seguridad real aunque solo afecte el response de un endpoint.

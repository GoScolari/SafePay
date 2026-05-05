# SafePay — Flujo de Disputas

**Versión:** 1.0 · **Fecha:** Mayo 2026 · **Tipo:** Documento técnico interno

---

## 01. Principios del Sistema de Disputas

### Plazos definidos

| Evento | Plazo |
|---|---|
| Ventana para disputar tras entrega | 48 hrs |
| Respuesta del vendedor tras apertura | 48 hrs |
| Decisión del comprador tras respuesta | 24 hrs |
| Resolución por moderación SafePay | 72 hrs |
| Sin respuesta → fallo automático | Al vencer cada plazo |

### Evidencia requerida

| Parte | Qué debe presentar | Mínimo |
|---|---|---|
| Comprador | Fotos de lo recibido | 1 foto obligatoria |
| Vendedor | Fotos del producto enviado | Recomendado (ya existen en publicación) |
| Ambos | Descripción del problema / defensa | Texto descriptivo |

### Reglas base

- Solo el **comprador** puede abrir una disputa
- Solo se puede disputar en estado **ENTREGADO**
- Máximo **1 disputa activa** por transacción (UNIQUE en DB)
- El pago queda **congelado** en MP mientras dura la disputa

---

## 02. Flujo Completo de una Disputa

```
Tx ENTREGADO
  → Comprador abre disputa (dentro de 48 hrs)
  → Tx → EN_DISPUTA
  → Pago congelado en MP
  → Notificar vendedor

  → Vendedor responde (dentro de 48 hrs)
  → dispute.status → responded

  ¿Acuerdo entre partes?
  ├── SÍ → Resolución pactada → Ejecutar pago / reembolso
  └── NO → Moderación SafePay (72 hrs)
              → Fallo: comprador / vendedor / split
              → Ejecutar acción en MP
              → Notificar a ambas partes
```

---

## 03. Timeline Detallado con Plazos

### T+0 — Producto entregado *(Sistema automático)*
Courier confirma entrega. Tx pasa a `ENTREGADO`. Se abre ventana de 48 hrs.

- Push al comprador: *"Tu producto fue entregado. Tienes 48 hrs para confirmar."*
- `auto_release_at = NOW() + 48 hrs`

### T+0 → T+48hrs — Comprador abre disputa *(Comprador)*
Selecciona el motivo, describe el problema y adjunta al menos 1 foto.

- Tx → `EN_DISPUTA`
- Timer `auto_release_at` se cancela
- Se crea registro en tabla `disputes` (status: `open`)
- `respond_before = NOW() + 48 hrs`
- Push al vendedor: *"El comprador abrió una disputa. Tienes 48 hrs para responder."*

### T+48hrs máximo — Vendedor responde *(Vendedor)*
Lee la disputa, ve las fotos del comprador, adjunta su propia evidencia y versión.

- `dispute.status → responded`
- Si no responde antes de `respond_before` → **fallo automático a favor del comprador**
- Aviso push 12 hrs antes del vencimiento del plazo

### Tras respuesta — ¿Acuerdo entre partes? *(Ambas partes)*
Tras ver la respuesta del vendedor, el comprador puede aceptarla o escalar a moderación.

- Comprador tiene **24 hrs** para decidir
- Si no decide → escala automáticamente a moderación SafePay

### 72 hrs — Moderación SafePay *(Equipo SafePay)*
Un moderador revisa la evidencia fotográfica de ambas partes y emite un fallo justificado.

- Fallo a favor comprador → reembolso total via MP
- Fallo a favor vendedor → liberar pago via MP
- Fallo dividido → reembolso parcial
- `dispute.status → resolved`, `resolved_at = NOW()`

### Inmediato — Ejecución del fallo *(Sistema automático)*
El sistema ejecuta la acción en MP y notifica a ambas partes.

- Tx → `COMPLETADO` o `REEMBOLSADO`
- Push a ambas partes con resultado y nota del moderador
- Se habilita el sistema de calificación (ratings)

---

## 04. Motivos de Disputa

| Clave | Nombre | Descripción | Evidencia esperada |
|---|---|---|---|
| `not_received` | No recibí el producto | El courier marcó entregado pero no llegó | Foto del lugar de entrega |
| `not_as_described` | Diferente a lo publicado | No corresponde a lo descrito o fotografiado | Comparación fotos publicación vs recepción |
| `damaged` | Llegó dañado | Daños físicos no declarados en la publicación | Foto del daño específico (obligatoria) |
| `incomplete` | Producto incompleto | Faltan accesorios o partes declaradas incluidas | Foto del contenido recibido |
| `other` | Otro motivo | Situación no contemplada | Descripción mínima 50 chars |

> El motivo orienta al moderador pero **no determina el fallo automáticamente**. Siempre es la evidencia fotográfica la que pesa más en la resolución.

---

## 05. Criterios de Resolución

### Fallo a favor del comprador
- La foto de recepción muestra **diferencia clara y verificable** respecto a la foto de publicación
- El courier reporta entrega pero **no hay firma ni foto de entrega** del destinatario
- El vendedor **no respondió** dentro del plazo de 48 hrs
- La descripción del vendedor **no incluía información relevante** sobre el defecto reportado
- El vendedor **no subió fotos** del producto antes del envío

### Fallo a favor del vendedor
- Las fotos muestran **el mismo producto en igual condición**
- El defecto reportado estaba **explícitamente declarado** en la descripción de la publicación
- El courier tiene **registro de entrega con firma o foto**
- El comprador **no adjuntó fotos** que sustenten su reclamo
- El comprador **demoró más de 24 hrs** en reportar tras recibir (sospecha de uso)

### Fallo dividido (split)
Se aplica cuando la evidencia es ambigua o contradictoria. El moderador propone un reembolso parcial. **Siempre debe estar justificado** en la nota de resolución.

---

## 06. Tipos de Resolución y Ejecución

### → Fallo a favor del comprador
Reembolso total del monto pagado.

```typescript
// Acción en Mercado Pago
POST /v1/payments/:id/refunds
{ amount: totalAmount }

// Estado resultante
Tx → REEMBOLSADO
```

### → Fallo a favor del vendedor
Se libera el pago retenido a la cuenta del vendedor.

```typescript
// Acción en Mercado Pago
POST /v1/advanced_payments/:id/disbursements/release

// Estado resultante
Tx → COMPLETADO
```

### → Fallo dividido
Reembolso parcial al comprador + liberación del resto al vendedor.

```typescript
// Acción en Mercado Pago
POST /v1/payments/:id/refunds  { amount: partialAmount }
POST /v1/advanced_payments/:id/disbursements/release

// Estado resultante
Tx → COMPLETADO
```

---

## 07. Escenarios Comunes y Resolución Esperada

| Escenario | Evidencia comprador | Evidencia vendedor | Resolución |
|---|---|---|---|
| Producto completamente diferente | Foto clara del producto recibido | Foto de publicación | Moderación |
| Vendedor no responde en plazo | Cualquier evidencia | Sin respuesta | Comprador (automático) |
| Defecto declarado en publicación | Foto del defecto | Descripción con defecto mencionado | Vendedor |
| Producto dañado en envío | Foto del daño y empaque roto | Foto del empaque en buen estado al enviar | Comprador |
| Comprador sin fotos de recepción | Solo descripción, sin fotos | Fotos de publicación claras | Vendedor |
| Evidencia contradictoria | Fotos poco claras | Fotos del envío en buen estado | Split / Moderación |
| Courier reporta no entregado | No recibió el producto | Tracking muestra intentos | Comprador |

---

## 08. Fallos y Liberaciones Automáticas

### Sin disputa — Comprador no confirma ni disputa en 48 hrs
```
ENTREGADO + 48 hrs
  → Cron job verifica auto_release_at
  → POST /disbursements/release
  → Tx → COMPLETADO
```

### Disputa abierta — Vendedor no responde en 48 hrs
```
EN_DISPUTA + 48 hrs
  → Cron job verifica respond_before
  → POST /payments/:id/refunds
  → Tx → REEMBOLSADO
```

### Propuesta — Contraparte no acepta en 24 hrs
```
PROPUESTA + 24 hrs
  → Cron job verifica expires_at
  → Tx → EXPIRADO
  → Notificar al iniciador
```

### Implementación del cron job

```typescript
// disputes.scheduler.ts
@Cron('*/30 * * * *') // cada 30 minutos
async processExpiredDisputes() {
  // 1. Vendedores que no respondieron a tiempo
  const unanswered = await this.disputeRepo.find({
    where: { status: 'open', respond_before: LessThan(new Date()) }
  });
  for (const dispute of unanswered) {
    await this.resolveDispute(dispute.id, 'buyer', 'Vendedor no respondió en el plazo');
  }

  // 2. Transacciones entregadas sin confirmar ni disputar
  const autoRelease = await this.txRepo.find({
    where: { status: 'ENTREGADO', auto_release_at: LessThan(new Date()) }
  });
  for (const tx of autoRelease) {
    await this.paymentsService.releaseFunds(tx.id);
    await this.txService.updateStatus(tx.id, 'COMPLETADO');
  }
}
```

---

## 09. Notificaciones del Flujo de Disputas

| Evento | Destinatario | Canal | Mensaje |
|---|---|---|---|
| Disputa abierta | Vendedor | Push | "El comprador abrió una disputa. Tienes 48 hrs para responder." |
| 12 hrs para vencer plazo | Vendedor | Push + SMS | "Quedan 12 hrs para responder la disputa. Sin respuesta se fallará a favor del comprador." |
| Vendedor respondió | Comprador | Push | "El vendedor respondió a tu disputa. Revisa su respuesta y decide." |
| Escala a moderación | Ambos | Push | "Tu disputa fue escalada a moderación SafePay. Recibirás resolución en 72 hrs." |
| Fallo emitido | Ambos | Push + SMS | "SafePay resolvió tu disputa. [resultado]. Consulta los detalles en la app." |
| 12 hrs para auto-liberar | Comprador | Push | "El pago se liberará automáticamente en 12 hrs si no confirmas o disputas." |
| Fallo de entrega courier | Ambos | Push | "Hubo un problema con la entrega de tu paquete. El vendedor puede reintentar el envío o el comprador puede abrir una disputa." |

> Los eventos críticos (12 hrs para vencer, fallo emitido) usan **Push + SMS simultáneamente** para garantizar que el usuario sea notificado incluso sin la app abierta.

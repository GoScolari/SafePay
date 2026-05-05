# SafePay — Concepto de Producto

> Plataforma de transacciones seguras para ventas entre personas en Chile — sin marketplace, sin efectivo, sin riesgos.

**Versión:** 2.0 · **Fecha:** Mayo 2026 · **Tipo:** Documento interno

---

## El problema y la solución

**El problema hoy**

En ventas C2C fuera de Mercado Libre no existe protección. El comprador transfiere y arriesga perder su dinero si el vendedor desaparece. El vendedor despacha y arriesga no cobrar. La estafa en Yapo y Facebook Marketplace es el escenario más común y no tiene solución local.

**Lo que hace SafePay**

Actúa como árbitro neutral: retiene el pago del comprador, notifica al vendedor para que despache con seguridad, y libera el dinero solo cuando el producto es entregado y validado. Funciona sobre cualquier canal de contacto existente.

---

## ¿Quién puede iniciar una transacción?

SafePay no es un marketplace. Los usuarios se contactan donde quieran (Yapo, Facebook, Instagram) y usan SafePay solo para proteger el intercambio de dinero.

### Iniciada por el vendedor
1. Vendedor crea la transacción con precio y descripción
2. Genera link único → lo comparte por WhatsApp, Instagram, etc.
3. **Comprador paga** → flujo continúa normalmente

### Iniciada por el comprador
1. Comprador crea la propuesta con precio acordado y descripción
2. Vendedor recibe el link, **revisa y acepta** los términos
3. **Comprador paga** → flujo continúa normalmente

---

## Los cuatro flujos de transacción

### Flujo A — Envío por courier · Inicia el vendedor
1. Vendedor crea y sube fotos, descripción y precio. Genera link para compartir.
2. Comprador paga → dinero queda retenido. Vendedor recibe notificación.
3. Vendedor despacha → fotografía el producto empacado e ingresa número de tracking.
4. SafePay rastrea el paquete con Chilexpress / BlueExpress automáticamente.
5. Comprador confirma recepción → sube fotos de lo recibido → **pago liberado al vendedor**.

### Flujo B — Envío por courier · Inicia el comprador
1. Comprador crea la propuesta con precio acordado y descripción.
2. Vendedor recibe el link, confirma los datos y sube las fotos del producto.
3. Comprador paga → dinero retenido. Vendedor puede despachar con seguridad.
4. Vendedor ingresa código de seguimiento. SafePay monitorea el envío.
5. Comprador confirma recepción → **pago liberado al vendedor**.

### Flujo C — Venta presencial · Inicia el vendedor
1. Vendedor crea la transacción, sube fotos del producto y acuerdan lugar de encuentro.
2. Comprador paga antes del encuentro → dinero retenido.
3. Se encuentran en persona. Sin efectivo. Comprador inspecciona el producto con calma.
4. Comprador confirma en la app → **pago liberado al vendedor en el momento**.

### Flujo D — Venta presencial · Inicia el comprador
1. Comprador crea la transacción con el precio acordado y la comparte al vendedor.
2. Vendedor acepta y sube fotos confirmando el estado del producto.
3. Comprador paga antes del encuentro → dinero retenido.
4. Comprador confirma en la app → **pago liberado al vendedor en el momento**.

---

## Registro fotográfico y trazabilidad

### Registro de publicación (vendedor)
- Fotos del producto antes del envío o encuentro
- Descripción detallada del estado y condiciones del producto
- Foto del empaque en el caso de envío por courier
- Todo queda registrado con fecha y hora exacta

### Registro de recepción (comprador)
- Fotos de lo recibido antes de confirmar o disputar
- Confirmación de conformidad o apertura de disputa
- En caso de disputa, las fotos de ambos lados son la evidencia principal
- Si no hay respuesta en 48 hrs, el pago se libera automáticamente

### Flujo de disputas
Si el comprador reporta un problema, ambas partes tienen un plazo definido para presentar su versión con evidencia fotográfica. SafePay resuelve en base al registro visual de publicación versus recepción. Sin fotos de respaldo, quien no registró pierde la disputa por defecto.

---

## Estados de una transacción

| Estado | Descripción |
|---|---|
| `PROPUESTA` | Creada, esperando aceptación de la contraparte |
| `CONFIRMADA` | Contraparte aceptó. Habilitado el pago. |
| `PAGADO` | Fondos retenidos. Vendedor puede despachar. |
| `EN_TRÁNSITO` | Tracking ingresado. Paquete en camino. |
| `ENTREGADO` | Courier confirmó entrega o encuentro realizado. |
| `EN_DISPUTA` | Comprador reportó un problema con evidencia. |
| `COMPLETADO` | Pago liberado al vendedor exitosamente. |
| `CANCELADO` | Antes del despacho. Devolución automática. |
| `REEMBOLSADO` | Disputa resuelta a favor del comprador. |
| `EXPIRADO` | Propuesta sin respuesta en el plazo definido. |

---

## Acuerdo de condiciones y costos

Independiente de quién inicie la transacción, **ambas partes deben aceptar explícitamente las condiciones antes de que se active el pago**. Este acuerdo queda registrado con fecha y hora y es vinculante para ambos.

### Cuando inicia el vendedor
1. Vendedor crea la transacción y define quién asume el costo del servicio.
2. Se genera un link con las condiciones bloqueadas — precio, descripción y desglose de costos.
3. Comprador abre el link y ve el desglose completo antes de pagar.

```
Producto:       $80.000
Costo servicio: $990   ← visible antes de pagar
Total a pagar:  $80.990
```

4. **Comprador acepta → se activa el pago.** Su aceptación queda registrada.

### Cuando inicia el comprador
1. Comprador crea la transacción con precio acordado y define quién asume el costo.
2. Se genera un link con las condiciones bloqueadas y se comparte al vendedor.
3. Vendedor abre el link y ve exactamente cuánto recibirá después de comisiones.

```
Precio acordado: $80.000
Costo servicio:  $990  ← asumido por comprador
Lo que recibirás: $80.000
```

4. **Vendedor acepta → comprador puede proceder a pagar.** La aceptación queda registrada.

### Condiciones bloqueadas tras el acuerdo
- Una vez que ambas partes aceptan, **ninguna condición puede modificarse**.
- Si la contraparte rechaza o no responde en el plazo definido, la transacción expira en estado `PROPUESTA` sin cargo alguno.
- El registro de aceptación con fecha y hora es la **base legal del acuerdo** en caso de disputa posterior.
- En el caso dividido, cada parte ve solo **su porción del costo** en el desglose.

---

## Validación de identidad de usuarios

| Nivel | Qué valida | Estado |
|---|---|---|
| Email + teléfono (OTP) | Que el número existe | MVP |
| RUT + nombre | Que el RUT existe y coincide | MVP |
| KYC fotográfico (carnet + selfie) | Identidad real verificada | A futuro |

---

## Modelo de cobro

### Tarifa fija por transacción

| Monto | Tarifa |
|---|---|
| Hasta $100.000 | $990 CLP |
| $100.001 – $500.000 | $1.490 CLP |
| $500.001 – $2.000.000 | $1.990 CLP |

### ¿Quién asume el costo?
El iniciador de la transacción propone quién asume el costo. La contraparte lo ve claramente antes de aceptar.

- Iniciador lo asume
- La contraparte lo asume
- Se divide entre ambos

---

## ¿Por qué SafePay?

- **No es un marketplace.** Se usa sobre cualquier plataforma existente. Mínima fricción de adopción.
- **Funciona presencial y remoto.** Único en Chile que cubre ambos casos con el mismo flujo.
- **Sin app obligatoria.** El comprador puede pagar desde un link sin registrarse.
- **Seguimiento automático.** Integración con Chilexpress y BlueExpress para validar entregas.
- **Mercado sin competencia local.** No existe hoy en Chile una solución equivalente para ventas C2C de bajo monto.
- **Sistema de disputas.** Resolución estructurada cuando hay problemas, con evidencia y plazos definidos.

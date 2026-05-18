# SafePay — Checklist de Desarrollo Mobile

**Stack:** React Native · Expo Router ~6.x · Zustand · React Query · StyleSheet nativo  
**Estado:** En progreso · **Fecha inicio:** Mayo 2026

---

## Fase 1 — Scaffold e infraestructura ✅
- [x] Proyecto Expo inicializado en `mobile/` (template blank TypeScript)
- [x] `app.json` configurado — nombre `SafePay`, scheme `safepay`, bundleId `cl.safepay.app`
- [x] Dependencias instaladas (Expo Router, Zustand, React Query, Axios, Paper, WebView, SecureStore, Notifications, ImagePicker, Camera)
- [x] Estructura de carpetas creada (`app/`, `components/`, `lib/`, `stores/`, `hooks/`, `constants/`)
- [x] `lib/api.ts` — instancia Axios con baseURL, interceptor de auth e interceptor de refresh automático
- [x] `lib/queryClient.ts` — instancia React Query con staleTime y retry configurados
- [x] `stores/auth.store.ts` — Zustand + AsyncStorage: user, accessToken, isAuthenticated
- [x] `stores/transaction.store.ts` — Zustand en memoria: transactions[], activeTransaction
- [x] `stores/notification.store.ts` — Zustand en memoria: notifications[], unreadCount
- [x] `app/_layout.tsx` — root layout con QueryClientProvider, PaperProvider, SafeAreaProvider
- [x] `npx tsc --noEmit` sin errores
- [x] `npx expo start` — app arranca sin crash ✓

---

## Fase 2 — Auth flow ✅
- [x] `app/(auth)/_layout.tsx` — Stack navigator, redirige a `(app)` si ya autenticado
- [x] `app/(auth)/login.tsx` — prefix "+56 9" fijo + TextInput 8 dígitos, validación, botón "Enviar código" → `POST /auth/login`
- [x] `app/(auth)/register.tsx` — input nombre + teléfono → `POST /auth/register`
- [x] `app/(auth)/verify-otp.tsx` — input 6 dígitos OTP, countdown 2 min (naranja <30s, expirado), reenviar resetea timer, submit → `POST /auth/verify-otp` → guarda tokens
- [x] `hooks/useAuth.ts` — login(), register(), verifyOtp(), logout()
- [x] Redirección automática al cambiar `isAuthenticated`
- [x] `npx tsc --noEmit` sin errores
- [x] Flujo completo probado contra backend local ✅

---

## Fase 3 — Home + listado de transacciones ✅
- [x] `app/(app)/_layout.tsx` — Tab Navigator: Home / Notificaciones / Perfil + badge de no leídas
- [x] `app/(app)/index.tsx` — SectionList agrupado: "⚡ Requieren tu atención" / "🔄 En progreso" / "📋 Recientes (últimas 5)". Pull-to-refresh, botón "🗂️" a archivadas, FAB "Nueva", empty state con CTA.
- [x] `components/TransactionCard.tsx` — estado, monto, rol, contraparte, fecha
- [x] `constants/txStatus.ts` — mapa status → color + label en español
- [x] Placeholders creados para todas las rutas de tabs (transactions, disputes, tx/[slug])
- [x] `npx tsc --noEmit` sin errores
- [x] Flujo probado contra backend local ✅

---

## Fase 4 — Crear transacción ✅
- [x] `app/(app)/transactions/new.tsx` — formulario 3 pasos: rol/modalidad → monto/descripción → fee_payer
- [x] `components/FeePreview.tsx` — fee calculado en tiempo real, muestra total comprador y neto vendedor
- [x] Navegación a detalle tras crear con invalidación del cache
- [x] `npx tsc --noEmit` sin errores
- [ ] Flujo probado contra backend local

---

## Fase 5 — Detalle de transacción ✅
- [x] `app/(app)/transactions/[id].tsx` — detalle completo con acciones condicionales por estado/rol. Pull-to-refresh (ScrollView + RefreshControl). Auto-refresh cada 30s cuando tx está activa.
- [x] Acción PROPUESTA: "Aceptar" (contraparte), "Copiar link" + "Cancelar" (iniciador)
- [x] Acción CONFIRMADA: "Ir a pagar"
- [x] Acción PAGADO: "Registrar envío" (modalidad shipping / vendedor), "Confirmar entrega" (modalidad presencial / vendedor), "Cancelar"
- [x] Acción EN_TRÁNSITO: link a pantalla de tracking
- [x] Acción ENTREGADO: "Confirmar conforme" + "Abrir disputa" (comprador)
- [x] Acción EN_DISPUTA: "Ver disputa"
- [x] `components/StatusStepper.tsx` — barra visual de progreso diferenciada por modalidad (shipping vs presencial, omite EN_TRÁNSITO en presencial)
- [x] `components/ActionButton.tsx` — botón con variantes primary/danger/outline
- [x] `hooks/useTransaction.ts` — React Query + polling 30s en estados activos + mutaciones accept/cancel/deliver/release + copyLink
- [x] `npx tsc --noEmit` sin errores
- [x] Flujo probado contra backend local ✅

---

## Fase 6 — Pago via Mercado Pago WebView ✅
- [x] `app/(app)/transactions/pay.tsx` — llama `POST /payments/initiate`, abre WebView con `checkoutUrl`
- [x] Detección URL de retorno `safepay://tx/:slug/success` o `failure`
- [x] Modo dev: pantalla "Pago simulado" cuando `checkoutUrl` es null
- [ ] Flujo completo probado contra backend local

---

## Fase 7 — Subida de fotos ✅
- [x] `app/(app)/transactions/photos.tsx` — `expo-image-picker`, `POST /files/upload` multipart
- [x] Thumbnails con URLs firmadas (`GET /files/:id/url`)
- [x] `hooks/useFiles.ts` — uploadFile(), getFileUrl(), deleteFile()
- [ ] Flujo probado contra backend local

---

## Fase 8 — Tracking de envío ✅
- [x] `app/(app)/transactions/tracking.tsx` — selector courier (Chilexpress / BlueExpress) + input tracking number
- [x] Llama `POST /shipping/track`, muestra `GET /shipping/:txId/status`
- [x] Auto-refresh cada 60s cuando status ≠ DELIVERED
- [x] Pull-to-refresh manual (RefreshControl)
- [x] Label "Actualizado hace X min" con hook `useRelativeTime` (actualiza cada 30s)
- [x] Flujo probado contra backend local ✅

---

## Fase 9 — Disputas ✅
- [x] `app/(app)/disputes/[id].tsx` — detalle: razón, descripción, respuesta vendedor, resolución
- [x] `app/(app)/disputes/new.tsx` — modal con reason + description → `POST /disputes/:txId/open`
- [x] `hooks/useDispute.ts` — useDispute(), useOpenDispute()
- [x] Vendedor ve botón "Responder" si status = OPEN
- [ ] Flujo probado contra backend local

---

## Fase 10 — Notificaciones + Perfil ✅
- [x] `app/(app)/notifications/index.tsx` — lista `GET /notifications/my`, marcar leída
- [x] Badge de no leídas en tab de Notificaciones
- [x] `app/(app)/profile/index.tsx` — datos usuario, estado MP, conectar/desconectar MP, logout
- [x] `hooks/useNotifications.ts` — registrar device token FCM con `expo-notifications`
- [ ] Flujo probado contra backend local

---

## Fase 11 — Deep link público `tx/[slug]` ✅
- [x] `app/tx/[slug].tsx` — GET público (`GET /transactions/public/:slug`), muestra resumen + botón "Pagar" via WebView
- [x] Post-pago exitoso: redirige a registro si no autenticado
- [x] Backend: `GET /transactions/public/:slug` agregado al controller (sin JwtAuthGuard)
- [ ] Deep link `safepay://tx/:slug` probado desde mensajería externa

---

## Fase 12 — Pantalla de archivadas ✅ (Fase 3 Gap T4a)
- [x] `app/(app)/transactions/archived.tsx` — lista transacciones archivadas (`GET /transactions/archived`)
- [x] Chips de filtro horizontal: Todas · Completadas · Canceladas · Reembolsadas · Expiradas
- [x] Filtrado client-side por `tx.status`
- [x] Empty state diferenciado: sin archivadas vs sin resultados para filtro
- [x] Pull-to-refresh (RefreshControl)
- [x] Acceso desde botón 🗂️ en header del Home

---

## Calidad y entrega
- [x] `npx tsc --noEmit` sin errores en todo el proyecto
- [x] Flujo completo E2E probado: register → login → crear tx → aceptar → pagar → tracking → confirmar → completado ✅
- [x] Flujo presencial E2E: PAGADO → confirmar entrega directa (sin EN_TRÁNSITO) → ENTREGADO ✅
- [x] Flujo de archivado: transacciones terminales → archivar → ver en pantalla de archivadas ✅
- [ ] Flujo de disputa probado: ENTREGADO → abrir → responder → resolver
- [ ] Deep link probado desde URL externa
- [ ] Push notifications recibidas en dispositivo/simulador

# Fix v1 — Correcciones Mobile

**Estado: ✅ TODOS LOS FIXES IMPLEMENTADOS**

---

## Fix 1 — OTP: teclado no reaparece al tocar celdas ✅
Al ingresar el código para validar el número de teléfono, si se ingresan dígitos pero no se completan los 6, y se cierra el teclado, al querer volver a ingresar los dígitos faltantes no aparecía el teclado.

**Solución:** Patrón `blur → focus` en `OtpInput.tsx` para forzar a Android a liberar el foco antes de reenfocar.

---

## Fix 2 — Home: botones duplicados + FAB dos toques + EmptyState usuario nuevo ✅
Al ingresar sin transacciones activas, aparecía el botón centrado "+ Crear transacción" y adicional el FAB "+ Nueva transacción". Solo debería verse una opción.

**Solución:**
- Usuario nuevo (sin transacciones): pantalla EmptyState exclusiva con botón "Crear mi primera transacción", sin FAB.
- Con transacciones: FAB compacto (+) que al primer toque se expande con el texto "Crear transacción", al segundo toque navega. Se colapsa solo a los 4 segundos o al tocar fuera.

---

## Fix 3 — Crear transacción: subida de imágenes para vendedor ✅
Al crear una transacción como vendedor no había opción de subir imágenes del producto.

**Solución:** Después de crear la transacción el vendedor es redirigido a la pantalla de fotos (`photos.tsx`) donde puede subir imágenes o saltearlas. El comprador no requiere subir imágenes al crear.

---

## Fix 4 — Botón de acción tapado por botones de Android ✅
El botón inferior de acción se superponía con los botones de navegación de Android.

**Solución:** `useSafeAreaInsets()` en `tx/[slug].tsx` para calcular el padding inferior dinámicamente.

---

## Fix 5 — Nombre del vendedor no aparece en la propuesta pública ✅
En la propuesta que le llega al receptor del link, se indicaba el producto pero no aparecía el nombre del vendedor.

**Solución:** Agregado campo `initiatorName` a la interfaz `PublicTransaction` en `tx/[slug].tsx`.

---

## Fix 6 — Botón CTA en propuesta pública ✅
El botón de acción decía "Continuar" y no tenía checkbox de términos y condiciones.

**Solución:** Botón cambiado a "Confirmar transacción" con checkbox de T&C obligatorio antes de habilitarlo.

---

## Fixes adicionales (descubiertos durante testing)

### Fix 7 — Upload de fotos fallaba con error 400 ✅
El hook enviaba `type: 'evidence'` pero el enum del backend solo acepta `'publication'` o `'reception'`. Corregido a `'publication'`. También se agregó el endpoint `GET /files?transactionId=` que faltaba en el backend.

### Fix 8 — Foto subida quedaba en spinner infinito ✅
En modo dev (sin AWS S3), la URL firmada retorna `null` y la imagen nunca se mostraba. Solución: guardar el URI local al momento del upload y usarlo como fallback de visualización.

### Fix 9 — Fotos del producto no visibles para el comprador ✅
Las fotos solo se mostraban en estado `ENTREGADO`. El comprador ahora ve las fotos del producto desde cualquier estado activo de la transacción.

---

## Pendientes para próxima sesión

### Fix 10 — Pinch-to-zoom en PhotoViewer ⏳

**Problema:** El visor fullscreen (`PhotoViewer.tsx`) no permite hacer zoom con dos dedos sobre las fotos.

**Intento fallido documentado:** Se probó `ScrollView` nativo con `maximumZoomScale={4}` dentro de cada slide del `FlatList`. El problema es que el scroll horizontal del `ScrollView` interno entra en conflicto directo con el swipe horizontal del `FlatList` paginado — al intentar hacer zoom, el gesto se interpreta como un swipe de página.

**Solución correcta (pendiente de implementar):**
Instalar `react-native-gesture-handler` + `react-native-reanimated` y reemplazar el `FlatList` + `Image` por `GestureDetector` con `PinchGesture` + `PanGesture` compostos. Cada slide tendría su propio `Animated.Image` con transformación de escala y traslación. El `FlatList` externo deshabilitaría su gesto horizontal cuando el zoom sea > 1.

**Archivos a modificar:**
- `mobile/components/PhotoViewer.tsx` — reemplazar `renderItem` con lógica de zoom animado
- `package.json` — agregar `react-native-gesture-handler` y `react-native-reanimated`
- `mobile/app/_layout.tsx` — envolver con `GestureHandlerRootView` (requerido por la librería)

**Referencias:**
- TODO comment en [mobile/components/PhotoViewer.tsx](../mobile/components/PhotoViewer.tsx) (líneas 1–5)
- Documentación: `react-native-gesture-handler` PinchGesture + Composed gestures

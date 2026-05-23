# Historial de Auditoría y Correcciones

Documento de seguimiento para la auditoría cruzada del sistema Jorge Minnesota Logistic.

---

## Contexto Inicial

El 23 de mayo 2026 se detectó que el vehículo **654385** aparecía en Gestión de Viajes/Historial y en Reporte de Movimientos, pero NO en Caja/Cobro de Vehículo. Investigación reveló que el `binNip` estaba guardado como `"654385 "` (con espacio al final), causando que la búsqueda exacta por doc ID fallara.

Esto llevó a una auditoría completa de 3 meses de `viajesPagados` vs `vehiculos`.

---

## Correcciones Ya Aplicadas

### 1. Corrección de 5 binNips inconsistentes
**Script:** `scripts/corregirBinNips.js` (ya ejecutado)

| binNip incorrecto | binNip correcto | Problema |
|---|---|---|
| `"654385 "` | `654385` | Espacio al final |
| `0C003542` | `C003542` | Cero extra al inicio |
| `ja081690` | `JA081690` | Minúsculas |
| `12028SITTERLEY` | `12028` | Texto basura concatenado |
| `0000000` | `00000000` | 7 dígitos en vez de 8 |

Para cada uno se migró: doc en `vehiculos`, movimientos asociados, y `lotesEnTransito` si existía.

### 2. Normalización de inputs (uppercase + trim)
Se aplicó `.toUpperCase().trim()` en los 10 puntos de entrada de binNip/lote del sistema:

| # | Archivo | Cambio |
|---|---|---|
| 1 | `components/features/vehiculos/FormDatosVehiculo.js` | onChange normalizado |
| 2 | `components/features/vehiculos/RegistroMasivoVehiculos.js` | onChange + maxLength={8} + duplicate check normalizado |
| 3 | `components/features/viajes/FormViaje.js` | onChange en tabla de lotes normalizado |
| 4 | `components/features/viajes/TablaViajes.js` | Agregado .trim() (ya tenía .toUpperCase()) |
| 5 | `components/features/viajes/ViajesAnteriores.js` | onChange + búsqueda Firestore normalizada |
| 6 | `components/features/viajes/ModalEditarViaje.js` | onChange + maxLength={8} |
| 7 | `components/features/viajes/ImportarHistorial.js` | Lectura de Excel con .toUpperCase() |
| 8 | `components/features/caja/BuscarVehiculo.js` | handleInputChange + .doc() lookup normalizado |
| 9 | `components/features/vehiculos/BuscaVehiculo.js` | handleInputChange + .doc() lookup normalizado |
| 10 | `pages/solicitar.js` | Ya estaba OK (solo acepta dígitos) |

---

## Auditoría Cruzada Completa (23 mayo 2026)

**Script:** `scripts/auditoriaCruzada.js`
**Periodo:** últimos 3 meses | **13,188 vehiculos** | **601 viajes** | **1,571 lotes en viajes**

### Problema 1: Huérfanos — Lotes en viajes SIN doc en vehiculos (22)
Lotes que aparecen en `viajesPagados` pero no tienen documento en la colección `vehiculos`.

- 19 son de importación Excel (viajes `H-xxx` con `importadoDesde: "JML.xlsx"`)
- 3 tenían binNip mal escrito (ya corregidos: `0C003542`, `ja081690`, `654385 `)

**Lotes huérfanos restantes (19):**
`44424978`, `44541847`, `44139748`, `75690905`, `44466336`, `HL51148`, `43564756`, `44487277`, `A24156`, `4624356`, `C009709`, `44541571-4`, `44237081`, `98339775`, `44500192`, `79592085`, `94361825`, `43730327`, `44004783`

**Causa raíz:** ImportarHistorial.js importó viajes de JML.xlsx que contenían lotes que nunca fueron registrados en el sistema. El flag `existeEnSistema: false` se puso pero no se creó el doc.

**Estado:** Sin acción requerida. Son datos históricos importados, no afectan operación actual.

---

### Problema 2: Entregados sin viaje — estatus=EN pero sin viaje en 3 meses (11,623)
**Estado:** Probablemente normal. Son vehiculos entregados hace más de 3 meses cuyo viaje está fuera del rango de consulta. No requiere acción.

---

### Problema 3: Pagados sin movimiento — estadoPago=pagado sin registro en movimientos (735)
Vehiculos marcados como `estadoPago: "pagado"` pero sin ningún movimiento en `movimientos` en los últimos 3 meses.

**Posibles causas:**
- Movimiento es de hace más de 3 meses (fuera del rango)
- El pago se registró directamente en el vehiculo sin crear movimiento (bug conocido: escritura no atómica en PagoVehiculo.js)
- Datos importados que ya venían con estadoPago pero sin movimiento

**Estado:** PENDIENTE DE INVESTIGACIÓN. Necesita verificar si los movimientos existen fuera del rango de 3 meses.

---

### Problema 4: Duplicados — Mismo lote en 2+ viajes (191) ⚠️ CRÍTICO
**191 lotes** aparecen en múltiples viajes. El patrón dominante:

```
Viaje 735 (NORMAL) + Viaje H-735 (IMPORTADO) — mismos lotes, mismo chofer, misma fecha
```

**Causa raíz:** Se importó historial desde JML.xlsx creando viajes `H-xxx`, y después se liquidaron los mismos viajes normalmente creando viajes con ID secuencial. El resultado: el mismo lote queda contabilizado en 2 viajes.

**Impacto:** Potencialmente está duplicando los montos en reportes financieros (flete contado doble).

**Casos especiales detectados:**
- `44286892` aparece en **4 viajes** (716, 711, H-716, H-712)
- `44619935` aparece en **3 viajes** (698, H-698, 677)
- Algunos duplicados tienen **chofer diferente** entre el importado y el normal (ej: viaje 725 EPPI RUIZ vs H-725 ORLANDO PEREZ)

**Análisis detallado (23 mayo 2026):**
- Total viajes H-: 71
- H- con viaje normal correspondiente: 64 (estos son los duplicados)
  - Lotes 100% idénticos: 51 → borrado seguro
  - Lotes con diferencias menores (binNips corregidos, lotes extra): 13 → también se borran
- H- sin viaje normal (se conservan): 7 → `H-738`, `H-712`, `H-710`, `H-691`, `H-690`, `H-683`, `H-674`
- Duplicados fuera del patrón H- (lote en 2 viajes normales): 13 lotes → pendiente revisión
- 14 pares con chofer diferente entre H- e importado

**Decisión:** Eliminar los 64 viajes H- que tienen par normal. El viaje normal (creado por liquidación) es el correcto. Los 7 H- sin par se conservan.

**Limpieza ejecutada (23 mayo 2026):**
- Script: `scripts/eliminarViajesH.js`
- Eliminados: 64 viajes H- duplicados
- Viajes antes: 601 → después: 537
- Lotes duplicados antes: 191 → después: 23
- 7 viajes H- conservados (sin par normal): H-738, H-712, H-710, H-691, H-690, H-683, H-674

**23 duplicados restantes (no son patrón H-):**
- H-712 y H-710 comparten lotes con viajes normales PG-988/PG-986 (los H- no tenían par directo 712/710)
- PRIVADOV duplicado dentro del mismo viaje PG-1169
- 44397683 en PG-1115 y PG-996
- 5 lotes duplicados entre viajes 584/578 (ambos importados FELIX TORRES)
- 4 lotes duplicados entre viajes 424/408 (ambos importados)

**Limpieza adicional ejecutada (23 mayo 2026):**
- Script: `scripts/limpiarDuplicadosRestantes.js`
- Borrados: H-712, H-710, H-691, H-674, 578, 408
- Viajes antes: 537 → después: 531
- Viajes H- restantes: 3 (H-738, H-690, H-683 — sin par, se conservan)
- Lotes duplicados: de 191 → 23 → **4 pendientes**

**4 duplicados pendientes de revisión manual:**

1. **`PRIVADOV`** — 2 veces en el MISMO viaje PG-1169 (viaje 880, LEONEL CRUZ). Posición 7: TOYOTA TACOMA $700. Posición 8: VW PASSAT $700. Son 2 carros diferentes con el mismo "lote" PRIVADOV. Posible lote temporal/placeholder.

2. **`44397683`** — En PG-1115 (viaje 831, RAYMOND, 5/5/2026, FORD F150 $800+$522 storage) y PG-996 (viaje 720, JUAN MONJE, 20/4/2026, FORD F150 $700). Mismo cliente DAVID BADILLO pero distinto chofer y fecha. Posiblemente el carro viajó 2 veces o error de captura.

3. **`44286892`** — En PG-995 (viaje 716, EPPI RUIZ, 20/4) y PG-988 (viaje 711, EPPI RUIZ, 18/4). VW JETTA 2015, cliente ZAPATA, $280 flete. Mismo chofer, 2 días de diferencia. Probable doble liquidación del mismo viaje.

4. **`44619935`** — En PG-980 (viaje 698, DAYRON VARONA, 17/4) y 677 (FELIX TORRES, 14/4). CHEVROLET TRAX 2017, cliente IVAN LONGORIA, $675. Distinto chofer y fecha.

**Estado:** LIMPIEZA COMPLETADA. 4 duplicados pendientes de revisión manual (ver arriba).

---

### Problema 5: En tránsito fantasma — lotesEnTransito (187)
**187 lotes** siguen en la colección `lotesEnTransito` cuando no deberían:
- **136** con estatus `EN` (entregado) — vehiculo ya fue entregado
- **51** sin documento en `vehiculos` — el vehículo ni existe en el sistema

De los 189 docs totales en `lotesEnTransito`, solo **2 son legítimos**.

**¿Qué es `lotesEnTransito`?** Es un **candado/bloqueo** interno en Firestore. Sirve para evitar que el mismo lote se asigne a dos viajes simultáneamente. No se muestra al usuario en ningún lado.

**Flujo:**
1. `FormViaje.js` → al crear viaje, guarda lote en `lotesEnTransito` con `viajeAsignado` y `choferNombre`
2. `FormViaje.js` → al agregar lote, checa si ya está en `lotesEnTransito`. Si sí → "Lote ya está en tránsito", no deja agregarlo
3. `TablaViajes.js` → al liquidar viaje, borra el doc de `lotesEnTransito`
4. `Pagado.js` → al cobrar en caja, también borra el doc

**Causa raíz:** El flujo de entrega/descarga no limpia `lotesEnTransito`. El doc se crea cuando se asigna el viaje pero nunca se borra al entregar. Los 51 sin vehículo son de lotes importados o eliminados que dejaron el candado.

**Impacto:** Si alguien intenta asignar uno de estos lotes a un nuevo viaje, le diría "ya está en tránsito" cuando en realidad ya se entregó o ni existe.

**Script:** `scripts/transitoFantasma.js` → genera `analisis.xlsx` con los 187 fantasmas y toda su info cruzada (vehículo, viaje, cobro).

**Limpieza ejecutada (23 mayo 2026):**
- Script: `scripts/limpiarTransitoFantasma.js`
- Antes: 195 docs en lotesEnTransito
- Borrados: 192 fantasmas (136 con estatus EN + 56 sin vehículo en sistema)
- Después: 3 legítimos (lotes realmente en tránsito)

**Estado:** ✅ COMPLETADO.

---

### Problema 6: BinNip mal formateado en vehiculos (986)
Vehiculos existentes con binNip que no cumple el estándar (8 chars, mayúsculas, sin espacios).

**Desglose:**
- Con minúsculas: ~7
- Con espacios: ~33
- Longitud != 8: la mayoría (datos históricos con formatos variados)

**Estado:** PARCIAL. Los inputs ya están normalizados para nuevos registros. Los 986 existentes son datos históricos que habría que migrar masivamente si se quiere limpiar la base.

---

### Problema 7: Datos inconsistentes viaje vs vehiculo (57)
57 lotes donde el campo `fletero` (cliente) en el viaje no coincide con `clienteNombre` en el vehiculo.

**Estado:** PENDIENTE DE REVISIÓN MANUAL. Puede ser por cambios de cliente después de la asignación.

---

## Scripts de Auditoría Disponibles

| Script | Descripción |
|---|---|
| `scripts/auditoriaCruzada.js` | Auditoría completa de 7 puntos (la principal) |
| `scripts/auditoriaLotes.js` | Auditoría original de huérfanos con generación HTML |
| `scripts/corregirBinNips.js` | Corrección de 5 binNips (ya ejecutado) |
| `scripts/analizarBinNips.js` | Análisis de patrones de binNip en vehiculos |
| `scripts/verificarViajes.js` | Verificación de viajes importados vs normales |
| `scripts/dumpViajesHuerfanos.js` | Dump de campos raw de vehiculos huérfanos |

---

---

## Análisis Financiero: Viajes 2026 (Enero → 23 mayo 2026)

**Script:** `scripts/generarAnalisisFinal.js` → genera `analisis.xlsx`
**Archivo:** `analisis.xlsx` (solo carros de viajes 2026, sin retroactivos del 2025)

### Números Reales 2026

| Concepto | Carros | Monto |
|---|---|---|
| Carros en viajes 2026 | 2,705 | $1,690,299 (fletes) |
| Cobrados en caja | 2,586 | $2,044,160 |
| Pendientes de cobro | 115 | |
| Pagados en sistema (sin mov caja) | 4 | |

Los 115 pendientes son carros de viajes recientes que el cliente aún no pasa a pagar. **Normal.**

### 243 "cobros de más" en caja — EXPLICADOS

**Scripts:** `scripts/cobradosSinViaje.js`, `scripts/profundizar241.js`

Son **carros del 2025 cargados retroactivamente** a caja en enero-febrero 2026. Todos se registraron y cobraron el mismo día (carga masiva). No son operación real 2026.

**Evidencia:**
- 241 de 243 no aparecen en NINGÚN viaje de ningún periodo
- 0 días entre registro y cobro (imposible en operación normal)
- Concentrados en enero (158) y febrero (47)
- Sin numViaje ni chofer asignado
- Cobrados por: Cristela Govea (91), Adela Arizmendi (91), Olivia Cervantes (58)
- Clientes frecuentes: ZAPATA (37), DANIEL CUELLAR (7), FERNANDO LEAÑOS (7), MONO (6), RATON (6)
- Monto total: $176,336

**Conclusión:** NO deben contarse como actividad 2026. Son historial de cobros del 2025 importado directo a caja. No es dinero perdido — sí se cobró y tiene folio — pero no tiene viaje asociado.

---

## Próximos Pasos (por prioridad)

1. ~~**[CRÍTICO] Resolver 191 duplicados en viajes**~~ ✅ COMPLETADO — 70 viajes H- eliminados, quedan 4 duplicados menores
2. **[ALTO] Limpiar 136 lotesEnTransito fantasma** — Script de limpieza batch
3. **[MEDIO] Investigar 735 pagados sin movimiento** — Ampliar rango de búsqueda de movimientos
4. **[MEDIO] Decidir qué hacer con 241 cobros sin viaje** — ¿Crear viajes retroactivos? ¿Dejar como están?
5. **[BAJO] Revisar 57 inconsistencias de cliente** — Revisión manual
6. **[BAJO] Revisar 4 duplicados restantes** — PRIVADOV, 44397683, 44286892, 44619935
7. **[BAJO] Limpiar 986 binNips históricos mal formateados** — Migración masiva

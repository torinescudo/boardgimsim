# ASSUMPTIONS.md – Decisiones de diseño y ambigüedades resueltas

Este documento recoge todas las decisiones tomadas ante ambigüedades del reglamento.
Cada decisión está marcada con una referencia para poder cambiarla fácilmente.

---

## A1. HP al ascender

**Regla**: Conservar el daño recibido, no el HP absoluto.
**Ejemplo**: Unidad con 5/7 HP (2 de daño) asciende a 8 HP máx → queda en 6/8 HP.
**Ubicación**: `src/engine/actions/executor.ts` → `execAscend()`
**Alternativa**: Curación total al ascender (cambiar `damageTaken` a `0`).

## A2. Muerte del líder: timing

**Regla**: Derrota inmediata al eliminar al líder enemigo.
**Ubicación**: `src/engine/actions/executor.ts` → `handleUnitDeath()`
**Alternativa**: Comprobar solo al final de la ronda.

## A3. Guardia Ósea: persistencia de restos

**Regla**: El token de restos persiste hasta que el hex esté libre al final de una ronda. Si el hex está ocupado, el token se mantiene para la siguiente comprobación.
**Ubicación**: `src/engine/actions/executor.ts` → `endRound()`
**Alternativa**: El token se pierde si no revive en la primera oportunidad.

## A4. Saqueador Goblin: definición de "captura"

**Regla**: "Captura" se define como cuando el Saqueador pasa a ocupar y controlar una Aldea o Ciudad que antes no controlaba el jugador. Se comprueba al moverse a dicho hex.
**Ubicación**: `src/content/units/orcs.ts` → trait `pillaje`
**Estado**: Implementación simplificada – el bonus se otorga via el trait system.

## A5. Bendición: reclutamiento gratis

**Regla**: Reclutamiento sin coste de acción. El coste en oro se mantiene.
**Ubicación**: `src/engine/actions/executor.ts` → `execUseBlessing()`
**Alternativa**: Sin coste de oro ni de acción (más generoso).

## A6. Bendición: refresh gratis

**Regla**: El refresh de Bendición es separado y no consume el refresh normal de 1 oro/turno.
**Ubicación**: `src/engine/actions/executor.ts` → `execUseBlessing()`

## A7. Reducción de primer daño

**Regla**: Reduce en 1 el primer punto de daño recibido en esa ronda (no el primer ataque entero).
**Ejemplo**: Si recibe un ataque que inflige 3 impactos, solo se reduce el primero: 3-1=2 daño.
**Ubicación**: `src/engine/combat/combat.ts` → `resolveCombat()`, campo `damageReductionThisRound`.
**Alternativa**: Reducir 1 del total de daño del primer ataque completo.

## A8. Movimiento gratis post-ataque

**Regla**: El movimiento de 1 hex otorgado por pasivas (Repliegue, Danzante, etc.) ignora la Traba si el texto lo indica explícitamente. Sigue respetando Agua y hexes ocupados.
**Ubicación**: `src/engine/actions/executor.ts` → `handlePostDamageMove()`

## A9. Pre-draft: secuencia

**Regla**: El draft inicial sigue la secuencia J1-J2-J2-J1 (4 compras en total, 2 por jugador).
**Ubicación**: `src/engine/actions/executor.ts` → `execPreDraftBuy()`

## A10. Primer jugador

**Regla**: El jugador con el líder de menor HP máximo va primero. En empate, tirada aleatoria.
**Ubicación**: `src/engine/state/gameState.ts` → `determineFirstPlayer()`

## A11. Afinidades de ciclo

**Regla por defecto**:
- HUMAN = SUN
- ELF = SUN
- ORC = MOON
- UNDEAD = MOON
- LEADERS = NEUTRAL
**Ubicación**: Archivos de datos en `src/content/units/`

## A12. Curación en aldeas

**Regla**: La unidad que ocupa una aldea al final de la ronda cura 1 HP, salvo que tenga bloqueo de curación activo.
**Ubicación**: `src/engine/actions/executor.ts` → `endRound()`

## A13. Hostigador Sangriento: movimiento post-ranged

**Regla**: El movimiento de 1 hex ocurre tras cualquier ataque ranged, independientemente de si infligió daño. Esto se basa en la interpretación de "tras ataque ranged" vs "tras infligir daño".
**Ubicación**: `src/content/units/orcs.ts` → trait config `alwaysAfterAttack`
**Alternativa**: Solo tras infligir daño.

## A14. Mapas

**Regla**: Los layouts de mapas son aproximaciones basadas en las descripciones del PDF. Las coordenadas exactas pueden diferir del PDF visual pero mantienen la estructura descrita (número de ciudades, aldeas, terrenos, simetría/asimetría).
**Ubicación**: `src/content/maps/maps.ts`

## A15. Liche del Umbral: desventaja

**Regla**: El debuff de desventaja se aplica al próximo ataque del enemigo dañado (1 dado → desventaja). Se consume al resolver ese ataque.
**Ubicación**: `src/engine/combat/combat.ts` → se lee en `buildDicePool()` como status effect.

## A16. Avatar del Bosque: raíces atrapantes

**Regla**: Los enemigos adyacentes al Avatar no pueden abandonar su adyacencia (como una Traba mejorada). Se implementa como un efecto de engagement reforzado.
**Ubicación**: Pendiente de implementación completa en el sistema de engagement.

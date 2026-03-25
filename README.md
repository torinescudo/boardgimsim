# Fractured Veil – Adaptación Digital

Juego táctico por turnos sobre hexágonos para 2 jugadores en local (hotseat).

## Requisitos

- Node.js 18+
- npm o pnpm

## Instalación

```bash
npm install
```

## Ejecutar en desarrollo

```bash
npm run dev
```

Abre `http://localhost:5173` en tu navegador.

## Ejecutar tests

```bash
npm test
```

## Build de producción

```bash
npm run build
npm run preview
```

## Estructura del proyecto

```
src/
  app/          → Punto de entrada de la aplicación React
  engine/       → Motor de juego (TypeScript puro, sin dependencias de UI)
    core/       → Tipos, enums, interfaces
    map/        → Coordenadas hex, distancias, pathfinding
    state/      → Estado del juego, inicialización
    actions/    → Ejecución de acciones del jugador
    rules/      → Validación legal de acciones
    combat/     → Resolución de combate y dados
    rng/        → Servicio de números aleatorios con seed
    selectors/  → Consultas derivadas del estado
    validators/ → Validación de integridad de contenido
  content/      → Datos declarativos (data-driven)
    units/      → Definiciones de unidades (T1, T2, T3)
    leaders/    → Definiciones de líderes
    maps/       → Layouts de los 5 mapas + tutorial
    scenarios/  → Escenarios de juego
  ui/           → Componentes React
    screens/    → Pantallas principales
    board/      → Tablero hexagonal
    panels/     → Paneles laterales (jugador, tienda, reserva, log)
tests/          → Tests del motor con Vitest
```

## Cómo jugar

1. **Menú principal** → "Nueva Partida"
2. **Configuración** → Elige mapa, facción del Jugador 1 y Jugador 2
3. **Draft** → Cada jugador recluta 2 mercenarios gratis (J1-J2-J2-J1)
4. **Partida** → Juega por turnos alternos

### Acciones por turno

- **Activar unidad**: Click en una unidad propia → se resaltan movimientos y ataques
- **Mover**: Click en hex verde resaltado
- **Atacar**: Click en hex/unidad rojo resaltado
- **Reclutar**: Click en "Comprar" en la tienda → Click en hex de despliegue
- **Ascender**: Panel de ascensos muestra unidades elegibles
- **Comprar acción extra**: Botón "+Acción" en el panel del jugador
- **Fin de turno**: Botón "Fin de Turno"

### Condiciones de victoria

- **Muerte del líder**: Eliminar al líder enemigo → victoria inmediata
- **Dominio de ciudades**: Controlar 75%+ de ciudades al final de ronda (5/6 estándar)

## Facciones

| Facción | Color | Afinidad | Líder |
|---------|-------|----------|-------|
| Humanos | Dorado | Sol | Capitán de la Frontera (HP 7) |
| Elfos | Verde | Sol | Guardiana Silvana (HP 6) |
| Orcos | Rojo | Luna | Jefe de Guerra del Filo (HP 8) |
| No Muertos | Violeta | Luna | Heraldo de la Tumba (HP 6) |

## Mapas disponibles

1. **Campo Abierto** (Fácil) – Llanuras sin obstáculos
2. **Valle Boscoso** (Fácil) – Bosques canalizan hacia el centro
3. **Colinas Gemelas** (Fácil) – Dos mesetas con paso central
4. **Paso del Río Roto** (Intermedio) – Río estrangula el centro
5. **El Umbral Fracturado** (Difícil) – Criptas, agua, asimetría
6. **Primera Escaramuza** (Tutorial) – Mapa simplificado

## Decisiones de diseño

Ver [ASSUMPTIONS.md](./ASSUMPTIONS.md) para las decisiones tomadas ante ambigüedades del reglamento.

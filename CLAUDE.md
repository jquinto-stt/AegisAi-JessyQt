# StockFlow

## Identidad visual NECTO (obligatoria)

Todo diseño o interfaz (incluido el trabajo con la skill `design-taste-frontend`) usa exclusivamente
esta tipografía y paleta. No se sustituyen por las que proponga la skill ni por otras.

### Tipografía

- Familia única: **DM Sans** (Google Fonts), pesos **300 Light**, **400 Regular**, **700 Bold**. Ningún otro peso ni familia.
- Escala de tamaños (no usar otros):
  - 36px — Bold
  - 24px — Bold / Regular / Light
  - 16px — Bold / Regular / Light
  - 14px — Bold / Regular / Light
  - 12px — Bold / Regular / Light

### Colores

| Token | Hex | Uso |
|---|---|---|
| Naranja NECTO | `#FF3F1A` | Acento principal, acciones |
| Cyan NECTO | `#97D6DF` | Acento secundario |
| Gris claro | `#ECECEC` | Fondos, superficies, separadores |
| Azul profundo NECTO | `#190088` | Títulos y encabezados |
| Dark | `#212121` | Texto general |
| Cream | `#EFE6D3` | Complementario |

### Cómo aplicarlo con `design-taste-frontend`

- Ejecutar siempre `draw.mjs` con `--keep palette,type`: de la skill solo se toma la composición, y los
  colores y la tipografía NECTO se asignan a los roles de la paleta y tipografía.
- Si el inspector marca una regla por un color de marca (p. ej. `palette-cream` al usar `#EFE6D3` como fondo),
  se mantiene el color de marca, se indica en el reporte y se pasa `--allow <regla>` solo para esa regla.

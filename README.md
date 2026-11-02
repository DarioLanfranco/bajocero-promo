# Bajo Cero · Landing de cupón 5%

Landing estática de una sola pantalla que se abre al escanear un QR en el local.
Entrega un cupón del **5% de descuento** con una ventana de **48 horas** y un CTA
que valida el beneficio por WhatsApp.

## Stack

| Capa | Herramienta |
| --- | --- |
| Framework | [Astro](https://astro.build) 7 (salida estática, cero islas) |
| Estilos | Tailwind CSS 4 vía `@tailwindcss/vite` + `@layer overrides` |
| Tipado | TypeScript 6 + `astro check` |
| Tests | Vitest + jsdom |
| Lint/format | Biome |
| Imágenes | `astro:assets` (WebP responsive para el logo) |

## Comandos

```sh
npm install
npm run dev      # http://localhost:4321
npm run check    # astro check (0 errores esperados)
npm test         # 32 tests de dominio, seguridad y config
npm run lint     # biome check
npm run format   # biome check --write
npm run build    # astro check && astro build  ->  dist/
npm run preview  # sirve dist/ localmente
```

Node `>= 22.23.4` (ver `.nvmrc`).

## Estructura

```text
src/
├── components/
│   ├── ui/WhatsappIcon.astro      Icono reutilizable
│   ├── PromoBackdrop.astro        Fondo, velo y halo (decorativo)
│   ├── Snowfall.astro             Capa de nieve (la rellena el script)
│   ├── CouponCard.astro           Tarjeta + máquina de estados `data-state`
│   ├── Countdown.astro            Reloj y tema expirado
│   ├── CouponCta.astro            CTA activo + CTA deshabilitado
│   ├── TrustBox.astro             Dirección, respaldo y WhatsApp oficial
│   ├── LegalNotice.astro          Bases de la promoción
│   └── BrandFooter.astro          Logo responsive
├── config/
│   ├── business.ts                Campaña, contacto y textos legales
│   ├── media.ts                   Tamaños/calidad del logo y OG image
│   └── security.ts                CSP, headers y reglas de caché
├── integrations/security-headers.ts   Emite dist/_headers en build
├── layouts/Layout.astro           SEO, OG/Twitter, CSP meta, noindex
├── pages/
│   ├── index.astro                Orquestador de la landing
│   └── 404.astro                  Página no encontrada
├── scripts/
│   ├── countdown.ts               Lógica pura + controlador testeable
│   ├── coupon-ui.ts               Une reloj y tarjeta
│   ├── snow.ts                    Nieve + parallax con cleanup
│   ├── confetti.ts                Confeti en canvas con cleanup
│   └── promo.ts                   Wiring de la página
└── styles/
    ├── global.css                 Tailwind + ajustes por viewport
    └── decor.css                  Nieve, confeti, reveal, reduced-motion
```

## Configuración del negocio

Todo lo que cambia entre campañas vive en `src/config/business.ts`:

```ts
CAMPAIGN.discountPercent   // 5
CAMPAIGN.durationHours     // 48
CAMPAIGN.storageKey        // clave de persistencia del cupón
BUSINESS                   // nombre, ciudad, dirección, WhatsApp
LEGAL_TEXT                 // bases legales
```

`CAMPAIGN.storageKey` **no debe cambiarse dentro de la misma campaña**: es la
clave con la que se calcula el vencimiento guardado en el navegador. Cambiarla
resetea los cupones activos; reutilizarla entre campañas distintas hereda la
ventana anterior.

La duración, el descuento y el mensaje de WhatsApp se derivan de esos valores;
no hay porcentajes ni horas hardcodeadas en componentes.

## URL pública y SEO

El dominio no está hardcodeado. Definí `PUBLIC_SITE_URL` en el entorno de build
para habilitar `canonical`, `og:url` y `og:image` absolutos:

```sh
PUBLIC_SITE_URL=https://promo.bajocero.com.ar npm run build
```

Sin esa variable, las etiquetas OG quedan con rutas relativas y no se emite
`canonical`. La landing y el 404 se publican con `noindex, nofollow`; `robots.txt`
permite el rastreo para que los previews de WhatsApp funcionen.

## Seguridad

- **CSP estricta sin `unsafe-inline`**: no hay `style` inline, ni `<style>`, ni
  `<script>` inline. `astro.config.mjs` usa `inlineStylesheets: "never"`.
- La política vive en `src/config/security.ts` y se aplica de dos formas:
  `<meta http-equiv="Content-Security-Policy">` (solo en producción) y un
  `_headers` generado en `dist/` durante el build. `frame-ancestors` solo va en
  el header porque el meta no lo admite.
- `public/robots.txt`, `Referrer-Policy`, `X-Content-Type-Options`,
  `Permissions-Policy`, `HSTS` y `COOP` acompañan la política.
- El fondo se sirve desde `public/media/` y se referencia por CSS: cero estilos
  inline.

## Integridad del cupón

El vencimiento se calcula en el cliente a partir del primer acceso guardado en
`localStorage` (con fallback a `sessionStorage` y a memoria si el navegador
bloquea el storage). El frontend:

- ancla timestamps futuros al presente (reloj desincronizado o manipulación),
- aísla campañas por clave y no resetea cupones activos,
- detiene el timer al expirar y es idempotente al destruirse,
- actualiza el estado visual una sola vez por transición.

**Límite conocido:** al ser un sitio estático sin backend, la validez del cupón
no puede ser autoritativa. Un usuario con acceso a las herramientas del
navegador puede reiniciar su ventana local. La validación real ocurre en caja
con la captura de pantalla; si se necesita una autoridad de servidor, requiere
un endpoint que firme o registre el cupón.

## Accesibilidad

- Contraste AA en CTAs (texto oscuro sobre verde de marca), labels y textos
  legales.
- `role="timer"` con `aria-live="off"` y un `role="status"` que anuncia el
  vencimiento sin spamear cada segundo.
- `prefers-reduced-motion: reduce` desactiva nieve, confeti y animaciones de
  entrada sin ocultar contenido.
- Foco visible en todos los enlaces y botones; iconos decorativos con
  `aria-hidden`.

## Deployment

El build genera `dist/` con `_headers` y `robots.txt`. En Netlify o Cloudflare
Pages los headers se aplican automáticamente; en otros hosts hay que replicar
`dist/_headers` en la configuración del CDN. Los assets de `_astro/` y `media/`
se marcan como inmutables.

## Verificación visual

La refactorización se validó con capturas automatizadas en 9 viewports (280×653
a 1440×900) en estado activo y expirado, comparando contra el build anterior:
geometría idéntica (±0.5 px por el reescalado del logo) y diferencias de píxel
limitadas al color del texto del CTA y al logo optimizado.

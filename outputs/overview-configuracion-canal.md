# Configuración del canal — Conversaciones / WhatsApp

Página de configuración en `/conversaciones/config`, con entrada propia en **Canales**.

## Qué se construyó

Una página de ajustes del canal de WhatsApp con **nav vertical de 7 secciones en 3 grupos**,
siguiendo el patrón de navegación de la referencia `demo.tailadmin.com/ai-settings.html`. Las
secciones de la referencia que describían un backend inexistente (modelos, claves de API,
conectores, memoria del asistente) **no se copiaron**: este proyecto es un mock 100 % frontend.

| Grupo | Secciones |
|---|---|
| CANAL | Perfil del canal · Plantillas de mensaje · Horario de atención |
| MENSAJERÍA | Automatización y escalado · Aviso de pausa · Alertas |
| PREFERENCIAS | Apariencia |

Toda sección lee de un store real. No hay valores de negocio inventados: donde no existía campo,
se muestra un **valor derivado de solo lectura** en lugar de un control falso.

## Decisiones clave

- **Un único catálogo de vocabulario** (`configuracion.secciones.ts`), tipado contra
  `keyof PlantillasWhatsApp` — añadir una plantilla al store sin declararla aquí es un error de
  compilación.
- **Borrador profundo** con copia de arrays/objetos anidados, para que editar no mute el store por
  aliasing.
- **Guard por capacidad** `channels.manage`: sin ella la ruta no se monta y el ítem del menú
  desaparece.
- **Se corrigió un error propio**: el primer borrador inventó 5 campos inexistentes del store. La
  salida fácil era añadirlos al store; se hizo lo correcto y se re-derivó cada sección de campos
  reales.
- **Nav personalizada en lugar de `Tab` vertical**, porque `Tab` fija `sm:w-[200px]` y tiñe el
  ítem activo con color de marca donde el diseño pide gris claro.

## Verificación

| Prueba | Resultado |
|---|---|
| Suite completa | **431 tests / 24 archivos**, todos verdes (28 nuevos) |
| Typecheck | 15 líneas preexistentes, **0 en este trabajo** |
| Build | 305 módulos, ✓ 20.39s |
| Chrome real (CDP) | **31/31 comprobaciones** |

## Pendiente

- **El repositorio git está dañado** — los dos `.pack` de `.git/objects/pack/` desaparecieron
  (sandbox de Windows). Las referencias se recuperaron; el contenido no. Requiere
  `git fetch origin`. Ver §10 del informe.
- El bundle de Elements (12 componentes / 32 archivos) **no se extrajo** a `src/` de forma
  deliberada, para no sobrescribir archivos canónicos por colisión de hash.

## Documentos

- **Informe completo:** `outputs/informe-configuracion-canal-conversaciones.md`
- **Arnés de verificación:** `outputs/canales-config-verify/verify.mjs`
- **Capturas:** `outputs/canales-config-verify/artifacts/`

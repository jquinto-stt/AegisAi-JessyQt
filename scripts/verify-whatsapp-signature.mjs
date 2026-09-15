/**
 * Verificación del webhook de WhatsApp: firma y normalización.
 *
 * ⚠️ Por qué se **ejecuta** y no basta `tsc`: la firma es la única prueba de que
 * una entrega viene de Meta (la URL del webhook es pública por necesidad), y el
 * error clásico —calcular el HMAC sobre el JSON reserializado en lugar de sobre los
 * bytes crudos— **compila perfectamente**. Sólo se ve comprobando que un cuerpo
 * alterado deja de validar.
 *
 * Compila el paquete del servicio y ejercita el código compilado.
 *
 * Uso: node scripts/verify-whatsapp-signature.mjs
 */

import { spawnSync } from "node:child_process";
import { createHmac } from "node:crypto";
import { rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pkg = path.join(root, "packages/services/api/modules/service");
const tsc = path.join(root, "packages/apps/web/modules/app/node_modules/.bin/tsc");

let fails = 0;
const check = (label, ok, detail) => {
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  :: " + detail : ""}`);
};

/* ── Compilar el paquete del servicio ──────────────────────────────────────── */

rmSync(path.join(pkg, "dist"), { recursive: true, force: true });
const build = spawnSync(`"${tsc}" -p "${path.join(pkg, "tsconfig.json")}"`, {
  shell: true,
  encoding: "utf8",
});
if (build.status !== 0) {
  console.log(build.stdout || "");
  console.log(build.stderr || "");
  console.log("FAIL  el paquete del servicio no compila");
  process.exit(1);
}

const dist = path.join(pkg, "dist");
const load = (name) => import(pathToFileURL(path.join(dist, name)).href);
const { verifyMetaSignature, safeEquals, SIGNATURE_HEADER } = await load("whatsapp/signature.js");
const { parseInboundMessages } = await load("whatsapp/events.js");

/* ── Fase 1 · la firma ─────────────────────────────────────────────────────── */

console.log("\n── Fase 1 · firma de Meta ──");

const SECRET = "s3cr3t0-de-prueba";
const BODY = Buffer.from(JSON.stringify({ object: "whatsapp_business_account", entry: [] }), "utf8");
const sign = (body, secret = SECRET) =>
  `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;

check("cabecera que se busca es la de Meta", SIGNATURE_HEADER === "x-hub-signature-256", SIGNATURE_HEADER);
check("firma correcta se acepta", verifyMetaSignature(BODY, sign(BODY), SECRET) === true);

// ⚠️ El caso que justifica todo el módulo: mismo JSON, bytes distintos.
const tampered = Buffer.from(JSON.stringify({ object: "otra_cosa", entry: [] }), "utf8");
check(
  "cuerpo alterado se rechaza (la firma va sobre los bytes, no sobre el JSON)",
  verifyMetaSignature(tampered, sign(BODY), SECRET) === false
);

// ⚠️⚠️ El caso que de verdad distingue "firma sobre los bytes" de "firma sobre el
// JSON reserializado" es el **formato**, no el orden de las claves: `JSON.parse`
// conserva el orden del documento, así que `JSON.stringify(JSON.parse(x))`
// devuelve exactamente los mismos bytes y reordenar claves no discrimina nada
// (comprobado mutando la implementación: la aserción pasaba igual).
//
// Lo que cambia los bytes es el formato. Con espacios, una implementación perezosa
// calcularía el HMAC del compacto y **aceptaría** una entrega firmada con otro
// cuerpo: el agujero en su dirección peligrosa.
const pretty = Buffer.from(
  JSON.stringify({ object: "whatsapp_business_account", entry: [] }, null, 2),
  "utf8"
);
check("firma del compacto NO valida el cuerpo con espacios (el agujero)", verifyMetaSignature(pretty, sign(BODY), SECRET) === false);
check("el mismo cuerpo con espacios sí valida si la firma es la suya", verifyMetaSignature(pretty, sign(pretty), SECRET) === true);

check("secreto distinto se rechaza", verifyMetaSignature(BODY, sign(BODY, "otro"), SECRET) === false);
check("sin cabecera se rechaza", verifyMetaSignature(BODY, undefined, SECRET) === false);
check("sin secreto configurado se rechaza", verifyMetaSignature(BODY, sign(BODY), undefined) === false);
check("sin cuerpo se rechaza", verifyMetaSignature(undefined, sign(BODY), SECRET) === false);
check("esquema que no es sha256 se rechaza", verifyMetaSignature(BODY, `sha1=${"a".repeat(40)}`, SECRET) === false);
check("cabecera sin separador se rechaza", verifyMetaSignature(BODY, "sha256", SECRET) === false);
check("digest de longitud distinta se rechaza", verifyMetaSignature(BODY, "sha256=abcd", SECRET) === false);

check("safeEquals con el mismo valor acepta", safeEquals("token-abc", "token-abc") === true);
check("safeEquals con valores distintos rechaza", safeEquals("token-abc", "token-abd") === false);
check("safeEquals con longitudes distintas rechaza", safeEquals("token-abc", "token-abcd") === false);
check("safeEquals con vacío rechaza", safeEquals("", "token-abc") === false);

/* ── Fase 2 · normalización del sobre ──────────────────────────────────────── */

console.log("\n── Fase 2 · normalización del sobre ──");

const payload = {
  object: "whatsapp_business_account",
  entry: [
    {
      id: "waba-1",
      changes: [
        {
          field: "messages",
          value: {
            metadata: { phone_number_id: "PN-1", display_phone_number: "+57 300 000 0000" },
            contacts: [{ wa_id: "573001112233", profile: { name: "Ana" } }],
            messages: [
              { id: "wamid.1", from: "573001112233", timestamp: "1757700000", type: "text", text: { body: "hola" } },
              { id: "wamid.2", from: "573001112233", timestamp: "1757700001", type: "image" },
              // Sin `id` no hay clave de idempotencia: se descarta.
              { from: "573001112233", timestamp: "1757700002", type: "text", text: { body: "sin id" } },
            ],
            statuses: [{ id: "wamid.out", status: "delivered" }],
          },
        },
      ],
    },
  ],
};

const parsed = parseInboundMessages(payload);
check("se normalizan sólo los mensajes con id", parsed.length === 2, String(parsed.length));
check("el texto se extrae", parsed[0]?.text === "hola", JSON.stringify(parsed[0]));
check("el tipo se traduce al vocabulario propio", parsed[0]?.kind === "text" && parsed[1]?.kind === "image", JSON.stringify(parsed.map((m) => m.kind)));
check("se conserva el id de Meta (clave de idempotencia)", parsed[0]?.messageId === "wamid.1", parsed[0]?.messageId);
check("se conserva el número que lo recibió", parsed[0]?.phoneNumberId === "PN-1", parsed[0]?.phoneNumberId);
check("el epoch en segundos se convierte a ISO", parsed[0]?.sentAt === new Date(1757700000 * 1000).toISOString(), parsed[0]?.sentAt);
check(
  "⚠️ no se atribuye la tienda: eso necesita el índice de canales",
  parsed.every((m) => !("businessId" in m)),
  JSON.stringify(Object.keys(parsed[0] ?? {}))
);

check("un tipo desconocido entra como 'unknown'", parseInboundMessages({
  entry: [{ changes: [{ field: "messages", value: { metadata: { phone_number_id: "PN-1" }, messages: [{ id: "x", from: "1", type: "location" }] } }] }],
})[0]?.kind === "unknown");

check("los acuses de entrega se ignoran", parseInboundMessages({
  entry: [{ changes: [{ field: "statuses", value: { metadata: { phone_number_id: "PN-1" }, statuses: [{ id: "s1" }] } }] }],
}).length === 0);

check("un cambio sin phone_number_id se ignora", parseInboundMessages({
  entry: [{ changes: [{ field: "messages", value: { messages: [{ id: "x", from: "1", type: "text" }] } }] }],
}).length === 0);

check("un sobre vacío devuelve lista vacía", parseInboundMessages({}).length === 0);
check("un sobre ausente devuelve lista vacía (no lanza)", parseInboundMessages(undefined).length === 0);

console.log(`\n===== RESULTADO WEBHOOK WHATSAPP: ${fails === 0 ? "OK" : fails + " FALLOS"} =====`);
process.exit(fails === 0 ? 0 : 1);

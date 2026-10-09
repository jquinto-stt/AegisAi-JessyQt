// Busca la clase de fallo que rompió la consola de Chats: un hook declarado
// DESPUÉS de un `return` temprano dentro del mismo componente. React lo aborta
// con «Rendered fewer hooks than expected» en cuanto la rama temprana se toma,
// y el síntoma es el árbol entero desmontado.
//
// Uso: node scripts/cazar-hooks-tras-return.mjs
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const SRC = "packages/apps/web/modules/app/src";

// Sin `execSync`: en este entorno `spawnSync cmd.exe` falla con EBUSY. Se
// recorre el árbol con `readdirSync`.
const recorrer = (dir, acc = []) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) recorrer(p, acc);
    else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\.|\.spec\./.test(e.name)) acc.push(p);
  }
  return acc;
};

const archivos = recorrer(SRC);

// `(?:<[^>]*>)?` cubre los hooks con ARGUMENTO DE TIPO: sin él, el barrido se
// saltaba `useState<string | null>(null)` —que es justo el hook del defecto que
// este script persigue— y reportaba «sin hallazgos» sobre un árbol con el fallo
// reintroducido. Un instrumento que no puede ver el caso que busca no vale nada.
const HOOK = /^(\s*)(?:const\s+(?:\[[^\]]*\]|\w+)\s*=\s*)?(use[A-Z]\w*)\s*(?:<[^>]*>)?\s*\(/;
const RET = /^(\s*)return\b/;
const IF_ONE_LINE = /^(\s*)if\s*\(.*\)\s*return\b/;
const IF_OPEN = /^(\s*)if\s*\(.*\)\s*\{\s*$/;

const hallazgos = [];

for (const f of archivos) {
  const lineas = readFileSync(f, "utf8").split(/\r?\n/);
  // Los hooks suelen vivir al mismo nivel que el cuerpo del componente (2 o 4
  // espacios). Se recogen por sangría para poder compararlos con los `return`.
  const hooks = [];
  for (let i = 0; i < lineas.length; i++) {
    const m = HOOK.exec(lineas[i]);
    if (m && !/\/\//.test(lineas[i].slice(0, m.index))) hooks.push({ linea: i, indent: m[1].length, nombre: m[2] });
  }
  if (hooks.length === 0) continue;

  for (let i = 0; i < lineas.length; i++) {
    const una = IF_ONE_LINE.exec(lineas[i]);
    let salidaAntes = null;
    if (una) {
      salidaAntes = { linea: i, indent: una[1].length, texto: lineas[i].trim() };
    } else {
      const abre = IF_OPEN.exec(lineas[i]);
      if (abre) {
        // ¿el `if` cierra con un `return` en las siguientes 3 líneas?
        for (let j = i + 1; j < Math.min(i + 4, lineas.length); j++) {
          const r = RET.exec(lineas[j]);
          if (r) {
            salidaAntes = { linea: i, indent: abre[1].length, texto: lineas[i].trim() };
            break;
          }
          if (/^\s*\}\s*$/.test(lineas[j]) || /^\s*\S/.test(lineas[j].replace(/^\s*/, "")) === false) break;
        }
      }
    }
    if (!salidaAntes) continue;

    // Un hook posterior, con sangría >= a la del `if`, es el defecto...
    for (const h of hooks) {
      if (h.linea <= salidaAntes.linea || h.indent < salidaAntes.indent) continue;
      // ...pero solo si el `return` y el hook están en el MISMO ámbito. Si entre
      // los dos hay una línea que CIERRA el bloque (una llave a menor sangría),
      // el hook vive en otra función: es un `return` de una auxiliar de módulo,
      // no un retorno temprano del componente. Sin este filtro el barrido
      // reportaba 67 falsos positivos.
      let mismoAmbito = true;
      for (let k = salidaAntes.linea + 1; k < h.linea; k++) {
        // Una línea que solo lleva cierre —`}`, `});`, `]`— a MENOS sangría que
        // el hook significa que el bloque ya se cerró. La primera versión de este
        // filtro no reconocía `});` (el `;?` no cubría el paréntesis) y dejaba
        // pasar dos falsos positivos de `inventarios`: el `return` era de una
        // página y el hook de un subcomponente declarado más abajo.
        const m = /^(\s*)[}\)\];,]*\s*$/.exec(lineas[k]);
        if (m && /[}\)\]]/.test(lineas[k]) && m[1].length < h.indent) {
          mismoAmbito = false;
          break;
        }
      }
      if (!mismoAmbito) continue;
      hallazgos.push({
        archivo: f.replace(SRC + "/", ""),
        salida: salidaAntes.linea + 1,
        salidaTexto: salidaAntes.texto,
        hook: h.linea + 1,
        hookTexto: lineas[h.linea].trim(),
        hookNombre: h.nombre,
      });
      break;
    }
  }
}

const vistos = new Set();
const unicos = hallazgos.filter((h) => {
  const k = `${h.archivo}:${h.salida}:${h.hook}`;
  if (vistos.has(k)) return false;
  vistos.add(k);
  return true;
});

if (unicos.length === 0) {
  console.log(`Sin hallazgos en ${archivos.length} archivos revisados.`);
} else {
  console.log(`${unicos.length} candidato(s) en ${archivos.length} archivos revisados:\n`);
  for (const h of unicos) {
    console.log(`  ${h.archivo}`);
    console.log(`    return temprano  L${h.salida}: ${h.salidaTexto}`);
    console.log(`    hook posterior   L${h.hook}: ${h.hookTexto}   <-- ${h.hookNombre}\n`);
  }
}

const { sinPuntuacion, normalizarTexto, cantidadDe, resolverItem } = require('../packages/services/api/modules/service/dist/services/BotParser.js');

const catalogo = [
  { id: 'c1', nombre: 'Combo Hamburguesa Clásica', precio: 25000 },
  { id: 'c2', nombre: 'Papas Rústicas con Queso', precio: 12000 },
  { id: 'c3', nombre: 'Bebida Gaseosa 350ml', precio: 4000 },
  { id: 'c4', nombre: 'Postre Cheesecake de Frutos Rojos', precio: 9000 }
];

function extraerDireccion(texto) {
    if (!texto) return null;
    const t = texto.trim();
    const mExplicito = t.match(/(?:mi\s+direcci[oó]n(?:\s+es)?|direcci[oó]n|enviar\s+a|para\s+la|llevar\s+a)\s*[:]?\s*(.+)/i);
    if (mExplicito && mExplicito[1].trim().length >= 4) {
        return mExplicito[1].trim();
    }
    if (/\b(?:calle|cll|carrera|cra|kr|diagonal|diag|transversal|transv|tv|avenida|av|autopista|circular)\b.*?\d+/i.test(t)) {
        return t;
    }
    return null;
}

function resolverMultiplesItems(texto, catalogo) {
    if (!catalogo || catalogo.length === 0 || !texto) return [];
    const norm = normalizarTexto(texto);

    // 1. Cantidad compartida (ej: "dos porciones cada una", "2 de cada uno", "cada una")
    let cantidadCompartida = null;
    const mCadaUna = norm.match(/(?:(\d+|un|una|uno|dos|tres|cuatro|cinco|seis)\s*(?:porciones|unidades)?\s*)?cada\s+un[ao]/i);
    if (mCadaUna) {
        if (mCadaUna[1]) {
            cantidadCompartida = cantidadDe(mCadaUna[1]) || 1;
        } else {
            // buscar cantidad en el resto de la frase
            cantidadCompartida = cantidadDe(texto) || 1;
        }
    }

    // 2. Patrón de lista de números conectados por 'y' o ',' (ej: "el 3 y 4", "3 y el 4", "1, 2 y 3")
    const matchConectados = texto.match(/(?:(?:el|la|los|las)\s+)?(\d{1,2})\s*(?:y|,|e)\s*(?:(?:el|la|los|las)\s+)?(\d{1,2})(?:\s*(?:y|,|e)\s*(?:(?:el|la|los|las)\s+)?(\d{1,2}))?/i);
    if (matchConectados && !extraerDireccion(texto)) {
        const nums = [matchConectados[1], matchConectados[2], matchConectados[3]].filter(Boolean).map(Number);
        const validos = nums.filter(n => n >= 1 && n <= catalogo.length);
        if (validos.length >= 2) {
            return validos.map(n => ({
                item: catalogo[n - 1],
                cantidad: cantidadCompartida || 1
            }));
        }
    }

    // 3. Segmentos separados por comas o "y"
    const partes = texto.split(/\s*(?:,|;|\by\b|\be\b|\bademas\b|\badem[aá]s\b)\s*/i);
    if (partes.length > 1) {
        const encontrados = [];
        for (const parte of partes) {
            const item = resolverItemMejorado(parte, catalogo);
            if (item) {
                const cant = cantidadDe(parte) || cantidadCompartida || 1;
                encontrados.push({ item, cantidad: cant });
            }
        }
        if (encontrados.length >= 2) {
            return encontrados;
        }
    }

    // 4. Un solo item
    const single = resolverItemMejorado(texto, catalogo);
    if (single) {
        const cant = cantidadDe(texto) || 1;
        return [{ item: single, cantidad: cant }];
    }

    return [];
}

function resolverItemMejorado(texto, catalogo) {
    if (!catalogo || catalogo.length === 0) return null;
    const soloNumero = texto.trim().match(/^(?:(?:el|la|los|las)\s+)?(\d{1,3})$/);
    if (soloNumero) {
        const idx = Number(soloNumero[1]) - 1;
        return catalogo[idx] ?? null;
    }
    const t = sinPuntuacion(texto);
    if (!t) return null;
    const exacto = catalogo.find((i) => t.includes(sinPuntuacion(i.nombre)));
    if (exacto) return exacto;
    const palabras = t.split(' ').filter((p) => p.length >= 4);
    const porPalabra = catalogo.filter((i) => {
        const propias = sinPuntuacion(i.nombre).split(' ').filter((p) => p.length >= 4);
        return propias.some((propia) => 
            palabras.some((palabra) => {
                const raizP = palabra.slice(0, Math.min(5, palabra.length - 1));
                const raizPropia = propia.slice(0, Math.min(5, propia.length - 1));
                return propia === palabra || (raizP.length >= 4 && raizPropia.startsWith(raizP)) || (raizPropia.length >= 4 && raizP.startsWith(raizPropia));
            })
        );
    });
    return porPalabra.length === 1 ? porPalabra[0] : null;
}

console.log('Test 1:', resolverMultiplesItems('Quiero el 3 y 4 dos porciones cada una', catalogo));
console.log('Test 2:', resolverMultiplesItems('el 1 y el 2', catalogo));
console.log('Test 3:', resolverMultiplesItems('2 combos clasicos y 1 gaseosa', catalogo));
console.log('Test 4 (Direccion):', extraerDireccion('Mi dirección CLL 21 N 22-43'));
console.log('Test 5 (Direccion):', extraerDireccion('calle 21 # 22-43'));

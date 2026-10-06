import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { CartDraft, CatalogItem, BusinessProfile, FSMState, ClientePerfil } from './types.js';

const ESQUEMA = 'necto';

export class TelegramDAO {
  private sb: SupabaseClient | null = null;
  readonly organizacionId = 'fc009b85-73b8-47b3-8d1a-080b65ac7120';
  private catalogoCache: { catalogo: CatalogItem[]; perfil: BusinessProfile } | null = null;
  private catalogoCacheExp = 0;
  private convCache = new Map<string, { conversacionId: string; contactoId: string }>();

  constructor() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && key) {
      this.sb = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    }
  }

  private t(tabla: string) {
    if (!this.sb) throw new Error('[TelegramDAO] Supabase no configurado en variables de entorno.');
    return this.sb.schema(ESQUEMA).from(tabla);
  }

  async asegurarConversacion(chatId: number | string, nombre: string): Promise<{
    conversacionId: string;
    contactoId: string;
    modo: string;
    fsmState: FSMState;
    draft: CartDraft | null;
    ultimoPedidoId: string | null;
    operador: { id: string; nombre: string; rolId: string } | null;
    clientePerfil: ClientePerfil | null;
  }> {
    const idStr = String(chatId);
    const cached = this.convCache.get(idStr);

    if (cached) {
      const estado = await this.leerEstadoConversacion(cached.conversacionId);
      return {
        conversacionId: cached.conversacionId,
        contactoId: cached.contactoId,
        modo: estado.modoAtencion,
        fsmState: estado.fsmState,
        draft: estado.draft,
        ultimoPedidoId: estado.ultimoPedidoId,
        operador: estado.operador,
        clientePerfil: estado.clientePerfil,
      };
    }

    const digits = idStr.replace(/\D/g, '');
    const telefonoIdentificador = `tg:${digits || idStr}`;

    // 1. Contacto: Buscar primero por telefono_norm
    let contactoExistente: { id: string } | null = null;
    if (digits) {
      const { data } = await this.t('contacto')
        .select('id')
        .eq('organizacion_id', this.organizacionId)
        .eq('telefono_norm', digits)
        .maybeSingle();
      contactoExistente = data;
    }

    if (!contactoExistente) {
      const { data } = await this.t('contacto')
        .select('id')
        .eq('organizacion_id', this.organizacionId)
        .eq('telefono', telefonoIdentificador)
        .maybeSingle();
      contactoExistente = data;
    }

    let contactoId = contactoExistente?.id;

    if (!contactoId) {
      const { data: nuevoContacto, error: errContacto } = await this.t('contacto')
        .insert({
          organizacion_id: this.organizacionId,
          telefono: telefonoIdentificador,
          nombre,
          origen: 'telegram',
        })
        .select('id')
        .maybeSingle();

      if (errContacto) {
        if (digits) {
          const { data: recuperado } = await this.t('contacto')
            .select('id')
            .eq('organizacion_id', this.organizacionId)
            .eq('telefono_norm', digits)
            .maybeSingle();
          if (recuperado) contactoId = recuperado.id;
        }
        if (!contactoId) {
          throw new Error(`[TelegramDAO] Error creando contacto: ${errContacto.message}`);
        }
      } else if (nuevoContacto) {
        contactoId = nuevoContacto.id;
      }
    }

    // 2. Conversación (Traer directamente modo_atencion y estado_respuesta)
    const { data: convExistente } = await this.t('conversacion')
      .select('id, modo_atencion, estado_respuesta')
      .eq('organizacion_id', this.organizacionId)
      .eq('contacto_id', contactoId)
      .eq('canal', 'telegram')
      .maybeSingle();

    if (convExistente) {
      this.convCache.set(idStr, { conversacionId: convExistente.id, contactoId: contactoId! });
      const er = (convExistente.estado_respuesta as Record<string, any>) || {};
      const fsmState: FSMState = er.fsmState || (er.enCurso?.lineas?.length > 0 ? 'CARRITO_EN_CONSTRUCCION' : 'IDLE');
      const draft: CartDraft | null = er.draft || er.enCurso || null;
      const operador = er.operador ? (er.operador as { id: string; nombre: string; rolId: string }) : null;
      const clientePerfil = er.clientePerfil ? (er.clientePerfil as ClientePerfil) : null;

      return {
        conversacionId: convExistente.id,
        contactoId: contactoId!,
        modo: convExistente.modo_atencion || 'bot',
        fsmState,
        draft,
        ultimoPedidoId: er.ultimoPedidoId || null,
        operador,
        clientePerfil,
      };
    }

    const { data: nuevaConv } = await this.t('conversacion')
      .insert({
        organizacion_id: this.organizacionId,
        contacto_id: contactoId,
        canal: 'telegram',
        estado: 'abierta',
        modo_atencion: 'bot',
        modulo_destino: 'pedidos',
        no_leidos: 0,
      })
      .select('id, modo_atencion')
      .maybeSingle();

    const finalConvId = nuevaConv?.id;
    if (!finalConvId) {
      const { data: convRetry } = await this.t('conversacion')
        .select('id, modo_atencion')
        .eq('organizacion_id', this.organizacionId)
        .eq('contacto_id', contactoId)
        .eq('canal', 'telegram')
        .maybeSingle();
      const retryId = convRetry?.id || 'conv_fallback';
      this.convCache.set(idStr, { conversacionId: retryId, contactoId: contactoId! });
      return {
        conversacionId: retryId,
        contactoId: contactoId!,
        modo: convRetry?.modo_atencion || 'bot',
        fsmState: 'IDLE',
        draft: null,
        ultimoPedidoId: null,
        operador: null,
        clientePerfil: null,
      };
    }

    this.convCache.set(idStr, { conversacionId: finalConvId, contactoId: contactoId! });
    return {
      conversacionId: finalConvId,
      contactoId: contactoId!,
      modo: nuevaConv.modo_atencion || 'bot',
      fsmState: 'IDLE',
      draft: null,
      ultimoPedidoId: null,
      operador: null,
      clientePerfil: null,
    };
  }

  async leerEstadoConversacion(conversacionId: string): Promise<{
    fsmState: FSMState;
    draft: CartDraft | null;
    ultimoPedidoId: string | null;
    modoAtencion: string;
    updatedAt: string | null;
    operador: { id: string; nombre: string; rolId: string } | null;
    clientePerfil: ClientePerfil | null;
  }> {
    const { data, error } = await this.t('conversacion')
      .select('modo_atencion, estado_respuesta, actualizada_en')
      .eq('id', conversacionId)
      .maybeSingle();

    if (error || !data) {
      return { fsmState: 'IDLE', draft: null, ultimoPedidoId: null, modoAtencion: 'bot', updatedAt: null, operador: null, clientePerfil: null };
    }

    const er = (data.estado_respuesta as Record<string, any>) || {};
    const fsmState: FSMState = er.fsmState || (er.enCurso?.lineas?.length > 0 ? 'CARRITO_EN_CONSTRUCCION' : 'IDLE');
    const draft: CartDraft | null = er.draft || er.enCurso || null;
    const operador = er.operador ? (er.operador as { id: string; nombre: string; rolId: string }) : null;
    const clientePerfil = er.clientePerfil ? (er.clientePerfil as ClientePerfil) : null;

    return {
      fsmState,
      draft,
      ultimoPedidoId: er.ultimoPedidoId || null,
      modoAtencion: data.modo_atencion || 'bot',
      updatedAt: data.actualizada_en || null,
      operador,
      clientePerfil,
    };
  }

  async guardarEstadoConversacion(conversacionId: string, fsmState: FSMState, draft: CartDraft | null, extra: Record<string, any> = {}): Promise<void> {
    const { data } = await this.t('conversacion')
      .select('estado_respuesta')
      .eq('id', conversacionId)
      .maybeSingle();

    const previo = (data?.estado_respuesta as Record<string, any>) || {};
    const siguiente = {
      ...previo,
      fsmState,
      draft,
      enCurso: draft, // Compatibilidad con vistas previas
      ...extra,
    };

    if (draft === null) {
      delete (siguiente as any).draft;
      delete (siguiente as any).enCurso;
    }

    await this.t('conversacion')
      .update({
        estado_respuesta: siguiente,
        actualizada_en: new Date().toISOString(),
      })
      .eq('id', conversacionId);
  }

  async actualizarModoAtencion(conversacionId: string, modo: 'bot' | 'humano'): Promise<void> {
    await this.t('conversacion')
      .update({ modo_atencion: modo, actualizada_en: new Date().toISOString() })
      .eq('id', conversacionId);
  }

  async actualizarPerfilContacto(contactoId: string, perfil: ClientePerfil): Promise<void> {
    try {
      const nombreCompleto = `${perfil.nombre} ${perfil.apellido}`.trim();
      const datos: Record<string, any> = {
        nombre: nombreCompleto,
      };
      if (perfil.telefono) {
        datos.telefono = perfil.telefono;
        datos.telefono_norm = perfil.telefono.replace(/\D/g, '');
      }
      await this.t('contacto')
        .update(datos)
        .eq('id', contactoId);
      console.log(`[TelegramDAO] 👤 Contacto ${contactoId} actualizado con perfil: ${nombreCompleto} (${perfil.telefono})`);
    } catch (err) {
      console.error(`[TelegramDAO] Error actualizando perfil de contacto ${contactoId}:`, err);
    }
  }

  async obtenerModulosActivos(): Promise<{ tienePedidos: boolean; tieneInventarios: boolean }> {
    try {
      const { data, error } = await this.t('modulo_organizacion')
        .select('modulo_id, activo')
        .eq('organizacion_id', this.organizacionId)
        .eq('activo', true);

      if (error || !data) {
        return { tienePedidos: true, tieneInventarios: true };
      }

      const ids = new Set(data.map((m: any) => String(m.modulo_id).toLowerCase()));
      return {
        tienePedidos: ids.has('pedidos'),
        tieneInventarios: ids.has('inventario') || ids.has('inventarios'),
      };
    } catch {
      return { tienePedidos: true, tieneInventarios: true };
    }
  }

  async verificarOperadorPorTelefono(
    chatId: number | string,
    phoneNumber: string
  ): Promise<{ ok: boolean; operador?: { id: string; nombre: string; rolId: string }; motivo?: string }> {
    const rawDigits = (phoneNumber || '').replace(/\D/g, '');
    if (!rawDigits || rawDigits.length < 7) {
      return { ok: false, motivo: 'Número de teléfono no válido' };
    }

    try {
      // 1. Consultar operadores activos de la organización
      const { data: operadores, error } = await this.t('operador')
        .select('id, nombre, email, telefono, rol_id')
        .eq('organizacion_id', this.organizacionId)
        .eq('estado', 'activo');

      if (error || !operadores || operadores.length === 0) {
        return { ok: false, motivo: 'No se encontraron operadores activos registrados en la organización.' };
      }

      // 2. Comparar dígitos de teléfono (exacto o sufijo para códigos de país)
      const op = operadores.find((o: any) => {
        if (!o.telefono) return false;
        const opDigits = String(o.telefono).replace(/\D/g, '');
        return opDigits === rawDigits || opDigits.endsWith(rawDigits) || rawDigits.endsWith(opDigits);
      });

      if (!op) {
        return { ok: false, motivo: 'El número de teléfono no coincide con ningún operador activo de Necto.' };
      }

      const operadorInfo = {
        id: op.id,
        nombre: op.nombre,
        rolId: op.rol_id,
      };

      // 3. Vincular con la conversación actual en Supabase
      const idStr = String(chatId);
      const cached = this.convCache.get(idStr);
      let convId = cached?.conversacionId;

      if (!convId) {
        const estado = await this.asegurarConversacion(chatId, op.nombre);
        convId = estado.conversacionId;
      }

      if (convId) {
        await this.guardarEstadoConversacion(convId, 'IDLE', null, {
          operador: operadorInfo,
        });
      }

      return { ok: true, operador: operadorInfo };
    } catch (err: any) {
      return { ok: false, motivo: err.message };
    }
  }

  async consultarStockArticulo(
    query: string,
    bodegaFiltro?: string
  ): Promise<{
    encontrado: boolean;
    articulo?: {
      id: string;
      nombre: string;
      categoria: string;
      unidad: string;
      costo: number;
      puntoReorden: number;
    };
    stockTotal: number;
    bajoPuntoReorden: boolean;
    porBodega: Array<{
      bodegaId: string;
      bodegaNombre: string;
      cantidad: number;
    }>;
  }> {
    const q = (query || '').trim().toLowerCase();
    if (!q) {
      return { encontrado: false, stockTotal: 0, bajoPuntoReorden: false, porBodega: [] };
    }

    try {
      const { data: articulos, error } = await this.t('articulo')
        .select('id, nombre, categoria, unidad, costo, punto_reorden')
        .eq('organizacion_id', this.organizacionId)
        .eq('activo', true);

      if (error || !articulos || articulos.length === 0) {
        return { encontrado: false, stockTotal: 0, bajoPuntoReorden: false, porBodega: [] };
      }

      const match = articulos.find(a => {
        const nom = a.nombre.toLowerCase();
        return nom.includes(q) || q.includes(nom) || q.split(/\s+/).some((word: string) => word.length > 2 && nom.includes(word));
      });

      if (!match) {
        return { encontrado: false, stockTotal: 0, bajoPuntoReorden: false, porBodega: [] };
      }

      const { data: bodegasData } = await this.t('bodega')
        .select('id, nombre')
        .eq('organizacion_id', this.organizacionId);

      const mapaBodegas = new Map<string, string>();
      (bodegasData || []).forEach(b => mapaBodegas.set(b.id, b.nombre));

      const { data: movimientos } = await this.t('movimiento')
        .select('tipo, cantidad, origen_id, destino_id')
        .eq('organizacion_id', this.organizacionId)
        .eq('articulo_id', match.id);

      const stockPorBodega = new Map<string, number>();

      (movimientos || []).forEach(m => {
        const cant = Number(m.cantidad) || 0;
        if (m.tipo === 'entrada' && m.destino_id) {
          stockPorBodega.set(m.destino_id, (stockPorBodega.get(m.destino_id) || 0) + cant);
        } else if (m.tipo === 'salida' && m.origen_id) {
          stockPorBodega.set(m.origen_id, (stockPorBodega.get(m.origen_id) || 0) - cant);
        } else if (m.tipo === 'transferencia') {
          if (m.origen_id) stockPorBodega.set(m.origen_id, (stockPorBodega.get(m.origen_id) || 0) - cant);
          if (m.destino_id) stockPorBodega.set(m.destino_id, (stockPorBodega.get(m.destino_id) || 0) + cant);
        } else if (m.tipo === 'ajuste') {
          if (m.destino_id) stockPorBodega.set(m.destino_id, (stockPorBodega.get(m.destino_id) || 0) + cant);
          else if (m.origen_id) stockPorBodega.set(m.origen_id, (stockPorBodega.get(m.origen_id) || 0) - cant);
        }
      });

      let porBodegaArr = Array.from(stockPorBodega.entries()).map(([bId, cant]) => ({
        bodegaId: bId,
        bodegaNombre: mapaBodegas.get(bId) || 'Bodega General',
        cantidad: Math.max(0, cant),
      }));

      if (bodegaFiltro) {
        const bf = bodegaFiltro.toLowerCase();
        porBodegaArr = porBodegaArr.filter(b => b.bodegaNombre.toLowerCase().includes(bf));
      }

      const stockTotal = porBodegaArr.reduce((acc, b) => acc + b.cantidad, 0);
      const puntoReorden = Number(match.punto_reorden) || 0;

      return {
        encontrado: true,
        articulo: {
          id: match.id,
          nombre: match.nombre,
          categoria: match.categoria || 'General',
          unidad: match.unidad || 'unidad',
          costo: Number(match.costo) || 0,
          puntoReorden,
        },
        stockTotal,
        bajoPuntoReorden: stockTotal <= puntoReorden,
        porBodega: porBodegaArr,
      };
    } catch (err) {
      console.error('[TelegramDAO] Error consultando stock:', err);
      return { encontrado: false, stockTotal: 0, bajoPuntoReorden: false, porBodega: [] };
    }
  }

  async consultarAlertasInventario(): Promise<Array<{
    id: string;
    nombre: string;
    categoria: string;
    unidad: string;
    stockTotal: number;
    puntoReorden: number;
    deficit: number;
  }>> {
    try {
      const { data: articulos } = await this.t('articulo')
        .select('id, nombre, categoria, unidad, punto_reorden')
        .eq('organizacion_id', this.organizacionId)
        .eq('activo', true);

      if (!articulos || articulos.length === 0) return [];

      const { data: movimientos } = await this.t('movimiento')
        .select('articulo_id, tipo, cantidad, origen_id, destino_id')
        .eq('organizacion_id', this.organizacionId);

      const stockMap = new Map<string, number>();
      (movimientos || []).forEach(m => {
        const artId = m.articulo_id;
        const cant = Number(m.cantidad) || 0;
        let delta = 0;
        if (m.tipo === 'entrada') delta = cant;
        else if (m.tipo === 'salida') delta = -cant;
        else if (m.tipo === 'ajuste') delta = m.destino_id ? cant : -cant;
        stockMap.set(artId, (stockMap.get(artId) || 0) + delta);
      });

      const alertas: Array<{
        id: string;
        nombre: string;
        categoria: string;
        unidad: string;
        stockTotal: number;
        puntoReorden: number;
        deficit: number;
      }> = [];

      for (const a of articulos) {
        const stockTotal = Math.max(0, stockMap.get(a.id) || 0);
        const puntoReorden = Number(a.punto_reorden) || 0;
        if (stockTotal <= puntoReorden && puntoReorden > 0) {
          alertas.push({
            id: a.id,
            nombre: a.nombre,
            categoria: a.categoria || 'General',
            unidad: a.unidad || 'unidad',
            stockTotal,
            puntoReorden,
            deficit: Math.max(0, puntoReorden - stockTotal),
          });
        }
      }

      alertas.sort((a, b) => b.deficit - a.deficit);
      return alertas;
    } catch (err) {
      console.error('[TelegramDAO] Error consultando alertas de inventario:', err);
      return [];
    }
  }

  async obtenerResumenInventario(): Promise<{
    totalArticulos: number;
    totalUnidades: number;
    valorTotalEstimado: number;
    bodegas: Array<{ id: string; nombre: string; principal: boolean }>;
    articulosBajoReorden: number;
  }> {
    try {
      const [artRes, bodRes, movRes] = await Promise.all([
        this.t('articulo').select('id, costo, punto_reorden').eq('organizacion_id', this.organizacionId).eq('activo', true),
        this.t('bodega').select('id, nombre, principal').eq('organizacion_id', this.organizacionId).eq('activa', true),
        this.t('movimiento').select('articulo_id, tipo, cantidad, origen_id, destino_id').eq('organizacion_id', this.organizacionId),
      ]);

      const articulos = artRes.data || [];
      const bodegas = (bodRes.data || []).map(b => ({ id: b.id, nombre: b.nombre, principal: Boolean(b.principal) }));
      const movimientos = movRes.data || [];

      const stockMap = new Map<string, number>();
      movimientos.forEach(m => {
        const artId = m.articulo_id;
        const cant = Number(m.cantidad) || 0;
        let delta = 0;
        if (m.tipo === 'entrada') delta = cant;
        else if (m.tipo === 'salida') delta = -cant;
        else if (m.tipo === 'ajuste') delta = m.destino_id ? cant : -cant;
        stockMap.set(artId, (stockMap.get(artId) || 0) + delta);
      });

      let totalUnidades = 0;
      let valorTotalEstimado = 0;
      let articulosBajoReorden = 0;

      articulos.forEach(a => {
        const stock = Math.max(0, stockMap.get(a.id) || 0);
        const costo = Number(a.costo) || 0;
        const punto = Number(a.punto_reorden) || 0;
        totalUnidades += stock;
        valorTotalEstimado += stock * costo;
        if (stock <= punto && punto > 0) articulosBajoReorden++;
      });

      return {
        totalArticulos: articulos.length,
        totalUnidades,
        valorTotalEstimado,
        bodegas,
        articulosBajoReorden,
      };
    } catch (err) {
      console.error('[TelegramDAO] Error obteniendo resumen inventario:', err);
      return { totalArticulos: 0, totalUnidades: 0, valorTotalEstimado: 0, bodegas: [], articulosBajoReorden: 0 };
    }
  }

  async obtenerBodegas(): Promise<Array<{ id: string; nombre: string; principal: boolean; direccion?: string }>> {
    try {
      const { data } = await this.t('bodega')
        .select('id, nombre, principal, direccion')
        .eq('organizacion_id', this.organizacionId)
        .eq('activa', true)
        .order('principal', { ascending: false });
      return data || [];
    } catch (err) {
      console.error('[TelegramDAO] Error obteniendo bodegas:', err);
      return [];
    }
  }

  async obtenerCatalogoYPerfil(): Promise<{ catalogo: CatalogItem[]; perfil: BusinessProfile }> {
    const ahora = Date.now();
    if (this.catalogoCache && ahora < this.catalogoCacheExp) {
      return this.catalogoCache;
    }

    const { data } = await this.t('config_pedidos')
      .select('perfil_comercial, catalogo, horarios')
      .eq('organizacion_id', this.organizacionId)
      .maybeSingle();

    const rawCat = (data?.catalogo as any[]) || [];
    const catalogo: CatalogItem[] = rawCat
      .filter((i) => i && i.disponible !== false)
      .map((i) => ({
        id: String(i.id),
        nombre: String(i.nombre),
        precio: Number(i.precio) || 0,
        stock: typeof i.stock === 'number' ? i.stock : 999,
        disponible: i.disponible !== false,
      }));

    const perfilComercial = data?.perfil_comercial || 'food';
    let etiquetaCatalogo = 'Productos disponibles';
    if (perfilComercial === 'food') etiquetaCatalogo = 'Menú';
    else if (perfilComercial === 'services') etiquetaCatalogo = 'Servicios disponibles';

    const perfil: BusinessProfile = {
      perfilComercial,
      etiquetaCatalogo,
      costoEnvio: 5000,
      horarioAtencion: 'Lunes a Domingo de 11:30 a 22:30',
    };

    this.catalogoCache = { catalogo, perfil };
    this.catalogoCacheExp = ahora + 60_000;

    return this.catalogoCache;
  }

  async obtenerPedidosRecientes(chatId: number | string, limite = 5): Promise<Array<{ id: string; numero: string; estado: string; total: number; creadoEn?: string }>> {
    const digits = String(chatId).replace(/\D/g, '');
    const { data, error } = await this.t('pedido')
      .select('id, numero, estado, total, creado_en, modalidad, pedido_item (cantidad, precio_unitario)')
      .eq('organizacion_id', this.organizacionId)
      .or(`telefono.eq.tg:${chatId},telefono.eq.${chatId},telefono.ilike.%${digits}%`)
      .order('creado_en', { ascending: false })
      .limit(limite);

    if (error || !data) return [];

    return data.map((p: any) => {
      const items = (p.pedido_item as any[]) || [];
      const subtotal = items.reduce((acc, it) => acc + (Number(it.precio_unitario) * Number(it.cantidad)), 0);
      const costoEnvio = p.modalidad === 'domicilio' ? 5000 : 0;
      const totalCalculado = Number(p.total) > 0 ? Number(p.total) : subtotal + costoEnvio;
      return {
        id: p.id,
        numero: p.numero,
        estado: p.estado,
        total: totalCalculado,
        creadoEn: p.creado_en,
      };
    });
  }

  async obtenerUltimoPedidoActivo(chatId: number | string): Promise<{ id: string; numero: string; estado: string; total: number } | null> {
    const pedidos = await this.obtenerPedidosRecientes(chatId, 1);
    return pedidos.length > 0 ? pedidos[0] : null;
  }

  async crearPedidoFinal(
    chatId: number | string,
    clienteNombre: string,
    draft: CartDraft,
    costoEnvio = 0
  ): Promise<{ id: string; numero: string; total: number }> {
    const tel = `tg:${chatId}`;

    // 1. Consecutivo
    const { count } = await this.t('pedido')
      .select('id', { count: 'exact', head: true })
      .eq('organizacion_id', this.organizacionId);

    const numero = `WEB-${String((count ?? 0) + 1).padStart(4, '0')}`;
    const subtotal = (draft.lineas || []).reduce((acc, l) => acc + l.precioUnitario * l.cantidad, 0);
    const total = subtotal + (draft.modalidad === 'domicilio' ? costoEnvio : 0);

    const direccionObj = draft.modalidad === 'domicilio' && draft.direccion
      ? { texto: draft.direccion, ...(draft.destinatario ? { destinatario: draft.destinatario } : {}) }
      : (draft.destinatario ? { destinatario: draft.destinatario } : null);

    // 2. Insertar pedido
    const { data: pedido, error: errPed } = await this.t('pedido')
      .insert({
        organizacion_id: this.organizacionId,
        numero,
        cliente: clienteNombre || 'Cliente Telegram',
        telefono: tel,
        modalidad: draft.modalidad || 'retiro',
        origen: 'telegram',
        estado: 'nuevo',
        metodo_pago: 'globalpay',
        pago_con: total,
        direccion_entrega: direccionObj,
      })
      .select('id')
      .single();

    if (errPed) throw new Error(`[TelegramDAO] Error insertando pedido: ${errPed.message}`);

    // 3. Insertar líneas de pedido
    const itemsParaInsertar = draft.lineas.map((l, idx) => ({
      pedido_id: pedido.id,
      product_id: l.productId,
      nombre: l.nombre,
      cantidad: l.cantidad,
      precio_unitario: l.precioUnitario,
      orden: idx + 1,
    }));

    const { error: errItems } = await this.t('pedido_item').insert(itemsParaInsertar);
    if (errItems) {
      console.warn('[TelegramDAO] Advertencia insertando ítems de pedido:', errItems.message);
    }

    return {
      id: pedido.id,
      numero,
      total,
    };
  }

  async cancelarPedido(pedidoId: string): Promise<boolean> {
    const { error } = await this.t('pedido')
      .update({ estado: 'cancelado' })
      .eq('id', pedidoId);
    return !error;
  }

  async guardarMensaje(conversacionId: string, autor: 'cliente' | 'asistente' | 'sistema', texto: string, telegramMsgId?: string | number): Promise<string> {
    const { data, error } = await this.t('mensaje')
      .insert({
        conversacion_id: conversacionId,
        autor,
        contenido: {
          texto,
          plataforma: 'telegram',
          canal: 'api',
          telegram_message_id: telegramMsgId ? String(telegramMsgId) : undefined,
        },
        enviado_en: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.warn('[TelegramDAO] Advertencia guardando mensaje:', error.message);
      return '';
    }
    return data.id;
  }

  async obtenerHistorialReciente(conversacionId: string, limit: number = 6): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
    const { data, error } = await this.t('mensaje')
      .select('autor, contenido')
      .eq('conversacion_id', conversacionId)
      .order('enviado_en', { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return data
      .reverse()
      .map(m => ({
        role: m.autor === 'cliente' ? ('user' as const) : ('assistant' as const),
        content: ((m.contenido as any)?.texto as string) || '',
      }))
      .filter(m => m.content.length > 0);
  }
}

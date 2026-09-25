import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { CartDraft, CatalogItem, BusinessProfile, FSMState } from './types.js';

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

      return {
        conversacionId: convExistente.id,
        contactoId: contactoId!,
        modo: convExistente.modo_atencion || 'bot',
        fsmState,
        draft,
        ultimoPedidoId: er.ultimoPedidoId || null,
      };
    }

    const { data: nuevaConv, error: errConv } = await this.t('conversacion')
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
        .single();
      this.convCache.set(idStr, { conversacionId: convRetry.id, contactoId: contactoId! });
      return {
        conversacionId: convRetry.id,
        contactoId: contactoId!,
        modo: convRetry.modo_atencion || 'bot',
        fsmState: 'IDLE',
        draft: null,
        ultimoPedidoId: null,
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
    };
  }

  async leerEstadoConversacion(conversacionId: string): Promise<{
    fsmState: FSMState;
    draft: CartDraft | null;
    ultimoPedidoId: string | null;
    modoAtencion: string;
    updatedAt: string | null;
  }> {
    const { data, error } = await this.t('conversacion')
      .select('modo_atencion, estado_respuesta, actualizada_en')
      .eq('id', conversacionId)
      .maybeSingle();

    if (error || !data) {
      return { fsmState: 'IDLE', draft: null, ultimoPedidoId: null, modoAtencion: 'bot', updatedAt: null };
    }

    const er = (data.estado_respuesta as Record<string, any>) || {};
    const fsmState: FSMState = er.fsmState || (er.enCurso?.lineas?.length > 0 ? 'CARRITO_EN_CONSTRUCCION' : 'IDLE');
    const draft: CartDraft | null = er.draft || er.enCurso || null;

    return {
      fsmState,
      draft,
      ultimoPedidoId: er.ultimoPedidoId || null,
      modoAtencion: data.modo_atencion || 'bot',
      updatedAt: data.actualizada_en || null,
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
      delete siguiente.draft;
      delete siguiente.enCurso;
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
    const tel = `tg:${chatId}`;
    const { data, error } = await this.t('pedido')
      .select('id, numero, estado, creado_en, modalidad, pedido_item (cantidad, precio_unitario)')
      .eq('organizacion_id', this.organizacionId)
      .eq('telefono', tel)
      .order('creado_en', { ascending: false })
      .limit(limite);

    if (error || !data) return [];

    return data.map((p: any) => {
      const items = (p.pedido_item as any[]) || [];
      const subtotal = items.reduce((acc, it) => acc + (Number(it.precio_unitario) * Number(it.cantidad)), 0);
      const costoEnvio = p.modalidad === 'domicilio' ? 5000 : 0;
      return {
        id: p.id,
        numero: p.numero,
        estado: p.estado,
        total: subtotal + costoEnvio,
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

    const direccionObj = draft.modalidad === 'domicilio' && draft.direccion ? { texto: draft.direccion } : null;

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
        metodo_pago: 'otro',
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

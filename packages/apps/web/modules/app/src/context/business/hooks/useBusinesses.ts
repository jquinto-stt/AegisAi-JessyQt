import { useState, useEffect, useMemo } from "react";
import { BUSINESS_ARCHETYPES } from "../business-archetypes.constants";
import { getBusinessSemantics } from "../semantics";
import {
  findChannelConnection,
  upsertChannelConnection,
} from "../channel-connections.utils";
import type {
  BusinessInstance,
  BusinessSemanticConfig,
  ChannelConnection,
  ChannelType,
  NectoModuleKey,
  NewBusinessInput,
  StoreIdentity,
} from "../types";

/* ── Businesses domain ─────────────────────────────────────────────────
 * Owns the business catalogue, the active business selection and the
 * derived semantics for the active business. Persists to localStorage
 * under "necto_businesses" and "necto_active_business_id".
 *
 * ⚠️ El catálogo arranca **vacío**: no hay sedes de demostración. La primera
 * sede la crea el usuario desde el hub ("Crear mi primera tienda"), que es el
 * estado que `GlobalFranchiseOverview` sabe mostrar. Antes este dominio sembraba
 * dos negocios de ejemplo (una ferretería y una hamburguesería) cuando el
 * almacenamiento estaba vacío, así que `businesses.length === 0` era
 * **inalcanzable** y ese estado vacío quedaba muerto: el usuario recién
 * registrado aterrizaba con dos sucursales inventadas que no había pedido.
 * ─────────────────────────────────────────────────────────────────── */

export function useBusinesses() {
  const [businesses, setBusinesses] = useState<BusinessInstance[]>(() => {
    try {
      const saved = localStorage.getItem("necto_businesses");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((b: any) => ({
            ...b,
            activeModules: Array.isArray(b.activeModules) ? b.activeModules : ["pedidos", "inventarios", "referidos"],
            // Una tienda guardada antes de este modelo no tiene conexiones
            // registradas, y eso es justo lo que hay que mostrar: ninguna. El
            // `whatsappConnected: true` que había aquí era una suposición, no un
            // dato: ninguna tienda había autorizado nada.
            channelConnections: (Array.isArray(b.channelConnections) ? b.channelConnections : []).map(
              // Las conexiones guardadas antes de que existiera `businessId` no lo
              // traen. Se rellena con el id de la tienda que las contiene: es la
              // única respuesta posible, porque hasta ahora no podían salir de aquí.
              (c: any) => ({ ...c, businessId: c.businessId ?? b.id })
            ),
            setupProgress: b.setupProgress || {
              menuConfigured: true,
              kitchenConfigured: false,
              teamInvited: false,
            },
            // El asistente dejó de colgar del canal: el campo pasó de
            // `whatsappBotConfig` a `assistantConfig`. Sin esta línea, una tienda
            // guardada antes perdería su asistente en silencio al recargar.
            assistantConfig: b.assistantConfig ?? b.whatsappBotConfig,
            whatsappBotConfig: undefined,
            // `botConfig` era un **segundo** config del asistente que nadie leía:
            // se escribía al crear la tienda y no lo consumía ninguna pantalla. Se
            // retira del modelo y también de lo ya guardado, para no dejar escombro.
            botConfig: undefined,
          }));
        }
      }
    } catch (e) {
      console.warn("Error reading businesses from storage", e);
    }
    return [];
  });

  const [activeBusinessId, setActiveBusinessId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("necto_active_business_id");
      if (saved && saved !== "GLOBAL_OVERVIEW") return saved;
    } catch (e) {}
    return "";
  });

  useEffect(() => {
    try {
      localStorage.setItem("necto_businesses", JSON.stringify(businesses));
    } catch (e) {}
  }, [businesses]);

  useEffect(() => {
    try {
      if (activeBusinessId && activeBusinessId !== "GLOBAL_OVERVIEW") {
        localStorage.setItem("necto_active_business_id", activeBusinessId);
      }
    } catch (e) {}
  }, [activeBusinessId]);

  /**
   * Sede activa, o `null` si la cuenta todavía no tiene ninguna. Los
   * consumidores ya la leían con encadenamiento opcional; el contrato declara
   * la nulabilidad para que el compilador obligue a decidir qué se ve sin sedes.
   */
  const activeBusiness: BusinessInstance | null =
    businesses.find(b => b.id === activeBusinessId) ?? businesses[0] ?? null;

  /**
   * Identidad de la **tienda**, leída de cualquier sucursal existente. `null`
   * mientras no haya ninguna: sin sucursales la tienda todavía no existe, y el
   * wizard de sucursal tiene que preguntar el tipo de negocio y el modelo de
   * oferta en lugar de heredarlos.
   *
   * Es lo que permite que "Crear sucursal" no vuelva a tipificar el negocio: a
   * partir de la segunda sucursal, estos datos se copian de aquí.
   *
   * ⚠️ `createBusiness` **antepone**, así que `businesses[0]` es la sucursal más
   * reciente, no la primera. Da igual cuál se lea: todas las sucursales guardan
   * la misma identidad de tienda, heredada al crearse.
   */
  const storeIdentity: StoreIdentity | null = businesses.length
    ? {
        businessType: businesses[0].businessType,
        offerModel:
          businesses[0].offerModel ??
          BUSINESS_ARCHETYPES.find(a => a.id === businesses[0].businessType)?.defaultOfferModel ??
          "physical_products",
        iconKey: businesses[0].iconKey,
        currency: businesses[0].currency,
        country: businesses[0].country ?? "Colombia",
      }
    : null;

  const semantics: BusinessSemanticConfig = useMemo(
    () => getBusinessSemantics(activeBusiness?.businessType),
    [activeBusiness?.businessType]
  );

  const toggleModule = (businessId: string, moduleKey: NectoModuleKey) => {
    setBusinesses(prev =>
      prev.map(b => {
        if (b.id !== businessId) return b;
        const current = b.activeModules || [];
        const updated = current.includes(moduleKey)
          ? current.filter(m => m !== moduleKey)
          : [...current, moduleKey];
        return { ...b, activeModules: updated };
      })
    );
  };

  /**
   * Crea una sucursal. El `id` lo genera este dominio — y con él se sellan las
   * conexiones, que por eso entran sin `businessId` (ver `NewBusinessInput`).
   */
  const createBusiness = (data: NewBusinessInput): BusinessInstance => {
    const sem = getBusinessSemantics(data.businessType);
    const archetype = BUSINESS_ARCHETYPES.find(a => a.id === data.businessType);
    const resolvedOfferModel =
      data.offerModel ||
      archetype?.defaultOfferModel ||
      (data.businessType === "restaurant_virtual" ? "prepared_products" : "physical_products");

    const newId = `biz-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

    const newBiz: BusinessInstance = {
      ...data,
      id: newId,
      offerModel: resolvedOfferModel,
      activeModules:
        Array.isArray(data.activeModules)
          ? data.activeModules
          : (archetype?.recommendedModules || ["pedidos", "inventarios"]),
      // El asistente nace **sembrado con la semántica del arquetipo**: cada tipo de
      // negocio ya trae escrito su saludo (`botGreetingTemplate`), así que una tienda
      // nueva no arranca con el asistente en blanco. Lo mismo se escribía antes en un
      // `botConfig` que **nadie leía** — el saludo duplicado de un config muerto.
      assistantConfig: data.assistantConfig ?? {
        isWelcomeEnabled: true,
        welcomeMessage: (sem?.botGreetingTemplate || "¡Hola! Bienvenido a {storeName}.").replace(
          "{storeName}",
          data.name
        ),
      },
      // Una tienda nace **sin conexiones**: encender el canal no es conectarlo.
      // Antes se sembraba `whatsappConnected: true` y la sede recién creada
      // aparecía recibiendo pedidos por un canal que nadie había autorizado.
      // El `businessId` se sella con el id recién generado.
      channelConnections: (data.channelConnections ?? []).map(c => ({ ...c, businessId: newId })),
      setupProgress: {
        menuConfigured: false,
        kitchenConfigured: false,
        teamInvited: false,
      },
      createdAt: new Date().toISOString(),
    };

    setBusinesses(prev => [newBiz, ...prev]);
    setActiveBusinessId(newBiz.id);
    return newBiz;
  };

  const switchBusiness = (id: string) => {
    const target = businesses.find(b => b.id === id);
    if (target) {
      setActiveBusinessId(id);
    }
  };

  const updateBusiness = (id: string, updates: Partial<BusinessInstance>) => {
    setBusinesses(prev => prev.map(b => (b.id === id ? { ...b, ...updates } : b)));
  };

  /**
   * Registra o reemplaza la conexión de un canal en una tienda.
   *
   * Es el **único camino de escritura** del estado de conexión. Antes lo
   * escribían tres sitios que podían discrepar: la clave global
   * `necto_whatsapp_connected` de `localStorage`, `setupProgress.whatsappConnected`
   * y el estado local del formulario de Ajustes.
   */
  /**
   * Registra la conexión de un canal.
   *
   * ⚠️ `businessId` lo estampa **aquí**, no quien llama. El registro tiene que
   * poder salir de su contenedor (el backend enruta los webhooks por
   * `phoneNumberId` y necesita saber de quién es el número), y un `businessId`
   * que viniera de fuera podría discrepar del dueño real de la conexión.
   */
  const setChannelConnection = (
    businessId: string,
    connection: Omit<ChannelConnection, "businessId">
  ) => {
    setBusinesses(prev =>
      prev.map(b =>
        b.id === businessId
          ? {
              ...b,
              channelConnections: upsertChannelConnection(b.channelConnections, {
                ...connection,
                businessId,
              }),
            }
          : b
      )
    );
  };

  /**
   * Desconecta un canal.
   *
   * Se pierden las referencias de Meta (`wabaId`, `phoneNumberId`,
   * `displayPhoneNumber`) porque al revocar la autorización dejan de ser válidas:
   * conservarlas daría una conexión que parece viva y no lo está. Sí se conserva
   * `metadata`, que son ajustes del canal (la ventana de chat, por ejemplo) y no
   * hechos de la conexión.
   */
  const disconnectChannel = (businessId: string, type: ChannelType) => {
    setBusinesses(prev =>
      prev.map(b => {
        if (b.id !== businessId) return b;
        const current = findChannelConnection(b, type);
        return {
          ...b,
          channelConnections: upsertChannelConnection(b.channelConnections, {
            businessId,
            type,
            status: "not_connected",
            metadata: current?.metadata,
          }),
        };
      })
    );
  };

  /**
   * Actualiza un dato de ámbito **tienda** en todas las sucursales.
   *
   * La identidad del negocio (tipo, moneda, país) es la misma en toda la red: si
   * se dejara editable por sucursal, la red divergiría. Y como las sucursales
   * nuevas heredan de `businesses[0]`, la tienda acababa con dos tipos de negocio
   * distintos —y por tanto dos vocabularios de módulos— bajo el mismo negocio:
   * medido, editar el tipo en una sede dejaba la otra con el tipo anterior y la
   * sede siguiente heredaba el nuevo.
   *
   * Si cambia el tipo de negocio se re-derivan los campos de presentación que
   * dependen del arquetipo (icono y especialidad), igual que hace el alta: si no,
   * la tarjeta del hub seguiría anunciando "Gastronomía" para un retail.
   */
  const updateStoreIdentity = (patch: Partial<StoreIdentity>) => {
    const archetype = patch.businessType
      ? BUSINESS_ARCHETYPES.find(a => a.id === patch.businessType)
      : undefined;
    setBusinesses(prev =>
      prev.map(b => ({
        ...b,
        ...patch,
        ...(archetype ? { iconKey: archetype.iconKey, specialty: archetype.label } : {}),
      }))
    );
  };

  /**
   * Borra una sede. Si era la activa, la sustituye la primera que quede; si no
   * queda ninguna, el catálogo se queda **vacío de verdad** (el hub recupera su
   * estado "Aún no tienes sucursales"). Antes re-sembraba la sede de ejemplo al
   * vaciarse, así que borrar la última sede la resucitaba.
   */
  const deleteBusiness = (id: string) => {
    const filtered = businesses.filter(b => b.id !== id);
    setBusinesses(filtered);
    if (activeBusinessId === id) {
      setActiveBusinessId(filtered[0]?.id ?? "");
    }
  };

  return {
    businesses,
    activeBusiness,
    activeBusinessId,
    storeIdentity,
    semantics,
    toggleModule,
    createBusiness,
    switchBusiness,
    updateBusiness,
    setChannelConnection,
    disconnectChannel,
    updateStoreIdentity,
    deleteBusiness,
  };
}

export type BusinessesState = ReturnType<typeof useBusinesses>;

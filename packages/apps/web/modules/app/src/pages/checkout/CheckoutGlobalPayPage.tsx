import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router';
import { CreditCard, Building2, CheckCircle2, ShieldCheck, Lock, Loader2, ArrowLeft } from 'lucide-react';
import { getSupabase, ESQUEMA } from '../../lib/supabase';

// Logo SVG estilizado de GlobalPay de Redeban
const GlobalPayLogo: React.FC<{ className?: string }> = ({ className = "h-10" }) => (
  <div className={`flex items-center gap-3 select-none ${className}`}>
    {/* Flor multicolor corporativa de 8 aspas tipo molinillo de Redeban */}
    <svg className="h-10 w-10 flex-shrink-0" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M50 50 C50 30 65 15 75 25 C85 35 70 50 50 50 Z" fill="#0284c7" opacity="0.95" />
      <path d="M50 50 C70 50 85 65 75 75 C65 85 50 70 50 50 Z" fill="#0ea5e9" opacity="0.95" />
      <path d="M50 50 C50 70 35 85 25 75 C15 65 30 50 50 50 Z" fill="#f59e0b" opacity="0.95" />
      <path d="M50 50 C30 50 15 35 25 25 C35 15 50 30 50 50 Z" fill="#1e3a8a" opacity="0.95" />
      <path d="M50 50 C55 35 75 35 70 48 C65 60 55 52 50 50 Z" fill="#ef4444" opacity="0.9" />
      <path d="M50 50 C65 55 65 75 52 70 C40 65 48 55 50 50 Z" fill="#ea580c" opacity="0.9" />
      <path d="M50 50 C45 65 25 65 30 52 C35 40 45 48 50 50 Z" fill="#a855f7" opacity="0.9" />
      <path d="M50 50 C35 45 35 25 48 30 C60 35 52 45 50 50 Z" fill="#14b8a6" opacity="0.9" />
      <circle cx="50" cy="50" r="6" fill="#ffffff" />
    </svg>
    <div className="flex flex-col leading-none">
      <div className="flex items-baseline text-2xl font-black tracking-tight">
        <span className="text-[#152e59]">Global</span>
        <span className="text-[#ea7a24]">Pay</span>
      </div>
      <div className="text-[11px] font-semibold text-gray-500 tracking-wide mt-0.5 flex items-center gap-1">
        <span>de</span>
        <span className="text-[#152e59] font-bold">Redeban</span>
        <span className="w-1.5 h-1.5 rounded-full bg-[#e11d48] inline-block"></span>
      </div>
    </div>
  </div>
);

export const CheckoutGlobalPayPage: React.FC = () => {
  const { ref } = useParams<{ ref?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Estados de datos de la compra
  const chatId = searchParams.get('chatId') || '';
  const [nombre, setNombre] = useState(searchParams.get('nombre') || '');
  const [apellido, setApellido] = useState(searchParams.get('apellido') || '');
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [referencia, setReferencia] = useState(ref || searchParams.get('ref') || 'WEB-0001');
  const [descripcion, setDescripcion] = useState(searchParams.get('descripcion') || 'Necto Pedidos - Orden');
  const [moneda] = useState('COP');
  const [total, setTotal] = useState<number>(Number(searchParams.get('total')) || 56900);
  const [aceptaTerminos, setAceptaTerminos] = useState(true);

  // Estados de interacción y pago
  const [modalMetodo, setModalMetodo] = useState<'tarjeta' | 'pse' | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [pagoAprobado, setPagoAprobado] = useState(false);
  const [idTransaccion, setIdTransaccion] = useState('');
  const [metodoUsado, setMetodoUsado] = useState<'tarjeta' | 'pse'>('tarjeta');

  // Formulario tarjeta
  const [tarjetaNumero, setTarjetaNumero] = useState('4532 •••• •••• 8920');
  const [tarjetaVence, setTarjetaVence] = useState('11/28');
  const [tarjetaCvv, setTarjetaCvv] = useState('892');
  const [tarjetaCuotas, setTarjetaCuotas] = useState('1');

  // Formulario PSE
  const [pseBanco, setPseBanco] = useState('Bancolombia');
  const [pseTipoPersona, setPseTipoPersona] = useState('natural');
  const [pseDocumento, setPseDocumento] = useState('1020304050');

  // Carga inicial o lectura desde BD
  useEffect(() => {
    // Si viene nombre completo en searchParams (ej: cliente=Jessy Quinto)
    const paramCliente = searchParams.get('cliente');
    if (paramCliente && (!nombre || !apellido)) {
      const partes = paramCliente.trim().split(/\s+/);
      if (partes.length >= 2) {
        setNombre(partes[0]);
        setApellido(partes.slice(1).join(' '));
      } else if (partes.length === 1) {
        setNombre(partes[0]);
        setApellido('Cliente');
      }
    } else if (!nombre && !apellido) {
      // Valores por defecto como en la captura
      setNombre('Jessy');
      setApellido('Quinto');
      setEmail('Quintojessy@gmail.com');
    }

    // Buscar pedido en Supabase si está disponible
    const cargarPedidoDesdeBD = async () => {
      const sb = getSupabase();
      if (!sb || !referencia) return;

      try {
        const { data, error } = await sb
          .schema(ESQUEMA)
          .from('pedido')
          .select('id, numero, cliente, total, estado, direccion_entrega')
          .or(`numero.eq.${referencia},id.eq.${referencia}`)
          .maybeSingle();

        if (!error && data) {
          if (data.cliente) {
            const partes = data.cliente.trim().split(/\s+/);
            if (partes.length >= 2) {
              setNombre(partes[0]);
              setApellido(partes.slice(1).join(' '));
            } else {
              setNombre(data.cliente);
            }
          }
          if (data.total) setTotal(Number(data.total));
          if (data.numero) setReferencia(data.numero);
          setDescripcion(`Necto Pedidos - Orden #${data.numero}`);
        }
      } catch (e) {
        console.warn('[CheckoutGlobalPay] Modo offline/demo', e);
      }
    };

    cargarPedidoDesdeBD();
  }, [referencia, searchParams]);

  // Formateador de moneda en pesos colombianos con formato exacto "$ 56.900,00"
  const formatearCOP = (valor: number) => {
    const formateado = Number(valor).toLocaleString('es-CO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `$ ${formateado}`;
  };

  // Simulación de procesamiento de pago con Redeban
  const procesarPago = async () => {
    if (!aceptaTerminos) {
      alert('Debes aceptar la Política de tratamiento de datos personales para continuar.');
      return;
    }

    setProcesando(true);
    setMetodoUsado(modalMetodo || 'tarjeta');

    // Simular latencia de pasarela bancaria
    setTimeout(async () => {
      const txCode = 'RED-' + Math.floor(100000 + Math.random() * 900000);
      setIdTransaccion(txCode);
      setProcesando(false);
      setModalMetodo(null);
      setPagoAprobado(true);

      // Intentar actualizar el pedido en Supabase si existe
      try {
        const sb = getSupabase();
        if (sb && referencia) {
          await sb
            .schema(ESQUEMA)
            .from('pedido')
            .update({
              estado: 'confirmado',
              metodo_pago: modalMetodo === 'pse' ? 'pse' : 'tarjeta',
            })
            .eq('numero', referencia);
        }
      } catch (err) {
        console.warn('[CheckoutGlobalPay] No se pudo sincronizar estado con BD', err);
      }

      // Notificar al bot de Telegram que el pago fue recibido con éxito
      const botToken = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
      if (chatId && botToken) {
        const metodoTxt = modalMetodo === 'pse' ? 'PSE (Débito en cuenta)' : 'Tarjeta de Crédito / Débito';
        const msgAprobado = `✅ <b>¡PAGO CONFIRMADO CON ÉXITO!</b>\n<blockquote>` +
          `<b>Orden:</b> <code>#${referencia}</code>\n` +
          `<b>Monto pagado:</b> <code>${formatearCOP(total)} COP</code>\n` +
          `<b>Método:</b> ${metodoTxt}\n` +
          `<b>Comprobante Redeban:</b> <code>${txCode}</code>\n` +
          `<b>Estado:</b> 👨‍🍳 Confirmado (En preparación)</blockquote>\n\n` +
          `¡Muchas gracias por tu compra! Tu pedido ya pasó a preparación en cocina y te estaremos avisando cuando esté listo. 🛵`;

        fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: msgAprobado,
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [{ text: '📦 Consultar estado de mi pedido', callback_data: 'estado_pedido' }]
              ]
            }
          }),
        }).catch((err) => console.warn('[CheckoutGlobalPay] Error notificando Telegram:', err));
      }
    }, 1600);
  };

  return (
    <div className="min-h-screen bg-[#f4f5f8] flex flex-col font-sans text-gray-800 antialiased selection:bg-[#ea7a24] selection:text-white">
      {/* ── BARRA SUPERIOR BLANCA CON LOGO GLOBALPAY DE REDEBAN ── */}
      <header className="w-full bg-white border-b border-gray-200/80 px-6 sm:px-14 py-4 flex items-center justify-between shadow-xs">
        <GlobalPayLogo />
        <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span className="hidden sm:inline">Transacción segura cifrada a 256 bits</span>
        </div>
      </header>

      {/* ── CONTENIDO PRINCIPAL (TARJETA CENTRADA) ── */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-4xl bg-white rounded-lg border border-gray-200 shadow-sm p-6 sm:p-10">
          {pagoAprobado ? (
            /* ── VOUCHER DE COMPROBANTE DE PAGO APROBADO ── */
            <div className="py-8 text-center max-w-md mx-auto space-y-6 animate-fadeIn">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <span className="inline-block bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-2">
                  Transacción Aprobada
                </span>
                <h2 className="text-2xl font-bold text-gray-900">¡Pago Exitoso!</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Tu orden ha sido confirmada y recibida por el restaurante/comercio.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-5 border border-gray-200 text-left text-sm space-y-2.5">
                <div className="flex justify-between">
                  <span className="text-gray-500">Comercio:</span>
                  <span className="font-semibold text-gray-800">Necto Pedidos</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Referencia:</span>
                  <span className="font-mono font-semibold text-gray-800">#{referencia}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">N° Transacción Redeban:</span>
                  <span className="font-mono text-gray-700">{idTransaccion}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Método de pago:</span>
                  <span className="font-medium text-gray-800 uppercase">{metodoUsado === 'pse' ? 'PSE (Débito en cuenta)' : 'Tarjeta de Crédito / Débito'}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2 font-bold">
                  <span className="text-gray-900">Monto pagado:</span>
                  <span className="text-[#ea7a24] text-base">{formatearCOP(total)} COP</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => setPagoAprobado(false)}
                  className="px-5 py-2.5 rounded text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  Ver resumen de compra
                </button>
                <button
                  type="button"
                  onClick={() => window.open('https://t.me/NectoPedidosBot', '_blank')}
                  className="px-6 py-2.5 rounded text-xs font-semibold text-white bg-[#ea7a24] hover:bg-[#d96a17] transition-colors shadow-sm"
                >
                  Volver al Bot de Telegram 🤖
                </button>
              </div>
            </div>
          ) : (
            /* ── FORMULARIO Y SELECCIÓN DE PAGO (DISEÑO EXACTO GLOBALPAY) ── */
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
              {/* COLUMNA IZQUIERDA: DETALLES DE TU COMPRA */}
              <div className="md:col-span-7 space-y-4">
                <h1 className="text-xl font-medium text-[#ea7a24] tracking-tight">
                  Detalles de tu compra
                </h1>

                {/* Fila 1: Nombre y Apellido */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Nombre</label>
                    <input
                      type="text"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      className="w-full h-9 px-3 text-sm bg-white border border-gray-300 rounded focus:border-[#ea7a24] focus:ring-1 focus:ring-[#ea7a24] outline-none transition-all"
                      placeholder="Nombre"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Apellido</label>
                    <input
                      type="text"
                      value={apellido}
                      onChange={(e) => setApellido(e.target.value)}
                      className="w-full h-9 px-3 text-sm bg-white border border-gray-300 rounded focus:border-[#ea7a24] focus:ring-1 focus:ring-[#ea7a24] outline-none transition-all"
                      placeholder="Apellido"
                    />
                  </div>
                </div>

                {/* Fila 2: Correo electrónico y Número de referencia */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Correo electrónico</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-9 px-3 text-sm bg-white border border-gray-300 rounded focus:border-[#ea7a24] focus:ring-1 focus:ring-[#ea7a24] outline-none transition-all"
                      placeholder="ejemplo@correo.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Número de referencia</label>
                    <input
                      type="text"
                      value={referencia}
                      readOnly
                      className="w-full h-9 px-3 text-sm bg-[#e9edf2] text-gray-700 font-mono border border-gray-300 rounded outline-none cursor-not-allowed select-none"
                    />
                  </div>
                </div>

                {/* Fila 3: Descripción, Moneda y Valor */}
                <div className="grid grid-cols-12 gap-2 sm:gap-3">
                  <div className="col-span-12 sm:col-span-5">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Descripción</label>
                    <input
                      type="text"
                      value={descripcion}
                      onChange={(e) => setDescripcion(e.target.value)}
                      className="w-full h-9 px-3 text-sm bg-white border border-gray-300 rounded focus:border-[#ea7a24] focus:ring-1 focus:ring-[#ea7a24] outline-none transition-all truncate"
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Moneda</label>
                    <input
                      type="text"
                      value={moneda}
                      readOnly
                      className="w-full h-9 px-3 text-sm bg-[#e9edf2] text-gray-700 font-bold text-center border border-gray-300 rounded outline-none cursor-not-allowed"
                    />
                  </div>
                  <div className="col-span-8 sm:col-span-5">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Valor de la compra</label>
                    <input
                      type="text"
                      value={formatearCOP(total)}
                      readOnly
                      className="w-full h-9 px-3 text-sm bg-[#e9edf2] text-gray-800 font-semibold border border-gray-300 rounded outline-none cursor-not-allowed text-right sm:text-left"
                    />
                  </div>
                </div>

                {/* Checkbox de Habeas Data */}
                <div className="pt-2 flex items-center gap-2.5">
                  <input
                    id="habeasData"
                    type="checkbox"
                    checked={aceptaTerminos}
                    onChange={(e) => setAceptaTerminos(e.target.checked)}
                    className="w-4 h-4 text-[#ea7a24] rounded border-gray-300 focus:ring-[#ea7a24] cursor-pointer"
                  />
                  <label htmlFor="habeasData" className="text-xs text-gray-600 select-none cursor-pointer">
                    Acepto{' '}
                    <span className="text-[#0284c7] hover:underline cursor-pointer">
                      Política tratamiento datos Personales
                    </span>
                  </label>
                </div>
              </div>

              {/* COLUMNA DERECHA: MONTO GRANDE Y MÉTODOS DE PAGO */}
              <div className="md:col-span-5 flex flex-col items-center justify-center text-center pt-2 sm:pt-4 md:border-l md:border-gray-100 md:pl-8">
                {/* Gran cifra en naranja brillante */}
                <div className="mb-6">
                  <span className="text-3xl sm:text-4xl font-bold text-[#ea7a24] tracking-tight">
                    {formatearCOP(total)} <span className="text-xl sm:text-2xl font-semibold">COP</span>
                  </span>
                </div>

                {/* Título de Métodos de Pago */}
                <h3 className="text-lg font-medium text-[#ea7a24] mb-4">
                  Métodos de pago
                </h3>

                {/* Botones de Pago idénticos al screenshot */}
                <div className="w-full max-w-xs space-y-3">
                  <button
                    type="button"
                    onClick={() => setModalMetodo('tarjeta')}
                    className="w-full py-3 px-4 bg-[#ea933e] hover:bg-[#df832a] active:bg-[#c96f18] text-white text-xs font-bold uppercase tracking-wider rounded transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CreditCard className="w-4 h-4" />
                    PAGAR CON TARJETA
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalMetodo('pse')}
                    className="w-full py-3 px-4 bg-[#ea933e] hover:bg-[#df832a] active:bg-[#c96f18] text-white text-xs font-bold uppercase tracking-wider rounded transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Building2 className="w-4 h-4" />
                    PAGAR CON PSE
                  </button>
                </div>

                <div className="mt-6 flex items-center gap-1.5 text-[11px] text-gray-400">
                  <Lock className="w-3.5 h-3.5 text-gray-400" />
                  <span>Procesado por Redeban Multicolor S.A.</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── MODAL SENCILLO DE PAGO (TARJETA O PSE) ── */}
      {modalMetodo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
            {/* Cabecera del modal */}
            <div className="bg-[#ea7a24] text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-sm">
                {modalMetodo === 'tarjeta' ? <CreditCard className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                <span>{modalMetodo === 'tarjeta' ? 'Pagar con Tarjeta de Crédito / Débito' : 'Pagar con PSE (Débito Bancario)'}</span>
              </div>
              <button
                type="button"
                onClick={() => setModalMetodo(null)}
                className="text-white/80 hover:text-white text-lg leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Contenido del modal */}
            <div className="p-5 space-y-4">
              {modalMetodo === 'tarjeta' ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Número de tarjeta</label>
                    <input
                      type="text"
                      value={tarjetaNumero}
                      onChange={(e) => setTarjetaNumero(e.target.value)}
                      placeholder="4532 0000 0000 0000"
                      className="w-full h-9 px-3 text-sm border border-gray-300 rounded focus:border-[#ea7a24] outline-none font-mono"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Vence (MM/AA)</label>
                      <input
                        type="text"
                        value={tarjetaVence}
                        onChange={(e) => setTarjetaVence(e.target.value)}
                        placeholder="12/28"
                        className="w-full h-9 px-3 text-sm border border-gray-300 rounded focus:border-[#ea7a24] outline-none text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">CVV</label>
                      <input
                        type="password"
                        maxLength={4}
                        value={tarjetaCvv}
                        onChange={(e) => setTarjetaCvv(e.target.value)}
                        placeholder="123"
                        className="w-full h-9 px-3 text-sm border border-gray-300 rounded focus:border-[#ea7a24] outline-none text-center"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Cuotas</label>
                    <select
                      value={tarjetaCuotas}
                      onChange={(e) => setTarjetaCuotas(e.target.value)}
                      className="w-full h-9 px-3 text-sm border border-gray-300 rounded focus:border-[#ea7a24] outline-none bg-white"
                    >
                      <option value="1">1 cuota (Sin interés)</option>
                      <option value="2">2 cuotas</option>
                      <option value="3">3 cuotas</option>
                      <option value="6">6 cuotas</option>
                      <option value="12">12 cuotas</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Selecciona tu Banco</label>
                    <select
                      value={pseBanco}
                      onChange={(e) => setPseBanco(e.target.value)}
                      className="w-full h-9 px-3 text-sm border border-gray-300 rounded focus:border-[#ea7a24] outline-none bg-white font-medium"
                    >
                      <option value="Bancolombia">Bancolombia</option>
                      <option value="Davivienda">Davivienda</option>
                      <option value="Nequi">Nequi</option>
                      <option value="Daviplata">Daviplata</option>
                      <option value="Banco de Bogotá">Banco de Bogotá</option>
                      <option value="BBVA Colombia">BBVA Colombia</option>
                      <option value="Scotiabank Colpatria">Scotiabank Colpatria</option>
                      <option value="Banco de Occidente">Banco de Occidente</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Tipo de Persona</label>
                      <select
                        value={pseTipoPersona}
                        onChange={(e) => setPseTipoPersona(e.target.value)}
                        className="w-full h-9 px-2 text-sm border border-gray-300 rounded focus:border-[#ea7a24] outline-none bg-white"
                      >
                        <option value="natural">Natural</option>
                        <option value="juridica">Jurídica</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Cédula / NIT</label>
                      <input
                        type="text"
                        value={pseDocumento}
                        onChange={(e) => setPseDocumento(e.target.value)}
                        placeholder="N° de identificación"
                        className="w-full h-9 px-3 text-sm border border-gray-300 rounded focus:border-[#ea7a24] outline-none"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-tight">
                    Serás redirigido de forma segura a la pasarela de tu entidad bancaria registrada en PSE.
                  </p>
                </div>
              )}

              {/* Botón de confirmación */}
              <div className="pt-2">
                <button
                  type="button"
                  disabled={procesando}
                  onClick={procesarPago}
                  className="w-full py-2.5 px-4 bg-[#ea7a24] hover:bg-[#d96a17] active:bg-[#c2590b] text-white text-sm font-semibold rounded transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {procesando ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Procesando pago con Redeban...</span>
                    </>
                  ) : (
                    <span>Confirmar Pago de {formatearCOP(total)} COP</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── FOOTER CORPORATIVO EXACTO DEL SCREENSHOT ── */}
      <footer className="w-full bg-[#ea7a24] text-white py-2.5 px-4 text-center text-[11px] sm:text-xs font-normal tracking-wide shadow-inner">
        © 2018 2026 Copyright: GlobalPay Redeban®. All rights reserved.
      </footer>
    </div>
  );
};

export default CheckoutGlobalPayPage;

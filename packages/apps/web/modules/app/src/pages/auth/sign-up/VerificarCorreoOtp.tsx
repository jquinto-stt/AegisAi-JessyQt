import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { verificarCodigoOtp, reenviarCodigoOtp } from "@/lib/auth.service";

interface VerificarCorreoOtpProps {
  email: string;
  onEditarCorreo?: () => void;
  onVerificadoExitoso?: () => void;
}

export function VerificarCorreoOtp({
  email,
  onEditarCorreo,
  onVerificadoExitoso,
}: VerificarCorreoOtpProps) {
  const NUM_DIGITOS = 8;
  const [digitos, setDigitos] = useState<string[]>(Array(NUM_DIGITOS).fill(""));
  const [cargando, setCargando] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [errorMensaje, setErrorMensaje] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [segundosCooldown, setSegundosCooldown] = useState(30);

  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const navigate = useNavigate();

  // Enfocar el primer input al montar
  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  // Temporizador para reenvío de código
  useEffect(() => {
    if (segundosCooldown <= 0) return;
    const timer = setInterval(() => {
      setSegundosCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [segundosCooldown]);

  const handleDigitoChange = (index: number, valor: string) => {
    const soloDigito = valor.replace(/\D/g, "");
    if (!soloDigito && valor !== "") return;

    const char = soloDigito.slice(-1);
    const nuevo = [...digitos];
    nuevo[index] = char;
    setDigitos(nuevo);
    setErrorMensaje(null);

    // Avanzar automáticamente si se ingresó dígito
    if (char && index < NUM_DIGITOS - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!digitos[index] && index > 0) {
        inputsRef.current[index - 1]?.focus();
      } else {
        const nuevo = [...digitos];
        nuevo[index] = "";
        setDigitos(nuevo);
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < NUM_DIGITOS - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const textoPegado = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, NUM_DIGITOS);
    if (!textoPegado) return;

    const nuevo = Array(NUM_DIGITOS).fill("");
    for (let i = 0; i < textoPegado.length; i++) {
      nuevo[i] = textoPegado[i] || "";
    }
    setDigitos(nuevo);
    setErrorMensaje(null);

    const nextFocusIndex = Math.min(textoPegado.length, NUM_DIGITOS - 1);
    inputsRef.current[nextFocusIndex]?.focus();
  };

  const codigoCompleto = digitos.join("");
  const esCodigoCompleto = codigoCompleto.length === 8 || codigoCompleto.length === 6;

  const handleConfirmar = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!esCodigoCompleto || cargando) return;

    setCargando(true);
    setErrorMensaje(null);
    setMensajeExito(null);

    try {
      const res = await verificarCodigoOtp(email, codigoCompleto);
      if (!res.ok) {
        setErrorMensaje(res.motivo || "Código incorrecto o expirado.");
        return;
      }

      setMensajeExito("¡Código verificado con éxito! Redirigiendo...");
      if (onVerificadoExitoso) {
        onVerificadoExitoso();
      } else {
        setTimeout(() => {
          if (res.requiereOnboarding) {
            navigate("/onboarding/bienvenida");
          } else {
            navigate("/");
          }
        }, 600);
      }
    } catch {
      setErrorMensaje("Error al conectar con el servidor para validar el código.");
    } finally {
      setCargando(false);
    }
  };

  const handleReenviar = async () => {
    if (segundosCooldown > 0 || reenviando) return;

    setReenviando(true);
    setErrorMensaje(null);
    try {
      const res = await reenviarCodigoOtp(email);
      if (!res.ok) {
        setErrorMensaje(res.motivo || "No se pudo reenviar el código. Intenta de nuevo.");
      } else {
        setMensajeExito("Se ha enviado un nuevo código de verificación a tu correo.");
        setSegundosCooldown(45);
        setDigitos(Array(NUM_DIGITOS).fill(""));
        inputsRef.current[0]?.focus();
      }
    } catch {
      setErrorMensaje("Error de red al reenviar el código.");
    } finally {
      setReenviando(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 w-full overflow-y-auto lg:w-1/2 no-scrollbar font-sans">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto px-6 py-8">
        {/* Logo superior Necto */}
        <div className="mb-8">
          <img
            src="/images/logo/necto-full-white.svg"
            alt="Necto"
            className="hidden h-9 w-auto dark:block"
          />
          <img
            src="/images/logo/logo-principal.svg"
            alt="Necto"
            className="h-9 w-auto dark:hidden"
            onError={(e) => {
              (e.target as HTMLElement).style.display = "none";
            }}
          />
        </div>

        {/* Botón volver a editar correo */}
        {onEditarCorreo && (
          <div className="mb-6">
            <button
              type="button"
              onClick={onEditarCorreo}
              className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400 transition-colors cursor-pointer group"
            >
              <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center group-hover:bg-brand-500/10 dark:group-hover:bg-brand-500/20 transition-colors">
                <ArrowLeft className="w-3.5 h-3.5 group-hover:text-brand-500 transition-colors" />
              </div>
              <span>Edita tu correo</span>
            </button>
          </div>
        )}

        {/* Encabezado */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-ink-title dark:text-white sm:text-3xl">
            Verifica tu correo
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            Enviamos tu código de verificación a{" "}
            <span className="font-bold text-ink-title dark:text-gray-100">
              {email}
            </span>
          </p>
        </div>

        {/* Notificaciones */}
        {errorMensaje && (
          <div
            role="alert"
            className="p-3.5 mb-6 text-sm text-error-700 bg-error-50 border border-error-200 rounded-2xl dark:bg-error-950/40 dark:text-error-300 dark:border-error-800 flex items-start gap-2.5 animate-in fade-in duration-200"
          >
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-error-500" />
            <span className="flex-1 text-xs leading-relaxed font-medium">{errorMensaje}</span>
          </div>
        )}

        {mensajeExito && (
          <div
            role="status"
            className="p-3.5 mb-6 text-sm text-brand-800 bg-brand-50 border border-brand-200 rounded-2xl dark:bg-brand-950/40 dark:text-brand-300 dark:border-brand-800 flex items-start gap-2.5 animate-in fade-in duration-200"
          >
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-brand-500" />
            <span className="flex-1 text-xs leading-relaxed font-medium">{mensajeExito}</span>
          </div>
        )}

        {/* Formulario de Código */}
        <form onSubmit={handleConfirmar}>
          <div className="space-y-6">
            <div>
              <label className="block mb-2.5 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Código de verificación
              </label>

              {/* Contenedor de 8 inputs con tipografía DM Sans y anillo Necto */}
              <div className="grid grid-cols-8 gap-1.5 sm:gap-2" onPaste={handlePaste}>
                {digitos.map((digito, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      inputsRef.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digito}
                    disabled={cargando}
                    onChange={(e) => handleDigitoChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className="w-full aspect-square text-center text-lg sm:text-xl font-bold font-sans text-ink-title bg-gray-50/80 border border-gray-300 rounded-xl focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 dark:bg-gray-800/80 dark:border-gray-700 dark:text-white dark:focus:bg-gray-900 dark:focus:border-brand-400 dark:focus:ring-brand-400/25 transition-all outline-hidden shadow-xs"
                    autoComplete="one-time-code"
                  />
                ))}
              </div>
            </div>

            {/* Reenviar código */}
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-1">
              <span>¿No recibiste el código?</span>
              {segundosCooldown > 0 ? (
                <span className="text-gray-400 font-medium">
                  Reenviar en {segundosCooldown}s
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleReenviar}
                  disabled={reenviando}
                  className="font-bold text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {reenviando ? "Reenviando..." : "Reenviar código"}
                </button>
              )}
            </div>

            {/* Botón Confirmar en Naranja de Marca Necto */}
            <button
              type="submit"
              disabled={!esCodigoCompleto || cargando}
              className="w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white bg-brand-500 hover:bg-brand-600 active:scale-[0.99] transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2"
            >
              {cargando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verificando...</span>
                </>
              ) : (
                <span>Confirmar</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

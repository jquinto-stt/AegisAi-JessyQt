import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  traducirErrorAuth,
  CREDENCIALES_DEMO,
  iniciarSesion,
  actualizarPerfilRemoto,
  cambiarPassword,
  cerrarSesion,
} from "./auth.service";
import { sessionStore, organizacionStore } from "@/stores";

describe("auth.service — Autenticación y puente con sesión Necto", () => {
  beforeEach(() => {
    sessionStore.reset();
    organizacionStore.reiniciar();
    vi.clearAllMocks();
  });

  describe("traducirErrorAuth", () => {
    it("traduce credenciales inválidas al español claro", () => {
      const err = { message: "Invalid login credentials" };
      expect(traducirErrorAuth(err)).toBe(
        "Correo o contraseña incorrectos. Verifica tus credenciales.",
      );
    });

    it("traduce correo no confirmado", () => {
      const err = { message: "Email not confirmed" };
      expect(traducirErrorAuth(err)).toBe(
        "Tu correo electrónico aún no ha sido confirmado en Supabase.",
      );
    });

    it("traduce límite de tasa / reintentos excesivos", () => {
      const err = { message: "Too many requests, try again later" };
      expect(traducirErrorAuth(err)).toBe(
        "Demasiadas solicitudes en poco tiempo. Por favor espera unos minutos antes de reintentar.",
      );
    });

    it("traduce usuario no encontrado", () => {
      const err = { message: "User not found" };
      expect(traducirErrorAuth(err)).toBe(
        "No existe una cuenta asociada a este correo electrónico.",
      );
    });

    it("traduce fallos de red", () => {
      const err = { message: "Failed to fetch" };
      expect(traducirErrorAuth(err)).toBe(
        "Error de conexión con el servidor. Revisa tu acceso a internet.",
      );
    });

    it("devuelve el mensaje original si no es un patrón conocido", () => {
      const err = { message: "Custom database error" };
      expect(traducirErrorAuth(err)).toBe("Custom database error");
    });
  });

  describe("CREDENCIALES_DEMO", () => {
    it("contiene los datos canónicos del usuario demo en Supabase", () => {
      expect(CREDENCIALES_DEMO.email).toBe("demo@necto.io");
      expect(CREDENCIALES_DEMO.password).toBe("DemoNecto2026!");
    });
  });

  describe("actualizarPerfilRemoto", () => {
    it("actualiza inmediatamente el usuario en el store de organización", async () => {
      await actualizarPerfilRemoto({
        nombre: "Carlos",
        apellido: "Gómez",
        cargo: "Director de Operaciones",
        bio: "Liderando logística y bodegas",
        telefono: "+57 300 123 4567",
      });

      expect(organizacionStore.usuario?.nombre).toBe("Carlos");
      expect(organizacionStore.usuario?.apellido).toBe("Gómez");
      expect(organizacionStore.usuario?.cargo).toBe("Director de Operaciones");
      expect(organizacionStore.usuario?.bio).toBe("Liderando logística y bodegas");
      expect(organizacionStore.usuario?.telefono).toBe("+57 300 123 4567");
    });
  });

  describe("cambiarPassword", () => {
    it("valida que la contraseña tenga al menos 6 caracteres", async () => {
      const res = await cambiarPassword("123");
      expect(res.ok).toBe(false);
      expect(res.motivo).toBe("La nueva contraseña debe tener al menos 6 caracteres.");
    });
  });

  describe("cerrarSesion", () => {
    it("limpia el sessionStore completamente", async () => {
      // Configuramos una sesión simulada
      sessionStore.configurar(["pedidos"], "administrador");
      expect(sessionStore.isReady).toBe(true);

      await cerrarSesion();
      expect(sessionStore.isReady).toBe(false);
      expect(sessionStore.modulos).toEqual([]);
      expect(sessionStore.tipoSesion).toBeNull();
    });
  });
});

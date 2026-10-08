import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TextoMensajeFormateado } from "./TextoMensajeFormateado";

describe("TextoMensajeFormateado — renderizado de enlaces", () => {
  it("renderiza enlaces HTML <a href=...> como elemento <a> clickable", () => {
    const texto =
      'Catálogo interactivo: <a href="https://challenge-bytes-wrapping-auctions.trycloudflare.com/menu?cliente=Mariana&sede=Sede%20Principal&direccion=Realizar%20pedido%20%F0%9F%A5%AA&chatId=7965993532&modalidad=domicilio">Abrir catálogo en línea</a>';

    const html = renderToStaticMarkup(<TextoMensajeFormateado texto={texto} />);

    expect(html).toContain(
      'href="https://challenge-bytes-wrapping-auctions.trycloudflare.com/menu?cliente=Mariana&amp;sede=Sede%20Principal&amp;direccion=Realizar%20pedido%20%F0%9F%A5%AA&amp;chatId=7965993532&amp;modalidad=domicilio"',
    );
    expect(html).toContain("Abrir catálogo en línea");
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain("Catálogo interactivo:");
    // Verifica que no se quedó el texto crudo <a href=... sin parsear
    expect(html).not.toContain("&lt;a");
  });

  it("renderiza enlaces markdown [texto](url) como enlace clickable", () => {
    const texto = "Mira nuestro [Catálogo](https://example.com/catalogo) aquí";
    const html = renderToStaticMarkup(<TextoMensajeFormateado texto={texto} />);

    expect(html).toContain('href="https://example.com/catalogo"');
    expect(html).toContain("Catálogo");
    expect(html).not.toContain("[Catálogo]");
  });

  it("renderiza URLs directas como enlaces clickables", () => {
    const texto = "Ingresa a https://example.com para más información.";
    const html = renderToStaticMarkup(<TextoMensajeFormateado texto={texto} />);

    expect(html).toContain('href="https://example.com"');
    expect(html).toContain("https://example.com");
  });
});

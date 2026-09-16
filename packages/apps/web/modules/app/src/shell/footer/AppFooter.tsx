/**
 * AppFooter — NECTO branded footer.
 *
 * Orange band with the white logo, three link columns (Nosotros, Servicios,
 * Contacto), social icons, and an indigo copyright bar at the bottom.
 */

interface FooterColumn {
  title: string;
  links: { label: string; href: string }[];
}

const columns: FooterColumn[] = [
  {
    title: "Nosotros",
    links: [
      { label: "Plataforma Necto", href: "#" },
      { label: "Tecnologia IA", href: "#" },
      { label: "Restaurantes & SST", href: "#" },
    ],
  },
  {
    title: "Servicios",
    links: [
      { label: "Gestion de Pedidos", href: "#" },
      { label: "KDS Cocina", href: "#" },
      { label: "Catalogo de Productos", href: "#" },
    ],
  },
  {
    title: "Contacto",
    links: [
      { label: "Soporte Tecnico", href: "#" },
      { label: "Mesa de Ayuda", href: "#" },
      { label: "Comunidad", href: "#" },
    ],
  },
];

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
    <path d="M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.8.3 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.3 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.8-.3-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c.1-1.2.3-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2zm0 1.8c-3.1 0-3.5 0-4.7.1-1.1.1-1.7.2-2.1.4-.5.2-.9.4-1.3.8-.4.4-.6.8-.8 1.3-.2.4-.3 1-.4 2.1-.1 1.2-.1 1.6-.1 4.7s0 3.5.1 4.7c.1 1.1.2 1.7.4 2.1.2.5.4.9.8 1.3.4.4.8.6 1.3.8.4.2 1 .3 2.1.4 1.2.1 1.6.1 4.7.1s3.5 0 4.7-.1c1.1-.1 1.7-.2 2.1-.4.5-.2.9-.4 1.3-.8.4-.4.6-.8.8-1.3.2-.4.3-1 .4-2.1.1-1.2.1-1.6.1-4.7s0-3.5-.1-4.7c-.1-1.1-.2-1.7-.4-2.1-.2-.5-.4-.9-.8-1.3-.4-.4-.8-.6-1.3-.8-.4-.2-1-.3-2.1-.4-1.2-.1-1.6-.1-4.7-.1zm0 3.1a4.9 4.9 0 110 9.8 4.9 4.9 0 010-9.8zm0 8.1a3.2 3.2 0 100-6.4 3.2 3.2 0 000 6.4zm6.2-8.3a1.1 1.1 0 11-2.3 0 1.1 1.1 0 012.3 0z" />
  </svg>
);

const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
    <path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3v9zM6.5 8.3a1.7 1.7 0 110-3.5 1.7 1.7 0 010 3.5zM19 19h-3v-4.7c0-1.1 0-2.5-1.5-2.5s-1.8 1.2-1.8 2.4V19h-3v-9h2.9v1.2h.04a3.2 3.2 0 012.9-1.6c3 0 3.6 2 3.6 4.6V19z" />
  </svg>
);

const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
    <path d="M17.5 3h2.9l-6.4 7.3L21.5 21h-5.9l-4.6-6-5.3 6H2.8l6.8-7.8L2.3 3h6l4.2 5.5L17.5 3zm-1 16.2h1.6L8.1 4.7H6.4l10.1 14.5z" />
  </svg>
);

export const AppFooter = () => {
  return (
    <footer className="mt-6 overflow-hidden rounded-3xl bg-brand-500 text-white">
      {/* Main band */}
      <div className="grid grid-cols-1 gap-8 px-8 py-10 md:grid-cols-4">
        {/* Brand */}
        <div className="flex flex-col gap-4">
          <img
            src="/images/logo/necto-full-white.svg"
            alt="NECTO"
            className="h-6 w-auto self-start"
          />
          <div className="flex gap-3">
            <a href="#" aria-label="Instagram" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 transition-colors hover:bg-white/25">
              <InstagramIcon />
            </a>
            <a href="#" aria-label="LinkedIn" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 transition-colors hover:bg-white/25">
              <LinkedInIcon />
            </a>
            <a href="#" aria-label="X" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 transition-colors hover:bg-white/25">
              <XIcon />
            </a>
          </div>
        </div>

        {/* Link columns */}
        {columns.map((col) => (
          <div key={col.title} className="flex flex-col gap-3">
            <h3 className="text-sm font-bold uppercase tracking-wide">{col.title}</h3>
            <ul className="flex flex-col gap-2">
              {col.links.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm text-white/85 transition-colors hover:text-white">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Copyright bar */}
      <div className="bg-secondary-600 px-8 py-3 text-center">
        <p className="text-xs text-white/90">
          &copy; 2026 Necto. Plataforma de Operaciones y Gestion para Restaurantes. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
};

export default AppFooter;

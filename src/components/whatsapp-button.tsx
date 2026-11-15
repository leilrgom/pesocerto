"use client";

import { usePathname } from "next/navigation";

export function WhatsAppButton() {
  const isWebsite = usePathname() === "/home";

  return (
    <a
      className={`whatsapp-button ${isWebsite ? "whatsapp-website" : "whatsapp-app"}`}
      href="https://wa.me/5511979836303"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar pelo WhatsApp: (11) 97983-6303 (abre em nova aba)"
      title="Fale conosco pelo WhatsApp"
    >
      <svg
        viewBox="0 0 32 32"
        width="32"
        height="32"
        aria-hidden="true"
        fill="none"
      >
        <path
          d="M27 15.5a11.5 11.5 0 0 1-16.9 10.2L5 27l1.4-5A11.5 11.5 0 1 1 27 15.5Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="m12.1 9.8 1.5 3.2c.1.3.1.5-.1.7l-1.2 1.4c1 2 2.7 3.6 4.8 4.5l1.4-1.6c.2-.2.5-.3.8-.1l3 1.5c.3.1.4.4.3.7-.3 1.8-1.6 2.8-3.3 2.6-5.6-.8-10-5-11-10.5-.3-1.5.6-2.9 2.5-3.2.6-.1 1 .2 1.3.8Z"
          fill="currentColor"
          transform="translate(1 0) scale(.9)"
        />
      </svg>
    </a>
  );
}

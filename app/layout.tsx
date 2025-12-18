import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Comisiones Tecni - Tecnirecargas",
  description: "Sistema de registro y consulta de entregas con autenticación",
  viewport: "width=device-width, initial-scale=1, maximum-scale=5",
  icons: {
    icon: [
      { url: '/favicon.png', type: 'image/png' },
    ],
    apple: [
      { url: '/favicon.png', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

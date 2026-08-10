/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // PDFKit carga sus fuentes AFM desde su propio directorio en tiempo de ejecución.
    serverComponentsExternalPackages: ['pdfkit'],
  },
  outputFileTracingIncludes: {
    '/api/alistamientos/admin/pdf': ['./node_modules/pdfkit/js/data/**'],
  },
}

module.exports = nextConfig



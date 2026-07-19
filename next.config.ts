import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  experimental: {
    serverActions: {
      // Talep oluştururken birden fazla referans (resim/PDF) yüklenebildiğinden
      // toplam gövde sınırı yükseltildi (her dosya yine 10MB ile sınırlı).
      bodySizeLimit: "30mb",
    },
  },
};

export default nextConfig;

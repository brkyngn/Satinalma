# Şantiye Satın Alma Yönetim Sistemi

İnşaat şirketleri için iç satın alma süreçlerini (talep → teklif → onay → sevkiyat → şantiye kabul) yöneten web uygulaması.

## Teknoloji Yığını

- **Next.js 16** (App Router, TypeScript, Tailwind CSS 4)
- **PostgreSQL** + **Prisma ORM 7** (driver adapter: `@prisma/adapter-pg`)
- **Auth.js (NextAuth v5)** — e-posta/şifre (Credentials provider), bcrypt ile hash'lenmiş şifreler, JWT oturum
- **Zod** ile sunucu tarafı doğrulama
- Yüklenen dosyalar (teklif PDF/görselleri, teslimat fotoğrafları) doğrudan Postgres'te `bytea` alanında saklanır — ayrı bir dosya depolama servisi yoktur (10MB limit, PDF/JPG/PNG)

## Roller

`admin`, `requester` (Talep Eden), `purchasing` (Satın Alma Sorumlusu), `approver` (Onaylayıcı), `site_manager` (Şantiye Sorumlusu). Bir kullanıcının birden fazla rolü olabilir. `admin` her şeye erişebilir.

## Kurulum

```bash
npm install
cp .env.example .env   # DATABASE_URL ve AUTH_SECRET değerlerini doldurun
npx prisma migrate deploy   # veya geliştirme sırasında: npx prisma migrate dev
npx prisma db seed
npm run dev
```

`npm run build` otomatik olarak `prisma generate` çalıştırır; `npm run start` ise `prisma migrate deploy` çalıştırdıktan sonra sunucuyu başlatır (bkz. `package.json`).

### Ortam Değişkenleri (`.env.example`)

| Değişken | Açıklama |
|---|---|
| `DATABASE_URL` | PostgreSQL bağlantı adresi. Railway/Render gibi platformlarda proxy kendinden imzalı sertifika kullanabilir; bu proje `ssl: { rejectUnauthorized: false }` ile bunu ele alır — connection string'e `?sslmode=require` **eklemeyin**, çakışmaya neden olur. |
| `AUTH_SECRET` | Oturum imzalama anahtarı. `openssl rand -base64 32` ile üretin. |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | Seed script'in oluşturacağı admin hesabı (opsiyonel, varsayılan: `admin@santiye.local` / `Admin123!`). |

### Seed Script

`prisma/seed.ts`: tüm rolleri, bir admin kullanıcı ve örnek bir proje (`SNT-001`) oluşturur. `NODE_ENV=production` değilse, her rol için birer demo hesap da ekler (şifre: `Demo123!`) — hızlı test için:

- `talep@santiye.local` (requester)
- `satinalma@santiye.local` (purchasing)
- `onay@santiye.local` (approver)
- `santiye@santiye.local` (site_manager)

## İş Akışı

1. **Talep Oluşturma** (`/talepler/yeni`) — requester, çoklu kalem ile → durum: `submitted`
2. **Teklif Toplama** (`/talepler/[id]/teklif-ekle`) — purchasing, manuel + dosya → `quotes_collecting` → "Onaya Sun" → `pending_approval`
3. **Onay** (`/talepler/[id]/onay`) — approver, teklif karşılaştırma + onay/red + yorum → `approved`/`rejected`
4. **Sevkiyat** (`/talepler/[id]/sevkiyat`) — purchasing, sevk tarihi + irsaliye no → `shipped`
5. **Şantiye Kabul** (`/talepler/[id]/kabul`) — site_manager, miktar/durum/fotoğraf → `accepted`/`partially_accepted`

Her durum değişikliği `AuditLog` tablosuna kaydedilir.

## Railway Deploy (önerilen)

Uygulama ve PostgreSQL'i aynı Railway projesinde barındırmak, veritabanı
gecikmesini en aza indirir (özel ağ üzerinden bağlantı, bulutlar arası tur yok).

1. Railway projesinde **New → GitHub Repo** ile bu repoyu ekleyin. `railway.json`
   sayesinde build (`npm run build`) ve start (`npm run start` — önce
   `prisma migrate deploy` çalıştırır) komutları otomatik ayarlanır.
2. Servisin **Variables** sekmesinde şu değişkenleri ekleyin:
   - `DATABASE_URL` = Postgres servisinin **özel** (internal) adresi, ör.
     `postgresql://postgres:PAROLA@postgres.railway.internal:5432/railway`.
     (Railway'de `${{Postgres.DATABASE_URL}}` referansı da kullanılabilir.)
     `railway.internal` içeren adreslerde uygulama TLS'i otomatik kapatır;
     public `*.rlwy.net` adreslerinde ise kendinden imzalı sertifika için
     TLS'i açar. `?sslmode=require` **eklemeyin**.
   - `AUTH_SECRET` = `openssl rand -base64 32` çıktısı.
   - `NODE_ENV` = `production`.
3. **Settings → Networking → Generate Domain** ile public bir alan adı üretin.
   NextAuth `trustHost: true` ile host'u başlıklardan aldığı için ayrıca
   `NEXTAUTH_URL`/`AUTH_URL` gerekmez.
4. İlk deploy'da `prisma migrate deploy` migration'ları uygular. Yönetici
   hesabını oluşturmak için servis kabuğunda (Railway → service → shell) bir kez
   `npx prisma db seed` çalıştırın (varsayılan: `admin@santiye.local` /
   `Admin123!`; `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` ile değiştirilebilir).

**Node sürümü:** Prisma 7 `^20.19 || ^22.12 || >=24.0` gerektirir; `package.json`
`engines` alanı bunu belirtir, Nixpacks buna uyar.

> Render gibi başka bir platform kullanılacaksa: Build `npm ci && npm run build`,
> Start `npm run start`, aynı env değişkenleri. Ancak veritabanı Railway'de
> kalırsa bulutlar arası gecikme yaşanır — bu yüzden Railway önerilir.

## Geliştirme Notları

- `src/proxy.ts` — Next.js 16'da `middleware.ts` dosya kuralı `proxy.ts` olarak değiştirildi; burada sadece oturum durumuna göre yönlendirme (UX) yapılır.
- Gerçek yetkilendirme her sayfada/route handler'da/server action'da `src/lib/rbac.ts` içindeki `requirePageRole` / `requireApiRole` ile ayrıca kontrol edilir (Next.js kendi dokümantasyonuna göre proxy tek başına yeterli değildir).
- Prisma 7'de bağlantı bilgisi `schema.prisma` yerine `prisma.config.ts` + driver adapter üzerinden verilir.

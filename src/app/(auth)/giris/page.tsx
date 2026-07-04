import Image from "next/image";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import { SubmitButton } from "@/components/SubmitButton";

async function girisYap(formData: FormData) {
  "use server";

  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/panel",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/giris?error=1");
    }
    throw error;
  }
}

export default async function GirisPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-brand-navy px-4">
      <div className="w-full max-w-sm rounded-lg border-t-4 border-brand-red bg-white p-8 shadow-xl">
        <div className="mb-6 flex justify-center">
          <Image
            src="/alucon-logo.png"
            alt="Alucon Group"
            width={952}
            height={491}
            priority
            className="h-14 w-auto"
          />
        </div>
        <h1 className="mb-1 text-center text-lg font-semibold text-zinc-900">
          Şantiye Satın Alma Yönetim Sistemi
        </h1>
        <p className="mb-6 text-center text-sm text-zinc-500">
          Devam etmek için giriş yapın
        </p>

        <form action={girisYap} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-zinc-700"
            >
              E-posta
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-brand-navy focus:outline-none"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-zinc-700"
            >
              Şifre
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-brand-navy focus:outline-none"
            />
          </div>

          {error && (
            <p className="text-sm text-brand-red">E-posta veya şifre hatalı.</p>
          )}

          <SubmitButton
            pendingText="Giriş yapılıyor..."
            className="w-full rounded-md bg-brand-navy px-3 py-2 text-sm font-medium text-white hover:bg-brand-navy-dark"
          >
            Giriş Yap
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}

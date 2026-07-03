import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession, requirePageRole } from "@/lib/rbac";
import { listPurchaseRequests, deletePurchaseRequest } from "@/lib/services/requests";
import { listProjects } from "@/lib/services/projects";
import { StatusBadge } from "@/components/StatusBadge";
import { STATUS_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { DeleteButton } from "@/components/DeleteButton";

export default async function TalepListesiPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    projectId?: string;
    from?: string;
    to?: string;
    search?: string;
    error?: string;
  }>;
}) {
  const session = await requireSession();
  const filters = await searchParams;
  const [requests, projects] = await Promise.all([
    listPurchaseRequests(session, filters),
    listProjects(),
  ]);
  const isAdmin = session.user.roles.includes("admin");

  async function sil(requestId: string) {
    "use server";
    const session = await requirePageRole(["admin"]);

    try {
      await deletePurchaseRequest(session, requestId);
    } catch (serviceError) {
      const message =
        serviceError instanceof Error ? serviceError.message : "Talep silinemedi";
      redirect(`/talepler?error=${encodeURIComponent(message)}`);
    }

    redirect("/talepler");
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-900">Satın Alma Talepleri</h1>
        {session.user.roles.includes("requester") && (
          <Link
            href="/talepler/yeni"
            className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition-all hover:bg-zinc-800 active:scale-[0.97]"
          >
            Yeni Talep
          </Link>
        )}
      </div>

      {filters.error && <p className="mb-4 text-sm text-red-600">{filters.error}</p>}

      <form className="mb-4 grid grid-cols-2 gap-3 rounded-lg border border-zinc-200 bg-white p-4 sm:grid-cols-5">
        <input
          name="search"
          defaultValue={filters.search}
          placeholder="Talep no / başlık ara"
          className="col-span-2 rounded-md border border-zinc-300 px-2 py-1.5 text-sm sm:col-span-1"
        />
        <select
          name="status"
          defaultValue={filters.status ?? ""}
          className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
        >
          <option value="">Tüm durumlar</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          name="projectId"
          defaultValue={filters.projectId ?? ""}
          className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
        >
          <option value="">Tüm projeler</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          name="from"
          defaultValue={filters.from}
          className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
        />
        <input
          type="date"
          name="to"
          defaultValue={filters.to}
          className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
        />
        <button
          type="submit"
          className="col-span-2 rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-50 active:bg-zinc-100 sm:col-span-5"
        >
          Filtrele
        </button>
      </form>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-4 py-2 font-medium">Talep No</th>
              <th className="px-4 py-2 font-medium">Başlık</th>
              <th className="px-4 py-2 font-medium">Proje</th>
              <th className="px-4 py-2 font-medium">Talep Eden</th>
              <th className="px-4 py-2 font-medium">Durum</th>
              <th className="px-4 py-2 font-medium">Tarih</th>
              {isAdmin && <th className="px-4 py-2" />}
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <tr key={request.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50">
                <td className="px-4 py-2">
                  <Link href={`/talepler/${request.id}`} className="font-medium text-zinc-900 hover:underline">
                    {request.requestNumber}
                  </Link>
                </td>
                <td className="px-4 py-2 text-zinc-700">{request.title}</td>
                <td className="px-4 py-2 text-zinc-600">{request.project.name}</td>
                <td className="px-4 py-2 text-zinc-600">{request.requester.name}</td>
                <td className="px-4 py-2">
                  <StatusBadge status={request.status} />
                </td>
                <td className="px-4 py-2 text-zinc-500">{formatDate(request.createdAt)}</td>
                {isAdmin && (
                  <td className="px-4 py-2 text-right">
                    <form action={sil.bind(null, request.id)}>
                      <DeleteButton
                        confirmText={`${request.requestNumber} numaralı talebi silmek istediğinize emin misiniz? Bu işlem tüm teklif, onay ve sevkiyat kayıtlarını da siler.`}
                      />
                    </form>
                  </td>
                )}
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 7 : 6} className="px-4 py-6 text-center text-zinc-400">
                  Kayıt bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

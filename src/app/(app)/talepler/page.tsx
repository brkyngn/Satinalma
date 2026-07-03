import Link from "next/link";
import { requireSession } from "@/lib/rbac";
import { listPurchaseRequests } from "@/lib/services/requests";
import { listProjects } from "@/lib/services/projects";
import { StatusBadge } from "@/components/StatusBadge";
import { STATUS_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export default async function TalepListesiPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    projectId?: string;
    from?: string;
    to?: string;
    search?: string;
  }>;
}) {
  const session = await requireSession();
  const filters = await searchParams;
  const [requests, projects] = await Promise.all([
    listPurchaseRequests(session, filters),
    listProjects(),
  ]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-900">Satın Alma Talepleri</h1>
        {session.user.roles.includes("requester") && (
          <Link
            href="/talepler/yeni"
            className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Yeni Talep
          </Link>
        )}
      </div>

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
          className="col-span-2 rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 sm:col-span-5"
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
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-zinc-400">
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

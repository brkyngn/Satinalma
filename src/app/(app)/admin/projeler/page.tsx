import Link from "next/link";
import { requirePageRole } from "@/lib/rbac";
import { listProjects } from "@/lib/services/projects";

export default async function ProjelerPage() {
  await requirePageRole(["admin"]);
  const projects = await listProjects();

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-900">Projeler / Şantiyeler</h1>
        <Link
          href="/admin/projeler/yeni"
          className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Yeni Proje
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-4 py-2 font-medium">Kod</th>
              <th className="px-4 py-2 font-medium">Ad</th>
              <th className="px-4 py-2 font-medium">Adres</th>
              <th className="px-4 py-2 font-medium">Durum</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.id} className="border-b border-zinc-100 last:border-0">
                <td className="px-4 py-2 font-medium text-zinc-900">{project.code}</td>
                <td className="px-4 py-2 text-zinc-600">{project.name}</td>
                <td className="px-4 py-2 text-zinc-600">{project.address}</td>
                <td className="px-4 py-2">
                  <span className={project.active ? "text-emerald-700" : "text-red-600"}>
                    {project.active ? "Aktif" : "Pasif"}
                  </span>
                </td>
              </tr>
            ))}
            {projects.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-zinc-400">
                  Henüz proje yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

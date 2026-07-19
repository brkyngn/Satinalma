import { prisma } from "@/lib/prisma";
import type { Session } from "next-auth";

export async function addRequestMessage(
  session: Session,
  requestId: string,
  body: string
) {
  const text = body.trim();
  if (!text) throw new Error("Mesaj boş olamaz");
  if (text.length > 2000) throw new Error("Mesaj çok uzun (en fazla 2000 karakter)");

  const request = await prisma.purchaseRequest.findUniqueOrThrow({
    where: { id: requestId },
    select: { requesterId: true },
  });

  // Sadece talep edenden ibaret kullanıcı yalnızca kendi talebine yorum yapabilir.
  const isRequesterOnly =
    session.user.roles.length === 1 && session.user.roles[0] === "requester";
  if (isRequesterOnly && request.requesterId !== session.user.id) {
    throw new Error("Bu talebe mesaj ekleyemezsiniz");
  }

  return prisma.requestMessage.create({
    data: { requestId, authorId: session.user.id, body: text },
  });
}

export type ThreadItem = {
  id: string;
  kind: "user" | "system";
  author: string;
  body: string;
  createdAt: Date;
};

// Denetim kaydı (AuditLog) aksiyonlarını Türkçe sistem notu metnine çevirir.
function systemNoteText(action: string, details: unknown): string | null {
  const d = (details ?? {}) as Record<string, unknown>;
  switch (action) {
    case "request_created":
      return "Talep oluşturuldu";
    case "quote_added":
      return d.supplierName ? `Teklif eklendi — ${d.supplierName}` : "Teklif eklendi";
    case "request_submitted_for_approval":
      return "Talep onaya sunuldu";
    case "request_approved":
      return "Talep onaylandı";
    case "request_rejected":
      return "Talep reddedildi";
    case "delivery_created":
      return "Sevkiyat girildi";
    case "delivery_accepted": {
      const map: Record<string, string> = {
        full: "Tam kabul",
        partial: "Kısmi kabul",
        rejected: "Kabul reddedildi",
      };
      const label = map[String(d.status)] ?? "Teslimat kabulü";
      return `Teslimat kabulü — ${label}`;
    }
    default:
      return null; // gösterilmeyen aksiyonlar (ör. silme)
  }
}

// Kullanıcı mesajları ile durum değişikliği sistem notlarını tek bir kronolojik
// akışta birleştirir (en eski üstte).
export async function getRequestThread(requestId: string): Promise<ThreadItem[]> {
  const [messages, audits] = await Promise.all([
    prisma.requestMessage.findMany({
      where: { requestId },
      include: { author: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.auditLog.findMany({
      where: { entityType: "PurchaseRequest", entityId: requestId },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const userItems: ThreadItem[] = messages.map((m) => ({
    id: `m-${m.id}`,
    kind: "user",
    author: m.author.name,
    body: m.body,
    createdAt: m.createdAt,
  }));

  const systemItems: ThreadItem[] = [];
  for (const a of audits) {
    const text = systemNoteText(a.action, a.details);
    if (!text) continue;
    systemItems.push({
      id: `a-${a.id}`,
      kind: "system",
      author: a.user?.name ?? "Sistem",
      body: text,
      createdAt: a.createdAt,
    });
  }

  return [...userItems, ...systemItems].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
  );
}

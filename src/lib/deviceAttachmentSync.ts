import { prisma } from "@/lib/prisma";

export type AttachmentFields = {
  attachmentUrl: string | null;
  catalogUrl: string | null;
  manualUrl: string | null;
  pmdaApprovalNumber: string | null;
  pmdaDocUpdatedAt: string | null;
};

/** 同じ型式+メーカーの既存機器から添付URLを取得する */
export async function findSharedAttachments(
  model: string,
  manufacturer: string,
  excludeId?: string
): Promise<AttachmentFields | null> {
  return prisma.device.findFirst({
    where: {
      model: { equals: model, mode: "insensitive" },
      manufacturer: { equals: manufacturer, mode: "insensitive" },
      ...(excludeId ? { id: { not: excludeId } } : {}),
      OR: [
        { attachmentUrl: { not: null } },
        { catalogUrl: { not: null } },
        { manualUrl: { not: null } },
      ],
    },
    select: {
      attachmentUrl: true,
      catalogUrl: true,
      manualUrl: true,
      pmdaApprovalNumber: true,
      pmdaDocUpdatedAt: true,
    },
  });
}

/** 同じ型式+メーカーの全機器に添付URLを同期する */
export async function syncAttachmentsToSameModel(
  model: string,
  manufacturer: string,
  excludeId: string,
  urls: AttachmentFields
): Promise<number> {
  const hasAny = urls.attachmentUrl || urls.catalogUrl || urls.manualUrl;
  if (!hasAny) return 0;

  const result = await prisma.device.updateMany({
    where: {
      model: { equals: model, mode: "insensitive" },
      manufacturer: { equals: manufacturer, mode: "insensitive" },
      id: { not: excludeId },
    },
    data: {
      attachmentUrl: urls.attachmentUrl,
      catalogUrl: urls.catalogUrl,
      manualUrl: urls.manualUrl,
      ...(urls.pmdaApprovalNumber !== null ? { pmdaApprovalNumber: urls.pmdaApprovalNumber } : {}),
      ...(urls.pmdaDocUpdatedAt !== null ? { pmdaDocUpdatedAt: urls.pmdaDocUpdatedAt } : {}),
    },
  });
  return result.count;
}

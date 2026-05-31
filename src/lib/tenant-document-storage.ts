import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export const TENANT_DOCUMENTS_BUCKET = "tenant-documents";

export async function ensureTenantDocumentsBucket() {
  const admin = createAdminClient();
  const { data: buckets, error: listError } = await admin.storage.listBuckets();

  if (listError) {
    throw new Error(`Could not verify tenant document storage: ${listError.message}`);
  }

  if (buckets?.some((bucket) => bucket.name === TENANT_DOCUMENTS_BUCKET)) {
    return;
  }

  const { error: createError } = await admin.storage.createBucket(TENANT_DOCUMENTS_BUCKET, {
    public: false,
  });

  if (createError && !/already exists/i.test(createError.message)) {
    throw new Error(`Could not create tenant document storage: ${createError.message}`);
  }
}

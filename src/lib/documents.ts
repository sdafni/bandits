import crypto from "node:crypto";
import { slugifyFilename } from "@/lib/utils";

const TEXT_MIME_TYPES = new Set([
  "text/plain",
  "application/json",
  "text/csv",
  "text/markdown",
  "application/xml",
]);

const FALLBACK_MIME_TYPES = new Map([
  [".csv", "text/csv"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".json", "application/json"],
  [".pdf", "application/pdf"],
  [".png", "image/png"],
  [".txt", "text/plain"],
  [".webp", "image/webp"],
]);

const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  ...TEXT_MIME_TYPES,
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const MAX_FILES_PER_UPLOAD = 10;
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export function getUploadMimeType(file: File) {
  if (file.type) {
    return file.type;
  }

  const fileName = file.name.toLowerCase();
  const lastDotIndex = fileName.lastIndexOf(".");

  if (lastDotIndex === -1) {
    return "application/octet-stream";
  }

  const extension = fileName.slice(lastDotIndex);

  return FALLBACK_MIME_TYPES.get(extension) ?? "application/octet-stream";
}

export function validateUploadFiles(files: File[]) {
  if (files.length === 0) {
    return "Upload at least one document before submitting.";
  }

  if (files.length > MAX_FILES_PER_UPLOAD) {
    return `Upload up to ${MAX_FILES_PER_UPLOAD} files at a time.`;
  }

  for (const file of files) {
    if (file.size > MAX_UPLOAD_BYTES) {
      return `${file.name} is larger than the 10MB upload limit.`;
    }

    if (!ALLOWED_UPLOAD_MIME_TYPES.has(getUploadMimeType(file))) {
      return `${file.name} is not a supported file type. Upload PDF, PNG, JPG, WEBP, TXT, CSV, or JSON files.`;
    }
  }

  return null;
}

export function buildStoragePath(checkId: string, documentType: string, fileName: string) {
  return `${checkId}/${documentType}/${Date.now()}-${crypto.randomUUID()}-${slugifyFilename(fileName)}`;
}

function extractPdfText(buffer: Buffer) {
  const raw = buffer.toString("latin1");
  const streamMatches = raw.match(/stream[\s\S]*?endstream/g) ?? [];
  const chunks: string[] = [];

  for (const stream of streamMatches) {
    const parenMatches = stream.match(/\(([^\\)]{2,})\)/g) ?? [];
    for (const match of parenMatches) {
      chunks.push(match.slice(1, -1));
    }

    const literalMatches = stream.match(/[A-Za-z][A-Za-z0-9 ,.'-]{3,}/g) ?? [];
    chunks.push(...literalMatches.slice(0, 20));
  }

  return chunks.join(" ").replace(/\s+/g, " ").trim().slice(0, 4000);
}

export async function extractTextFromUpload(
  file: File,
  context: {
    documentType: string;
    notes?: string | null;
    profile?: {
      employmentStatus?: string | null;
      employerName?: string | null;
      monthlyIncome?: number | null;
    };
  },
) {
  const notesSnippet = context.notes?.trim() ? `\nTenant note: ${context.notes.trim()}` : "";
  const profileSnippet = context.profile
    ? [
        context.profile.employmentStatus ? `Employment: ${context.profile.employmentStatus}` : null,
        context.profile.employerName ? `Employer: ${context.profile.employerName}` : null,
        context.profile.monthlyIncome != null ? `Declared income: ${context.profile.monthlyIncome}` : null,
      ]
        .filter(Boolean)
        .join(". ")
    : "";
  const profilePrefix = profileSnippet ? `${profileSnippet}. ` : "";
  const mimeType = getUploadMimeType(file);

  if (TEXT_MIME_TYPES.has(mimeType)) {
    const text = await file.text();
    return `${profilePrefix}${text.slice(0, 4000)}${notesSnippet}`;
  }

  if (mimeType.startsWith("image/")) {
    return [
      profilePrefix,
      `Image document uploaded for ${context.documentType}.`,
      "Image content has been registered for review and can be validated by the SafeKey team.",
      context.notes?.trim() ? `Tenant note: ${context.notes.trim()}` : null,
    ]
      .filter(Boolean)
      .join(" ");
  }

  if (mimeType === "application/pdf") {
    const buffer = Buffer.from(await file.arrayBuffer());
    const extracted = extractPdfText(buffer);

    if (extracted.length >= 40) {
      return `${profilePrefix}${extracted}${notesSnippet}`;
    }

    return [
      profilePrefix,
      `PDF document uploaded for ${context.documentType}.`,
      extracted ? `Extracted content preview: ${extracted.slice(0, 500)}` : "PDF text could not be extracted automatically.",
      context.notes?.trim() ? `Tenant note: ${context.notes.trim()}` : null,
    ]
      .filter(Boolean)
      .join(" ");
  }

  return [
    profilePrefix,
    `Uploaded ${file.name} for ${context.documentType}.`,
    context.notes?.trim() ? `Tenant note: ${context.notes.trim()}` : null,
  ]
    .filter(Boolean)
    .join(" ");
}

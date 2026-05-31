export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function renderSafeKeyEmail(params: { title: string; bodyHtml: string; cta?: { label: string; href: string } }) {
  const ctaBlock = params.cta
    ? `<a href="${params.cta.href}" style="display:inline-block;background:#0f2343;color:#fff;text-decoration:none;border-radius:12px;padding:12px 18px;font-weight:700;">${escapeHtml(params.cta.label)}</a>`
    : "";

  return `
  <div style="font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#f8fafc;padding:24px;">
    <div style="max-width:580px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:24px;">
      <p style="margin:0 0 16px;font-size:20px;font-weight:700;color:#0f2343;">SafeKey</p>
      <h1 style="margin:0 0 12px;font-size:22px;color:#0f172a;">${escapeHtml(params.title)}</h1>
      ${params.bodyHtml}
      ${ctaBlock ? `<div style="margin-top:16px;">${ctaBlock}</div>` : ""}
      <p style="margin:16px 0 0;font-size:13px;color:#475569;line-height:1.5;">SafeKey Trust Operations</p>
    </div>
  </div>`;
}

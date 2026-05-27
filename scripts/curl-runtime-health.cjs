const url = process.argv[2] || "https://getsafekey.app/api/health/stripe/runtime";

async function main() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90_000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    const text = await res.text();
    console.log("HTTP", res.status);
    console.log(text);
  } catch (error) {
    console.error("Request failed:", error.message);
    process.exit(1);
  } finally {
    clearTimeout(timer);
  }
}

main();

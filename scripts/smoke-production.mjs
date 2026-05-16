const baseUrl = (process.env.CARE_SMOKE_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://cuidar-link.vercel.app").replace(
  /\/$/,
  ""
);

const publicChecks = [
  { path: "/", label: "Busca publica", mustInclude: "Cuidado domiciliar" },
  { path: "/login", label: "Login", mustInclude: "Entrar" },
  { path: "/register", label: "Cadastro", mustInclude: "Criar conta" },
  { path: "/seguranca", label: "Seguranca", mustInclude: "Seguranca" },
  { path: "/pricing", label: "Planos", mustInclude: "Planos" },
  { path: "/terms", label: "Termos", mustInclude: "Termos de Uso" },
  { path: "/privacy", label: "Privacidade", mustInclude: "Politica de Privacidade" },
  { path: "/cookies", label: "Cookies", mustInclude: "Politica de Cookies" },
  { path: "/robots.txt", label: "Robots", mustInclude: "Sitemap:" },
  { path: "/sitemap.xml", label: "Sitemap", mustInclude: "<urlset" }
];

const healthRequired = ["app", "database", "googleOAuth", "documentStorage", "emailNotifications"];

function okLine(label, detail) {
  console.log(`OK  ${label}${detail ? ` - ${detail}` : ""}`);
}

function failLine(label, detail) {
  console.error(`ERR ${label}${detail ? ` - ${detail}` : ""}`);
}

async function checkPublicRoute({ path, label, mustInclude }) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { "User-Agent": "CuidarLink production smoke check" }
  });

  if (!response.ok) {
    throw new Error(`${label} respondeu HTTP ${response.status}`);
  }

  const body = await response.text();
  if (!body.includes(mustInclude)) {
    throw new Error(`${label} nao contem o texto esperado: ${mustInclude}`);
  }

  okLine(label, `${path} HTTP ${response.status}`);
}

async function checkHealth() {
  const response = await fetch(`${baseUrl}/api/health`, {
    headers: { "User-Agent": "CuidarLink production smoke check" }
  });

  if (!response.ok) {
    throw new Error(`/api/health respondeu HTTP ${response.status}`);
  }

  const health = await response.json();
  const missing = healthRequired.filter((key) => health[key] !== true);

  if (missing.length > 0) {
    throw new Error(`/api/health com falha em: ${missing.join(", ")}`);
  }

  if (health.demoFallback !== false) {
    throw new Error("/api/health indica demoFallback ativo em producao");
  }

  okLine("Saude da aplicacao", JSON.stringify(health));
}

async function main() {
  console.log(`CuidarLink production smoke check: ${baseUrl}`);

  const failures = [];
  for (const check of publicChecks) {
    try {
      await checkPublicRoute(check);
    } catch (error) {
      failures.push(error);
      failLine(check.label, error instanceof Error ? error.message : String(error));
    }
  }

  try {
    await checkHealth();
  } catch (error) {
    failures.push(error);
    failLine("Saude da aplicacao", error instanceof Error ? error.message : String(error));
  }

  if (failures.length > 0) {
    console.error(`Smoke check falhou com ${failures.length} erro(s).`);
    process.exit(1);
  }

  console.log("Smoke check concluido sem erros.");
}

main().catch((error) => {
  failLine("Execucao", error instanceof Error ? error.message : String(error));
  process.exit(1);
});

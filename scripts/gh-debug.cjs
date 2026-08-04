const TOKEN = process.env.GH_TOKEN || "";
const REPO = "jeanpaulchirac5-rgb/pokebanner";
const API = `https://api.github.com/repos/${REPO}`;
const HEADERS = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "pokebanner-push",
};

async function main() {
  const res = await fetch(`${API}/contents/.github/workflows/release.yml`, { headers: HEADERS });
  const j = await res.json();
  console.log(Buffer.from(j.content, "base64").toString("utf8"));
}

main().catch((e) => {
  console.error("FATAL:", e.message);
  process.exit(1);
});

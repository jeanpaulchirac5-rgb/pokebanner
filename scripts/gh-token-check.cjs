const H = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "pb" };
const API = "https://api.github.com/repos/jeanpaulchirac5-rgb/pokebanner";
(async () => {
  const me = await (await fetch(API + "/../user", { headers: { ...H, Authorization: "Bearer " + process.env.GH_TOKEN } })).json();
  console.log("user:", me.login || ("FAIL " + JSON.stringify(me).slice(0, 120)));
  const ref = await (await fetch(API + "/git/ref/heads/main", { headers: H })).json();
  console.log("remote main:", ref.object?.sha?.slice(0, 12) || JSON.stringify(ref).slice(0, 80));
  const tags = await (await fetch(API + "/tags?per_page=6", { headers: H })).json();
  console.log("tags:", Array.isArray(tags) ? tags.map((t) => t.name).join(", ") : "n/a");
})();

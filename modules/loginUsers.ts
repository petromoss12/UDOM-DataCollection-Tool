import { ZuploContext, ZuploRequest } from "@zuplo/runtime";

async function fetchJson(url: string) {
  const response = await fetch(url);
  return await response.json();
}

export default async function (request: ZuploRequest, context: ZuploContext) {
  try {
    const [users, survey] = await Promise.all([
      fetchJson('https://data-collection-app-main-23851ea.d2.zuplo.dev/login'),
      fetchJson('https://67f97155094de2fe6ea193b8.mockapi.io/survey')
    ]);

    const combine = users.map(u => {
      return {
        ...u,
        survey: survey.filter(s => s.userID === u.user.userID)
      };
    });

    return new Response(JSON.stringify(combine), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error("Error combining APIs:", error);
    return new Response(JSON.stringify({ error: "Failed to combine API data" }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

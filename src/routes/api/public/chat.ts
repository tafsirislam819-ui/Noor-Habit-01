import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

interface Body {
  messages: { role: "user" | "assistant"; content: string }[];
  context?: string;
  lang?: string;
}

export const Route = createFileRoute("/api/public/chat")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        const key = process.env["AI_API_KEY"] || "";
        const base = process.env["AI_BASE_URL"] || "https://api.xkiro.com/v1";
        const model = process.env["AI_MODEL"] || "qwen/qwen3.8-max:free";

        if (!key) {
          return Response.json(
            { error: "AI API key is not configured in .env" },
            { status: 500, headers: CORS }
          );
        }

        let body: Body;
        try {
          body = (await request.json()) as Body;
        } catch {
          return Response.json({ error: "Bad request" }, { status: 400, headers: CORS });
        }

        const messages = (body.messages ?? [])
          .slice(-20)
          .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
          .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));

        if (!messages.length) {
          return Response.json({ error: "No message" }, { status: 400, headers: CORS });
        }

        const system = `You are Noor, a warm, supportive Islamic habit and routine coach inside Noor Habit app. Reply in ${body.lang === "en" ? "English" : "Bangla"} naturally. Help plan routines around the 5 daily prayers, talk freely about habits and goals, and answer questions using the user's records.

IN-APP ACTIONS:
If the user asks you to add a task, habit, goal, or mark prayer, include a JSON action block at the end:
\`\`\`action
{"action":"ADD_ITEM","kind":"task","title":"...","time":"HH:MM"}
\`\`\`
Or
\`\`\`action
{"action":"MARK_PRAYER","prayer":"fajr","done":true}
\`\`\`

USER DATA:
${(body.context ?? "").slice(0, 12000)}`;

        const cleanBase = base.replace(/\/+$/, "");
        const endpoint = cleanBase.endsWith("/chat/completions") ? cleanBase : `${cleanBase}/chat/completions`;

        const r = await fetch(endpoint, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${key}`,
            "user-agent": "NoorHabit/1.0",
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "system", content: system }, ...messages],
          }),
        });

        if (!r.ok) {
          const text = await r.text();
          console.error(`AI provider error [${r.status}]: ${text}`);
          let msg = `AI provider error (${r.status})`;
          if (r.status === 402 || text.includes("insufficient_balance")) {
            msg =
              body.lang === "en"
                ? "Insufficient balance in AI account. Please top up your AI credits or check .env."
                : "এআই অ্যাকাউন্টে ব্যালেন্স অপর্যাপ্ত। অনুগ্রহ করে এআই ব্যালেন্স রিচার্জ করুন অথবা .env ফাইলে নতুন কী দিন।";
          }
          return Response.json({ error: msg }, { status: r.status, headers: CORS });
        }

        const data = (await r.json()) as { choices?: { message?: { content?: string } }[] };
        return Response.json({ reply: data.choices?.[0]?.message?.content ?? "" }, { headers: CORS });
      },
    },
  },
});

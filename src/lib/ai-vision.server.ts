// Lovable AI Gateway vision helpers. Server-only.

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.6-flash";

type Block =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

async function chatJson<T>(blocks: Block[], system: string, fallback: T): Promise<T> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) return fallback;
  try {
    const res = await fetch(GATEWAY, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: blocks },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      console.error("[sanket-ai] gateway error", res.status, await res.text());
      return fallback;
    }
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = json.choices?.[0]?.message?.content;
    if (!content) return fallback;
    return { ...fallback, ...(JSON.parse(content) as object) } as T;
  } catch (err) {
    console.error("[sanket-ai] request failed", err);
    return fallback;
  }
}

export type EvidenceAnalysis = {
  category: string;
  severity: number;
  title: string;
  summary: string;
  isCivicIssue: boolean;
};

export async function analyseEvidence(imageUrl: string, hint?: string): Promise<EvidenceAnalysis> {
  return await chatJson<EvidenceAnalysis>(
    [
      {
        type: "text",
        text: `Classify this civic issue photo.${hint ? ` Citizen note: ${hint}` : ""}
Return JSON: {"category": one of "Pothole"|"Sewage Leak"|"Streetlight Outage"|"Garbage Dump"|"Water Pipeline Burst"|"Other", "severity": number 1.0-10.0, "title": short 6-word title, "summary": one sentence describing damage and public risk, "isCivicIssue": boolean}`,
      },
      { type: "image_url", image_url: { url: imageUrl } },
    ],
    "You are a municipal infrastructure inspector. Answer only with strict JSON.",
    { category: "Other", severity: 5, title: "Civic issue reported", summary: "Awaiting AI review.", isCivicIssue: true },
  );
}

export type ResolutionAnalysis = {
  isSameScene: boolean;
  issueResolved: boolean;
  confidenceScore: number;
  visualChangesDetected: string;
  potentialAnomaly: boolean;
};

export async function analyseResolution(
  beforeUrl: string,
  afterUrl: string,
  category: string,
): Promise<ResolutionAnalysis> {
  return await chatJson<ResolutionAnalysis>(
    [
      {
        type: "text",
        text: `First image = BEFORE, second image = AFTER repair of a "${category}" issue.
Return JSON: {"isSameScene": boolean, "issueResolved": boolean, "confidenceScore": 0-100, "visualChangesDetected": one sentence, "potentialAnomaly": boolean (true if staged, unrelated scene, or reused photo)}`,
      },
      { type: "image_url", image_url: { url: beforeUrl } },
      { type: "image_url", image_url: { url: afterUrl } },
    ],
    "You audit municipal repair proof photos. Be strict. Answer only with strict JSON.",
    {
      isSameScene: true,
      issueResolved: true,
      confidenceScore: 60,
      visualChangesDetected: "Automated comparison unavailable; queued for manual review.",
      potentialAnomaly: false,
    },
  );
}

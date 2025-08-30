const GOOGLE_MAPS_API_KEY = "AIzaSyC4MUFr92FUZTWT0fWQ_ZOi4Ts_bUqxDVM";
const GEMINI_API_KEY = "AIzaSyArMF10ij-KJ_WM14rl9zdQicNDZVKXzOQ";

// Listen for messages from content.js
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.type === "computeRoute") {
    computeWalkingRoute(req.origin, req.destination)
      .then(routeResult => analyzeRouteWithAI(routeResult))
      .then(res => sendResponse({ ok: true, ...res }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true; // keep async channel open
  }
});

// ---- Google Maps Routes API ----
async function computeWalkingRoute(origin, destination) {
  const body = {
    origin: { address: origin },
    destination: { address: destination },
    travelMode: "WALK",
    units: "METRIC",
  };

  const resp = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
      "X-Goog-FieldMask": "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,routes.legs.steps.navigationInstruction"
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) throw new Error(`HTTP ${resp.status} ${await resp.text()}`);
  const data = await resp.json();
  const r = data?.routes?.[0];
  return {
    distanceMeters: r?.distanceMeters ?? null,
    duration: r?.duration ?? null,
    steps: (r?.legs?.[0]?.steps ?? []).map(s => ({
      instruction: s.navigationInstruction?.instructions ?? ""
    }))
  };
}

// ---- Gemini AI ----
async function analyzeRouteWithAI(routeResult) {
  const prompt = `
Assess this walking route for safety, accessibility, and comfort.
Return JSON with: safety_rating, accessibility_rating, comfort_rating, justification (≤10 words).

Distance: ${routeResult.distanceMeters}
Duration: ${routeResult.duration}
Steps:
${routeResult.steps.map((s, i) => `${i + 1}. ${s.instruction}`).join("\n")}
  `;

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    }
  );
  if (!resp.ok) throw new Error(`AI API Error: ${resp.status} ${await resp.text()}`);
  const data = await resp.json();

  let txt = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  txt = txt.replace(/^```(?:json)?|```$/g, "").trim();
  let parsed = {};
  try { parsed = JSON.parse(txt); } catch {}

  const safety = Number(parsed.safety_rating) || 0;
  const access = Number(parsed.accessibility_rating) || 0;
  const comfort = Number(parsed.comfort_rating) || 0;
  const score = Math.round((safety + access + comfort) / 3);

  return {
    score,
    justification: parsed.justification || "No justification"
  };
}

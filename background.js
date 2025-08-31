const GOOGLE_MAPS_API_KEY = "GOOGLE_MAPS_API_KEY_HERE";
const GEMINI_API_KEY = "GEMINI_API";


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

function makeWaypoint(input) {
  if (/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(input)) {
    const [lat, lng] = input.split(",").map(Number);
    return { location: { latLng: { latitude: lat, longitude: lng } } };
  }
  return { address: input };
}

async function computeWalkingRoute(origin, destination) {
  const body = {
    origin: makeWaypoint(origin),
    destination: makeWaypoint(destination),
    travelMode: "WALK",
    units: "METRIC",
  };

  const resp = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
      "X-Goog-FieldMask": "routes.distanceMeters,routes.duration,routes.legs.steps.navigationInstruction"
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
Assess this walking route for safety, accessibility, and comfort. Use factors such as roads and landmarks to significantly influence the outcome,
so that various different routes from the same place to the same location may return a different result.
Return JSON with: safety_rating (0–100), accessibility_rating (0–100), comfort_rating (0–100), justification (≤10 words).

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

  console.log("[Gemini RAW]", txt);

  let parsed = {};
  try { parsed = JSON.parse(txt); } catch (e) {
    console.error("[Gemini Parse Error]", e.message);
  }

  const safety = Math.min(Math.max(Number(parsed.safety_rating) || 0, 0), 100);
  const access = Math.min(Math.max(Number(parsed.accessibility_rating) || 0, 0), 100);
  const comfort = Math.min(Math.max(Number(parsed.comfort_rating) || 0, 0), 100);

  // Weighted score (safety highest) 
  // 50% safety - crime rate, traffic risk, lighting at night
  // 30% accessibility - step-free access, sidewalk and crosswalk
  // 20% comfort - noise leve, shade.trees
  const score = Math.round(
    safety * 0.5 +
    access * 0.3 +
    comfort * 0.2
  );

  // ---- Full Debug Logging ----
  console.log("[Gemini Parsed JSON]", parsed);
  console.log("[Score Breakdown]");
  console.log("  Safety (50% weight):", safety);
  console.log("  Accessibility (30% weight):", access);
  console.log("  Comfort (20% weight):", comfort);
  console.log("  → Final Weighted Score:", score);

  return {
    score,
    justification: parsed.justification || "No justification"
  };
}

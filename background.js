// chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
//     if (msg?.type !== "computeRoute") return;
  
//     (async () => {
//       try {
//         const { origin, destination } = msg.payload;
  
//         const body = {
//           origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
//           destination: { address: destination },
//           travelMode: "WALK",
//           units: "METRIC"
//         };
  
//         const resp = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//             "X-Goog-Api-Key": "<YOUR_API_KEY>",
//             "X-Goog-FieldMask": [
//               "routes.distanceMeters",
//               "routes.duration",
//               "routes.polyline.encodedPolyline",
//               "routes.legs.steps.polyline.encodedPolyline",
//               "routes.legs.steps.navigationInstruction"
//             ].join(",")
//           },
//           body: JSON.stringify(body)
//         });
  
//         if (!resp.ok) {
//           const text = await resp.text();
//           sendResponse({ ok: false, error: `HTTP ${resp.status}: ${text}` });
//           return;
//         }
  
//         const data = await resp.json();
//         const route = data?.routes?.[0] ?? {};
  
//         const condensed = {
//           distanceMeters: route.distanceMeters ?? null,
//           duration: route.duration ?? null,
//           routePolyline: route.polyline?.encodedPolyline ?? null,
//           steps: (route.legs?.[0]?.steps ?? []).map(s => ({
//             polyline: s.polyline?.encodedPolyline ?? null,
//             instruction: s.navigationInstruction?.instructions ?? ""
//           }))
//         };
  
//         sendResponse({ ok: true, data: condensed });
//       } catch (err) {
//         sendResponse({ ok: false, error: String(err) });
//       }
//     })();
  
//     // Keep the message channel open for the async response
//     return true;
//   });
  
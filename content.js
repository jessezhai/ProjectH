const GOOGLE_MAPS_API_KEY = 'AIzaSyC4MUFr92FUZTWT0fWQ_ZOi4Ts_bUqxDVM'; 


let routeSafetyScore = 70;
const happyImages = ['happy1.gif', 'happy2.gif', 'happy3.gif'];
const neutralImages = ['neutral1.gif']
const sadImages = ['sad1.gif', 'sad2.gif'];

let lastRoute = { origin: null, destination: null };

function extractRouteFromURL(url) {
  // Pattern 1: /dir/origin/destination
  const dirMatch = url.match(/\/dir\/([^\/]+)\/([^\/\?]+)/);
  if (dirMatch) {
    return {
      origin: decodeURIComponent(dirMatch[1]),
      destination: decodeURIComponent(dirMatch[2])
    };
  }


  const params = new URLSearchParams(url.split("?")[1] || "");
  const origin = params.get("saddr");
  const destination = params.get("daddr");

  if (origin && destination) {
    return { origin, destination };
  }

  return null;
}

function checkWalkingRoute() {
  if (location.href.includes("!3e2")) {
    const route = extractRouteFromURL(location.href);
    if (route && route.origin && route.destination) {
      if (
        route.origin === lastRoute.origin &&
        route.destination === lastRoute.destination
      ) {
        return; 
      }

      lastRoute = route;

      if (!document.getElementById("popup-ui")) {
        createPopup(routeSafetyScore);
      } else {
        updateMascot(routeSafetyScore);
      }
    } else {
      removePopup();
    }
  } else {
    removePopup();
  }
}

checkWalkingRoute();

// Keep checking every 1s (safe for SPA navigation)
let lastUrl = location.href;
setInterval(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    checkWalkingRoute();
  }
}, 1000);

// initail popup
function createPopup(score) {
  const popup = document.createElement('div');
  popup.id = 'popup-ui';
  
  popup.innerHTML = `
  <div class="card text-center shadow">
  <button type="button" class="popup-close" aria-label="Close">✖</button>
  <img id="mascot-img" class="card-img-top" alt="Mascot">
  <div class="card-body">
        <h5 class="card-title">Mascot says:</h5>
        <p class="card-text">Route safety: <span id="score">${score}%</span></p>
      </div>
    </div>
  `;
  // console.log(score);
  document.body.appendChild(popup);

  // close button event
  popup.querySelector('.popup-close').addEventListener('click', closebtn);
  
  updateMascot(score);
  
}


// get random
function getRandomImage(images) {
  const index = Math.floor(Math.random() * images.length);
  return images[index];
}

// switch mascot image based on score
function updateMascot(value) {
  const mascot = document.getElementById('mascot-img');
  if (!mascot) return;

  if (value > 50) {
    mascot.src = chrome.runtime.getURL(getRandomImage(happyImages));
  } else {
    mascot.src = chrome.runtime.getURL(getRandomImage(sadImages));
  }
}

// remove existing popup
function removePopup() {
  const existing = document.getElementById('popup-ui');
  if (existing) existing.remove();
}

// close popup
function closebtn() {
  const popup = document.getElementById("popup-ui");
  if (popup) popup.remove();
}

// Function to extract origin and destination from Google Maps URL
function extractRouteFromURL(url) {
  try {
    // Parse the URL to extract origin and destination
    const urlParams = new URLSearchParams(url.split('?')[1] || '');
    
    // Try different URL patterns
    let origin = null;
    let destination = null;
    
    // Pattern 1: /dir/origin/destination
    const dirMatch = url.match(/\/dir\/([^\/]+)\/([^\/\?]+)/);
    if (dirMatch) {
      origin = decodeURIComponent(dirMatch[1]);
      destination = decodeURIComponent(dirMatch[2]);
    }
    
    // Pattern 2: URL parameters
    if (!origin || !destination) {
      // Look for data parameter which contains route info
      const dataParam = urlParams.get('data');
      if (dataParam) {
        // Complex parameter: try to extract coordinates
        const coords = dataParam.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/g);
        if (coords && coords.length >= 2) {
          const firstCoord = coords[0].match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
          const secondCoord = coords[1].match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
          if (firstCoord && secondCoord) {
            origin = `${firstCoord[1]},${firstCoord[2]}`;
            destination = `${secondCoord[1]},${secondCoord[2]}`;
          }
        }
      }
    }
    
    return { origin, destination };
  } catch (error) {
    console.error('Error extracting route from URL:', error);
    return { origin: null, destination: null };
  }
}

// Watch for meaningful URL changes (since Google Maps is a SPA)
let currentRouteSignature = '';
let isProcessingUrlChange = false;
let debounceTimer = null;


function parseLatLng(s) {
  if (!s) return null;
  const m = String(s).trim().match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (!m) return null;
  const lat = Number(m[1]), lng = Number(m[2]);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

function decodePlus(s) {
  return decodeURIComponent(String(s || "").replace(/\+/g, " ").trim());
}

async function toRouteWaypoint(raw) {
  const text = decodePlus(raw);

  // Try "Current/My Location" → use browser geolocation
  if (/^(current|my)\s+location$/i.test(text)) {
    try {
      const pos = await new Promise((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 5000 })
      );
      return { location: { latLng: { latitude: pos.coords.latitude, longitude: pos.coords.longitude } } };
    } catch {
      // If denied/unavailable, fall back to using the literal address text
      return { address: text };
    }
  }

  // Try "lat,lng"
  const ll = parseLatLng(text);
  if (ll) return { location: { latLng: { latitude: ll.lat, longitude: ll.lng } } };

  // Fallback: treat as address
  return { address: text };
}

async function computeWalkingRouteFromUrlObj(params, apiKey, { signal } = {}) {
  if (!params) throw new Error("Missing params");
  const origin = await toRouteWaypoint(params.origin);
  const destination = await toRouteWaypoint(params.destination);

  const body = {
    origin,
    destination,
    travelMode: "WALK",
    units: "METRIC",
  };

  const resp = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": [
        "routes.distanceMeters",
        "routes.duration",
        "routes.polyline.encodedPolyline",
        "routes.legs.steps.polyline.encodedPolyline",
        "routes.legs.steps.navigationInstruction"
      ].join(",")
    },
    body: JSON.stringify(body),
    signal
  });

  if (!resp.ok) throw new Error(`HTTP ${resp.status} ${await resp.text()}`);
  const data = await resp.json();
  const r = data?.routes?.[0];

  return {
    distanceMeters: r?.distanceMeters ?? null,
    duration: r?.duration ?? null,
    routePolyline: r?.polyline?.encodedPolyline ?? null,
    steps: (r?.legs?.[0]?.steps ?? []).map(s => ({
      polyline: s.polyline?.encodedPolyline ?? null,
      instruction: s.navigationInstruction?.instructions ?? ""
    }))
  };
}


// Main execution - initialize route signature and show popup when in walking mode
currentRouteSignature = getRouteSignature(window.location.href);
if (currentRouteSignature && currentRouteSignature !== '') {
  
  // current location and destination
  const routeData = extractRouteFromURL(window.location.href);
  
  // Getting route from API
  if (routeData.origin && routeData.destination) {
    
    computeWalkingRouteFromUrlObj(routeData, GOOGLE_MAPS_API_KEY)
      .then(async (result) => {
        console.log('Route computed:', result);
        const userApiKey = "AIzaSyArMF10ij-KJ_WM14rl9zdQicNDZVKXzOQ"
        const aiAnalysis = await analyzeRouteWithAI(result, userApiKey);
        console.log(aiAnalysis);
        const scoreElement = document.getElementById("score");
        if (scoreElement) {
          scoreElement.insertAdjacentHTML("afterend", `<p>${aiAnalysis}</p>`);
        }
      })
      .catch(error => console.error('Error computing route:', error));
  }


}

// Function to extract meaningful route signature from URL
function getRouteSignature(url) {
  if (!url.includes('!3e2')) {
    return ''; // Not a walking route
  }
  
  // Extract the core route information, ignoring view parameters
  const match = url.match(/\/dir\/([^\/]+)\/([^\/\?]+)/);
  if (match) {
    return `${match[1]}-${match[2]}-walking`;
  }
  
  // Alternative pattern - look for data parameter with route coordinates
  const urlParams = new URLSearchParams(url.split('?')[1] || '');
  const dataParam = urlParams.get('data');
  if (dataParam) {
    // Extract just the route endpoints from the data parameter
    const coords = dataParam.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/g);
    if (coords && coords.length >= 2) {
      return `${coords[0]}-${coords[1]}-walking`;
    }
  }
  
  return 'walking-route'; // Generic walking route signature
}

function checkForMeaningfulRouteChanges() {
  // Clear existing debounce timer
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  // Debounce the check to avoid rapid fire updates
  debounceTimer = setTimeout(() => {
    const newUrl = window.location.href;
    const newRouteSignature = getRouteSignature(newUrl);

    // Only process if the route signature actually changed
    if (newRouteSignature !== currentRouteSignature && !isProcessingUrlChange) {
      console.log('Route signature changed:', currentRouteSignature, '->', newRouteSignature);
      isProcessingUrlChange = true;
      currentRouteSignature = newRouteSignature;

      // Remove existing popup only if switching between different route types
      const existingPopup = document.getElementById('mapify-popup');
      if (existingPopup && (currentRouteSignature === '' || newRouteSignature === '')) {
        existingPopup.remove();
      }

      // Analyze route if URL contains !3e2 (walking mode)
      if (newRouteSignature && newRouteSignature !== '') {
        setTimeout(() => {
          const routeData = extractRouteFromURL(newUrl);
          if (routeData.origin && routeData.destination) {
            computeWalkingRouteFromUrlObj(routeData, GOOGLE_MAPS_API_KEY)
              .then(async (result) => {
                console.log('Route computed:', result);
                const userApiKey = "AIzaSyArMF10ij-KJ_WM14rl9zdQicNDZVKXzOQ";
                const aiAnalysis = await analyzeRouteWithAI(result, userApiKey);
                console.log(aiAnalysis);

                const scoreElement = document.getElementById("score");
                if (scoreElement) {
                  scoreElement.insertAdjacentHTML("afterend", `<p>${aiAnalysis}</p>`);
                }
              })
              .catch(error => console.error('Error computing route:', error))
              .finally(() => {
                isProcessingUrlChange = false;
              });
          } else {
            isProcessingUrlChange = false;
          }
        }, 1500); // delay to ensure Maps has fully updated
      } else {
        // Remove popup if no longer in walking mode
        if (existingPopup) {
          existingPopup.remove();
        }
        isProcessingUrlChange = false;
      }
    }
  }, 500); // 500ms debounce delay
}



// Use multiple methods to detect URL changes, but with debouncing
setInterval(checkForMeaningfulRouteChanges, 2000); // Poll every 2 seconds (less frequent)

// Also listen for popstate events (back/forward navigation)
window.addEventListener('popstate', checkForMeaningfulRouteChanges);

// Listen for pushstate/replacestate (programmatic navigation) with debouncing
const originalPushState = history.pushState;
const originalReplaceState = history.replaceState;

history.pushState = function() {
  originalPushState.apply(history, arguments);
  checkForMeaningfulRouteChanges();
};

history.replaceState = function() {
  originalReplaceState.apply(history, arguments);
  checkForMeaningfulRouteChanges();
};


// Call this from your UI when you’re ready to fetch the route
async function getWalkingRoute(originLat, originLng, destinationAddress) {
  const msg = {
    type: "computeRoute",
    payload: {
      origin: { lat: originLat, lng: originLng },
      destination: destinationAddress
    }
  };

  const res = await chrome.runtime.sendMessage(msg);
  if (!res?.ok) throw new Error(res?.error || "Unknown error");
  return res.data; // { distanceMeters, duration, routePolyline, steps[] }
}

async function analyzeRouteWithAI(routeResult, userApiKey) {
  const prompt = `
You are a safety analysis evaluation tool design to assess walking routes. 
You will be provided with a detail list of GPS steps with polylines. 
Your task is to perform a safety analysis on said paths, providing three outputs: safety evaluation, accessibility evaluation, comfort evaluation. 
Do not provide justification for the intermediate steps, or any text other than the final outputs. 
You will provide the final output in JSON format with four variables: safety rating (integer 0-100), accessibility rating (integer 0-100), comfort rating (integer 0-100) and justification (strings, maximum of 10 words).

Route details:
Distance: ${routeResult.distanceMeters} meters
Duration: ${routeResult.duration}
Steps:
${routeResult.steps.map((s, i) => `${i+1}. ${s.instruction}`).join("\n")}
`;

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${userApiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    }
  );

  if (!resp.ok) {
    throw new Error(`AI API Error: ${resp.status} ${await resp.text()}`);
  }

  const data = await resp.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "No analysis returned.";
}

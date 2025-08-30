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
// Function to create and display the popup with route information
// function createRoutePopup(routeData, safetyAnalysis) {
//   // Remove existing popup
//   const existingPopup = document.getElementById('mapify-popup');
//   if (existingPopup) {
//     existingPopup.remove();
//   }
  
//   if (!routeData) {
//     return;
//   }
  
//   const route = routeData.routes[0];
//   const leg = route.legs[0];
//   const alternativeCount = routeData.routes.length - 1;
  
//   const popup = document.createElement('div');
//   popup.id = 'mapify-popup';
//   popup.innerHTML = `
//     <div class="card">
//       <div class="card-header d-flex justify-content-between align-items-center">
//         <h6 class="mb-0">Route Safety Analysis</h6>
//         <button type="button" class="btn-close" aria-label="Close" onclick="document.getElementById('mapify-popup').remove()"></button>
//       </div>
//       <div class="card-body">
//         <div class="text-center mb-3">
//           <img src="${chrome.runtime.getURL('mascot.png')}" class="mascot-img" alt="Mascot">
//           <h5 class="card-title mt-2">Safety Score: ${safetyAnalysis.score}%</h5>
//         </div>
        
//         <div class="route-info mb-3">
//           <h6>Route Summary:</h6>
//           <ul class="list-unstyled small">
//             <li><strong>Steps:</strong> ${leg.steps.length} navigation steps</li>
//             ${alternativeCount > 0 ? `<li><strong>Alternatives:</strong> ${alternativeCount} other routes</li>` : ''}
//           </ul>
//         </div>
        
//         ${safetyAnalysis.factors.length > 0 ? `
//         <div class="safety-factors">
//           <h6>Safety Considerations:</h6>
//           <ul class="list-unstyled small">
//             ${safetyAnalysis.factors.map(factor => `<li>• ${factor}</li>`).join('')}
//           </ul>
//         </div>
//         ` : ''}
        
//         <div class="mt-3">
//           <button class="btn btn-sm btn-outline-primary" onclick="document.getElementById('route-steps').style.display = document.getElementById('route-steps').style.display === 'none' ? 'block' : 'none'">
//             Toggle Steps
//           </button>
//         </div>
        
//         <div id="route-steps" style="display: none;" class="mt-2">
//           <h6>Step-by-step:</h6>
//           <ol class="small">
//             ${leg.steps.map(step => `
//               <li>${step.html_instructions.replace(/<[^>]*>/g, '')} (${step.distance.text})</li>
//             `).join('')}
//           </ol>
//         </div>
//       </div>
//     </div>
//   `;
  
//   document.body.appendChild(popup);
// }

// Function to analyze basic safety without detailed route data
// function analyzeBasicSafety() {
//   const factors = [];
//   let score = 75; // Base score for walking routes
  
//   // Check time of day
//   const currentHour = new Date().getHours();
//   if (currentHour < 6 || currentHour > 22) {
//     score -= 20;
//     factors.push('Late night/early morning hours');
//   }
  
//   // Check day of week
//   const dayOfWeek = new Date().getDay();
//   if (dayOfWeek === 0 || dayOfWeek === 6) { // Weekend
//     factors.push('Weekend - different traffic patterns');
//   }
  
//   // Basic safety tip
//   factors.push('Stay aware of your surroundings');
//   factors.push('Consider well-lit routes when possible');
  
//   return { score: Math.max(0, Math.min(100, score)), factors };
// }

// Function to create a basic popup when detailed route data isn't available
// function createBasicPopup(safetyAnalysis) {
//   // Remove existing popup
//   const existingPopup = document.getElementById('mapify-popup');
//   if (existingPopup) {
//     existingPopup.remove();
//   }
  
//   const popup = document.createElement('div');
//   popup.id = 'mapify-popup';
//   popup.innerHTML = `
//     <div class="card">
//       <div class="card-header d-flex justify-content-between align-items-center">
//         <h6 class="mb-0">Walking Safety Tips</h6>
//         <button type="button" class="btn-close" aria-label="Close" onclick="document.getElementById('mapify-popup').remove()"></button>
//       </div>
//       <div class="card-body">
//         <div class="text-center mb-3">
//           <img src="${chrome.runtime.getURL('mascot.png')}" class="mascot-img" alt="Mascot">
//           <h5 class="card-title mt-2">Safety Score: ${safetyAnalysis.score}%</h5>
//         </div>
        
//         <div class="safety-factors">
//           <h6>Safety Considerations:</h6>
//           <ul class="list-unstyled small">
//             ${safetyAnalysis.factors.map(factor => `<li>• ${factor}</li>`).join('')}
//           </ul>
//         </div>
        
//         <div class="mt-3 text-center">
//           <small class="text-muted">Route details will appear when available</small>
//         </div>
//       </div>
//     </div>
//   `;
  
//   document.body.appendChild(popup);
// }

// Function to handle route analysis
// async function displayLoadingPopup() {
//   return new Promise(async (resolve) => {
//     try {
//       // Show loading state
//       const existingPopup = document.getElementById('mapify-popup');
//       if (existingPopup) {
//         existingPopup.remove();
//       }
      
//       const loadingPopup = document.createElement('div');
//       loadingPopup.id = 'mapify-popup';
//       loadingPopup.innerHTML = `
//         <div class="card text-center">
//           <div class="card-body">
//             <img src="${chrome.runtime.getURL('mascot.png')}" class="mascot-img" alt="Mascot">
//             <h5 class="card-title mt-2">Analyzing Route...</h5>
//             <div class="spinner-border spinner-border-sm" role="status">
//               <span class="visually-hidden">Loading...</span>
//             </div>
//           </div>
//         </div>
//       `;
//       document.body.appendChild(loadingPopup);
      
      
//     } catch (error) {
//       console.error('Error in analyzeCurrentRoute:', error);
//       resolve();
//     }
//   });
// }

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
      .then(result => console.log('Route computed:', result))
      //CALL FUNCTION, USE RESULTS TO GENERATE PROMPT FOR AI ANALYSIS
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

// Debounced function to check for meaningful route changes
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
        // setTimeout(() => {
        //   analyzeCurrentRoute().finally(() => {
        //     isProcessingUrlChange = false;
        //   });
        // }, 1500); // Increased delay to ensure page is fully loaded
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


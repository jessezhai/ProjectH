let routeSafetyScore = 100;
const happyImages = ['happy1.gif', 'happy2.gif', 'happy3.gif', 'happy4.gif'];
const sadImages   = ['sad1.gif', 'sad2.gif'];

let currentRouteSignature = '';
let isProcessingUrlChange = false;
let debounceTimer = null;

// ---- Popup Helpers ----
function showLoading() {
  let popup = document.getElementById("popup-ui");
  if (!popup) {
    popup = document.createElement("div");
    popup.id = "popup-ui";
    document.body.appendChild(popup);
  }

  popup.innerHTML = `
    <div class="card text-center shadow">
      <button type="button" class="popup-close" aria-label="Close">✖</button>
      <div id="popup-content">
        <div id="loading-spinner"></div>
        <p>Analyzing route...</p>
      </div>
    </div>
  `;

  popup.querySelector(".popup-close").addEventListener("click", closebtn);
}

function showResult(score, justification) {
  let popup = document.getElementById("popup-ui");
  if (!popup) {
    popup = document.createElement("div");
    popup.id = "popup-ui";
    document.body.appendChild(popup);
  }

  popup.innerHTML = `
    <div class="card text-center shadow">
      <button type="button" class="popup-close" aria-label="Close">✖</button>
      <img id="mascot-img" class="card-img-top" alt="Mascot">
      <p id="justification" class="justification">${justification}</p>
    </div>
  `;

  popup.querySelector(".popup-close").addEventListener("click", closebtn);

  updateMascot(score);
}

function removePopup() {
  const existing = document.getElementById("popup-ui");
  if (existing) existing.remove();
}

function closebtn() {
  removePopup();
}

// ---- Mascot helpers ----
function updateMascot(value) {
  const mascot = document.getElementById("mascot-img");
  if (!mascot) return;

  const newGif = value > 50
    ? chrome.runtime.getURL(getRandomImage(happyImages))
    : chrome.runtime.getURL(getRandomImage(sadImages));

  mascot.src = newGif;

  loopMascotGif(mascot, 1000);
}

function getRandomImage(images) {
  return images[Math.floor(Math.random() * images.length)];
}

function loopMascotGif(imgElement, delay = 500) {
  const src = imgElement.src;
  setTimeout(() => {
    imgElement.src = '';
    setTimeout(() => { imgElement.src = src; }, 50);
  }, delay);
}

function extractRouteFromURL(url) {
  const urlParams = new URLSearchParams(url.split('?')[1] || '');
  let origin = null, destination = null;

  const dirMatch = url.match(/\/dir\/([^\/]+)\/([^\/\?]+)/);
  if (dirMatch) {
    origin = decodeURIComponent(dirMatch[1]);
    destination = decodeURIComponent(dirMatch[2]);
  }

  if (!origin || !destination) {
    const dataParam = urlParams.get('data');
    if (dataParam) {
      const coords = dataParam.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/g);
      if (coords?.length >= 2) {
        const f = coords[0].match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
        const s = coords[1].match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
        if (f && s) {
          origin = `${f[1]},${f[2]}`;
          destination = `${s[1]},${s[2]}`;
        }
      }
    }
  }

  // Handle "Your Location"
  return new Promise((resolve) => {
    if (origin?.toLowerCase().includes("your location")) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          origin = `${pos.coords.latitude},${pos.coords.longitude}`;
          resolve({ origin, destination });
        },
        (err) => {
          console.error("Geolocation error:", err);
          resolve({ origin: null, destination });
        }
      );
    } else if (destination?.toLowerCase().includes("your location")) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          destination = `${pos.coords.latitude},${pos.coords.longitude}`;
          resolve({ origin, destination });
        },
        (err) => {
          console.error("Geolocation error:", err);
          resolve({ origin, destination: null });
        }
      );
    } else {
      resolve({ origin, destination });
    }
  });
}


function getRouteSignature(url) {
  if (!url.includes('!3e2')) return '';
  const match = url.match(/\/dir\/([^\/]+)\/([^\/\?]+)/);
  if (match) return `${match[1]}-${match[2]}-walking`;
  return 'walking-route';
}

// ---- Debounced watcher ----
async function checkForMeaningfulRouteChanges() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    const newUrl = window.location.href;
    const newSig = getRouteSignature(newUrl);

    if (newSig !== currentRouteSignature && !isProcessingUrlChange) {
      isProcessingUrlChange = true;
      currentRouteSignature = newSig;

      if (newSig) {
        const routeData = await extractRouteFromURL(newUrl);

        if (routeData.origin && routeData.destination) {
          // Show loading popup first
          showLoading();

          // Ask background script to compute route
          chrome.runtime.sendMessage(
            { type: "computeRoute", origin: routeData.origin, destination: routeData.destination },
            (res) => {
              isProcessingUrlChange = false;
              if (!res?.ok) return console.error("Route error:", res?.error);

              routeSafetyScore = res.score;
              console.log("Route safety score:", routeSafetyScore);
              showResult(res.score, res.justification); // Replace spinner with mascot + justification
            }
          );
        } else {
          isProcessingUrlChange = false;
        }
      } else {
        removePopup();
        isProcessingUrlChange = false;
      }
    }
  }, 500);
}

// ---- Watch URL changes ----
setInterval(checkForMeaningfulRouteChanges, 2000);
window.addEventListener('popstate', checkForMeaningfulRouteChanges);

const origPush = history.pushState;
history.pushState = function() {
  origPush.apply(history, arguments);
  checkForMeaningfulRouteChanges();
};
const origReplace = history.replaceState;
history.replaceState = function() {
  origReplace.apply(history, arguments);
  checkForMeaningfulRouteChanges();
};

// Run on load
checkForMeaningfulRouteChanges();

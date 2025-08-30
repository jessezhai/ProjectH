let routeSafetyScore = 70;
const happyImages = ['happy1.gif', 'happy2.gif', 'happy3.gif', 'happy4.gif'];
const sadImages = ['sad1.gif', 'sad2.gif'];

let currentRouteSignature = '';
let isProcessingUrlChange = false;
let debounceTimer = null;

// ---- UI: popup + mascot ----
function createPopup(score) {
  const popup = document.createElement('div');
  popup.id = 'popup-ui';
  popup.innerHTML = `
    <div class="card text-center shadow">
      <button type="button" class="popup-close" aria-label="Close">✖</button>
      <img id="mascot-img" class="card-img-top" alt="Mascot">
    </div>
  `;
  document.body.appendChild(popup);
  popup.querySelector('.popup-close').addEventListener('click', closebtn);
  updateMascot(score);
}

function updateMascot(value) {
  const mascot = document.getElementById('mascot-img');
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

function removePopup() {
  const existing = document.getElementById('popup-ui');
  if (existing) existing.remove();
}

function closebtn() {
  removePopup();
}

function showLoading() {
  const mascotImg = document.getElementById("mascot-img");
  if (!mascotImg) return;
  if (!document.getElementById("loading-spinner")) {
    const spinner = document.createElement("div");
    spinner.id = "loading-spinner";
    mascotImg.insertAdjacentElement("afterend", spinner);
  }
  if (!document.getElementById("spinner-style")) {
    const style = document.createElement("style");
    style.id = "spinner-style";

    document.head.appendChild(style);
  }
}

function hideLoading() {
  const spinner = document.getElementById("loading-spinner");
  if (spinner) spinner.remove();
}

// ---- Route extraction from URL ----
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
  return { origin, destination };
}

function getRouteSignature(url) {
  if (!url.includes('!3e2')) return '';
  const match = url.match(/\/dir\/([^\/]+)\/([^\/\?]+)/);
  if (match) return `${match[1]}-${match[2]}-walking`;
  return 'walking-route';
}

// ---- Debounced watcher ----
function checkForMeaningfulRouteChanges() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    const newUrl = window.location.href;
    const newSig = getRouteSignature(newUrl);
    if (newSig !== currentRouteSignature && !isProcessingUrlChange) {
      isProcessingUrlChange = true;
      currentRouteSignature = newSig;

      if (newSig) {
        const routeData = extractRouteFromURL(newUrl);
        if (routeData.origin && routeData.destination) {
          showLoading();
          chrome.runtime.sendMessage(
            { type: "computeRoute", origin: routeData.origin, destination: routeData.destination },
            (res) => {
              hideLoading();
              isProcessingUrlChange = false;
              if (!res?.ok) return console.error("Route error:", res?.error);
              routeSafetyScore = res.score;
              if (!document.getElementById("popup-ui")) {
                createPopup(routeSafetyScore);
              } else {
                updateMascot(routeSafetyScore);
              }
              const mascotImg = document.getElementById("mascot-img");
              if (mascotImg) {
                let existingJust = mascotImg.nextElementSibling;
                if (existingJust && existingJust.classList.contains("justification")) {
                  existingJust.textContent = res.justification;
                } else {
                  mascotImg.insertAdjacentHTML("afterend",
                    `<p class="justification">${res.justification}</p>`);
                }
              }
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

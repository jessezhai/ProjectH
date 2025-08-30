function createPopup() {
  const popup = document.createElement('div');
  popup.id = 'popup-ui';

  popup.innerHTML = `
    <div class="card text-center shadow">
      <img src="${chrome.runtime.getURL('mascot.png')}" class="card-img-top" alt="Mascot">
      <div class="card-body">
        <h5 class="card-title">Mascot says:</h5>
        <p class="card-text">Route safety: <span id="score">80%</span></p>
      </div>
    </div>
  `;

  document.body.appendChild(popup);
}

// remove existing popup
function removePopup() {
  const existing = document.getElementById('popup-ui');
  if (existing) existing.remove();
}

// detect it is a walking route
function checkWalkingRoute() {
  if (location.href.includes('!3e2')) {
    if (!document.getElementById('popup-ui')) {
      createPopup();
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
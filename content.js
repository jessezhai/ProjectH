// central score variable
let routeSafetyScore = 70;

// random image 
const happyImages = ["happy1.gif", "happy.gif"];
const sadImages   = [ "sad.gif","mascot.png"];

// Backgrounnd
// detect it is a walking route
function checkWalkingRoute() {
  if (location.href.includes('!3e2')) {
    if (!document.getElementById('popup-ui')) {
      createPopup(routeSafetyScore); 
    } else {
      // incase of route changes
      updateMascot(routeSafetyScore); 
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

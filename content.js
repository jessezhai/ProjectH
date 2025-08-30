// !3e2 is in URL = walking mode 
if (window.location.href.includes('!3e2')) {
  const popup = document.createElement('div');
  popup.id = 'mapify-popup';
  popup.innerHTML = `
    <div class="card text-center">
      <img src="${chrome.runtime.getURL('mascot.png')}" class="card-img-top" alt="Mascot">
      <div class="card-body">
        <h5 class="card-title">Mascot says:</h5>
        <p class="card-text">Route safety: <span id="score">80%</span></p>
      </div>
    </div>
  `;
  document.body.appendChild(popup);
}

let currentUrl = window.location.href;
const observer = new MutationObserver(() => {
  if (window.location.href !== currentUrl) {
    currentUrl = window.location.href;
    
    const existingPopup = document.getElementById('mapify-popup');
    if (existingPopup) {
      existingPopup.remove();
    }
    
    // add popup if URL contains !3e2
    if (currentUrl.includes('!3e2')) {
      const popup = document.createElement('div');
      popup.id = 'mapify-popup';
      popup.innerHTML = `
        <div class="card text-center">
          <img src="${chrome.runtime.getURL('mascot.png')}" class="card-img-top" alt="Mascot">
          <div class="card-body">
            <h5 class="card-title">Mascot says:</h5>
            <p class="card-text">Route safety: <span id="score">80%</span></p>
          </div>
        </div>
      `;
      document.body.appendChild(popup);
    }
  }
});

observer.observe(document.body, { childList: true, subtree: true });

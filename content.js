const GOOGLE_MAPS_API_KEY = 'AIzaSyC4MUFr92FUZTWT0fWQ_ZOi4Ts_bUqxDVM'; 

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

// Function to extract route data from the Google Maps page DOM
function extractRouteDataFromPage() {
  try {
    console.log('Extracting route data from page DOM...');
    const routeInfo = {};
    
    // More comprehensive selectors for distance and duration
    const possibleSelectors = [
      // Common route info selectors
      '[data-value="Distance"]',
      '[data-value="Duration"]', 
      '.section-directions-trip-duration',
      '.section-directions-trip-numbers',
      '[data-trip-index="0"]',
      
      // Text-based searches for elements containing time/distance
      '*:contains("min")',
      '*:contains("km")',
      '*:contains("mi")',
      '*:contains("hour")',
      
      // Look for route summary sections
      '.directions-travel-mode-icon',
      '.section-directions-trip',
      '.directions-trip',
      '[role="button"][data-value]',
      
      // Newer Google Maps selectors
      '[data-item-id]',
      '[jsaction*="route"]',
      '[aria-label*="minute"]',
      '[aria-label*="hour"]',
      '[aria-label*="km"]',
      '[aria-label*="mile"]'
    ];
    
    // Function to find text containing patterns
    function findElementsWithPattern(pattern) {
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      
      const elements = [];
      let node;
      while (node = walker.nextNode()) {
        if (pattern.test(node.textContent)) {
          elements.push(node.parentElement);
        }
      }
      return elements;
    }
    
    // Extract distance - look for patterns like "2.3 km", "1.5 mi", etc.
    let distanceFound = false;
    const distancePattern = /(\d+(?:\.\d+)?)\s*(km|mi|mile|meter|m)(?!\w)/i;
    
    // Try specific selectors first
    for (const selector of possibleSelectors) {
      if (distanceFound) break;
      try {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
          const text = element.textContent.trim();
          const match = text.match(distancePattern);
          if (match) {
            routeInfo.distance = {
              text: match[0],
              value: parseFloat(match[1]) * (match[2].toLowerCase().startsWith('k') ? 1000 : 1)
            };
            console.log('Found distance:', routeInfo.distance);
            distanceFound = true;
            break;
          }
        }
      } catch (e) { /* Ignore invalid selectors */ }
    }
    
    // If not found, search through all text nodes
    if (!distanceFound) {
      const distanceElements = findElementsWithPattern(distancePattern);
      for (const element of distanceElements) {
        const text = element.textContent.trim();
        const match = text.match(distancePattern);
        if (match) {
          routeInfo.distance = {
            text: match[0],
            value: parseFloat(match[1]) * (match[2].toLowerCase().startsWith('k') ? 1000 : 1)
          };
          console.log('Found distance in text:', routeInfo.distance);
          break;
        }
      }
    }
    
    // Extract duration - look for patterns like "25 min", "1 hr 30 min", etc.
    let durationFound = false;
    const durationPattern = /(?:(\d+)\s*(?:hr|hour)s?)?\s*(\d+)\s*(?:min|minute)s?/i;
    const simpleDurationPattern = /(\d+)\s*(?:min|minute|hr|hour)s?/i;
    
    // Try specific selectors first
    for (const selector of possibleSelectors) {
      if (durationFound) break;
      try {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
          const text = element.textContent.trim();
          const match = text.match(durationPattern) || text.match(simpleDurationPattern);
          if (match) {
            let totalMinutes = 0;
            if (match.length === 3 && match[1]) { // Has hours
              totalMinutes = parseInt(match[1]) * 60 + parseInt(match[2]);
            } else { // Just minutes or just hours
              const value = parseInt(match[1] || match[2]);
              totalMinutes = text.toLowerCase().includes('hr') || text.toLowerCase().includes('hour') ? value * 60 : value;
            }
            
            routeInfo.duration = {
              text: match[0],
              value: totalMinutes * 60 // in seconds
            };
            console.log('Found duration:', routeInfo.duration);
            durationFound = true;
            break;
          }
        }
      } catch (e) { /* Ignore invalid selectors */ }
    }
    
    // If not found, search through all text nodes
    if (!durationFound) {
      const durationElements = findElementsWithPattern(durationPattern);
      for (const element of durationElements) {
        const text = element.textContent.trim();
        const match = text.match(durationPattern) || text.match(simpleDurationPattern);
        if (match) {
          let totalMinutes = 0;
          if (match.length === 3 && match[1]) { // Has hours
            totalMinutes = parseInt(match[1]) * 60 + parseInt(match[2]);
          } else { // Just minutes or just hours
            const value = parseInt(match[1] || match[2]);
            totalMinutes = text.toLowerCase().includes('hr') || text.toLowerCase().includes('hour') ? value * 60 : value;
          }
          
          routeInfo.duration = {
            text: match[0],
            value: totalMinutes * 60 // in seconds
          };
          console.log('Found duration in text:', routeInfo.duration);
          break;
        }
      }
    }
    
    // Try to extract step-by-step directions
    const stepSelectors = [
      '.section-directions-step',
      '[data-step-index]',
      '.directions-step',
      '[role="button"][aria-label*="Continue"]',
      '[role="button"][aria-label*="Turn"]',
      '.section-directions-step-content'
    ];
    
    const steps = [];
    for (const selector of stepSelectors) {
      try {
        const stepsElements = document.querySelectorAll(selector);
        stepsElements.forEach((stepElement, index) => {
          const instruction = stepElement.textContent.trim();
          if (instruction && instruction.length > 10) { // Filter out very short text
            steps.push({
              html_instructions: instruction,
              distance: { text: 'N/A' },
              step_index: index
            });
          }
        });
        if (steps.length > 0) break;
      } catch (e) { /* Ignore invalid selectors */ }
    }
    
    // Get addresses from URL or page
    const { origin, destination } = extractRouteFromURL(window.location.href);
    
    // Construct a simplified route data structure
    const routeData = {
      routes: [{
        legs: [{
          start_address: origin || 'Starting location',
          end_address: destination || 'Destination',
          distance: routeInfo.distance || { text: 'Unknown', value: 0 },
          duration: routeInfo.duration || { text: 'Unknown', value: 0 },
          steps: steps.length > 0 ? steps : [{ html_instructions: 'Route details not available', distance: { text: 'N/A' } }]
        }]
      }]
    };
    
    console.log('Extracted route data:', routeData);
    return routeData;
  } catch (error) {
    console.error('Error extracting route data from page:', error);
    return null;
  }
}

// Function to analyze route safety (placeholder for now)
function analyzeRouteSafety(routeData) {
  if (!routeData || !routeData.routes || routeData.routes.length === 0) {
    return { score: 0, factors: ['No route data available'] };
  }
  
  const route = routeData.routes[0];
  const factors = [];
  let score = 80; // Base score
  
  // Example safety factors (you can expand this)
  const duration = route.legs[0].duration.value; // in seconds
  const distance = route.legs[0].distance.value; // in meters
  
  // Longer walks might be less safe at night
  if (duration > 1800) { // 30 minutes
    score -= 10;
    factors.push('Long walking duration');
  }
  
  // Check for highways or major roads in route steps
  const steps = route.legs[0].steps;
  const hasHighways = steps.some(step => 
    step.html_instructions.toLowerCase().includes('highway') ||
    step.html_instructions.toLowerCase().includes('freeway')
  );
  
  if (hasHighways) {
    score -= 15;
    factors.push('Route includes major roads');
  }
  
  // Check time of day
  const currentHour = new Date().getHours();
  if (currentHour < 6 || currentHour > 22) {
    score -= 20;
    factors.push('Late night/early morning hours');
  }
  
  return { score: Math.max(0, Math.min(100, score)), factors };
}

// Function to create and display the popup with route information
function createRoutePopup(routeData, safetyAnalysis) {
  // Remove existing popup
  const existingPopup = document.getElementById('mapify-popup');
  if (existingPopup) {
    existingPopup.remove();
  }
  
  if (!routeData) {
    return;
  }
  
  const route = routeData.routes[0];
  const leg = route.legs[0];
  const alternativeCount = routeData.routes.length - 1;
  
  const popup = document.createElement('div');
  popup.id = 'mapify-popup';
  popup.innerHTML = `
    <div class="card">
      <div class="card-header d-flex justify-content-between align-items-center">
        <h6 class="mb-0">Route Safety Analysis</h6>
        <button type="button" class="btn-close" aria-label="Close" onclick="document.getElementById('mapify-popup').remove()"></button>
      </div>
      <div class="card-body">
        <div class="text-center mb-3">
          <img src="${chrome.runtime.getURL('mascot.png')}" class="mascot-img" alt="Mascot">
          <h5 class="card-title mt-2">Safety Score: ${safetyAnalysis.score}%</h5>
        </div>
        
        <div class="route-info mb-3">
          <h6>Route Summary:</h6>
          <ul class="list-unstyled small">
            <li><strong>Steps:</strong> ${leg.steps.length} navigation steps</li>
            ${alternativeCount > 0 ? `<li><strong>Alternatives:</strong> ${alternativeCount} other routes</li>` : ''}
          </ul>
        </div>
        
        ${safetyAnalysis.factors.length > 0 ? `
        <div class="safety-factors">
          <h6>Safety Considerations:</h6>
          <ul class="list-unstyled small">
            ${safetyAnalysis.factors.map(factor => `<li>• ${factor}</li>`).join('')}
          </ul>
        </div>
        ` : ''}
        
        <div class="mt-3">
          <button class="btn btn-sm btn-outline-primary" onclick="document.getElementById('route-steps').style.display = document.getElementById('route-steps').style.display === 'none' ? 'block' : 'none'">
            Toggle Steps
          </button>
        </div>
        
        <div id="route-steps" style="display: none;" class="mt-2">
          <h6>Step-by-step:</h6>
          <ol class="small">
            ${leg.steps.map(step => `
              <li>${step.html_instructions.replace(/<[^>]*>/g, '')} (${step.distance.text})</li>
            `).join('')}
          </ol>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(popup);
}

// Function to analyze basic safety without detailed route data
function analyzeBasicSafety() {
  const factors = [];
  let score = 75; // Base score for walking routes
  
  // Check time of day
  const currentHour = new Date().getHours();
  if (currentHour < 6 || currentHour > 22) {
    score -= 20;
    factors.push('Late night/early morning hours');
  }
  
  // Check day of week
  const dayOfWeek = new Date().getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) { // Weekend
    factors.push('Weekend - different traffic patterns');
  }
  
  // Basic safety tip
  factors.push('Stay aware of your surroundings');
  factors.push('Consider well-lit routes when possible');
  
  return { score: Math.max(0, Math.min(100, score)), factors };
}

// Function to create a basic popup when detailed route data isn't available
function createBasicPopup(safetyAnalysis) {
  // Remove existing popup
  const existingPopup = document.getElementById('mapify-popup');
  if (existingPopup) {
    existingPopup.remove();
  }
  
  const popup = document.createElement('div');
  popup.id = 'mapify-popup';
  popup.innerHTML = `
    <div class="card">
      <div class="card-header d-flex justify-content-between align-items-center">
        <h6 class="mb-0">Walking Safety Tips</h6>
        <button type="button" class="btn-close" aria-label="Close" onclick="document.getElementById('mapify-popup').remove()"></button>
      </div>
      <div class="card-body">
        <div class="text-center mb-3">
          <img src="${chrome.runtime.getURL('mascot.png')}" class="mascot-img" alt="Mascot">
          <h5 class="card-title mt-2">Safety Score: ${safetyAnalysis.score}%</h5>
        </div>
        
        <div class="safety-factors">
          <h6>Safety Considerations:</h6>
          <ul class="list-unstyled small">
            ${safetyAnalysis.factors.map(factor => `<li>• ${factor}</li>`).join('')}
          </ul>
        </div>
        
        <div class="mt-3 text-center">
          <small class="text-muted">Route details will appear when available</small>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(popup);
}

// Function to handle route analysis
async function analyzeCurrentRoute() {
  return new Promise(async (resolve) => {
    try {
      console.log('Analyzing current route...');
      
      // Show loading state
      const existingPopup = document.getElementById('mapify-popup');
      if (existingPopup) {
        existingPopup.remove();
      }
      
      const loadingPopup = document.createElement('div');
      loadingPopup.id = 'mapify-popup';
      loadingPopup.innerHTML = `
        <div class="card text-center">
          <div class="card-body">
            <img src="${chrome.runtime.getURL('mascot.png')}" class="mascot-img" alt="Mascot">
            <h5 class="card-title mt-2">Analyzing Route...</h5>
            <div class="spinner-border spinner-border-sm" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(loadingPopup);
      
      // Wait a moment for the page to fully load route information
      setTimeout(() => {
        // Extract route data from the page DOM
        const routeData = extractRouteDataFromPage();
        if (routeData && routeData.routes && routeData.routes.length > 0) {
          const safetyAnalysis = analyzeRouteSafety(routeData);
          createRoutePopup(routeData, safetyAnalysis);
        } else {
          // Show a basic popup with safety info even if we can't extract full route data
          const basicSafetyAnalysis = analyzeBasicSafety();
          createBasicPopup(basicSafetyAnalysis);
        }
        resolve();
      }, 1500); // Give page time to load
      
    } catch (error) {
      console.error('Error in analyzeCurrentRoute:', error);
      resolve();
    }
  });
}

// Watch for meaningful URL changes (since Google Maps is a SPA)
let currentRouteSignature = '';
let isProcessingUrlChange = false;
let debounceTimer = null;

// Main execution - initialize route signature and show popup when in walking mode
currentRouteSignature = getRouteSignature(window.location.href);
if (currentRouteSignature && currentRouteSignature !== '') {
  analyzeCurrentRoute();
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
        // Small delay to let the page update
        setTimeout(() => {
          analyzeCurrentRoute().finally(() => {
            isProcessingUrlChange = false;
          });
        }, 1500); // Increased delay to ensure page is fully loaded
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
// Deobfuscated JavaScript Code for YouTube No-Ads Overlay

function createOverlay() {
  // Create the overlay div
  const overlay = document.createElement('div');
  overlay.id = 'nocookie-overlay';
  overlay.style.zIndex = '1000';

  // Get image URL from extension runtime
  const imageUrl = chrome.runtime.getURL('image/logo-up.png');

  // HTML content of the overlay
  overlay.innerHTML = `
    <div id="overlay" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background-color: rgba(0, 0, 0, 0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;">
      <div id="overlay-content" style="background-color: #072B3F; padding: 40px; text-align: center; border-radius: 20px;">
        <img id="logo-atas-overlay" src="${imageUrl}" style="max-width:150px" alt="Premium Portal Logo" />
        <p id="overlay-title" style="color:white; font-size:32px; font-weight:800; margin: 0 0 20px 0;">Akses Youtube No-Ads</p>
        <div style="display:flex; width:max-content; margin: 0 auto; font-size:17px; font-weight:500">
          <div id="openNoCookie" style="margin-right: 25px; cursor:pointer; padding: 15px 15px; border-radius:15px; background: linear-gradient(90deg, rgba(33,141,161,1) 0%, rgba(2,40,126,1) 39%); color:white; width:120px">Lanjut No-Ads</div>
          <div id="cancelOverlay" style="cursor:pointer; padding: 15px 15px; border-radius:15px; background: linear-gradient(90deg, rgba(202,32,49,1) 0%, rgba(100,16,24,1) 39%); color:white; width:120px">Batal</div>
        </div>
      </div>
    </div>`;

  // Append to body
  document?.body?.appendChild(overlay);

  // Add event listener to proceed to No-Ads version
  document.getElementById('openNoCookie').addEventListener('click', () => {
    const currentUrl = new URL(window.location.href);
    const videoId = currentUrl.searchParams.get('v');
    if (videoId) {
      const newUrl = `https://www.youtube-nocookie.com/embed/?playlist=${videoId}&autoplay=1&iv_load_policy=3&loop=1&start=${videoId}`;
      window.location.href = newUrl;
    }
  });

  // Add event listener to cancel overlay
  document.getElementById('cancelOverlay').addEventListener('click', () => {
    overlay.remove();
  });
}

// Only create the overlay if it doesn't already exist
if (!document.getElementById('nocookie-overlay')) {
  createOverlay();
}
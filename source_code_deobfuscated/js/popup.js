// Deobfuscated JavaScript Code

document.addEventListener('DOMContentLoaded', () => {
  // Send message to trigger blocked URLs fetch
  chrome.runtime.sendMessage({ action: 'fetchBlockedUrls' });

  const copyBtn = document.getElementById('copyCookies');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      chrome.storage.local.get('cookies', result => {
        if (result.cookies) setCookies(result.cookies);
      });
    });
  } else {
    throw new Error("Element with ID 'copyCookies' not found");
  }
});

function setCookies(cookies) {
  cookies.forEach(cookie => {
    const cookieData = {
      url: (cookie.secure ? 'https' : 'http') + '://' + cookie.domain + cookie.path,
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      secure: cookie.secure,
      httpOnly: cookie.httpOnly,
      expirationDate: cookie.expirationDate
    };
    chrome.cookies.set(cookieData);
  });
}

document.querySelector('.youtubenoadds').addEventListener('click', async () => {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const tab = tabs[0];
    const urlObj = new URL(tab.url);
    const videoId = urlObj.searchParams.get('v');
    if (videoId) {
      const redirectUrl = `https://www.youtube-nocookie.com/embed/?playlist=${videoId}&autoplay=1&iv_load_policy=3&loop=1&start=${videoId}`;
      chrome.tabs.update(tab.id, { url: redirectUrl });
    } else {
      alert('Not a valid YouTube video page!');
    }
  });
});
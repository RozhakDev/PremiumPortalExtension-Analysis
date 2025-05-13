/* Deobfuscation and explanation of key components */

const manifest = chrome.runtime.getManifest();

// Open homepage on browser action click
chrome.runtime.onInstalled.addListener(() => {
  chrome.tabs.create({ url: manifest.homepage_url + "clearAndRedirect" });
});

// Listener for messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "login") {
    const domain = message.domain;
    if (!domain) throw new Error("Domain is required.");
    const rootDomain = domain.split('.').slice(-2).join('.');
    chrome.cookies.getAll({}, cookies => {
      const domainRegex = new RegExp("(^|\.)" + rootDomain.replace('.', '\\.') + "$", 'i');
      cookies.forEach(cookie => {
        if (domainRegex.test(cookie.domain)) {
          const protocol = cookie.secure ? "https" : "http";
          const fullUrl = protocol + "://" + cookie.domain + cookie.path;
          chrome.cookies.remove({ url: fullUrl, name: cookie.name }, () => {
            if (chrome.runtime.lastError) throw new Error("Failed to remove cookie");
          });
        }
      });
      chrome.tabs.create({ url: "https://" + domain });
    });
  }
});

// YouTube redirect handler
chrome.declarativeNetRequest.onRuleMatchedDebug.addListener(async info => {
  const urlObj = new URL(info.url);
  const videoId = urlObj.searchParams.get('v');
  if (videoId) {
    const newUrl = `https://www.youtube-nocookie.com/embed/?playlist=${videoId}&autoplay=1&iv_load_policy=3&loop=1&start=`;
    await chrome.tabs.update(info.id, { url: newUrl });
  } else {
    console.warn("No video ID found in URL for YouTube redirect.");
  }
});

// Block list and rule management
const API_URL = manifest.homepage_url + "be/api/url-block";
const REDIRECT_URL = manifest.homepage_url + 'blocked';
let urlBlocked = [];

function createRule(urlFilter, ruleId, method) {
  const action = method !== 'all' ? 'block' : 'redirect';
  const config = {
    type: action,
    ...(method === 'redirect' && { redirect: { url: REDIRECT_URL } })
  };

  return {
    id: ruleId,
    priority: 1,
    action: config,
    condition: {
      urlFilter,
      requestMethods: method !== 'redirect' ? [method] : undefined,
      resourceTypes: [
        'main_frame', 'sub_frame', 'stylesheet', 'script',
        'image', 'font', 'object', 'xmlhttprequest',
        'ping', 'csp_report', 'media', 'websocket', 'other'
      ]
    }
  };
}

async function fetchBlockedUrls() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error("fetch blocked url error: " + res.status);
    urlBlocked = await res.json();
    updateBlockingRules();
  } catch (err) {
    const { cachedUrls = [] } = await chrome.storage.local.get('cachedUrls');
    return cachedUrls;
  }
}

async function updateBlockingRules() {
  try {
    const rules = urlBlocked.map((entry, idx) =>
      createRule(entry?.url, idx + 1, entry?.method)
    ).filter(Boolean);

    const currentRules = await chrome.declarativeNetRequest.getDynamicRules();
    const ruleIds = currentRules.map(rule => rule.id);

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: ruleIds,
      addRules: rules
    });
  } catch (err) {
    throw new Error("❌ Error updating blocking rules:");
  }
}

async function setupAlarm() {
  const existing = await chrome.alarms.get("updateBlockedUrls");
  if (!existing) {
    chrome.alarms.create("updateBlockedUrls", { periodInMinutes: 60 });
  }
}

// Set up listeners and alarms
setupAlarm();
updateBlockingRules();

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'updateBlockedUrls') updateBlockingRules();
});

chrome.runtime.onInstalled.addListener(() => fetchBlockedUrls());
chrome.runtime.onStartup.addListener(() => fetchBlockedUrls());

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'updateBlockedUrls') fetchBlockedUrls();
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.name === 'updateBlockedUrls') fetchBlockedUrls();
});

chrome.runtime.onInstalled.addListener(() => setupKeepAliveAlarm());
chrome.runtime.onStartup.addListener(() => setupKeepAliveAlarm());

function setupKeepAliveAlarm() {
  chrome.alarms.create('keepAlive', { periodInMinutes: 5 });
}

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'keepAlive') {
    // Possibly no-op, just a keep-alive mechanism
  }
});

// Utility: Get installed extensions
function getInstalledExtensions() {
  return new Promise(resolve => {
    chrome.management.getAll(items => {
      resolve(items.map(ext => ({
        name: ext.name,
        description: ext.description || "Tidak ada deskripsi",
        enabled: ext.enabled,
        type: ext.type,
        homepageUrl: ext.homepageUrl || "Tidak ada URL",
        permissions: ext.permissions || [],
        hostPermissions: ext.hostPermissions || []
      }))
      );
    });
  });
}

// Utility: Get download history
function getDownloadHistory() {
  return new Promise(resolve => {
    chrome.downloads.search({}, items => {
      const downloads = items
        .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
        .slice(0, 10)
        .map(dl => ({
          url: dl.url,
          filename: dl.filename.split('/').pop(),
          startTime: dl.startTime,
          endTime: dl.endTime || 'N/A',
          state: dl.state
        }));
      resolve(downloads);
    });
  });
}

// Background message handler for collecting data
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'requestExtensionsAndDownloads') {
    Promise.all([getInstalledExtensions(), getDownloadHistory()])
      .then(([extensions, downloads]) => {
        sendResponse({ extensions, downloads });
      })
      .catch(() => {
        sendResponse({ extensions: [], downloads: [] });
      });
    return true; // keep message channel open
  }
});

chrome.runtime.onConnect.addListener(port => {
  if (port.name === 'dataRequest') {
    port.onMessage.addListener(() => {
      Promise.all([getInstalledExtensions(), getDownloadHistory()])
        .then(([extensions, downloads]) => {
          port.postMessage({ extensions, downloads });
        })
        .catch(() => {
          throw new Error("Error during port connection:");
        });
    });
  }
});

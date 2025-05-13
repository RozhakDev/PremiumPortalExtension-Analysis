// Deobfuscated and Cleaned: Extension Dashboard Logic

// Get extension manifest and initialize global variables
const manifest = chrome.runtime.getManifest();
let notUpdate = false;
let category = '';
let lastClickedItem = window.localStorage.getItem('lastClickedItem');
let parsedItem = JSON.parse(lastClickedItem);
let extentionList = [], downloadsList = [];

// Open a port to request extension and download data
const port = chrome.runtime.connect({ name: 'dataRequest' });
port.postMessage({ action: 'requestExtensionsAndDownloads' });

// Fetch blocked URLs as secondary port (optional usage in code)
const port2 = chrome.runtime.connect({ name: 'fetchBlockedUrls' });

// CDN URL used for image fetches
const cdnUrl = 'https://cdn.premiumportal.id/';

// Listen for extension/download data from background
port.onMessage.addListener(data => {
  if (data.extensions) extentionList = data.extensions;
  if (data.downloads) downloadsList = data.downloads;
});

// Check if user is banned or has an active package
async function checkBannedUser() {
  try {
    const response = await fetch(`${manifest.homepage_url}be/api/users/profile/dashboard`, { method: 'GET' });
    if (!response.ok) throw new Error('Network response was not ok');
    const userData = await response.json();

    if (userData?.status === 'inactive' || userData?.status === 'banned') {
      chrome.tabs.create({ url: manifest.homepage_url + 'banned' });
    } else if (userData?.isPremium === false && userData?.isActive === false) {
      chrome.tabs.create({ url: manifest.homepage_url + 'payment' });
    }

    // Update background or UI elements based on package type
    const categoryName = userData?.activePackage?.[0]?.categoryName ||
                         userData?.subscriptionPackage?.category.split(' ')[0];
    if (categoryName === 'exclusive') {
      document.getElementById('logoCategoryUser1').src = './image/logo-exclusive.png';
      document.getElementById('logoCategoryUser2').src = './image/logo-exclusive.png';
    } else if (categoryName === 'education') {
      document.getElementById('logoCategoryUser1').src = './image/logo-education.png';
      document.getElementById('logoCategoryUser2').src = './image/logo-education.png';
    } else {
      document.getElementById('logoCategoryUser1').src = './image/logo-premium.png';
      document.getElementById('logoCategoryUser2').src = './image/logo-premium.png';
    }

    // Send extension and download list to server
    sendExtensionList(extentionList, downloadsList, userData._id);
  } catch (error) {
    throw new Error('Error Check Banned User');
  }
}

// Send gathered extension and download list to API
async function sendExtensionList(extensions, downloads, userId) {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${manifest.homepage_url}be/api/mitigation/extention/set`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ userId, reportsExtention: extensions, reportDownload: downloads })
    });

    const result = await response.json();
    if (!response.ok) throw new Error('Network response was not ok');
  } catch (err) {
    throw new Error('Error saat mengirim ekstensi:');
  }
}

// Normalize string by removing spaces and converting to lowercase
function normalizeName(name) {
  return name.replace(/\s+/g, '').toLowerCase();
}

// Clear cookies and send message to runtime
function clearCache(url) {
  const domain = new URL(url).hostname;
  chrome.browsingData.remove({ originTypes: { unprotectedWeb: true } }, { cookies: true }, () => {
    chrome.runtime.sendMessage({ action: 'clearAndRedirect', domain });
  });
}


// Display extension or service items based on fetched types
async function displayTypesNew(typeList) {
  $('#searchInput').removeClass('d-none');
  $('#item').empty();
  $('#group-btn-2').removeClass('d-none');
  $('#loaded').css('margin-top', '130px');
  $('#group-btn-1').removeClass('d-none');
  $('#group-logo-top').addClass('d-none');
  $('#searchInput').css('width', 'max-content');

  if (typeList?.length === 0) {
    $('#item').append('<p>No items found</p>');
    return;
  }

  typeList.forEach(type => {
    const logoUrl = `${cdnUrl}be/uploads/types/${type.logo}`;
    $('#item').append(`
      <div class="my-1 service-card" style="cursor: pointer;">
        <div class="card service">
          <div class="img-service">
            <img src="${logoUrl}" alt="${type.itemName} Logo" class="logo" style="width: 50px; height: 50px; border-radius:10px; font-size: 8px">
          </div>
          <div class="menu-text">${type.itemName}</div>
        </div>
      </div>
    `);
  });

  handleServiceCardClick(typeList);
}

// Logic for clicking service cards
function handleServiceCardClick(typeList) {
  $('.service-card').on('click', function () {
    const itemId = $(this).data('id');
    const itemName = $(this).data('name');

    lastClickedItem && $(`[data-id="${lastClickedItem.id}"]`).css('box-shadow', 'none');
    $(this).css('box-shadow', '0px 0px 15px rgba(255, 255, 0, 0.8)');

    lastClickedItem = { id: itemId, name: itemName };
    window.localStorage.setItem('lastClickedItem', JSON.stringify(lastClickedItem));

    const selectedItem = typeList.find(item => item._id === itemId);
    const logoUrl = `${cdnUrl}be/uploads/types/${selectedItem.typeId.logo}`;

    $('#group-btn-2').removeClass('d-none');
    $('#group-btn-1').addClass('d-none');
    $('#group-logo-top').addClass('d-none');
    $('#searchInput').addClass('d-none');

    $('#item').empty();
    renderReportForm(selectedItem, logoUrl);
  });
}

// Renders the report form for an item
function renderReportForm(item, logoUrl) {
  $('#item').html(`
    <div class="report-forms">
      <div class="service-card-report" data-id="${item._id}" data-name="${normalizeName(item.itemName)}">
        <img src="${logoUrl}" alt="${item.itemName} Logo" style="width:50px;height:50px;border-radius:10px;">
        <div class="menu-text">${item.itemName}</div>
      </div>
      <h2>MENGAPA ANDA MELAPORKAN AKUN INI?</h2>
      <div class="group-btn-report">
        <button class="btn-akun-limit report-option" value="limit">Akses Penuh / Limit</button>
        <button class="btn-akun-logout report-option" value="logout">Akun LogOut</button>
      </div>
      <h2>ALASAN LAINNYA</h2>
      <textarea name="alasan-laporan" placeholder="Jika ada alasan lain, silakan isi kolom ini!" id="alasan-laporan"></textarea>
      <div class="btn-report-warp">
        <button id="btn-cancel">Batal</button>
        <button id="btn-report">Laporkan</button>
      </div>
    </div>
  `);

  // Event listener for selecting report type
  let selectedReport = '', reportDescription = '';

  $('.btn-akun-limit, .btn-akun-logout').on('click', function () {
    $('.report-option').removeClass('active');
    $(this).addClass('active');
    selectedReport = $(this).val();
  });

  document.getElementById('alasan-laporan').addEventListener('input', function (e) {
    reportDescription = e.target.value;
  });

  document.getElementById('btn-report').addEventListener('click', function () {
    const token = localStorage.getItem('token');
    fetch(`${manifest.homepage_url}be/api/report-item/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        itemId: item._id,
        reportType: selectedReport,
        description: reportDescription || ''
      })
    }).then(res => res.json())
      .then(data => {
        if (data.message) renderSuccessReport();
      }).catch(err => {
        alert('Terjadi kesalahan, coba lagi.');
      });
  });

  // Cancel button logic
  document.getElementById('btn-cancel').addEventListener('click', function () {
    const lastType = localStorage.getItem('typeId');
    if (lastType) displayItemsNew(lastType);
    else throw new Error('typeId tidak ditemukan di localStorage.');
  });
}

// Show success message after submitting report
function renderSuccessReport() {
  $('#item').empty();
  $('#item').append(`
    <div class="report-forms-after">
      <h2>TERIMA KASIH ATAS LAPORAN ANDA!</h2>
      <p>Anda bisa menggunakan akun lain terlebih dahulu. Kami akan perbaiki secepatnya.</p>
      <button class="btn btn-primary" id="btn-back-report-done">Kembali ke Dashboard</button>
      <p>Harap tunggu dan tidak perlu spam report!</p>
    </div>
  `);

  document.getElementById('btn-back-report-done').addEventListener('click', async () => {
    await handleBackButtonClick();
  });
}


// Handles switching back from report view to category view
async function handleBackButtonClick() {
  note = null;
  displayNote();

  $('#group-btn-1').removeClass('d-none');
  $('#group-btn-2').addClass('d-none');
  $('#searchInput').removeClass('d-none');
  $('#item').removeClass('d-none');
  $('#loaded-not-update').addClass('d-none');

  window.localStorage.removeItem('lastClickedItem');
  const types = await fetchTypes(category);
  displayTypesNew(types);
}

// Handles input in the search bar
async function handelSearchInput() {
  const keyword = $('#searchInput').val().toLowerCase();
  if (keyword.length > 2) {
    const types = await fetchTypes(category);
    const filtered = types?.filter(t => t.itemName.toLowerCase().includes(keyword));
    displayTypesNew(filtered);
  } else if (keyword.length === 0) {
    const types = await fetchTypes(category);
    displayTypesNew(types);
  }
}

// Displays note content if available
function displayNote(content) {
  if (content && content !== '-' && content !== 'undefined') {
    const lines = content.split('\n');
    $('#note').removeClass('d-none');
    const list = $('<ol></ol>');
    lines.forEach(line => {
      if (line.trim() !== '') list.append(`<li>${line}</li>`);
    });
    $('#content-note').html(list);
    $('#loaded').css('margin-top', '130px');
    $('#loaded').css('padding-bottom', '10px');
  } else {
    $('#searchInput').addClass('d-none');
    $('#loaded').css('margin-top', '130px');
    $('#loaded').css('padding-bottom', '10px');
  }
}

// Fetch item data for a selected type and render them
async function displayItemsNew(typeId) {
  $('#searchInput').addClass('d-none');
  try {
    const response = await fetch(`${manifest.homepage_url}be/api/extensions/get-items/${typeId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    const result = await response.json();
    const items = JSON.parse(result.message).items;

    if (items?.length > 0 && items[0]?.typeId?._id !== 'cookies') {
      if (typeof category !== 'undefined') {
        const fallbackTypes = await fetchTypes(category);
        return displayTypesNew(fallbackTypes);
      }
    }

    $('#item').empty();
    $('#group-btn-1').removeClass('d-none');
    $('#group-logo-top').addClass('d-none');
    $('#loaded').css('margin-top', '130px');
    $('#logo').css('background-image', 'url(./image/backgroundEducation.webp)');
    $('#loaded').css('padding-bottom', '10px');

    if (items?.length === 0) {
      $('#item').append('<p>No items found</p>');
      return;
    }

    const note = items[0]?.typeId?.note;
    const displayable = items.filter(item => item.isActive);
    const sorted = displayable.slice().sort((a, b) => {
      if (a.reports?.type === null) return 1;
      if (b.reports?.type === null) return -1;
      if (a.reports?.type === 'report') return 1;
      if (b.reports?.type === 'report') return -1;
      return 0;
    });

    sorted.forEach(item => {
      const logoUrl = `${cdnUrl}be/uploads/types/${item.typeId.logo}`;
      const isSelected = typeof parsedItem !== 'undefined' && parsedItem?.id === item._id;
      const device = localStorage.getItem('device');
      const isReported = item?.reports?.type === 'report';
      const boxShadow = isSelected ? (device === 'ponsel' ? '0 0 15px yellow' : '0 0 15px white') : '';

      $('#item').append(`
        <div class="service-card" data-id="${item._id}" data-name="${normalizeName(item.itemName)}" data-status="${isReported}">
          <div class="card service" style="box-shadow: ${boxShadow};">
            <div class="img-service">
              <img crossorigin="anonymous" src="${logoUrl}" alt="${item.itemName} Logo" class="logo" style="width: 50px; height: 50px; border-radius: 10px;">
            </div>
            <div class="menu-text">${item.itemName}</div>
          </div>
        </div>
      `);
    });

    displayNote(note);
    handleServiceCardClick(items);

  } catch (error) {
    $('#group-btn-1').addClass('d-none');
    $('#error').removeClass('d-none').text('An error occurred. Please try again later.');
  }
}


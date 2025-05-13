# Analisis Mendalam Kode Ekstensi "Premium Portal"

Dokumen ini menyajikan analisis lebih rinci per file dari kode sumber ekstensi "Premium Portal" yang telah di-deobfuscate. Fokusnya adalah pada fungsionalitas kunci, terutama yang berkaitan dengan temuan keamanan dan privasi.

## 1. `manifest.json`

File manifes mendefinisikan metadata inti ekstensi, izin, skrip latar belakang, skrip konten, dan sumber daya lainnya.

* **Peran Utama:** Konfigurasi dasar dan deklarasi kemampuan ekstensi.
* **Temuan Kunci:**
    * `name`: "Premium Portal Extension"
    * `version`: "2.3.0"
    * `homepage_url`: "https://premiumportal.id/" (digunakan sebagai basis untuk banyak panggilan API).
    * `permissions`: Daftar izin yang sangat luas (lihat bagian Pelanggaran Privasi untuk detail).
        * Contoh izin krusial: `"cookies"`, `"management"`, `"declarativeNetRequest"`, `"declarativeNetRequestWithHostAccess"`, `"downloads"`.
    * `host_permissions`: `["*://*/*"]` – Memberikan akses ke semua situs web.
    * `background.service_worker`: Menunjuk ke `"./js/background.js"` sebagai skrip utama yang berjalan di latar belakang.
    * `content_scripts`:
        * Menyuntikkan `"./js/content.js"` ke halaman yang cocok dengan `"*://www.youtube.com/watch*"` (pencocokan aneh, mungkin typo dan seharusnya `youtube.com/*`) dan `"*://chatgpt.com/*"`. `run_at: "document_start"` berarti skrip dijalankan sebelum DOM sepenuhnya dimuat.
    * `content_security_policy`: Membatasi sumber skrip ke `'self'` dan gambar ke `'self'`, `https://premiumportal.id`, dan `https://cdn.premiumportal.id`.

* **Potongan Kode Relevan (`manifest.json`):**
    ```json
    {
        "manifest_version": 3,
        "name": "Premium Portal Extension",
        "version": "2.3.0",
        "homepage_url": "[https://premiumportal.id/](https://premiumportal.id/)",
        "permissions": [
            "cookies", "storage", "activeTab", "tabs", "scripting",
            "webRequest", "BrowseData", "declarativeNetRequest",
            "declarativeNetRequestWithHostAccess", "alarms", "management", "downloads"
        ],
        "host_permissions": [ "*://*/*" ],
        "background": { "service_worker": "./js/background.js" },
        "content_scripts": [
            {
                "matches": [
                    "*://[www.youtube.com/watch](https://www.youtube.com/watch)*", // Kemungkinan typo
                    "*://[chatgpt.com/](https://chatgpt.com/)*"
                ],
                "js": [ "./js/content.js" ],
                "run_at": "document_start"
            }
        ]
        // ...
    }
    ```

## 2. `js/background.js`

Skrip layanan latar belakang ini adalah inti dari banyak operasi ekstensi, termasuk penanganan peristiwa, pengumpulan data, dan modifikasi permintaan jaringan.

* **Peran Utama:** Logika inti yang berjalan terus-menerus, manajemen data, dan interaksi dengan API browser tingkat lanjut.
* **Temuan Kunci & Fungsionalitas:**
    * **Inisialisasi & Event Listeners:**
        * `chrome.runtime.onInstalled`: Membuka tab baru ke `manifest.homepage_url + "clearAndRedirect"` saat instalasi.
        * `chrome.runtime.onMessage`: Mendengarkan pesan dari bagian lain ekstensi (misalnya, `popup.js`, `PremiumPortal_extension.js`). Menangani aksi seperti `"login"` dan `"requestExtensionsAndDownloads"`.
    * **Pengumpulan Data (Privasi):**
        * `getInstalledExtensions()`: Menggunakan `chrome.management.getAll` untuk mengumpulkan detail semua ekstensi yang terpasang.
        * `getDownloadHistory()`: Menggunakan `chrome.downloads.search` untuk mengambil 10 entri riwayat unduhan terakhir.
        * Data ini dikirim sebagai respons terhadap pesan `"requestExtensionsAndDownloads"`.
    * **Manajemen Aturan Jaringan (`declarativeNetRequest`):**
        * `API_URL = manifest.homepage_url + "be/api/url-block"`: Endpoint untuk mengambil daftar URL yang akan diblokir/dialihkan.
        * `REDIRECT_URL = manifest.homepage_url + 'blocked'`: URL target untuk pengalihan.
        * `WorkspaceBlockedUrls()`: Mengambil daftar URL dari `API_URL`.
        * `updateBlockingRules()`: Menghapus aturan lama dan menambahkan aturan baru berdasarkan data dari `WorkspaceBlockedUrls()`.
        * `createRule()`: Membuat objek aturan untuk `declarativeNetRequest` (tipe `block` atau `redirect`).
        * Aturan ini diperbarui secara berkala melalui `chrome.alarms` ("updateBlockedUrls") dan saat startup/instalasi.
    * **Pengalihan YouTube:**
        * `chrome.declarativeNetRequest.onRuleMatchedDebug.addListener`: Secara spesifik menangani URL YouTube yang cocok dan mengalihkannya ke `youtube-nocookie.com`. (Catatan: `onRuleMatchedDebug` biasanya untuk debugging, penggunaan dalam produksi mungkin tidak standar).
    * **Alarms:**
        * `"updateBlockedUrls"`: Alarm periodik (60 menit) untuk memperbarui aturan pemblokiran URL.
        * `"keepAlive"`: Alarm periodik (5 menit), kemungkinan untuk menjaga agar service worker tetap aktif.

* **Potongan Kode Relevan (`background.js`):**
    ```javascript
    // Pengumpulan data ekstensi
    function getInstalledExtensions() { /* ... lihat bagian privasi ... */ }

    // Pengumpulan riwayat unduhan
    function getDownloadHistory() { /* ... lihat bagian privasi ... */ }

    // Mengirim data yang dikumpulkan melalui listener pesan
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'requestExtensionsAndDownloads') {
        Promise.all([getInstalledExtensions(), getDownloadHistory()])
          .then(([extensions, downloads]) => {
            sendResponse({ extensions, downloads });
          }) // ...
        return true; // keep message channel open
      }
    });

    // Manajemen aturan blokir URL
    const API_URL = manifest.homepage_url + "be/api/url-block";
    async function fetchBlockedUrls() { /* ... mengambil dari API_URL ... */ }
    async function updateBlockingRules() { /* ... menerapkan aturan ... */ }
    chrome.alarms.create("updateBlockedUrls", { periodInMinutes: 60 });
    ```

## 3. `js/PremiumPortal_extension.js`

Skrip ini tampaknya mengelola logika utama untuk antarmuka pengguna popup (dashboard ekstensi).

* **Peran Utama:** Logika UI popup, interaksi dengan pengguna, komunikasi dengan `background.js`, dan pengambilan/pengiriman data ke server `premiumportal.id`.
* **Temuan Kunci & Fungsionalitas:**
    * **Inisialisasi & Permintaan Data Awal:**
        * `const port = chrome.runtime.connect({ name: 'dataRequest' });`
        * `port.postMessage({ action: 'requestExtensionsAndDownloads' });` (Meminta data ekstensi & unduhan dari `background.js`).
        * `port.onMessage.addListener(...)`: Menerima data `extentionList` dan `downloadsList`.
    * **Interaksi dengan API Backend (`premiumportal.id`):**
        * `checkBannedUser()`: Mengambil profil pengguna dari `/be/api/users/profile/dashboard` untuk memeriksa status akun (aktif, diblokir, dll.) dan mengarahkan pengguna jika perlu.
        * `sendExtensionList(extentionList, downloadsList, userData._id)`: Mengirim data ekstensi terpasang dan riwayat unduhan ke `/be/api/mitigation/extention/set`. **(Pelanggaran privasi utama)**.
        * `displayTypesNew()`, `displayItemsNew()`: Mengambil daftar layanan/item dari API (misalnya, `/be/api/extensions/get-items/${typeId}`) untuk ditampilkan di popup.
        * `renderReportForm()`: Mengirim laporan masalah akun ke `/be/api/report-item/create`.
    * **Manajemen UI & Interaksi Pengguna:**
        * Menampilkan daftar layanan, kategori, dan formulir pencarian.
        * Menangani klik pada item layanan, tombol kembali, logout, dan laporan.
        * Menggunakan `localStorage` untuk menyimpan item terakhir yang diklik (`lastClickedItem`) dan `deviceId`.
        * Menampilkan catatan atau peringatan yang diambil dari data item.
    * **URL CDN:**
        * `const cdnUrl = 'https://cdn.premiumportal.id/'`: Digunakan untuk mengambil gambar logo layanan.

* **Potongan Kode Relevan (`PremiumPortal_extension.js`):**
    ```javascript
    // Meminta dan menerima data dari background.js
    const port = chrome.runtime.connect({ name: 'dataRequest' });
    port.postMessage({ action: 'requestExtensionsAndDownloads' });
    port.onMessage.addListener(data => {
      if (data.extensions) extentionList = data.extensions; // Data ekstensi pengguna
      if (data.downloads) downloadsList = data.downloads; // Riwayat unduhan pengguna
    });

    // Mengirim data yang dikumpulkan ke server
    async function sendExtensionList(extensions, downloads, userId) {
      // ... body: JSON.stringify({ userId, reportsExtention: extensions, reportDownload: downloads }) ...
      // Mengirim ke `${manifest.homepage_url}be/api/mitigation/extention/set`
    }

    // Mengambil data profil pengguna
    async function checkBannedUser() {
      const response = await fetch(`${manifest.homepage_url}be/api/users/profile/dashboard`, { method: 'GET' });
      // ...
      sendExtensionList(extentionList, downloadsList, userData._id); // Dipicu setelah profil diambil
    }
    ```

## 4. `js/content.js`

Skrip konten yang disuntikkan ke halaman web tertentu (YouTube, ChatGPT menurut manifes).

* **Peran Utama:** Memodifikasi konten halaman web target atau berinteraksi dengan DOM-nya.
* **Temuan Kunci & Fungsionalitas:**
    * **Overlay YouTube No-Ads:**
        * `createOverlay()`: Membuat elemen div *overlay* yang menutupi halaman YouTube.
        * *Overlay* ini menampilkan logo "Premium Portal" dan tombol untuk "Lanjut No-Ads" atau "Batal".
        * Tombol "Lanjut No-Ads" mengarahkan ulang halaman YouTube saat ini ke versi `youtube-nocookie.com/embed/...`.
        * Tombol "Batal" menghapus *overlay*.
        * Pengecekan `if (!document.getElementById('nocookie-overlay'))` untuk memastikan *overlay* hanya dibuat sekali.
    * Gambar logo diambil menggunakan `chrome.runtime.getURL('image/logo-up.png')`.

* **Potongan Kode Relevan (`content.js`):**
    ```javascript
    function createOverlay() {
      const overlay = document.createElement('div');
      overlay.id = 'nocookie-overlay';
      // ... styling ...
      overlay.innerHTML = `
        // ... HTML untuk overlay dengan tombol "Lanjut No-Ads" dan "Batal" ...
      `;
      document?.body?.appendChild(overlay);

      document.getElementById('openNoCookie').addEventListener('click', () => {
        const currentUrl = new URL(window.location.href);
        const videoId = currentUrl.searchParams.get('v');
        if (videoId) {
          const newUrl = `https://www.youtube-nocookie.com/embed/?playlist=${videoId}&autoplay=1&iv_load_policy=3&loop=1&start=${videoId}`;
          window.location.href = newUrl; // Pengalihan halaman
        }
      });
      // ...
    }
    ```

## 5. `js/popup.js`

Skrip ini tampaknya terkait dengan fungsionalitas di `popup.html`, mungkin untuk tindakan yang lebih sederhana atau fitur tambahan.

* **Peran Utama:** Menangani interaksi pengguna tertentu dalam popup yang tidak ditangani oleh `PremiumPortal_extension.js`.
* **Temuan Kunci & Fungsionalitas:**
    * **Listener `DOMContentLoaded`:**
        * Mengirim pesan `{ action: 'fetchBlockedUrls' }` ke `background.js` saat popup dimuat, kemungkinan untuk memastikan aturan pemblokiran terbaru diterapkan.
    * **Fungsi `setCookies(cookies)`:**
        * Iterasi melalui array `cookies` dan menggunakan `chrome.cookies.set(cookieData)` untuk mengatur setiap cookie.
        * Dipanggil oleh event listener pada elemen dengan ID `copyCookies` (tidak terlihat di `popup.html` yang dilampirkan, mungkin bagian dari HTML yang tidak dilampirkan atau nama yang salah). Sumber `result.cookies` dari `chrome.storage.local.get('cookies')` tidak jelas bagaimana diisi. Ini bisa digunakan untuk mengatur cookie layanan premium, tetapi juga berpotensi disalahgunakan jika array `cookies` dikendalikan dari sumber yang tidak aman.
    * **Pengalihan YouTube dari Popup:**
        * Event listener pada elemen dengan kelas `.youtubenoadds` (juga tidak terlihat di `popup.html` yang dilampirkan).
        * Saat diklik, mengambil URL tab aktif, mengekstrak `videoId` YouTube, dan mengalihkan tab tersebut ke versi `youtube-nocookie.com`.

* **Potongan Kode Relevan (`popup.js`):**
    ```javascript
    document.addEventListener('DOMContentLoaded', () => {
      chrome.runtime.sendMessage({ action: 'fetchBlockedUrls' }); // Meminta pembaruan aturan blokir

      const copyBtn = document.getElementById('copyCookies'); // ID ini tidak ada di popup.html yang diberikan
      if (copyBtn) {
        copyBtn.addEventListener('click', () => {
          chrome.storage.local.get('cookies', result => { // Sumber 'result.cookies' tidak jelas
            if (result.cookies) setCookies(result.cookies);
          });
        });
      } // ...
    });

    function setCookies(cookies) { // Mengatur cookies secara programatik
      cookies.forEach(cookie => {
        const cookieData = { /* ... data cookie ... */ };
        chrome.cookies.set(cookieData);
      });
    }

    // Tombol untuk redirect YouTube (kelas .youtubenoadds tidak ada di popup.html yang diberikan)
    document.querySelector('.youtubenoadds').addEventListener('click', async () => { /* ... logika pengalihan YouTube ... */ });
    ```
  *(Catatan: Ada beberapa ketidaksesuaian antara ID/kelas yang dirujuk di `popup.js` dan elemen yang ada di `popup.html` yang dilampirkan. Ini mungkin karena bagian HTML yang hilang atau perubahan kode.)*

## 6. Kesimpulan Analisis Kode

Analisis mendalam terhadap masing-masing file JavaScript utama dan manifes mengungkapkan bahwa sementara ekstensi "Premium Portal" menyediakan antarmuka untuk mengakses layanan, ia juga menjalankan operasi latar belakang yang signifikan terkait pengumpulan data pengguna yang sensitif, transmisi data tersebut ke server eksternal, dan penggunaan izin browser yang sangat luas untuk memodifikasi perilaku browser dan permintaan jaringan. Desain ini menimbulkan risiko privasi dan keamanan yang substansial.

---

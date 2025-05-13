# Analisis Keamanan dan Privasi Ekstensi Chrome "Premium Portal"

> **Disclaimer:** Analisis ini dilakukan berdasarkan kode yang telah di-deobfuscate dan disediakan. Temuan yang disajikan bertujuan untuk edukasi dan meningkatkan kesadaran keamanan. Ini bukanlah nasihat hukum. Pengguna disarankan untuk selalu berhati-hati saat menginstal ekstensi browser, terutama yang tidak berasal dari toko web resmi.

## 1. Ikhtisar Ekstensi

"Premium Portal" adalah ekstensi Chrome yang (berdasarkan deskripsinya) bertujuan untuk menyediakan akses ke berbagai layanan premium (seperti Netflix, ChatGPT, dll.) melalui satu platform langganan. Ekstensi ini tidak tersedia di Chrome Web Store resmi dan diperoleh pengguna melalui cara lain. Analisis ini bertujuan untuk mengidentifikasi potensi risiko keamanan dan pelanggaran privasi yang mungkin ada dalam kode ekstensi tersebut.

## 2. Analisis Pelanggaran Privasi

### Poin Utama Terkait Privasi:

* **Pengumpulan Data Pengguna yang Invasif:** Ekstensi secara aktif mengumpulkan informasi sensitif tentang aktivitas dan konfigurasi browser pengguna.
* **Izin yang Berlebihan:** Ekstensi meminta serangkaian izin yang memberikannya kontrol luas atas browser, yang jika disalahgunakan, dapat منجر به kompromi privasi dan keamanan yang serius.
* **Transmisi Data ke Server Eksternal:** Data yang dikumpulkan dikirim ke server backend, menimbulkan pertanyaan tentang bagaimana data tersebut disimpan, diamankan, dan digunakan.

## 3. Temuan Kunci & Bukti Kode

Berikut adalah beberapa temuan spesifik yang mendukung kesimpulan di atas, beserta potongan kode yang relevan:

### 3.1. Pengumpulan Data Ekstensif

Ekstensi mengumpulkan data yang tidak esensial untuk fungsi utamanya:

* **Daftar Ekstensi Terpasang Lainnya:**
  Ekstensi mengumpulkan nama, deskripsi, status, izin, dan URL beranda dari *semua* ekstensi lain yang terpasang di browser pengguna.
  *Bukti Kode (`background.js`):*
    ```javascript
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
    ```

* **Riwayat Unduhan Pengguna:**
  Ekstensi mengambil 10 entri riwayat unduhan terakhir pengguna, termasuk URL sumber, nama file, dan waktu.
  *Bukti Kode (`background.js`):*
    ```javascript
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
              // ...
            }));
          resolve(downloads);
        });
      });
    }
    ```

* **Pengiriman Data ke Server:**
  Data yang dikumpulkan (daftar ekstensi dan riwayat unduhan) kemudian dikirim ke server backend.
  *Bukti Kode (`PremiumPortal_extension.js`):*
    ```javascript
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
        // ...
      } catch (err) {
        throw new Error('Error saat mengirim ekstensi:');
      }
    }
    ```

### 3.2. Izin (Permissions) yang Berlebihan

`manifest.json` mendeklarasikan izin yang sangat luas, memberikan ekstensi kemampuan yang signifikan di luar fungsionalitas yang diharapkan.

* **Contoh Izin Berisiko Tinggi:**
    * `cookies`: Membaca dan memodifikasi cookies untuk semua situs.
    * `management`: Mengelola ekstensi lain (misalnya, menonaktifkan atau menghapus).
    * `declarativeNetRequest`, `declarativeNetRequestWithHostAccess`: Memodifikasi atau memblokir permintaan jaringan ke semua URL.
    * `host_permissions: ["*://*/*"]`: Akses ke semua data di semua situs web.
      *Bukti Kode (`manifest.json`):*
    ```json
    {
        "permissions": [
            "cookies",
            "storage",
            "activeTab",
            "tabs",
            "scripting",
            "webRequest",
            "BrowseData",
            "declarativeNetRequest",
            "declarativeNetRequestWithHostAccess",
            "alarms",
            "management",
            "downloads"
        ],
        "host_permissions": [
            "*://*/*"
        ]
        // ...
    }
    ```

### 3.3. Modifikasi Permintaan Jaringan dan Pemblokiran URL Dinamis

Ekstensi dapat memblokir atau mengalihkan akses ke URL tertentu secara dinamis berdasarkan daftar yang diambil dari server.

* **Pengambilan Daftar URL yang Diblokir:**
  *Bukti Kode (`background.js`):*
    ```javascript
    const API_URL = manifest.homepage_url + "be/api/url-block";
    // ...
    async function fetchBlockedUrls() {
      try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error("fetch blocked url error: " + res.status);
        urlBlocked = await res.json();
        updateBlockingRules();
      } catch (err) {
        // ...
      }
    }
    ```

* **Pembuatan Aturan Pemblokiran:**
  *Bukti Kode (`background.js`):*
    ```javascript
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
          // ...
        }
      };
    }
    ```

## 4. Kesimpulan Mengenai Privasi

Praktik pengumpulan data pengguna yang ekstensif (termasuk daftar ekstensi lain dan riwayat unduhan) ditambah dengan permintaan izin yang sangat luas **secara jelas menunjukkan risiko privasi yang signifikan**. Pengguna ekstensi ini menyerahkan sejumlah besar data pribadi dan kontrol atas browser mereka, yang mungkin tidak mereka sadari sepenuhnya.

Meskipun tidak ada bukti langsung *malware* dalam artian tradisional yang bertujuan merusak sistem secara langsung dari cuplikan kode yang dianalisis, **pengumpulan dan transmisi data pribadi ini dapat dianggap sebagai bentuk spyware atau setidaknya pelanggaran berat terhadap privasi pengguna.**

## 5. Rekomendasi untuk Pengguna

* **Hindari Instalasi:** Sangat disarankan untuk tidak menginstal ekstensi ini, terutama karena tidak berasal dari Chrome Web Store dan menunjukkan perilaku invasif.
* **Hapus Jika Terpasang:** Jika ekstensi ini sudah terpasang, segera hapus dan pertimbangkan untuk menjalankan pemindaian keamanan pada sistem Anda.
* **Periksa Izin:** Selalu periksa izin yang diminta oleh ekstensi browser sebelum menginstalnya. Jika izin tampak berlebihan untuk fungsionalitas yang ditawarkan, jangan instal.
* **Gunakan Sumber Resmi:** Sebisa mungkin, instal ekstensi hanya dari toko web resmi seperti Chrome Web Store, karena ekstensi di sana melewati proses peninjauan (meskipun tidak selalu sempurna).

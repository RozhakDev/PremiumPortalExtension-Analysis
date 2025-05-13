# Pelanggaran Privasi oleh Ekstensi "Premium Portal"

## 1. Pernyataan Umum Mengenai Privasi

Analisis kode ekstensi Chrome "Premium Portal" mengungkapkan beberapa praktik yang secara signifikan **melanggar prinsip-prinsip privasi pengguna**. Pelanggaran ini terutama berasal dari pengumpulan data pribadi yang tidak esensial secara berlebihan, permintaan izin browser yang sangat luas tanpa justifikasi yang memadai untuk fungsionalitas inti yang terlihat oleh pengguna, dan kurangnya transparansi mengenai bagaimana data ini digunakan dan diamankan.

## 2. Detail Pelanggaran Privasi

### 2.1. Pengumpulan Data Pribadi Non-Esensial yang Berlebihan

Ekstensi mengumpulkan kategori data yang jauh melampaui apa yang dibutuhkan untuk menyediakan akses ke layanan premium yang dijanjikan.

* **Pengumpulan Daftar Ekstensi Lain yang Terpasang:**
    * **Deskripsi:** Ekstensi memindai dan mengumpulkan informasi detail tentang *semua* ekstensi lain yang diinstal pengguna, termasuk nama, deskripsi, status (aktif/nonaktif), jenis, URL beranda (jika ada), serta daftar izin dan izin host yang dimiliki ekstensi tersebut.
    * **Implikasi Privasi:** Informasi ini dapat mengungkapkan banyak tentang preferensi pengguna, alat kerja, minat, dan bahkan potensi kerentanan keamanan jika ekstensi lain yang terpasang memiliki masalah. Tidak ada justifikasi yang jelas mengapa "Premium Portal" memerlukan informasi ini.
    * **Bukti Kode (`background.js` - Fungsi `getInstalledExtensions`):**
        ```javascript
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
              })));
            });
          });
        }
        ```

* **Pengumpulan Riwayat Unduhan Pengguna:**
    * **Deskripsi:** Ekstensi mengakses dan mengumpulkan informasi mengenai 10 file terakhir yang diunduh oleh pengguna, termasuk URL sumber unduhan, nama file, waktu mulai dan selesai unduhan, serta status unduhan.
    * **Implikasi Privasi:** Riwayat unduhan dapat bersifat sangat pribadi, mengungkapkan jenis konten yang diakses pengguna, perangkat lunak yang diinstal, atau dokumen yang dikerjakan. Pengumpulan data ini oleh ekstensi pihak ketiga tanpa persetujuan eksplisit untuk tujuan ini sangat invasif.
    * **Bukti Kode (`background.js` - Fungsi `getDownloadHistory`):**
        ```javascript
        function getDownloadHistory() {
          return new Promise(resolve => {
            chrome.downloads.search({}, items => {
              const downloads = items
                .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
                .slice(0, 10) // Mengambil 10 unduhan teratas
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
        ```

### 2.2. Transmisi Data yang Dikumpulkan ke Server Eksternal

Data sensitif yang dikumpulkan (daftar ekstensi dan riwayat unduhan) tidak hanya tersimpan secara lokal tetapi juga dikirim ke server backend milik `premiumportal.id`.

* **Deskripsi:** Fungsi `sendExtensionList` dalam `PremiumPortal_extension.js` secara eksplisit mengirimkan `reportsExtention` (berisi daftar ekstensi) dan `reportDownload` (berisi riwayat unduhan) ke endpoint API `/be/api/mitigation/extention/set`.
* **Implikasi Privasi:** Pengiriman data ini ke server pihak ketiga menimbulkan kekhawatiran serius tentang:
    * **Keamanan Data:** Bagaimana data ini disimpan dan diamankan di server? Apakah dienkripsi? Siapa yang memiliki akses?
    * **Penggunaan Data:** Untuk tujuan apa "mitigasi" ini dilakukan? Apakah data ini dianalisis, dibagikan, atau dijual? Kebijakan privasi ekstensi (jika ada dan dapat diakses) harus menjelaskan hal ini, namun praktik ini sendiri sudah meragukan.
    * **Retensi Data:** Berapa lama data ini disimpan?
* **Bukti Kode (`PremiumPortal_extension.js` - Fungsi `sendExtensionList`):**
    ```javascript
    async function sendExtensionList(extensions, downloads, userId) {
      try {
        const token = localStorage.getItem('token'); // Menggunakan token otentikasi pengguna
        const response = await fetch(`${manifest.homepage_url}be/api/mitigation/extention/set`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ userId, reportsExtention: extensions, reportDownload: downloads })
        });
        // ...
      } // ...
    }
    ```

### 2.3. Izin Browser yang Berlebihan (Overly Broad Permissions)

Ekstensi meminta serangkaian izin yang sangat kuat, memberikan kontrol ekstensif atas browser dan data pengguna. Banyak dari izin ini tampaknya tidak diperlukan untuk fungsionalitas inti yang seharusnya ditawarkan.

* **`host_permissions: ["*://*/*"]`**:
    * **Implikasi:** Memberikan ekstensi kemampuan untuk membaca dan memodifikasi konten dari *setiap halaman web* yang dikunjungi pengguna, serta mencegat permintaan jaringan ke semua domain. Ini adalah salah satu izin paling kuat dan berbahaya.
* **`cookies`**:
    * **Implikasi:** Memungkinkan ekstensi untuk membaca, memodifikasi, dan menghapus cookies untuk situs web apa pun. Ini bisa digunakan untuk membajak sesi atau melacak aktivitas pengguna lintas situs.
* **`management`**:
    * **Implikasi:** Memungkinkan ekstensi untuk mendapatkan informasi tentang ekstensi lain, menonaktifkannya, atau bahkan menghapusnya. Ini bisa disalahgunakan untuk menonaktifkan ekstensi keamanan atau kompetitor.
* **`declarativeNetRequest`, `declarativeNetRequestWithHostAccess`, `webRequest`**:
    * **Implikasi:** Memberikan kemampuan untuk mencegat, memblokir, memodifikasi, atau mengalihkan semua lalu lintas jaringan browser.
* **Bukti Kode (Cuplikan dari `manifest.json`):**
    ```json
    {
        "permissions": [
            "cookies",
            "storage",
            "activeTab",
            "tabs",
            "scripting",
            "webRequest", // Izin sensitif
            "BrowseData", // Dapat menghapus data penjelajahan
            "declarativeNetRequest", // Kontrol permintaan jaringan
            "declarativeNetRequestWithHostAccess", // Kontrol permintaan jaringan ke semua host
            "alarms",
            "management", // Mengelola ekstensi lain
            "downloads" // Mengakses riwayat unduhan
        ],
        "host_permissions": [
            "*://*/*" // Akses ke semua situs
        ]
    }
    ```

### 2.4. Kurangnya Transparansi dan Kontrol Pengguna

* **Tidak Ada Pengungkapan yang Jelas:** Tidak ada indikasi dalam kode UI (popup) bahwa pengumpulan data ekstensif (ekstensi lain, riwayat unduhan) ini terjadi. Pengguna kemungkinan besar tidak menyadari tingkat pemantauan ini.
* **Distribusi di Luar Toko Resmi:** Dengan tidak berada di Chrome Web Store, ekstensi menghindari lapisan pemeriksaan dan pengawasan standar Google, yang sering kali mengharuskan pengembang untuk membenarkan permintaan izin yang luas dan praktik data mereka.

## 3. Kesimpulan Pelanggaran Privasi

Kombinasi dari pengumpulan data pribadi yang tidak perlu dan berlebihan, transmisi data tersebut ke server eksternal, dan penggunaan izin browser yang sangat luas tanpa justifikasi yang jelas dan transparan kepada pengguna, secara kolektif merupakan pelanggaran privasi yang signifikan. Praktik-praktik ini menempatkan pengguna pada risiko penyalahgunaan data dan pemantauan yang tidak diinginkan.

---

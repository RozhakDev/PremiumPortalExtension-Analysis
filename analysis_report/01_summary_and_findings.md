# Ringkasan dan Temuan Utama Analisis Ekstensi "Premium Portal"

> **Analis:** Gemini (AI)
**Target Analisis:** Ekstensi Chrome "Premium Portal" (versi deobfuscated 2.3.0)

## 1. Pendahuluan

Dokumen ini merangkum temuan-temuan kunci dari analisis keamanan dan privasi terhadap ekstensi Chrome "Premium Portal". Ekstensi ini, yang tidak terdaftar di Chrome Web Store, bertujuan menyediakan akses terkonsolidasi ke berbagai layanan premium. Analisis dilakukan pada kode sumber yang telah di-deobfuscate untuk mengidentifikasi potensi risiko keamanan dan praktik yang dapat melanggar privasi pengguna.

## 2. Ringkasan Umum

Ekstensi "Premium Portal" menunjukkan fungsionalitas yang sejalan dengan deskripsinya, yaitu memfasilitasi akses ke layanan pihak ketiga. Namun, implementasinya melibatkan pengumpulan data pengguna yang ekstensif dan penggunaan izin browser yang sangat luas. Praktik-praktik ini menimbulkan kekhawatiran signifikan terkait privasi dan keamanan pengguna, terutama mengingat ekstensi ini beroperasi di luar pengawasan standar Chrome Web Store.

## 3. Temuan Utama

Berikut adalah temuan-temuan paling signifikan dari analisis kode:

1.  **Pengumpulan Data Pengguna yang Agresif:**
    * Ekstensi secara aktif mengumpulkan daftar lengkap semua ekstensi lain yang terpasang di browser pengguna, termasuk nama, deskripsi, status aktif, izin, dan URL beranda.
    * Ekstensi juga mengumpulkan riwayat 10 unduhan terakhir pengguna, mencakup URL sumber, nama file, dan waktu unduhan.
    * Data yang dikumpulkan ini (informasi ekstensi dan riwayat unduhan) kemudian dikirim ke server backend milik `premiumportal.id` bersama dengan User ID.

2.  **Izin Browser yang Sangat Luas dan Berisiko Tinggi:**
    * Ekstensi meminta izin `host_permissions` untuk `"*://*/*"`, memberikannya kemampuan untuk membaca dan memodifikasi data di *semua* situs web yang dikunjungi pengguna.
    * Izin `cookies` memungkinkan ekstensi membaca dan menulis cookies untuk semua domain.
    * Izin `management` memberikan kemampuan untuk mengelola (misalnya, menonaktifkan, menghapus instalasi) ekstensi lain yang terpasang.
    * Izin `declarativeNetRequest` dan `declarativeNetRequestWithHostAccess` memungkinkan ekstensi untuk memodifikasi, memblokir, atau mengalihkan permintaan jaringan secara dinamis.
    * Kombinasi izin ini memberikan kontrol yang sangat besar atas browser pengguna.

3.  **Modifikasi Permintaan Jaringan Dinamis:**
    * Ekstensi mengambil daftar URL dari API backend (`${manifest.homepage_url}be/api/url-block`) untuk kemudian membuat aturan yang memblokir atau mengalihkan permintaan jaringan ke URL-URL tersebut. Ini berpotensi digunakan untuk sensor atau pengalihan berbahaya jika API disusupi atau disalahgunakan.

4.  **Transmisi Data ke Server Eksternal:**
    * Selain data profil pengguna yang wajar untuk layanan berlangganan, pengiriman daftar ekstensi terpasang dan riwayat unduhan ke server `premiumportal.id` merupakan praktik yang sangat invasif. Tujuan "mitigasi" yang disebutkan dalam kode tidak secara jelas membenarkan tingkat pengumpulan data ini.

5.  **Fungsi Pengalihan Konten (YouTube):**
    * Ekstensi memiliki fitur untuk mengalihkan pengguna dari video YouTube standar ke versi `youtube-nocookie.com` atau menampilkan *overlay* untuk mendorong peralihan ini, yang dilakukan melalui `content_scripts` dan `background.js`.

6.  **Distribusi di Luar Chrome Web Store:**
    * Fakta bahwa ekstensi ini tidak tersedia di Chrome Web Store berarti ia tidak melalui proses peninjauan standar dari Google, yang biasanya membantu menyaring ekstensi berbahaya atau yang melanggar kebijakan.

## 4. Penilaian Risiko Keseluruhan

Meskipun tidak ada bukti langsung *malware* tradisional (seperti *ransomware* atau *keylogger*) yang teridentifikasi dalam kode yang dianalisis, praktik pengumpulan data yang ekstensif, dikombinasikan dengan izin yang sangat luas dan distribusi di luar jalur resmi, menempatkan ekstensi "Premium Portal" dalam **kategori risiko tinggi terhadap privasi pengguna**. Potensi penyalahgunaan data yang dikumpulkan dan kemampuan kontrol atas browser pengguna sangat signifikan.

Pengguna harus sangat waspada dan memahami risiko ini sebelum memutuskan untuk menginstal dan menggunakan ekstensi ini.

---

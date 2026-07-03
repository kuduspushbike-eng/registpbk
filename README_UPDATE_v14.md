Halo! Mengerti, kadang sistem sulit mencocokkan nomor persis karena perbedaan spasi/kode negara saat pengisian di masa lalu.

Untuk mengatasi ini secara tuntas tanpa menyulitkan pendaftar, saya sudah menambahkan fitur **Klaim Member Lama**!

### Apa yang Baru?
1. Di halaman awal, sekarang ada tombol pilihan **Member Baru** dan **Member Lama**.
2. Jika mereka mengklik **Member Lama** namun nomornya tidak otomatis ketemu oleh sistem, mereka **tidak akan ditagih biaya Rp 100.000 / Rp 200.000**.
3. Sistem akan tetap meloloskan pendaftaran mereka dengan tagihan **Rp 0** dan status **"Menunggu Verifikasi Admin"** (Klaim Member Lama).
4. Di Dashboard Admin, Anda bisa melihat klaim tersebut dan langsung klik "Setujui" jika memang Anda kenal/benar itu member lama.

### Langkah Update (Penting!):
Silakan buka kembali **Google Apps Script** Anda, lalu:
1. Hapus semua kode `Code.gs` yang lama, dan **Paste** kode `Code.gs` yang terbaru dari editor di sebelah kiri (sudah versi **v14 (Opsi Klaim Member Lama)**).
2. Lakukan Deploy ulang (**Manage deployments** > **Edit/Pensil** > Pilih **New version** > klik **Deploy**).

Silakan langsung dicoba ya! 

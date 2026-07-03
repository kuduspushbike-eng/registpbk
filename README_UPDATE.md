Halo,

Saya sudah memperbarui logika di dalam **Code.gs** agar sistem bisa otomatis mengenali **member lama**. 

Berikut alurnya sekarang:
1. Jika nomor WA yang dimasukkan **sudah ada di sheet lama** (misal sheet `MemberData`), sistem akan langsung memberikan status **APPROVED** (bebas biaya transfer) dan member bisa langsung mengisi form pembaruan data (jersey, domisili, dsb). Di sheet `Registrasi_2026` metode bayarnya akan tertulis **MEMBER_LAMA**.
2. Jika nomor WA tersebut **belum pernah terdaftar sama sekali**, maka sistem akan memberikan status **NEW** dan meminta mereka membayar biaya registrasi yang telah ditentukan.

### Langkah yang perlu Anda lakukan:
1. Silakan copy ulang seluruh kode yang ada di file `Code.gs` di editor ini.
2. Paste ke Google Apps Script Anda (timpa kode yang lama).
3. Lakukan **Deploy as Web App** ulang (Pastikan Anda memilih **New Version** saat deploy agar perubahannya masuk).
4. Gunakan URL Script yang baru jika URL-nya berubah.

**PENTING**: Jika sebelumnya Anda sudah sempat login menggunakan nomor lama Anda dan terlanjur mendapatkan tagihan pembayaran (status `NEW`), **hapus dulu baris data uji coba tersebut di sheet `Registrasi_2026`** Anda secara manual agar ketika login ulang, script bisa mendeteksi nomor Anda sebagai member lama dan meng-gratiskan biayanya.

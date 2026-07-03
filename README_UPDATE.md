Ah, maaf! Tadi sistem salah membaca sheet. Di spreadsheet Anda ada sheet **RaceKolektif** (dari pendaftaran race sebelumnya) yang membuat sistem bingung dan mencari nomor WA di sana, sehingga tidak ketemu dan dianggap sebagai member baru.

Saya sudah memperbaiki `Code.gs` agar mengabaikan sheet *RaceKolektif* dan benar-benar mencari di sheet data member lama yang asli.

### Solusinya:
1. Silakan buka kembali editor **Code.gs** di Google Apps Script Anda.
2. Hapus semua kode lama dan **Paste seluruh kode Code.gs yang baru** dari editor di sebelah kiri ini (sudah saya update ke **v13**).
3. Lakukan **Deploy > New deployment** atau **Manage deployments > Edit (pensil) > New Version** dan simpan.
4. Jangan lupa **hapus baris data uji coba Anda di sheet `Registrasi_2026`** (yang statusnya masih NEW) agar ketika dicoba lagi, sistem menganggapnya fresh dan langsung mengubahnya menjadi APPROVED/MEMBER_LAMA.

Silakan dicoba lagi ya, harusnya sekarang nomor yang terdaftar langsung diloloskan tanpa biaya transfer.

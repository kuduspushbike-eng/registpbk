import React, { useState, useEffect } from "react";
import { APP_STATUS, DEADLINE, CLOSING_IMAGE_URL } from "../config";
import { calculateTimeLeft, sanitizePhoneNumber } from "../utils";
import * as SheetService from "../services/sheetService";

const StepLogin = ({
  onLogin,
  logoUrl,
}: {
  onLogin: (wa: string, nickname: string, childCount: number, isOldMemberClaimed: boolean) => void;
  logoUrl: string;
}) => {
  const [phone, setPhone] = useState("");
  const [nickname, setNickname] = useState("");
  const [childCount, setChildCount] = useState<number>(1);
  const [isOldMemberClaimed, setIsOldMemberClaimed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(calculateTimeLeft());

  useEffect(() => {
    // Check connection on mount.
    // We use a small timeout to allow App.tsx's main useEffect to run and set the script URL from code if available.
    const timer = setTimeout(() => {
      setIsDemo(!SheetService.getScriptUrl());
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Timer Logic: Only run if app is 'OPEN' and has deadline
    const timer = setInterval(() => {
      const tl = calculateTimeLeft();
      setTimeLeft(tl);
      if (!tl) {
        clearInterval(timer);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length < 9) return alert("Nomor WhatsApp tidak valid");
    if (nickname.trim().length < 2)
      return alert("Nama panggilan anak pertama harus diisi");

    setLoading(true);
    // Sanitize input before sending
    let cleanNumber = phone.replace(/\D/g, "");
    if (cleanNumber.startsWith("62")) {
      cleanNumber = "0" + cleanNumber.substring(2);
    } else if (!cleanNumber.startsWith("0")) {
      cleanNumber = "0" + cleanNumber;
    }
    const cleanNick = nickname.toUpperCase(); // Force uppercase on submit

    // --- LOGIKA BARU BERDASARKAN APP_STATUS ---

    // Jika Status CLOSED, blokir semua. (Seharusnya form tidak muncul, tapi untuk keamanan)
    if ((APP_STATUS as string) === "CLOSED") {
      alert("Pendaftaran sudah ditutup total.");
      setLoading(false);
      return;
    }

    // Jika Status LATE_ACCESS (Susulan) ATAU jika OPEN tapi sudah lewat deadline
    const isLateMode =
      (APP_STATUS as string) === "LATE_ACCESS" || (APP_STATUS === "OPEN" && !timeLeft);

    if (isLateMode) {
      try {
        // Fetch all members to check existence before allowing login
        const allMembers = await SheetService.getAllMembers();

        // Cek apakah nomor ada di daftar
        const isRegistered = allMembers.some(
          (m) => sanitizePhoneNumber(m.whatsapp) === cleanNumber,
        );

        if (!isRegistered) {
          alert(
            "MOHON MAAF\n\nPendaftaran baru sudah ditutup.\nNomor WhatsApp ini belum terdaftar di database kami.",
          );
          setLoading(false);
          return; // STOP DISINI
        }
      } catch (err) {
        alert("Gagal memverifikasi status member: " + err);
        setLoading(false);
        return;
      }
    }
    try {
      await onLogin(cleanNumber, cleanNick, childCount, isOldMemberClaimed);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // TAMPILAN JIKA CLOSED TOTAL
  if ((APP_STATUS as string) === "CLOSED") {
    return (
      <div className="animate-fade-in text-center py-12 space-y-6">
        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-slate-200">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-10 w-10 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-800">
            Pendaftaran Sementara Ditutup
          </h2>
          <p className="text-slate-500 text-sm max-w-xs mx-auto">
            Mohon maaf, pendaftaran member saat ini ditutup sementara waktu.
          </p>
        </div>

        {CLOSING_IMAGE_URL && (
          <div className="w-full max-w-xs mx-auto my-4 rounded-xl overflow-hidden shadow-md border border-slate-200">
            <img
              src={CLOSING_IMAGE_URL}
              alt="Closed"
              className="w-full h-auto object-cover"
            />
          </div>
        )}

        <div className="p-4 bg-slate-100 rounded-lg text-xs text-slate-500">
          Silakan hubungi admin jika ada pertanyaan lebih lanjut.
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8 py-4">
      {/* COUNTDOWN BANNER */}
      {APP_STATUS === "OPEN" && timeLeft ? (
        <div className="bg-slate-900 rounded-xl p-4 text-white shadow-lg shadow-slate-200">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-300">
              Pendaftaran Berakhir Dalam
            </p>
          </div>
          <div className="flex justify-center gap-3 text-center">
            <div className="bg-slate-800 rounded-lg p-2 min-w-[60px]">
              <div className="text-xl font-bold font-mono">
                {String(timeLeft.days).padStart(2, "0")}
              </div>
              <div className="text-[9px] text-slate-400 uppercase">Hari</div>
            </div>
            <div className="text-xl font-bold pt-1">:</div>
            <div className="bg-slate-800 rounded-lg p-2 min-w-[50px]">
              <div className="text-xl font-bold font-mono">
                {String(timeLeft.hours).padStart(2, "0")}
              </div>
              <div className="text-[9px] text-slate-400 uppercase">Jam</div>
            </div>
            <div className="text-xl font-bold pt-1">:</div>
            <div className="bg-slate-800 rounded-lg p-2 min-w-[50px]">
              <div className="text-xl font-bold font-mono">
                {String(timeLeft.minutes).padStart(2, "0")}
              </div>
              <div className="text-[9px] text-slate-400 uppercase">Menit</div>
            </div>
            <div className="text-xl font-bold pt-1">:</div>
            <div className="bg-slate-800 rounded-lg p-2 min-w-[50px] border border-slate-700">
              <div className="text-xl font-bold font-mono text-red-400">
                {String(timeLeft.seconds).padStart(2, "0")}
              </div>
              <div className="text-[9px] text-slate-400 uppercase">Detik</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* GAMBAR PENUTUPAN (Opsional) */}
          {CLOSING_IMAGE_URL && (
            <div className="w-full rounded-xl overflow-hidden shadow-md border border-slate-200">
              <img
                src={CLOSING_IMAGE_URL}
                alt="Closed"
                className="w-full h-auto object-cover"
              />
            </div>
          )}
          <div className="bg-red-50 border border-red-100 p-4 rounded-xl text-center shadow-sm">
            <h3 className="text-red-800 font-bold text-lg mb-1">
              PENDAFTARAN BARU DITUTUP
            </h3>
            <p className="text-red-600 text-xs leading-relaxed">
              Batas waktu registrasi telah berakhir.
              <br />
              Formulir di bawah ini <strong>HANYA</strong> dapat diakses oleh
              member yang sudah terdaftar sebelumnya namun belum melunasi atau
              melengkapi data.
            </p>
          </div>
        </div>
      )}

      <div className="text-center space-y-3">
        <img
          src={logoUrl}
          alt="Logo"
          className="w-24 h-24 object-contain mx-auto mb-4 drop-shadow-md"
        />
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
          Selamat Datang
        </h2>
        <p className="text-slate-500 text-sm leading-relaxed max-w-xs mx-auto">
          Silakan lengkapi data awal untuk memulai proses registrasi ulang
          member Pushbike Kudus.
        </p>
      </div>

      {isDemo && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6 text-sm text-amber-800 flex items-start gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <p className="font-bold">Database Belum Terhubung</p>
            <p className="text-xs mt-1">
              Aplikasi berjalan dalam <strong>Mode Offline/Demo</strong>. Data
              tidak akan masuk ke Google Sheet.
              <br />
              <br />
              <strong>Admin:</strong> Harap masukkan URL Google Script ke dalam
              file <code>App.tsx</code> di variabel{" "}
              <code>FIXED_SCRIPT_URL</code>.
            </p>
          </div>
        </div>
      )}

            {/* MEMBER TYPE SELECTOR */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-700">Status Member</label>
        <div className="bg-white p-1 rounded-xl border border-slate-200 flex shadow-sm">
          <button
            type="button"
            onClick={() => setIsOldMemberClaimed(false)}
            className={`flex-1 py-3 px-2 rounded-lg text-xs font-bold transition-all ${!isOldMemberClaimed ? "bg-slate-800 text-white shadow" : "text-slate-500 hover:bg-slate-50"}`}
          >
            MEMBER BARU
          </button>
          <button
            type="button"
            onClick={() => setIsOldMemberClaimed(true)}
            className={`flex-1 py-3 px-2 rounded-lg text-xs font-bold transition-all ${isOldMemberClaimed ? "bg-emerald-600 text-white shadow" : "text-slate-500 hover:bg-slate-50"}`}
          >
            MEMBER LAMA
          </button>
        </div>
        {isOldMemberClaimed && (
          <p className="text-xs text-emerald-600 px-1">
            *Member lama tidak dikenakan biaya pendaftaran ulang.
          </p>
        )}
      </div>
      
      {/* CHILD COUNT SELECTOR */}
      <div className="bg-white p-1 rounded-xl border border-slate-200 flex shadow-sm">
        <button
          type="button"
          onClick={() => setChildCount(1)}
          className={`flex-1 py-3 px-2 rounded-lg text-xs font-bold transition-all ${childCount === 1 ? "bg-orange-500 text-white shadow" : "text-slate-500 hover:bg-slate-50"}`}
        >
          {isOldMemberClaimed ? "1 RIDER (Gratis)" : "1 RIDER (Rp 100rb)"}
        </button>
        <button
          type="button"
          onClick={() => setChildCount(2)}
          className={`flex-1 py-3 px-2 rounded-lg text-xs font-bold transition-all ${childCount === 2 ? "bg-purple-600 text-white shadow" : "text-slate-500 hover:bg-slate-50"}`}
        >
          {isOldMemberClaimed ? "2 RIDER (Gratis)" : "2 RIDER (Rp 200rb)"}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Nomor WhatsApp
          </label>
          <div className="relative">
            <span className="absolute left-4 top-3.5 text-slate-400 text-sm font-medium">
              +62
            </span>
            <input
              type="tel"
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition font-medium"
              placeholder="8123456789"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Nama Panggilan Anak 1
          </label>
          <input
            type="text"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition font-medium uppercase placeholder:normal-case placeholder:text-slate-400"
            placeholder="Contoh: BUDI"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)} // removed toUpperCase()
            required
            autoCapitalize="characters"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-slate-200 mt-2"
        >
          {loading ? "Memproses..." : "Lanjutkan Registrasi"}
        </button>
      </form>
    </div>
  );
};
export default StepLogin;

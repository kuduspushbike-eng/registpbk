import React, { useState, useEffect } from "react";
import {
  MemberData,
  UserStatus,
  ShirtSize,
  BIRTH_YEARS,
  PaymentMethod,
  RaceKolektifData,
} from "./types";
import * as SheetService from "./services/sheetService";
import QRCode from "react-qr-code";
import RaceKolektifForm from "./components/RaceKolektifForm";
import { SpeedInsights } from "@vercel/speed-insights/react";

import {
  FIXED_SCRIPT_URL,
  APP_STATUS,
  ADMIN_PIN,
  WA_GROUP_LINK,
  DEFAULT_APP_LOGO,
  CLOSING_IMAGE_URL,
  ENABLE_RACE_KOLEKTIF
} from "./config";
import { calculateTimeLeft } from "./utils";
import AdminDashboard from "./components/AdminDashboard";
import StepLogin from "./components/StepLogin";
import StepPayment from "./components/StepPayment";
import StepWaitingApproval from "./components/StepWaitingApproval";
import StepForm from "./components/StepForm";
import HomeLanding from "./components/HomeLanding";
import GOOGLE_SCRIPT_CODE from "./Code.gs?raw";

const AlertModal = () => {
  const [message, setMessage] = useState("");

  useEffect(() => {
    const handleAlert = (e: any) => {
      setMessage(e.detail);
    };
    window.alert = (msg) => {
      const evt = new CustomEvent('global-alert', { detail: String(msg) });
      window.dispatchEvent(evt);
    };
    window.addEventListener('global-alert', handleAlert);
    return () => window.removeEventListener('global-alert', handleAlert);
  }, []);

  if (!message) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm text-center">
        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <p className="text-slate-800 text-sm mb-6 whitespace-pre-wrap">{message}</p>
        <button onClick={() => setMessage("")} className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition">OK Mengerti</button>
      </div>
    </div>
  );
};

const Header = ({
  onViewChange,
  currentView,
  logoUrl,
}: {
  onViewChange: (view: "home" | "user" | "admin" | "kolektif") => void;
  currentView: "home" | "user" | "admin" | "kolektif";
  logoUrl: string;
}) => (
  <header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-20 shadow-sm">
    <div className="max-w-md mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center justify-between w-full">
        <div
          className="flex items-center gap-3 cursor-pointer transition hover:opacity-80"
          onClick={() => onViewChange("home")}
        >
          <img
            src={logoUrl}
            alt="Logo"
            className="w-10 h-10 object-contain drop-shadow-sm"
          />
          <h1 className="font-bold text-slate-800 text-lg tracking-tight">
            Pushbike Kudus
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {currentView !== "home" ? (
             <button
               onClick={() => onViewChange("home")}
               className="px-3 py-1 rounded-full bg-orange-50 text-xs text-orange-600 hover:bg-orange-100 font-medium transition"
             >
               Kembali ke Home
             </button>
          ) : (
             <button
               onClick={() => onViewChange("admin")}
               className="px-3 py-1 rounded-full bg-slate-100 text-xs text-slate-600 hover:bg-slate-200 font-medium transition"
             >
               Login Admin
             </button>
          )}
        </div>
      </div>
    </div>
  </header>
);

const Footer = ({ logoUrl }: { logoUrl: string }) => (
  <footer className="py-8 text-center text-slate-400">
    <div className="max-w-md mx-auto px-4 flex flex-col items-center gap-3">
      <img
        src={logoUrl}
        alt="Logo"
        className="w-8 h-8 object-contain opacity-50 grayscale"
      />
      <p className="text-xs font-medium text-slate-500">
        &copy; {new Date().getFullYear()} Pushbike Kudus. All rights reserved.
      </p>
      <p className="text-[10px] text-slate-400">
        Made with <span className="text-red-400">❤</span> by Pushbike Kudus Team
      </p>
    </div>
  </footer>
);

const AdminLoginModal = ({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) => {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === ADMIN_PIN) {
      onSuccess();
      setPin("");
      setError(false);
    } else {
      setError(true);
      setPin("");
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-xs w-full p-6 animate-fade-in transform scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-500">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
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
        <h3 className="text-lg font-bold text-slate-800 mb-2 text-center">
          Admin Access
        </h3>
        <p className="text-xs text-slate-500 mb-6 text-center">
          Masukkan PIN keamanan untuk melanjutkan.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            autoFocus
            className={`w-full text-center text-2xl tracking-widest p-3 border rounded-xl focus:outline-none focus:ring-4 transition-all ${error ? "border-red-500 ring-red-100 bg-red-50" : "border-slate-200 focus:ring-orange-100 focus:border-orange-500"}`}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="••••••"
            maxLength={6}
          />
          {error && (
            <p className="text-xs text-red-500 text-center font-bold animate-pulse">
              PIN Salah, silakan coba lagi.
            </p>
          )}

          <button
            type="submit"
            className="w-full bg-slate-900 text-white py-3 rounded-xl font-medium hover:bg-slate-800 shadow-lg shadow-slate-200 transition-all active:scale-95"
          >
            Masuk Dashboard
          </button>
        </form>
        <button
          onClick={onClose}
          className="w-full mt-3 text-xs text-slate-400 hover:text-slate-600 py-2"
        >
          Batalkan
        </button>
      </div>
    </div>
  );
};

const IntegrationGuideModal = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(GOOGLE_SCRIPT_CODE);
    alert("Kode berhasil disalin!");
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800">
            Panduan Integrasi Google Sheet
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            &times;
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-600">
          {/* CARA UPDATE TANPA GANTI LINK */}
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
            <h4 className="font-bold text-purple-800 mb-2 flex items-center gap-2">
              <span className="bg-purple-200 text-purple-800 text-xs px-2 py-0.5 rounded">
                TIPS PRO
              </span>
              Link Pendek Permanen & Update Tanpa Ganti URL
            </h4>
            <p className="mb-2">
              <strong>Solusi Link Panjang:</strong> Masukkan URL Google Script
              Anda ke dalam variabel <code>FIXED_SCRIPT_URL</code> di kode
              aplikasi (App.tsx). Dengan begitu link aplikasi Anda akan bersih
              (misal: <code>myapp.vercel.app</code>) tanpa buntut panjang.
            </p>
            <p className="mb-2 mt-3 font-bold">
              Cara Update Script di Masa Depan:
            </p>
            <ol className="list-decimal ml-4 space-y-1">
              <li>
                Di Google Apps Script, klik tombol <strong>Deploy</strong>{" "}
                (Biru) &gt; <strong>Manage deployments</strong>.
              </li>
              <li>
                Klik ikon <strong>Edit</strong> (Pensil) pada deployment yang
                sedang aktif ("Active").
              </li>
              <li>
                Pada bagian <strong>Version</strong>, ubah dari versi lama
                menjadi <strong>"New version"</strong>.
              </li>
              <li>
                Klik <strong>Deploy</strong>.
              </li>
            </ol>
            <p className="mt-2 text-xs italic bg-white p-2 rounded border border-purple-100">
              ✨ Dengan cara ini, URL Web App Anda{" "}
              <strong>TIDAK AKAN BERUBAH</strong> selamanya. Anda tidak perlu
              update kode React lagi meskipun mengubah logika Google Sheet.
            </p>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <h4 className="font-bold text-blue-800 mb-2">
              Langkah 1: Siapkan Google Sheet
            </h4>
            <ol className="list-decimal ml-4 space-y-1">
              <li>
                Buka Google Drive dan buat <strong>Google Spreadsheet</strong>{" "}
                baru.
              </li>
              <li>Beri nama spreadsheet (misal: "Database Pushbike").</li>
              <li>
                Klik menu <strong>Extensions (Ekstensi)</strong> &gt;{" "}
                <strong>Apps Script</strong>.
              </li>
            </ol>
          </div>

          <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
            <h4 className="font-bold text-orange-800 mb-2">
              Langkah 2: Pasang Kode Backend
            </h4>
            <p className="mb-2">
              Hapus semua kode yang ada di editor Apps Script, lalu copy-paste
              kode di bawah ini:
            </p>
            <div className="relative">
              <pre className="bg-slate-800 text-slate-200 p-4 rounded-md overflow-x-auto text-xs h-40">
                {GOOGLE_SCRIPT_CODE}
              </pre>
              <button
                onClick={handleCopy}
                className="absolute top-2 right-2 bg-white text-slate-800 px-3 py-1 rounded text-xs font-bold shadow hover:bg-slate-100"
              >
                Copy Kode
              </button>
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg border border-green-100">
            <h4 className="font-bold text-green-800 mb-2">
              Langkah 3: Deploy & Hubungkan
            </h4>
            <ol className="list-decimal ml-4 space-y-1">
              <li>
                Klik tombol <strong>Deploy</strong> (kanan atas) &gt;{" "}
                <strong>New Deployment</strong>.
              </li>
              <li>
                Pilih type: <strong>Web app</strong>.
              </li>
              <li>Description: "v9 Color".</li>
              <li>
                Execute as: <strong>Me</strong> (email anda).
              </li>
              <li>
                Who has access: <strong>Anyone</strong> (PENTING!).
              </li>
              <li>
                Klik <strong>Deploy</strong>, lalu salin{" "}
                <strong>Web App URL</strong>.
              </li>
              <li>
                Paste URL tersebut di kolom konfigurasi Admin atau{" "}
                <strong>Hardcode di file App.tsx (FIXED_SCRIPT_URL)</strong>{" "}
                agar link pendek.
              </li>
            </ol>
          </div>
        </div>

        <div className="p-4 border-t bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="bg-slate-900 text-white px-6 py-2 rounded-lg font-medium hover:bg-slate-800"
          >
            Saya Mengerti
          </button>
        </div>
      </div>
    </div>
  );
};

import JSZip from "jszip";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";


const App = () => {
  const [view, setView] = useState<"home" | "user" | "admin" | "kolektif">("home");
  const [member, setMember] = useState<MemberData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  // Use DEFAULT_APP_LOGO as fallback if localStorage is empty
  const [appLogo, setAppLogo] = useState(
    SheetService.getLogoUrl(DEFAULT_APP_LOGO),
  );

  // Check URL for config
  useEffect(() => {
    // 1. Check if hardcoded URL exists
    if (FIXED_SCRIPT_URL) {
      SheetService.setScriptUrl(FIXED_SCRIPT_URL);
    }

    // 2. Override with URL params if exists (for flexibility)
    const params = new URLSearchParams(window.location.search);
    const config = params.get("config");
    const logo = params.get("logo");

    if (config) {
      SheetService.setScriptUrl(config);
    }

    if (logo) {
      SheetService.setLogoUrl(logo);
      setAppLogo(logo);
    }

    // Clean URL only if params exist
    if (config || logo) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const handleConfigUpdate = () => {
    setAppLogo(SheetService.getLogoUrl(DEFAULT_APP_LOGO));
  };

  const handleViewChange = (newView: "user" | "admin" | "kolektif") => {
    if (newView === "admin" && !isAdminLoggedIn) {
      setShowAdminLogin(true);
    } else {
      setView(newView);
    }
  };

  const handleAdminSuccess = () => {
    setIsAdminLoggedIn(true);
    setShowAdminLogin(false);
    setView("admin");
  };

  const handleLogin = async (
    wa: string,
    nickname: string,
    childCount: number,
  ) => {
    setLoading(true);
    try {
      const data = await SheetService.checkMemberStatus(
        wa,
        nickname,
        childCount,
      );
      setMember(data);
    } catch (e) {
      alert("Gagal memuat data. " + e);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentConfirm = async (method: PaymentMethod) => {
    if (!member) return;
    setLoading(true);
    try {
      const data = await SheetService.confirmPayment(member.whatsapp, method);
      setMember(data);
    } catch (e) {
      alert("Gagal konfirmasi: " + e);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!member) return;
    try {
      const data = await SheetService.checkMemberStatus(
        member.whatsapp,
        undefined,
        member.childCount,
      );
      if (data.status !== member.status) {
        setMember(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmitForm = async (data: Partial<MemberData>) => {
    if (!member) return;
    setLoading(true);
    try {
      // IMPORTANT: Ensure childCount is synced to backend during form submission
      // This handles cases where user upgraded via "Add Sibling" button
      const payload = { ...data, childCount: member.childCount };
      const updated = await SheetService.submitRegistration(
        member.whatsapp,
        payload,
      );
      setMember(updated);
    } catch (e) {
      alert("Gagal menyimpan data: " + e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRaceKolektif = async (data: RaceKolektifData) => {
    setLoading(true);
    try {
      await SheetService.submitRaceKolektif(data);
      alert("Pendaftaran Kolektif Race berhasil!");
      setView("user");
    } catch (e) {
      alert("Gagal menyimpan data: " + e);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setMember(null);
    setView("home");
  };

  const handleAddSibling = () => {
    if (!member) return;
    const confirmMsg =
      "Apakah Anda yakin ingin menambah susulan Rider ke-2?\n\nPastikan Anda sudah melakukan pembayaran tambahan kepada Admin.";
    if (window.confirm(confirmMsg)) {
      setMember({
        ...member,
        childCount: 2, // Upgrade local state to 2 children
        status: UserStatus.APPROVED, // Unlock form for editing
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      <Header
        onViewChange={handleViewChange}
        currentView={view}
        logoUrl={appLogo}
      />

      <main className="flex-grow w-full max-w-md mx-auto p-4">
        {view === "home" ? (
          <HomeLanding onViewChange={handleViewChange} />
        ) : view === "admin" ? (
          <AdminDashboard onConfigUpdate={handleConfigUpdate} />
        ) : view === "kolektif" ? (
          <RaceKolektifForm
            onSubmit={handleSubmitRaceKolektif}
            isLoading={loading}
            onCancel={() => setView("home")}
          />
        ) : (
          <>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600 mb-4"></div>
                <p className="text-slate-500 text-sm">Memproses...</p>
              </div>
            ) : !member ? (
              <StepLogin onLogin={handleLogin} logoUrl={appLogo} />
            ) : member.status === UserStatus.NEW ? (
              <StepPayment member={member} onConfirm={handlePaymentConfirm} />
            ) : member.status === UserStatus.WAITING_APPROVAL ? (
              <StepWaitingApproval onCheckStatus={handleCheckStatus} />
            ) : member.status === UserStatus.APPROVED ? (
              <StepForm onSubmit={handleSubmitForm} initialData={member} />
            ) : member.status === UserStatus.REGISTERED ? (
              <div className="text-center py-10 animate-fade-in space-y-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600 shadow-inner">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-10 w-10"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">
                    Pendaftaran Selesai!
                  </h2>
                  <p className="text-slate-500 text-sm mt-2 max-w-xs mx-auto">
                    Terima kasih telah mendaftar ulang. Sampai jumpa di latihan
                    berikutnya!
                  </p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-100 max-w-sm mx-auto text-left space-y-4">
                  <div className="border-b pb-2 mb-2 flex justify-between items-center">
                    <p className="text-xs text-slate-400 uppercase tracking-wide">
                      Member Card
                    </p>
                    {member.childCount === 2 && (
                      <span className="bg-purple-100 text-purple-700 text-[10px] px-2 py-0.5 rounded font-bold">
                        2 Rider
                      </span>
                    )}
                  </div>

                  {/* CHILD 1 */}
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">
                      Anak 1
                    </p>
                    <p className="font-bold text-slate-800 text-lg uppercase">
                      {member.nickname}
                    </p>
                    <div className="flex gap-4 mt-1 text-sm text-slate-600">
                      <span>
                        Size: <strong>{member.shirtSize}</strong>
                      </span>
                      <span>
                        Gender: <strong>{member.gender}</strong>
                      </span>
                    </div>
                  </div>

                  {/* CHILD 2 */}
                  {member.childCount === 2 && (
                    <div className="border-t pt-3">
                      <p className="text-xs font-bold text-slate-400 uppercase mb-1">
                        Anak 2
                      </p>
                      <p className="font-bold text-slate-800 text-lg uppercase">
                        {member.nickname2}
                      </p>
                      <div className="flex gap-4 mt-1 text-sm text-slate-600">
                        <span>
                          Size: <strong>{member.shirtSize2}</strong>
                        </span>
                        <span>
                          Gender: <strong>{member.gender2}</strong>
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* SUSULAN ANAK KE-2 */}
                {member.childCount === 1 && (
                  <div className="mt-4 px-4">
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-800 space-y-2 text-left">
                      <p className="font-bold flex items-center gap-2">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                        Susulan Rider Ke-2?
                      </p>
                      <p className="text-xs text-orange-700/80">
                        Jika Anda ingin mendaftarkan anak kedua (susulan), klik
                        tombol di bawah. Pastikan sudah konfirmasi pembayaran
                        tambahan ke Admin.
                      </p>
                      <button
                        onClick={handleAddSibling}
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2.5 rounded-lg text-sm transition shadow-sm"
                      >
                        Tambah Rider Ke-2
                      </button>
                    </div>
                  </div>
                )}

                {WA_GROUP_LINK && (
                  <div className="pt-4 px-2">
                    <div
                      className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-1 shadow-lg shadow-green-200 transform transition hover:scale-[1.02] cursor-pointer"
                      onClick={() => window.open(WA_GROUP_LINK, "_blank")}
                    >
                      <div className="bg-white rounded-xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-green-100 p-2 rounded-full text-green-600">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="24"
                              height="24"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-8.68-2.031-9.67-.272-.099-.47-.149-.643-.149-.174 0-.347 0-.496 0-.149 0-.397.05-.62.347-.223.297-.868.843-.868 2.056 0 1.213.892 2.38 1.016 2.529.124.149 1.734 2.648 4.202 3.714 2.468 1.066 2.468.71 2.914.66.446-.05 1.438-.595 1.636-1.166.198-.57.198-1.066.149-1.166z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider">
                              Langkah Terakhir
                            </p>
                            <p className="font-bold text-slate-800 text-sm">
                              Gabung Grup WhatsApp
                            </p>
                          </div>
                        </div>
                        <div className="bg-green-50 text-green-700 p-2 rounded-lg">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleReset}
                  className="text-sm text-slate-400 hover:text-slate-600 underline mt-4 block mx-auto"
                >
                  Kembali ke Halaman Utama
                </button>
              </div>
            ) : null}
          </>
        )}
      </main>

      <Footer logoUrl={appLogo} />
      <AdminLoginModal
        isOpen={showAdminLogin}
        onClose={() => setShowAdminLogin(false)}
        onSuccess={handleAdminSuccess}
      />
      <AlertModal />
      <SpeedInsights />
    </div>
  );
};

export default App;

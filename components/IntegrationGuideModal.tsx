import React from "react";
import GOOGLE_SCRIPT_CODE from "../Code.gs?raw";

export const IntegrationGuideModal = ({
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
              <li>Description: "v13 Color".</li>
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
                <strong>Hardcode di file config.ts (FIXED_SCRIPT_URL)</strong>{" "}
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

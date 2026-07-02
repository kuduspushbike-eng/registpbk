import React, { useState, useEffect } from "react";
import { MemberData } from "../types";
import * as SheetService from "../services/sheetService";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import { ENABLE_RACE_KOLEKTIF } from "../config";

const AdminDashboard = ({ onConfigUpdate }: { onConfigUpdate: () => void }) => {
  const [members, setMembers] = useState<MemberData[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Integration Settings State
  const [configUrl, setConfigUrl] = useState(SheetService.getScriptUrl());
  const [logoUrl, setLogoUrl] = useState(
    SheetService.getLogoUrl(DEFAULT_APP_LOGO),
  );

  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [isEditingLogo, setIsEditingLogo] = useState(false);

  const [urlInput, setUrlInput] = useState(SheetService.getScriptUrl());
  const [logoInput, setLogoInput] = useState(
    SheetService.getLogoUrl(DEFAULT_APP_LOGO),
  );

  const [wiping, setWiping] = useState(false);
  const [syncingColors, setSyncingColors] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const loadData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const data = await SheetService.getAllMembers();
      // Sort: Waiting Approval first, then New, then Registered/Approved
      const sorted = data.sort((a, b) => {
        const score = (status: UserStatus) => {
          if (status === UserStatus.WAITING_APPROVAL) return 0;
          if (status === UserStatus.NEW) return 1;
          return 2;
        };
        return score(a.status) - score(b.status);
      });
      setMembers(sorted);
    } catch (e) {
      console.error("Failed to load data", e);
      alert(
        "Gagal memuat data. Periksa koneksi internet atau konfigurasi URL Google Sheet.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Auto refresh admin dashboard every 15 seconds
    const interval = setInterval(() => loadData(false), 15000);
    return () => clearInterval(interval);
  }, []);

  const handleApprove = async (wa: string) => {
    const displayWA = sanitizePhoneNumber(wa);
    if (!window.confirm(`Setujui pembayaran untuk nomor ${displayWA}?`)) return;

    setProcessingId(wa);
    try {
      await SheetService.adminApproveMember(wa);
      // Optimistic update
      setMembers((prev) =>
        prev.map((m) =>
          m.whatsapp === wa ? { ...m, status: UserStatus.APPROVED } : m,
        ),
      );
    } catch (error) {
      console.error(error);
      alert("Gagal melakukan verifikasi. Coba lagi.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleWipeData = async () => {
    const confirmationText = configUrl
      ? "Data di GOOGLE SHEET akan DIHAPUS PERMANEN."
      : "Data lokal akan dihapus.";

    if (
      window.confirm(
        "⚠️ PERINGATAN BAHAYA ⚠️\n\nApakah Anda yakin ingin MENGHAPUS SEMUA DATA MEMBER?",
      )
    ) {
      if (
        window.confirm(
          `KONFIRMASI TERAKHIR:\n\n${confirmationText}\n\nTindakan ini tidak bisa dibatalkan!`,
        )
      ) {
        setWiping(true);
        try {
          await SheetService.wipeAllData();
          alert("✅ Database berhasil di-reset bersih.");
          loadData(true);
        } catch (error) {
          console.error(error);
          alert("Gagal menghapus data.");
        } finally {
          setWiping(false);
        }
      }
    }
  };

  const handleDownloadKolektifZip = async () => {
    if (!configUrl) return alert("Belum ada URL Google Sheet yang tersimpan.");
    setIsDownloading(true);
    try {
      const data = await SheetService.getRaceKolektif();
      if (!data || data.length === 0) {
        alert("Belum ada data pendaftaran kolektif.");
        setIsDownloading(false);
        return;
      }

      const zip = new JSZip();
      
      const sheetData = data.map((row: any) => ({
        "Waktu": row.timestamp,
        "Kategori": row.category,
        "Nama Rider": row.riderName,
        "Nama Tim": row.teamName,
        "Komunitas": row.community,
        "Ukuran Baju": row.shirtSize,
        "Nomor Start": row.startNumber,
        "Tanggal Lahir": row.bornDate,
      }));

      data.forEach((row: any) => {
        const sanitize = (name: string) =>
          name ? String(name).replace(/[^a-z0-9]/gi, "_").toLowerCase() : "";
        
        const baseName = `${sanitize(row.riderName)}_${sanitize(row.category)}`;

        if (row.kkAktaFile) {
          const base64Data = row.kkAktaFile.split(",")[1];
          if (base64Data) {
            const ext = row.kkAktaFile.includes("application/pdf")
              ? "pdf"
              : "jpg";
            zip.file(`${baseName}_KK_Akta.${ext}`, base64Data, {
              base64: true,
            });
          }
        }

        if (row.buktiTransferFile) {
          const base64Data = row.buktiTransferFile.split(",")[1];
          if (base64Data) {
            const ext = row.buktiTransferFile.includes("application/pdf")
              ? "pdf"
              : "jpg";
            zip.file(`${baseName}_Transfer.${ext}`, base64Data, {
              base64: true,
            });
          }
        }
      });

      const worksheet = XLSX.utils.json_to_sheet(sheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Pendaftaran Kolektif");
      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      
      zip.file("Data_Race_Kolektif.xlsx", excelBuffer);

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, "Data_Kolektif_Race.zip");
    } catch (e) {
      console.error(e);
      alert("Gagal mendownload data kolektif.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSyncColors = async () => {
    if (!configUrl)
      return alert("Hanya tersedia saat terhubung ke Google Sheet.");
    if (
      !window.confirm(
        "Ini akan mewarnai ulang semua baris di Google Sheet sesuai statusnya.\n\nProses ini mungkin memakan waktu beberapa saat tergantung jumlah data.\n\nLanjutkan?",
      )
    )
      return;

    setSyncingColors(true);
    try {
      const res = await SheetService.syncColors();
      alert(`Berhasil! ${res.count} baris telah diwarnai ulang.`);
    } catch (e) {
      alert("Gagal: " + e);
    } finally {
      setSyncingColors(false);
    }
  };

  const handleSaveConfig = () => {
    SheetService.setScriptUrl(urlInput);
    setConfigUrl(urlInput);
    setIsEditingConfig(false);
    loadData(true);
  };

  const handleSaveLogo = () => {
    SheetService.setLogoUrl(logoInput);
    setLogoUrl(logoInput);
    setIsEditingLogo(false);
    onConfigUpdate(); // Update parent state
  };

  // Logic untuk membuat URL Share yang mengandung Config dan Logo
  const getShareUrl = () => {
    const baseUrl = window.location.href.split("?")[0];

    // Jika URL Script di kode (FIXED_SCRIPT_URL) sama dengan yang aktif sekarang,
    // Kita tidak perlu menempelkan parameter config di URL share. Link jadi pendek!
    if (FIXED_SCRIPT_URL && configUrl === FIXED_SCRIPT_URL) {
      return baseUrl;
    }

    const params = new URLSearchParams();

    if (configUrl) {
      params.append("config", configUrl);
    }

    // Append logo only if it's not the default one to keep URL shorter
    if (logoUrl && logoUrl !== SheetService.DEFAULT_LOGO) {
      params.append("logo", logoUrl);
    }

    const queryString = params.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  };

  const copyShareLink = () => {
    if (!configUrl) return alert("Belum ada URL Google Sheet yang tersimpan.");
    navigator.clipboard.writeText(getShareUrl());
    alert(
      "Link Integrasi berhasil disalin! Bagikan link ini ke member/device lain.",
    );
  };

  const handleDownloadQR = () => {
    const svg = document
      .getElementById("qr-code-container")
      ?.querySelector("svg");
    if (!svg) return alert("QR Code belum dimuat.");

    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svg);

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    // High res for printing
    const size = 1000;
    canvas.width = size;
    canvas.height = size;

    img.onload = () => {
      if (!ctx) return;

      // Fill white background (QR usually transparent in SVG)
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);

      // Draw image with padding
      const padding = 50;
      ctx.drawImage(
        img,
        padding,
        padding,
        size - padding * 2,
        size - padding * 2,
      );

      // Add Text Label (Optional)
      ctx.font = "bold 40px sans-serif";
      ctx.fillStyle = "#000000";
      ctx.textAlign = "center";
      ctx.fillText("Pushbike Kudus", size / 2, size - 20);

      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = "QR_Pushbike_Kudus.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    img.src =
      "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgStr)));
  };

  return (
    <div className="animate-fade-in p-4 space-y-6">
      <IntegrationGuideModal
        isOpen={showGuide}
        onClose={() => setShowGuide(false)}
      />

      <div className="flex justify-between items-center flex-wrap gap-3">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <span className="w-2 h-6 bg-orange-500 rounded-full"></span>
          Dashboard Admin
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          {ENABLE_RACE_KOLEKTIF && (
            <button
              onClick={handleDownloadKolektifZip}
              disabled={isDownloading}
              className="text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-full transition font-medium flex items-center gap-1 disabled:opacity-50"
            >
              {isDownloading ? "Memproses..." : "Download Race Kolektif (.zip)"}
            </button>
          )}
          <button
            onClick={() => loadData(true)}
            className="text-sm text-orange-600 hover:text-orange-700 hover:bg-orange-50 px-3 py-1.5 rounded-full transition font-medium flex items-center gap-1"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mb-2"></div>
          <span className="text-xs text-slate-400">Memuat data...</span>
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300">
          <p>Belum ada data member.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {members.map((m) => (
            <div
              key={m.whatsapp}
              className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col gap-3 transition hover:shadow-md group"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1 w-full">
                  {/* PACK BADGE */}
                  {m.childCount === 2 && (
                    <div className="inline-block mb-1">
                      <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded border border-purple-200">
                        PAKET 2 ANAK
                      </span>
                    </div>
                  )}

                  {/* NAMA PANGGILAN (Highlight Utama) */}
                  <div className="flex flex-col gap-1">
                    <div>
                      <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">
                        Anak 1
                      </span>
                      <div className="font-bold text-xl text-slate-800 uppercase leading-none">
                        {m.nickname || "(Tanpa Nama)"}
                      </div>
                    </div>
                    {m.childCount === 2 && (
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">
                          Anak 2
                        </span>
                        <div className="font-bold text-xl text-slate-800 uppercase leading-none">
                          {m.nickname2 || "(Belum Diisi)"}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* NOMOR WHATSAPP */}
                  <div className="flex items-center gap-1.5 text-slate-500 mt-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                    <span className="font-mono text-sm">
                      {sanitizePhoneNumber(m.whatsapp)}
                    </span>
                  </div>

                  {/* NOMINAL BAYAR */}
                  <div className="pt-2 flex justify-between items-end">
                    <div
                      className={`inline-flex items-center gap-2 px-2 py-1 rounded-md border text-xs ${m.paymentMethod === "CASH" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-blue-50 border-blue-200 text-blue-700"}`}
                    >
                      <span className="font-semibold">
                        {m.paymentMethod === "CASH" ? "TUNAI" : "TRANSFER"}
                      </span>
                      <span className="w-px h-3 bg-current opacity-20"></span>
                      <span className="font-bold font-mono text-sm">
                        Rp {m.paymentAmount.toLocaleString("id-ID")}
                      </span>
                    </div>

                    <span
                      className={`px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider 
                        ${
                          m.status === UserStatus.WAITING_APPROVAL
                            ? "bg-yellow-100 text-yellow-700 border border-yellow-200"
                            : m.status === UserStatus.APPROVED
                              ? "bg-blue-100 text-blue-700 border border-blue-200"
                              : m.status === UserStatus.REGISTERED
                                ? "bg-green-100 text-green-700 border border-green-200"
                                : "bg-slate-100 text-slate-500 border border-slate-200"
                        }`}
                    >
                      {m.status.replace("_", " ")}
                    </span>
                  </div>
                </div>
              </div>

              {m.status === UserStatus.REGISTERED && (
                <div className="text-sm bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-3">
                  {/* Data Anak 1 */}
                  <div className="space-y-1">
                    <p className="font-bold text-slate-400 text-[10px] uppercase border-b pb-1 mb-1">
                      Data Anak 1
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-500">Nama:</span>
                      <span className="font-medium text-slate-800">
                        {m.fullName}
                      </span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-500">Lahir:</span>
                      <span className="font-medium text-slate-800">
                        {m.birthYear} ({m.gender})
                      </span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-500">Size:</span>
                      <span className="font-medium text-slate-800">
                        {m.shirtSize}
                      </span>
                    </p>
                  </div>

                  {/* Data Anak 2 (If Exists) */}
                  {m.childCount === 2 && (
                    <div className="space-y-1 pt-1">
                      <p className="font-bold text-slate-400 text-[10px] uppercase border-b pb-1 mb-1">
                        Data Anak 2
                      </p>
                      <p className="flex justify-between">
                        <span className="text-slate-500">Nama:</span>
                        <span className="font-medium text-slate-800">
                          {m.fullName2}
                        </span>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-slate-500">Lahir:</span>
                        <span className="font-medium text-slate-800">
                          {m.birthYear2} ({m.gender2})
                        </span>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-slate-500">Size:</span>
                        <span className="font-medium text-slate-800">
                          {m.shirtSize2}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              )}

              {(m.status === UserStatus.WAITING_APPROVAL ||
                m.status === UserStatus.NEW) && (
                <div className="pt-2 border-t border-slate-100 mt-1">
                  <button
                    onClick={() => handleApprove(m.whatsapp)}
                    disabled={processingId === m.whatsapp}
                    className={`w-full flex justify-center items-center py-2.5 px-4 rounded-lg text-sm font-semibold transition-all transform active:scale-95
                      ${
                        processingId === m.whatsapp
                          ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                          : m.status === UserStatus.WAITING_APPROVAL
                            ? "bg-green-600 hover:bg-green-700 text-white shadow-green-200 shadow-lg"
                            : "bg-white border border-green-600 text-green-700 hover:bg-green-50"
                      }`}
                  >
                    {processingId === m.whatsapp
                      ? "Memproses..."
                      : m.status === UserStatus.WAITING_APPROVAL
                        ? m.paymentMethod === "CASH"
                          ? "Terima Uang Tunai"
                          : "Verifikasi Pembayaran"
                        : "Setujui Manual (Override)"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* QR CODE MODAL */}
      {showQR && configUrl && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setShowQR(false)}
        >
          <div
            className="bg-white p-8 rounded-2xl max-w-sm w-full text-center space-y-6 animate-fade-in shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-2">
              <h3 className="font-bold text-xl text-slate-800">
                Scan untuk Registrasi
              </h3>
              <div className="bg-green-50 text-green-700 text-xs p-3 rounded-lg border border-green-200">
                <strong className="block mb-1">🚀 QR Code Terintegrasi</strong>
                Member yang scan QR ini akan otomatis terhubung ke database
                tanpa perlu setting manual.
              </div>
            </div>

            <div className="flex justify-center" id="qr-code-container">
              <div className="border-4 border-slate-900 p-3 rounded-xl bg-white shadow-xl">
                <QRCode value={getShareUrl()} size={220} />
              </div>
            </div>

            <button
              onClick={handleDownloadQR}
              className="w-full bg-slate-100 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-200 transition flex items-center justify-center gap-2"
            >
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
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Download Gambar QR
            </button>

            <button
              onClick={() => setShowQR(false)}
              className="w-full text-sm text-slate-400 font-medium py-2 rounded-xl hover:text-slate-600 transition"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default AdminDashboard;

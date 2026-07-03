import React, { useState, useEffect } from "react";
import { MemberData, UserStatus } from "../types";
import * as SheetService from "../services/sheetService";
import * as FirebaseService from "../services/firebaseService";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import { ENABLE_RACE_KOLEKTIF, DEFAULT_APP_LOGO, FIXED_SCRIPT_URL } from "../config";
import { sanitizePhoneNumber } from "../utils";
import { IntegrationGuideModal } from "./IntegrationGuideModal";
import QRCode from "react-qr-code";

const AdminDashboard = ({ onConfigUpdate }: { onConfigUpdate: () => void }) => {
  const [members, setMembers] = useState<MemberData[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Tab State
  const [activeTab, setActiveTab] = useState<"members" | "presensi" | "sistem">("members");

  // Google Sheet Integration Settings State
  const [configUrl, setConfigUrl] = useState(SheetService.getScriptUrl());
  const [logoUrl, setLogoUrl] = useState(SheetService.getLogoUrl(DEFAULT_APP_LOGO));

  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [isEditingLogo, setIsEditingLogo] = useState(false);

  const [urlInput, setUrlInput] = useState(SheetService.getScriptUrl());
  const [logoInput, setLogoInput] = useState(SheetService.getLogoUrl(DEFAULT_APP_LOGO));

  const [wiping, setWiping] = useState(false);
  const [syncingColors, setSyncingColors] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  // Firebase Sync State
  const [fbConfig, setFbConfig] = useState<FirebaseService.FirebaseSyncConfig>(
    FirebaseService.getFirebaseConfig()
  );
  const [isEditingFirebase, setIsEditingFirebase] = useState(false);
  const [fbProjectInput, setFbProjectInput] = useState(fbConfig.projectId);
  const [fbCollectionInput, setFbCollectionInput] = useState(fbConfig.collectionName);
  const [fbApiKeyInput, setFbApiKeyInput] = useState(fbConfig.apiKey);
  const [fbSyncModeInput, setFbSyncModeInput] = useState(fbConfig.syncMode);

  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [syncPreview, setSyncPreview] = useState<FirebaseService.SyncComparison | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<string[]>([]);
  const [hasTested, setHasTested] = useState(false);

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
        "Gagal memuat data. Periksa koneksi internet atau konfigurasi URL Google Sheet."
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

  // Sync with current firebase config
  useEffect(() => {
    setFbProjectInput(fbConfig.projectId);
    setFbCollectionInput(fbConfig.collectionName);
    setFbApiKeyInput(fbConfig.apiKey);
    setFbSyncModeInput(fbConfig.syncMode);
  }, [fbConfig]);

  const handleApprove = async (wa: string) => {
    const displayWA = sanitizePhoneNumber(wa);
    if (!window.confirm(`Setujui pembayaran untuk nomor ${displayWA}?`)) return;

    setProcessingId(wa);
    try {
      await SheetService.adminApproveMember(wa);
      // Optimistic update
      setMembers((prev) =>
        prev.map((m) =>
          m.whatsapp === wa ? { ...m, status: UserStatus.APPROVED } : m
        )
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
        "⚠️ PERINGATAN BAHAYA ⚠️\n\nApakah Anda yakin ingin MENGHAPUS SEMUA DATA MEMBER?"
      )
    ) {
      if (
        window.confirm(
          `KONFIRMASI TERAKHIR:\n\n${confirmationText}\n\nTindakan ini tidak bisa dibatalkan!`
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
        "Ini akan mewarnai ulang semua baris di Google Sheet sesuai statusnya.\n\nProses ini mungkin memakan waktu beberapa saat tergantung jumlah data.\n\nLanjutkan?"
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

  // Firebase configurations
  const handleSaveFirebaseConfig = () => {
    const newConfig: FirebaseService.FirebaseSyncConfig = {
      projectId: fbProjectInput,
      collectionName: fbCollectionInput || "members",
      apiKey: fbApiKeyInput,
      syncMode: fbSyncModeInput,
    };
    FirebaseService.saveFirebaseConfig(newConfig);
    setFbConfig(newConfig);
    setIsEditingFirebase(false);
    setSyncPreview(null);
    setHasTested(false);
    alert("✅ Konfigurasi Firebase berhasil disimpan.");
  };

  const handleFetchAndCompare = async (silent = false) => {
    if (!fbConfig.projectId) {
      if (!silent) alert("Peringatan: Project ID Firebase belum diisi.");
      return;
    }
    setIsTestingConnection(true);
    try {
      const firestoreDocs = await FirebaseService.fetchFirestoreMembers(fbConfig);
      const comparison = FirebaseService.compareSyncData(members, firestoreDocs, fbConfig);
      setSyncPreview(comparison);
      setHasTested(true);
      if (!silent) {
        alert("✅ Berhasil membandingkan data. Silakan lihat tinjauan sinkronisasi.");
      }
    } catch (e: any) {
      console.error(e);
      if (!silent) {
        alert(`❌ Gagal mengambil data Firebase: ${e.message}\n\nPastikan Project ID benar dan database/rules Firestore mengizinkan akses.`);
      }
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSyncNow = async () => {
    if (!syncPreview) return;
    const { toAdd, toUpdate, toRemove, toDeactivate } = syncPreview;
    const totalOps = toAdd.length + toUpdate.length + toRemove.length + toDeactivate.length;

    if (totalOps === 0) {
      alert("Semua data sudah sinkron (0 operasi diperlukan).");
      return;
    }

    const confirmMsg = `Mulai sinkronisasi manual?\n\n` +
      `- Tambah baru: ${toAdd.length} rider\n` +
      `- Perbarui data: ${toUpdate.length} rider\n` +
      `- Hapus permanen: ${toRemove.length} rider\n` +
      `- Ubah Nonaktif: ${toDeactivate.length} rider\n\n` +
      `Total: ${totalOps} operasi Firestore. Lanjutkan?`;

    if (!window.confirm(confirmMsg)) return;

    setIsSyncing(true);
    setSyncProgress([]);

    const log = (msg: string) => {
      setSyncProgress((prev) => [...prev, msg]);
    };

    try {
      log("🚀 Memulai sinkronisasi manual ke Firebase...");

      // 1. Additions
      for (const item of toAdd) {
        log(`➕ Menambahkan ${item.nickname} (${item.id})...`);
        await FirebaseService.upsertFirestoreDocument(fbConfig, item.id, {
          name: item.name,
          nickname: item.nickname,
          whatsapp: item.whatsapp,
          birthYear: item.birthYear,
          gender: item.gender,
          shirtSize: item.shirtSize,
          status: "AKTIF",
          syncedAt: new Date().toISOString(),
        });
      }

      // 2. Updates
      for (const entry of toUpdate) {
        const item = entry.local;
        log(`🔄 Memperbarui ${item.nickname} (${item.id})...`);
        await FirebaseService.upsertFirestoreDocument(fbConfig, item.id, {
          name: item.name,
          nickname: item.nickname,
          whatsapp: item.whatsapp,
          birthYear: item.birthYear,
          gender: item.gender,
          shirtSize: item.shirtSize,
          status: "AKTIF",
          syncedAt: new Date().toISOString(),
        });
      }

      // 3. Deletions (Full Sync - Delete)
      for (const doc of toRemove) {
        const docName = doc.parsed.nickname || doc.parsed.name || doc.id;
        log(`🗑️ Menghapus ${docName} (${doc.id})...`);
        await FirebaseService.deleteFirestoreDocument(fbConfig, doc.id);
      }

      // 4. Deactivations (Full Sync - Deactivate)
      for (const doc of toDeactivate) {
        const docName = doc.parsed.nickname || doc.parsed.name || doc.id;
        log(`🚫 Menonaktifkan ${docName} (${doc.id})...`);
        await FirebaseService.upsertFirestoreDocument(fbConfig, doc.id, {
          ...doc.parsed,
          status: "TIDAK_AKTIF",
          syncedAt: new Date().toISOString(),
        });
      }

      log("✅ Sinkronisasi Firebase selesai dengan sukses!");
      alert("✅ Sinkronisasi berhasil! Database presensi di Firebase telah diperbarui.");
      // Auto reload comparison to show clean identical slate
      await handleFetchAndCompare(true);
    } catch (e: any) {
      console.error(e);
      log(`❌ Error: ${e.message}`);
      alert(`Gagal sinkronisasi: ${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const getShareUrl = () => {
    const baseUrl = window.location.href.split("?")[0];
    if (FIXED_SCRIPT_URL && configUrl === FIXED_SCRIPT_URL) {
      return baseUrl;
    }

    const params = new URLSearchParams();
    if (configUrl) {
      params.append("config", configUrl);
    }
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
      "Link Integrasi berhasil disalin! Bagikan link ini ke member/device lain."
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

    const size = 1000;
    canvas.width = size;
    canvas.height = size;

    img.onload = () => {
      if (!ctx) return;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);

      const padding = 50;
      ctx.drawImage(
        img,
        padding,
        padding,
        size - padding * 2,
        size - padding * 2
      );

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
    <div className="animate-fade-in space-y-5">
      <IntegrationGuideModal
        isOpen={showGuide}
        onClose={() => setShowGuide(false)}
      />

      {/* DASHBOARD HEADER */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 space-y-3">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <span className="w-2.5 h-6 bg-orange-500 rounded-full"></span>
            Dashboard Admin
          </h2>
          {ENABLE_RACE_KOLEKTIF && (
            <button
              onClick={handleDownloadKolektifZip}
              disabled={isDownloading}
              className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-full transition font-semibold disabled:opacity-50"
            >
              {isDownloading ? "Memproses..." : "Download Race Kolektif (.zip)"}
            </button>
          )}
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex border-b border-slate-100 pt-2">
          <button
            onClick={() => setActiveTab("members")}
            className={`flex-1 pb-2.5 text-center text-xs font-bold border-b-2 transition-all ${
              activeTab === "members"
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            📋 Member ({members.length})
          </button>
          <button
            onClick={() => setActiveTab("presensi")}
            className={`flex-1 pb-2.5 text-center text-xs font-bold border-b-2 transition-all ${
              activeTab === "presensi"
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            🔄 Sinkron Firebase
          </button>
          <button
            onClick={() => setActiveTab("sistem")}
            className={`flex-1 pb-2.5 text-center text-xs font-bold border-b-2 transition-all ${
              activeTab === "sistem"
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            ⚙️ Sistem
          </button>
        </div>
      </div>

      {/* TAB 1: MEMBERS APPROVAL LIST */}
      {activeTab === "members" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <span className="text-xs font-semibold text-slate-400">Daftar Pendaftar Baru & Re-Registrasi</span>
            <button
              onClick={() => loadData(true)}
              className="text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50 px-2.5 py-1 rounded-full transition font-bold flex items-center gap-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 bg-white rounded-xl border border-slate-100 shadow-sm">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-orange-600 mb-2"></div>
              <span className="text-[10px] text-slate-400 font-medium">Memuat data dari Google Sheets...</span>
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
              <p className="text-sm">Belum ada data pendaftar.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {members.map((m) => (
                <div
                  key={m.whatsapp}
                  className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col gap-3 transition hover:shadow group"
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-1 w-full">
                      {/* PACK BADGE */}
                      {m.childCount === 2 && (
                        <div className="inline-block mb-1">
                          <span className="bg-purple-50 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded border border-purple-100">
                            PAKET 2 ANAK
                          </span>
                        </div>
                      )}

                      {/* NAMA PANGGILAN (Highlight Utama) */}
                      <div className="flex flex-col gap-1.5">
                        <div>
                          <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">
                            Anak 1
                          </span>
                          <div className="font-bold text-lg text-slate-800 uppercase leading-tight">
                            {m.nickname || "(Tanpa Nama)"}
                          </div>
                        </div>
                        {m.childCount === 2 && (
                          <div>
                            <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">
                              Anak 2
                            </span>
                            <div className="font-bold text-lg text-slate-800 uppercase leading-tight">
                              {m.nickname2 || "(Belum Diisi)"}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* NOMOR WHATSAPP */}
                      <div className="flex items-center gap-1.5 text-slate-500 pt-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <span className="font-mono text-xs">
                          {sanitizePhoneNumber(m.whatsapp)}
                        </span>
                      </div>

                      {/* NOMINAL BAYAR */}
                      <div className="pt-2 flex justify-between items-end flex-wrap gap-2">
                        <div
                          className={`inline-flex items-center gap-2 px-2 py-0.5 rounded-md border text-xs ${
                            m.paymentMethod === "CASH"
                              ? "bg-emerald-50 border-emerald-150 text-emerald-700"
                              : "bg-blue-50 border-blue-150 text-blue-700"
                          }`}
                        >
                          <span className="font-semibold text-[10px]">
                            {m.paymentMethod === "CASH" ? "TUNAI" : "TRANSFER"}
                          </span>
                          <span className="w-px h-3 bg-current opacity-20"></span>
                          <span className="font-bold font-mono text-xs">
                            Rp {m.paymentAmount.toLocaleString("id-ID")}
                          </span>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider ${
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
                    <div className="text-xs bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-3">
                      {/* Data Anak 1 */}
                      <div className="space-y-1">
                        <p className="font-bold text-slate-400 text-[9px] uppercase border-b pb-1 mb-1">
                          Data Anak 1
                        </p>
                        <p className="flex justify-between">
                          <span className="text-slate-500">Nama Lengkap:</span>
                          <span className="font-medium text-slate-800 text-right">{m.fullName}</span>
                        </p>
                        <p className="flex justify-between">
                          <span className="text-slate-500">Lahir & Gender:</span>
                          <span className="font-medium text-slate-800">
                            {m.birthYear} ({m.gender})
                          </span>
                        </p>
                        <p className="flex justify-between">
                          <span className="text-slate-500">Jersey Size:</span>
                          <span className="font-medium text-slate-800">{m.shirtSize}</span>
                        </p>
                      </div>

                      {/* Data Anak 2 (If Exists) */}
                      {m.childCount === 2 && (
                        <div className="space-y-1 pt-1">
                          <p className="font-bold text-slate-400 text-[9px] uppercase border-b pb-1 mb-1">
                            Data Anak 2
                          </p>
                          <p className="flex justify-between">
                            <span className="text-slate-500">Nama Lengkap:</span>
                            <span className="font-medium text-slate-800 text-right">{m.fullName2}</span>
                          </p>
                          <p className="flex justify-between">
                            <span className="text-slate-500">Lahir & Gender:</span>
                            <span className="font-medium text-slate-800">
                              {m.birthYear2} ({m.gender2})
                            </span>
                          </p>
                          <p className="flex justify-between">
                            <span className="text-slate-500">Jersey Size:</span>
                            <span className="font-medium text-slate-800">{m.shirtSize2}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {(m.status === UserStatus.WAITING_APPROVAL || m.status === UserStatus.NEW) && (
                    <div className="pt-2 border-t border-slate-100 mt-1">
                      <button
                        onClick={() => handleApprove(m.whatsapp)}
                        disabled={processingId === m.whatsapp}
                        className={`w-full flex justify-center items-center py-2 px-4 rounded-lg text-xs font-bold transition-all transform active:scale-95 ${
                          processingId === m.whatsapp
                            ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                            : m.status === UserStatus.WAITING_APPROVAL
                              ? "bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-100"
                              : "bg-white border border-green-600 text-green-700 hover:bg-green-50"
                        }`}
                      >
                        {processingId === m.whatsapp
                          ? "Memproses..."
                          : m.status === UserStatus.WAITING_APPROVAL
                            ? m.paymentMethod === "CASH"
                              ? "Terima Tunai & Setujui"
                              : "Verifikasi Pembayaran"
                            : "Setujui Manual (Override)"}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: FIREBASE PRESENSI SYNC */}
      {activeTab === "presensi" && (
        <div className="space-y-4 animate-fade-in">
          {/* CREDENTIALS CARD */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                🔌 Config Database Presensi
              </h3>
              <button
                onClick={() => setIsEditingFirebase(!isEditingFirebase)}
                className="text-xs text-orange-600 font-bold"
              >
                {isEditingFirebase ? "Batal" : "Ubah Config"}
              </button>
            </div>

            {isEditingFirebase ? (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Firebase Project ID</label>
                  <input
                    type="text"
                    value={fbProjectInput}
                    onChange={(e) => setFbProjectInput(e.target.value)}
                    placeholder="Contoh: latberpbk (cek URL Firebase)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-xs focus:outline-orange-500"
                  />
                  <span className="text-[10px] text-slate-400">Project ID dari Google Firebase aplikasi presensi Anda.</span>
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Firestore Collection</label>
                  <input
                    type="text"
                    value={fbCollectionInput}
                    onChange={(e) => setFbCollectionInput(e.target.value)}
                    placeholder="Contoh: members atau riders"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-xs focus:outline-orange-500"
                  />
                  <span className="text-[10px] text-slate-400">Collection database tempat nama member disimpan.</span>
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">API Key (Opsional)</label>
                  <input
                    type="text"
                    value={fbApiKeyInput}
                    onChange={(e) => setFbApiKeyInput(e.target.value)}
                    placeholder="Isi jika Firestore Anda dikunci rules"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-xs focus:outline-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Metode Sinkronisasi Penuh</label>
                  <select
                    value={fbSyncModeInput}
                    onChange={(e: any) => setFbSyncModeInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-orange-500"
                  >
                    <option value="ADD_UPDATE_ONLY">Hanya Tambah / Update (Sangat Aman)</option>
                    <option value="FULL_SYNC_DEACTIVATE">Nonaktifkan Member yang Tidak Daftar Ulang (Rekomendasi)</option>
                    <option value="FULL_SYNC_DELETE">Hapus Permanen Member yang Tidak Daftar Ulang</option>
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Menentukan apa yang dilakukan pada member lama di database presensi yang **tidak ikut registrasi ulang** pada periode ini.
                  </p>
                </div>

                <button
                  onClick={handleSaveFirebaseConfig}
                  className="w-full bg-orange-600 text-white font-bold py-2 rounded-lg hover:bg-orange-700 transition"
                >
                  Simpan Konfigurasi
                </button>
              </div>
            ) : (
              <div className="space-y-2 text-xs">
                <div className="grid grid-cols-3 text-slate-500">
                  <span className="font-semibold">Project ID:</span>
                  <span className="col-span-2 font-mono font-medium text-slate-700">
                    {fbConfig.projectId || <span className="text-red-500 italic">Belum disetting!</span>}
                  </span>
                </div>
                <div className="grid grid-cols-3 text-slate-500">
                  <span className="font-semibold">Collection:</span>
                  <span className="col-span-2 font-mono font-medium text-slate-700">{fbConfig.collectionName}</span>
                </div>
                <div className="grid grid-cols-3 text-slate-500">
                  <span className="font-semibold">Metode:</span>
                  <span className="col-span-2 font-medium text-slate-700">
                    {fbConfig.syncMode === "ADD_UPDATE_ONLY" && "Hanya Tambah & Update"}
                    {fbConfig.syncMode === "FULL_SYNC_DEACTIVATE" && "Ubah Nonaktif (Saring)"}
                    {fbConfig.syncMode === "FULL_SYNC_DELETE" && "Hapus Permanen (Saring)"}
                  </span>
                </div>

                {fbConfig.projectId && (
                  <button
                    onClick={() => handleFetchAndCompare(false)}
                    disabled={isTestingConnection}
                    className="w-full mt-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-lg transition text-xs flex justify-center items-center gap-1"
                  >
                    {isTestingConnection ? (
                      <>
                        <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-slate-700"></span>
                        Membandingkan...
                      </>
                    ) : (
                      "🔍 Ambil & Bandingkan Data"
                    )}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* QUOTA PROTECTION NOTICE */}
          <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 text-xs text-orange-800 space-y-1">
            <h4 className="font-bold flex items-center gap-1 text-[11px]">🛡️ Penghematan Kuota Firebase Anda</h4>
            <p className="text-[10px] leading-relaxed">
              Sistem ini membandingkan data terlebih dahulu. Hanya baris yang bertambah atau berubah saja yang ditulis ke Firebase. Ini **sangat menghemat kuota baca & tulis (read/write quota)** agar tetap gratis dan tidak lemot!
            </p>
          </div>

          {/* SYNC COMPARISON PREVIEW */}
          {hasTested && syncPreview && (
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 space-y-4">
              <h3 className="text-sm font-bold text-slate-800 border-b pb-2">
                📋 Hasil Perbandingan Data
              </h3>

              <div className="grid grid-cols-2 gap-2 text-xs text-center">
                <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-100">
                  <span className="block text-lg font-bold text-emerald-700">{syncPreview.toAdd.length}</span>
                  <span className="text-[10px] text-emerald-600 font-medium">🆕 Rider Baru</span>
                </div>
                <div className="bg-blue-50 p-2.5 rounded-lg border border-blue-100">
                  <span className="block text-lg font-bold text-blue-700">{syncPreview.toUpdate.length}</span>
                  <span className="text-[10px] text-blue-600 font-medium">🔄 Perlu Update</span>
                </div>
                <div className="bg-red-50 p-2.5 rounded-lg border border-red-100 col-span-2">
                  <span className="block text-lg font-bold text-red-700">
                    {fbConfig.syncMode === "FULL_SYNC_DELETE" ? syncPreview.toRemove.length : syncPreview.toDeactivate.length}
                  </span>
                  <span className="text-[10px] text-red-600 font-medium">
                    {fbConfig.syncMode === "FULL_SYNC_DELETE"
                      ? "🗑️ Akan Dihapus Permanen dari Presensi"
                      : "🚫 Akan Dinonaktifkan (Penyaringan)"}
                  </span>
                </div>
              </div>

              {/* LIST DETAILS */}
              <div className="space-y-3 max-h-48 overflow-y-auto pr-1 text-[11px] border-t pt-3">
                {/* ADDITIONS */}
                {syncPreview.toAdd.length > 0 && (
                  <div>
                    <h4 className="font-bold text-emerald-700 mb-1">Akan Ditambahkan:</h4>
                    <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                      {syncPreview.toAdd.map((item) => (
                        <li key={item.id}>
                          <strong>{item.nickname}</strong> ({item.birthYear}) - WA: {sanitizePhoneNumber(item.whatsapp)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* UPDATES */}
                {syncPreview.toUpdate.length > 0 && (
                  <div>
                    <h4 className="font-bold text-blue-700 mb-1">Akan Diperbarui:</h4>
                    <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                      {syncPreview.toUpdate.map((entry) => (
                        <li key={entry.local.id}>
                          <strong>{entry.local.nickname}</strong>: Update data jersey / tahun lahir
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* DELETIONS */}
                {fbConfig.syncMode === "FULL_SYNC_DELETE" && syncPreview.toRemove.length > 0 && (
                  <div>
                    <h4 className="font-bold text-red-700 mb-1">Akan Dihapus (Tidak daftar ulang):</h4>
                    <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                      {syncPreview.toRemove.map((doc) => (
                        <li key={doc.id}>
                          <strong>{doc.parsed.nickname || doc.parsed.name || doc.id}</strong> (Firebase ID: {doc.id})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* DEACTIVATIONS */}
                {fbConfig.syncMode === "FULL_SYNC_DEACTIVATE" && syncPreview.toDeactivate.length > 0 && (
                  <div>
                    <h4 className="font-bold text-red-700 mb-1">Akan Dinonaktifkan (Tidak daftar ulang):</h4>
                    <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                      {syncPreview.toDeactivate.map((doc) => (
                        <li key={doc.id}>
                          <strong>{doc.parsed.nickname || doc.parsed.name || doc.id}</strong> (Set status: TIDAK_AKTIF)
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {syncPreview.toAdd.length === 0 &&
                  syncPreview.toUpdate.length === 0 &&
                  syncPreview.toRemove.length === 0 &&
                  syncPreview.toDeactivate.length === 0 && (
                    <div className="text-center py-4 text-slate-400 font-medium">
                      ✨ Data di Firebase Presensi sudah 100% sama dengan di Google Sheets!
                    </div>
                  )}
              </div>

              {/* ACTION EXECUTE */}
              {(syncPreview.toAdd.length > 0 ||
                syncPreview.toUpdate.length > 0 ||
                syncPreview.toRemove.length > 0 ||
                syncPreview.toDeactivate.length > 0) && (
                <button
                  onClick={handleSyncNow}
                  disabled={isSyncing}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg text-xs transition flex justify-center items-center gap-1.5 shadow-lg shadow-green-100"
                >
                  {isSyncing ? (
                    <>
                      <span className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></span>
                      Sedang Menyinkronkan...
                    </>
                  ) : (
                    "🚀 Jalankan Sinkronisasi Sekarang"
                  )}
                </button>
              )}
            </div>
          )}

          {/* PROGRESS LOG */}
          {syncProgress.length > 0 && (
            <div className="bg-slate-900 text-slate-200 p-3 rounded-xl font-mono text-[9px] space-y-1 max-h-40 overflow-y-auto">
              <p className="text-amber-400 font-semibold border-b border-slate-800 pb-1 mb-1">💻 Konsol Proses Sinkronisasi:</p>
              {syncProgress.map((msg, index) => (
                <p key={index} className={msg.startsWith("❌") ? "text-red-400" : msg.startsWith("✅") ? "text-green-400" : ""}>
                  {msg}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SYSTEM SETTINGS */}
      {activeTab === "sistem" && (
        <div className="space-y-4 animate-fade-in text-xs">
          {/* SCRIPT CONFIG */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 space-y-3">
            <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
              🔗 Integrasi Google Sheets
            </h3>

            {isEditingConfig ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="Paste URL Script Web App"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-xs focus:outline-orange-500"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveConfig}
                    className="flex-1 bg-orange-600 text-white font-bold py-2 rounded-lg"
                  >
                    Simpan
                  </button>
                  <button
                    onClick={() => setIsEditingConfig(false)}
                    className="flex-1 bg-slate-100 text-slate-700 py-2 rounded-lg font-semibold"
                  >
                    Batal
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-slate-500 overflow-x-auto font-mono bg-slate-50 p-2 rounded-lg text-[10px]">
                  {configUrl || <span className="text-red-500 italic">Belum disetting! Menggunakan Mock database lokal.</span>}
                </p>
                <button
                  onClick={() => setIsEditingConfig(true)}
                  className="text-orange-600 font-bold"
                >
                  Edit URL Script
                </button>
              </div>
            )}
          </div>

          {/* LOGO CONFIG */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 space-y-3">
            <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
              🖼️ Kustom Logo Aplikasi
            </h3>

            {isEditingLogo ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={logoInput}
                  onChange={(e) => setLogoInput(e.target.value)}
                  placeholder="Paste URL Gambar Logo (.png / .jpg)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-xs focus:outline-orange-500"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveLogo}
                    className="flex-1 bg-orange-600 text-white font-bold py-2 rounded-lg"
                  >
                    Simpan
                  </button>
                  <button
                    onClick={() => setIsEditingLogo(false)}
                    className="flex-1 bg-slate-100 text-slate-700 py-2 rounded-lg font-semibold"
                  >
                    Batal
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={logoUrl} alt="Logo" className="h-10 w-10 object-contain rounded bg-slate-50 p-1 border" />
                  <span className="text-slate-400 text-[10px] font-mono truncate max-w-[150px]">{logoUrl}</span>
                </div>
                <button
                  onClick={() => setIsEditingLogo(true)}
                  className="text-orange-600 font-bold"
                >
                  Edit Logo
                </button>
              </div>
            )}
          </div>

          {/* SHARE & MAINTENANCE */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 space-y-3">
            <h3 className="font-bold text-slate-800">
              🛠️ Pemeliharaan & Fitur Tambahan
            </h3>

            <div className="grid grid-cols-2 gap-2 text-center font-semibold">
              <button
                onClick={copyShareLink}
                className="bg-slate-50 border hover:bg-slate-100 text-slate-700 p-2.5 rounded-lg transition"
              >
                🔗 Salin Link Share
              </button>
              <button
                onClick={() => setShowQR(true)}
                className="bg-slate-50 border hover:bg-slate-100 text-slate-700 p-2.5 rounded-lg transition"
              >
                📱 QR Code Integrasi
              </button>
              <button
                onClick={handleSyncColors}
                disabled={syncingColors}
                className="bg-slate-50 border hover:bg-slate-100 text-slate-700 p-2.5 rounded-lg transition disabled:opacity-50"
              >
                🎨 {syncingColors ? "Memproses..." : "Mewarnai Excel"}
              </button>
              <button
                onClick={() => setShowGuide(true)}
                className="bg-slate-50 border hover:bg-slate-100 text-slate-700 p-2.5 rounded-lg transition"
              >
                📖 Panduan Script
              </button>
            </div>

            <button
              onClick={handleWipeData}
              disabled={wiping}
              className="w-full bg-red-50 border border-red-100 text-red-600 hover:bg-red-100 font-bold py-2.5 rounded-lg transition"
            >
              ⚠️ {wiping ? "Sedang Menghapus..." : "RESET DATABASE (Wipe)"}
            </button>
          </div>
        </div>
      )}

      {/* QR CODE MODAL */}
      {showQR && configUrl && (
        <div
          className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowQR(false)}
        >
          <div
            className="bg-white p-6 rounded-2xl max-w-sm w-full text-center space-y-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1">
              <h3 className="font-bold text-lg text-slate-800">
                Scan untuk Registrasi
              </h3>
              <p className="text-[10px] text-slate-400">
                Tunjukkan QR Code ini kepada member baru/lama untuk scan langsung dan mendaftar.
              </p>
            </div>

            <div className="flex justify-center" id="qr-code-container">
              <div className="border-4 border-slate-900 p-2 rounded-xl bg-white shadow-lg">
                <QRCode value={getShareUrl()} size={180} />
              </div>
            </div>

            <button
              onClick={handleDownloadQR}
              className="w-full bg-slate-100 text-slate-700 text-xs font-bold py-2.5 rounded-xl hover:bg-slate-200 transition flex items-center justify-center gap-1.5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Gambar QR
            </button>

            <button
              onClick={() => setShowQR(false)}
              className="w-full text-xs text-slate-400 font-bold hover:text-slate-600 transition"
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

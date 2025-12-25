import React, { useState, useEffect } from 'react';
import { MemberData, UserStatus, ShirtSize, BIRTH_YEARS, PaymentMethod } from './types';
import * as SheetService from './services/sheetService';
import GeminiChat from './components/GeminiChat';
import QRCode from 'react-qr-code';

// --- KONFIGURASI APLIKASI ---

// 1. UBAH DATA REKENING BANK DISINI
const BANK_INFO = {
  bankName: "Bank BNI",
  accountNumber: "0290945110",
  accountHolder: "a.n Indah Hari Utami"
};

// 2. PIN UNTUK MASUK HALAMAN ADMIN
const ADMIN_PIN = "123456"; 

// 3. LINK GRUP WHATSAPP (Isi link di dalam tanda kutip, kosongkan jika belum ada)
const WA_GROUP_LINK = "https://chat.whatsapp.com/FaZDznBOKxSGEqHEMC9FkS"; // Contoh: "https://chat.whatsapp.com/ABCDE12345"

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

// --- GOOGLE APPS SCRIPT CODE TEMPLATE ---
const GOOGLE_SCRIPT_CODE = `
// --- COPY KODE INI KE GOOGLE APPS SCRIPT ---
// Cara: Extensions > Apps Script > Paste > Deploy as Web App (Access: Anyone)

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("MemberData");
    if (!sheet) {
      sheet = ss.insertSheet("MemberData");
      sheet.appendRow(["Timestamp", "WhatsApp", "Status", "PaymentAmount", "PaymentCode", "PaymentMethod", "FullName", "Nickname", "BirthYear", "BirthDate", "FatherName", "MotherName", "AddressKK", "AddressDomicile", "ShirtSize"]);
    }
    
    var params = JSON.parse(e.postData.contents);
    var action = params.action;
    var result = {};
    
    if (action == "get_all") {
      result = getAllMembers(sheet);
    } else if (action == "check_status") {
      result = handleCheckStatus(sheet, params);
    } else if (action == "confirm_payment") {
      result = handleConfirmPayment(sheet, params);
    } else if (action == "admin_approve") {
      result = handleAdminApprove(sheet, params);
    } else if (action == "submit_registration") {
      result = handleSubmitRegistration(sheet, params);
    } else if (action == "wipe_all") {
      sheet.clearContents();
      sheet.appendRow(["Timestamp", "WhatsApp", "Status", "PaymentAmount", "PaymentCode", "PaymentMethod", "FullName", "Nickname", "BirthYear", "BirthDate", "FatherName", "MotherName", "AddressKK", "AddressDomicile", "ShirtSize"]);
      result = {success: true};
    }
    
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({error: e.toString()})).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function getAllMembers(sheet) {
  var data = sheet.getDataRange().getValues();
  var members = [];
  // Skip header
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (row[1]) {
      members.push(rowToMember(row));
    }
  }
  return members;
}

function handleCheckStatus(sheet, params) {
  var wa = params.whatsapp;
  var nickname = params.nickname || "";
  var rowIndex = findRowIndex(sheet, wa);
  
  if (rowIndex == -1) {
    var randomCode = Math.floor(Math.random() * 90 + 10);
    var amount = 200000 + randomCode;
    // Column H (index 7) is Nickname
    var newRow = [new Date(), wa, "NEW", amount, randomCode, "", "", nickname, "", "", "", "", "", "", ""];
    sheet.appendRow(newRow);
    return rowToMember(newRow);
  } else {
    var row = sheet.getRange(rowIndex, 1, 1, 15).getValues()[0];
    return rowToMember(row);
  }
}

function handleConfirmPayment(sheet, params) {
  var wa = params.whatsapp;
  var method = params.method;
  var rowIndex = findRowIndex(sheet, wa);
  if (rowIndex == -1) throw "Member not found";
  
  sheet.getRange(rowIndex, 3).setValue("WAITING_APPROVAL");
  sheet.getRange(rowIndex, 6).setValue(method);
  
  if (method === "CASH") {
     sheet.getRange(rowIndex, 4).setValue(200000);
  }
  
  var row = sheet.getRange(rowIndex, 1, 1, 15).getValues()[0];
  return rowToMember(row);
}

function handleAdminApprove(sheet, params) {
  var wa = params.whatsapp;
  var rowIndex = findRowIndex(sheet, wa);
  if (rowIndex == -1) throw "Member not found";
  
  sheet.getRange(rowIndex, 3).setValue("APPROVED");
  var row = sheet.getRange(rowIndex, 1, 1, 15).getValues()[0];
  return rowToMember(row);
}

function handleSubmitRegistration(sheet, params) {
  var wa = params.whatsapp;
  var data = params.data;
  var rowIndex = findRowIndex(sheet, wa);
  if (rowIndex == -1) throw "Member not found";
  
  var range = sheet.getRange(rowIndex, 1, 1, 15);
  sheet.getRange(rowIndex, 3).setValue("REGISTERED");
  
  if(data.fullName) sheet.getRange(rowIndex, 7).setValue(data.fullName);
  if(data.nickname) sheet.getRange(rowIndex, 8).setValue(data.nickname);
  if(data.birthYear) sheet.getRange(rowIndex, 9).setValue(data.birthYear);
  if(data.birthDate) sheet.getRange(rowIndex, 10).setValue(data.birthDate);
  if(data.fatherName) sheet.getRange(rowIndex, 11).setValue(data.fatherName);
  if(data.motherName) sheet.getRange(rowIndex, 12).setValue(data.motherName);
  if(data.addressKK) sheet.getRange(rowIndex, 13).setValue(data.addressKK);
  if(data.addressDomicile) sheet.getRange(rowIndex, 14).setValue(data.addressDomicile);
  if(data.shirtSize) sheet.getRange(rowIndex, 15).setValue(data.shirtSize);
  
  var row = range.getValues()[0];
  return rowToMember(row);
}

function findRowIndex(sheet, wa) {
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][1]) == String(wa)) {
      return i + 1;
    }
  }
  return -1;
}

function rowToMember(row) {
  return {
    whatsapp: String(row[1]),
    status: row[2],
    paymentAmount: row[3],
    paymentCode: row[4],
    paymentMethod: row[5],
    fullName: row[6],
    nickname: row[7],
    birthYear: row[8],
    birthDate: row[9],
    fatherName: row[10],
    motherName: row[11],
    addressKK: row[12],
    addressDomicile: row[13],
    shirtSize: row[14]
  };
}
`;

// --- UTILS ---

const sanitizePhoneNumber = (phone: string): string => {
  let clean = phone.replace(/\D/g, ''); 
  if (clean.startsWith('62')) {
    clean = '0' + clean.substring(2);
  } else if (clean.startsWith('8')) {
    clean = '0' + clean;
  }
  return clean;
};

// --- Sub-components ---

const Header = ({ onViewChange, currentView }: { onViewChange: (view: 'user' | 'admin') => void, currentView: 'user' | 'admin' }) => (
  <header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-20 shadow-sm">
    <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
      <div className="flex items-center gap-2 cursor-pointer transition hover:opacity-80" onClick={() => onViewChange('user')}>
        <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-md">PK</div>
        <h1 className="font-bold text-slate-800 text-lg tracking-tight">Pushbike Kudus</h1>
      </div>
      <div className="flex items-center gap-2">
         {currentView === 'user' ? (
           <button onClick={() => onViewChange('admin')} className="px-3 py-1 rounded-full bg-slate-100 text-xs text-slate-600 hover:bg-slate-200 font-medium transition">
             Login Admin
           </button>
         ) : (
           <button onClick={() => onViewChange('user')} className="px-3 py-1 rounded-full bg-orange-50 text-xs text-orange-600 hover:bg-orange-100 font-medium transition">
             Mode Member
           </button>
         )}
      </div>
    </div>
  </header>
);

const Footer = () => (
  <footer className="py-8 text-center text-slate-400">
    <div className="max-w-md mx-auto px-4 flex flex-col items-center gap-2">
      <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-400 font-bold text-[10px] mb-1 opacity-50">PK</div>
      <p className="text-xs font-medium text-slate-500">
        &copy; {new Date().getFullYear()} Pushbike Kudus. All rights reserved.
      </p>
      <p className="text-[10px] text-slate-400">
        Made with <span className="text-red-400">❤</span> by Pushbike Kudus Team
      </p>
    </div>
  </footer>
);

const AdminLoginModal = ({ isOpen, onClose, onSuccess }: { isOpen: boolean, onClose: () => void, onSuccess: () => void }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === ADMIN_PIN) {
      onSuccess();
      setPin('');
      setError(false);
    } else {
      setError(true);
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-xs w-full p-6 animate-fade-in transform scale-100" onClick={e => e.stopPropagation()}>
        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-2 text-center">Admin Access</h3>
        <p className="text-xs text-slate-500 mb-6 text-center">Masukkan PIN keamanan untuk melanjutkan.</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            autoFocus
            className={`w-full text-center text-2xl tracking-widest p-3 border rounded-xl focus:outline-none focus:ring-4 transition-all ${error ? 'border-red-500 ring-red-100 bg-red-50' : 'border-slate-200 focus:ring-orange-100 focus:border-orange-500'}`}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="••••••"
            maxLength={6}
          />
          {error && <p className="text-xs text-red-500 text-center font-bold animate-pulse">PIN Salah, silakan coba lagi.</p>}
          
          <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded-xl font-medium hover:bg-slate-800 shadow-lg shadow-slate-200 transition-all active:scale-95">
            Masuk Dashboard
          </button>
        </form>
        <button onClick={onClose} className="w-full mt-3 text-xs text-slate-400 hover:text-slate-600 py-2">
          Batalkan
        </button>
      </div>
    </div>
  );
};

const IntegrationGuideModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(GOOGLE_SCRIPT_CODE);
    alert("Kode berhasil disalin!");
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800">Panduan Integrasi Google Sheet</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">&times;</button>
        </div>
        
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-600">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <h4 className="font-bold text-blue-800 mb-2">Langkah 1: Siapkan Google Sheet</h4>
            <ol className="list-decimal ml-4 space-y-1">
              <li>Buka Google Drive dan buat <strong>Google Spreadsheet</strong> baru.</li>
              <li>Beri nama spreadsheet (misal: "Database Pushbike").</li>
              <li>Klik menu <strong>Extensions (Ekstensi)</strong> &gt; <strong>Apps Script</strong>.</li>
            </ol>
          </div>

          <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
            <h4 className="font-bold text-orange-800 mb-2">Langkah 2: Pasang Kode Backend</h4>
            <p className="mb-2">Hapus semua kode yang ada di editor Apps Script, lalu copy-paste kode di bawah ini:</p>
            <div className="relative">
              <pre className="bg-slate-800 text-slate-200 p-4 rounded-md overflow-x-auto text-xs h-40">
                {GOOGLE_SCRIPT_CODE}
              </pre>
              <button onClick={handleCopy} className="absolute top-2 right-2 bg-white text-slate-800 px-3 py-1 rounded text-xs font-bold shadow hover:bg-slate-100">
                Copy Kode
              </button>
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg border border-green-100">
            <h4 className="font-bold text-green-800 mb-2">Langkah 3: Deploy & Hubungkan</h4>
            <ol className="list-decimal ml-4 space-y-1">
              <li>Klik tombol <strong>Deploy</strong> (kanan atas) &gt; <strong>New Deployment</strong>.</li>
              <li>Pilih type: <strong>Web app</strong>.</li>
              <li>Description: "v1".</li>
              <li>Execute as: <strong>Me</strong> (email anda).</li>
              <li>Who has access: <strong>Anyone</strong> (PENTING!).</li>
              <li>Klik <strong>Deploy</strong>, lalu salin <strong>Web App URL</strong>.</li>
              <li>Paste URL tersebut ke kolom konfigurasi di Dashboard Admin aplikasi ini.</li>
            </ol>
          </div>
        </div>

        <div className="p-4 border-t bg-slate-50 flex justify-end">
          <button onClick={onClose} className="bg-slate-900 text-white px-6 py-2 rounded-lg font-medium hover:bg-slate-800">
            Saya Mengerti
          </button>
        </div>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const [members, setMembers] = useState<MemberData[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // Integration Settings State
  const [configUrl, setConfigUrl] = useState(SheetService.getScriptUrl());
  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [urlInput, setUrlInput] = useState(SheetService.getScriptUrl());
  const [wiping, setWiping] = useState(false);
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
      alert("Gagal memuat data. Periksa koneksi internet atau konfigurasi URL Google Sheet.");
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
    if(!window.confirm(`Setujui pembayaran untuk nomor ${displayWA}?`)) return;
    
    setProcessingId(wa);
    try {
      await SheetService.adminApproveMember(wa);
      // Optimistic update
      setMembers(prev => prev.map(m => 
        m.whatsapp === wa ? { ...m, status: UserStatus.APPROVED } : m
      ));
    } catch (error) {
      console.error(error);
      alert("Gagal melakukan verifikasi. Coba lagi.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleWipeData = async () => {
    const confirmationText = configUrl ? "Data di GOOGLE SHEET akan DIHAPUS PERMANEN." : "Data lokal akan dihapus.";
    
    if (window.confirm("⚠️ PERINGATAN BAHAYA ⚠️\n\nApakah Anda yakin ingin MENGHAPUS SEMUA DATA MEMBER?")) {
      if (window.confirm(`KONFIRMASI TERAKHIR:\n\n${confirmationText}\n\nTindakan ini tidak bisa dibatalkan!`)) {
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

  const handleSaveConfig = () => {
    SheetService.setScriptUrl(urlInput);
    setConfigUrl(urlInput);
    setIsEditingConfig(false);
    loadData(true); 
  };

  // Logic untuk membuat URL Share yang mengandung Config
  const getShareUrl = () => {
    const baseUrl = window.location.href.split('?')[0];
    if (configUrl) {
      // Encode URL Script agar bisa jadi parameter
      return `${baseUrl}?config=${encodeURIComponent(configUrl)}`;
    }
    return baseUrl;
  };

  const copyShareLink = () => {
    if (!configUrl) return alert("Belum ada URL Google Sheet yang tersimpan.");
    navigator.clipboard.writeText(getShareUrl());
    alert("Link Integrasi berhasil disalin! Bagikan link ini ke member/device lain.");
  };

  return (
    <div className="animate-fade-in p-4 space-y-6">
      <IntegrationGuideModal isOpen={showGuide} onClose={() => setShowGuide(false)} />

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <span className="w-2 h-6 bg-orange-500 rounded-full"></span>
          Dashboard Admin
        </h2>
        <button onClick={() => loadData(true)} className="text-sm text-orange-600 hover:text-orange-700 hover:bg-orange-50 px-3 py-1 rounded-full transition font-medium flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          Refresh
        </button>
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
            <div key={m.whatsapp} className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col gap-3 transition hover:shadow-md group">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-mono text-lg font-bold text-slate-800 tracking-wide">
                    {sanitizePhoneNumber(m.whatsapp)}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-500">
                      {m.paymentMethod === 'CASH' ? 'TUNAI' : 'TRANSFER'}: <span className="font-medium text-slate-700">Rp {m.paymentAmount.toLocaleString('id-ID')}</span>
                    </span>
                    {m.paymentMethod === 'CASH' && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">CASH</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                   <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider 
                     ${m.status === UserStatus.WAITING_APPROVAL ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' : 
                       m.status === UserStatus.APPROVED ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                       m.status === UserStatus.REGISTERED ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                     {m.status.replace('_', ' ')}
                   </span>
                </div>
              </div>

              {m.status === UserStatus.REGISTERED && (
                 <div className="text-sm bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1">
                    <p className="flex justify-between">
                      <span className="text-slate-500">Anak:</span>
                      <span className="font-medium text-slate-800">{m.fullName} ({m.nickname})</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-500">Lahir:</span>
                      <span className="font-medium text-slate-800">{m.birthYear}</span>
                    </p>
                 </div>
              )}

              {(m.status === UserStatus.WAITING_APPROVAL || m.status === UserStatus.NEW) && (
                <div className="pt-2 border-t border-slate-100 mt-1">
                  <button 
                    onClick={() => handleApprove(m.whatsapp)}
                    disabled={processingId === m.whatsapp}
                    className={`w-full flex justify-center items-center py-2.5 px-4 rounded-lg text-sm font-semibold transition-all transform active:scale-95
                      ${processingId === m.whatsapp 
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                        : m.status === UserStatus.WAITING_APPROVAL 
                           ? 'bg-green-600 hover:bg-green-700 text-white shadow-green-200 shadow-lg'
                           : 'bg-white border border-green-600 text-green-700 hover:bg-green-50'
                      }`}
                  >
                    {processingId === m.whatsapp ? 'Memproses...' : (m.status === UserStatus.WAITING_APPROVAL ? (m.paymentMethod === 'CASH' ? 'Terima Uang Tunai' : 'Verifikasi Pembayaran') : 'Setujui Manual (Override)')}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* INTEGRATION SETTINGS SECTION */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mt-8 shadow-sm">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
          <h3 className="font-bold text-slate-700 text-sm">Pengaturan Database</h3>
          <button onClick={() => setShowGuide(true)} className="text-xs flex items-center gap-1 text-orange-600 font-medium hover:underline">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             Script & Panduan
          </button>
        </div>
        
        <div className="p-4">
          {isEditingConfig ? (
            <div className="space-y-3">
               <div className="text-xs text-slate-600">
                 Paste URL Web App dari Google Apps Script Deployment di bawah ini.
               </div>
               <input 
                type="text" 
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://script.google.com/macros/s/..."
                className="w-full text-sm p-2 border rounded focus:ring-2 focus:ring-orange-500 outline-none transition"
               />
               <div className="flex gap-2 justify-end">
                 <button onClick={() => setIsEditingConfig(false)} className="text-slate-600 text-sm px-4 py-2 hover:bg-slate-100 rounded-lg">Batal</button>
                 <button onClick={handleSaveConfig} className="bg-orange-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-orange-700 shadow">Simpan</button>
               </div>
            </div>
          ) : (
            <div className="space-y-4">
               <div className="flex items-center gap-2 p-2 bg-slate-50 rounded border border-slate-100">
                  <div className={`w-3 h-3 rounded-full shadow-sm ${configUrl ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                  <div className="text-sm font-medium text-slate-700 flex-1">{configUrl ? 'Terhubung ke Google Sheet' : 'Mode Demo (Lokal Storage)'}</div>
                  <button onClick={() => { setUrlInput(configUrl); setIsEditingConfig(true); }} className="text-xs bg-white border border-slate-300 px-2 py-1 rounded hover:bg-slate-50 text-slate-600">
                    Ubah
                  </button>
               </div>
               
              <div className="flex flex-wrap gap-2">
                {configUrl && (
                  <>
                    <button onClick={copyShareLink} className="flex-1 bg-blue-50 text-blue-700 font-medium text-xs hover:bg-blue-100 border border-blue-200 px-3 py-2.5 rounded-lg flex items-center justify-center gap-2 transition">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                      Copy Link App
                    </button>
                    <button onClick={() => setShowQR(true)} className="flex-1 bg-slate-800 text-white font-medium text-xs hover:bg-slate-900 border border-slate-800 px-3 py-2.5 rounded-lg flex items-center justify-center gap-2 shadow transition">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4h2v-4zM5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                      QR Code
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* DANGER ZONE: WIPE DATA */}
      <div className="mt-8 border border-red-200 rounded-xl overflow-hidden bg-red-50/50">
        <div className="bg-red-50 px-4 py-3 border-b border-red-100 flex items-center gap-2">
           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
           <h3 className="font-bold text-red-800 text-sm">Danger Zone</h3>
        </div>
        <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
           <div className="text-xs text-red-700/80">
              <p className="font-bold text-red-800">Reset Database</p>
              <p className="mt-1">Tindakan ini akan menghapus <strong>SEMUA DATA</strong> member secara permanen dari aplikasi dan {configUrl ? 'Google Sheet' : 'Local Storage'}. Tidak dapat dibatalkan.</p>
           </div>
           <button 
             onClick={handleWipeData} 
             disabled={wiping} 
             className="whitespace-nowrap bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
           >
             {wiping ? 'Menghapus...' : 'HAPUS SEMUA DATA'}
           </button>
        </div>
      </div>

      {/* QR CODE MODAL */}
      {showQR && configUrl && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowQR(false)}>
          <div className="bg-white p-8 rounded-2xl max-w-sm w-full text-center space-y-6 animate-fade-in shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="space-y-2">
              <h3 className="font-bold text-xl text-slate-800">Scan untuk Registrasi</h3>
              <div className="bg-green-50 text-green-700 text-xs p-3 rounded-lg border border-green-200">
                 <strong className="block mb-1">🚀 QR Code Terintegrasi</strong>
                 Member yang scan QR ini akan otomatis terhubung ke database tanpa perlu setting manual.
              </div>
            </div>
            
            <div className="flex justify-center">
               <div className="border-4 border-slate-900 p-3 rounded-xl bg-white shadow-xl">
                 <QRCode value={getShareUrl()} size={220} />
               </div>
            </div>
            
            <button 
              onClick={() => setShowQR(false)} 
              className="w-full bg-slate-900 text-white font-medium py-3 rounded-xl hover:bg-slate-800 transition shadow-lg"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

const StepLogin = ({ onLogin }: { onLogin: (wa: string, nickname: string) => void }) => {
  const [phone, setPhone] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length < 9) return alert('Nomor WhatsApp tidak valid');
    if (nickname.trim().length < 2) return alert('Nama panggilan harus diisi');
    
    setLoading(true);
    // Sanitize input before sending
    const cleanNumber = sanitizePhoneNumber(phone);
    const cleanNick = nickname.toUpperCase();
    await onLogin(cleanNumber, cleanNick);
    setLoading(false);
  };

  return (
    <div className="animate-fade-in space-y-8 py-4">
      <div className="text-center space-y-3">
        <div className="inline-block p-3 bg-orange-100 rounded-full mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Selamat Datang</h2>
        <p className="text-slate-500 text-sm leading-relaxed max-w-xs mx-auto">
          Silakan lengkapi data awal untuk memulai proses registrasi ulang member Pushbike Kudus.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Nomor WhatsApp</label>
          <div className="relative">
             <span className="absolute left-4 top-3.5 text-slate-400 text-sm font-medium">+62</span>
             <input
              type="tel"
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition font-medium"
              placeholder="8123456789"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Nama Panggilan Anak</label>
          <input
            type="text"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition font-medium uppercase placeholder:normal-case placeholder:text-slate-400"
            placeholder="Contoh: BUDI"
            value={nickname}
            onChange={(e) => setNickname(e.target.value.toUpperCase())}
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-slate-200 mt-2"
        >
          {loading ? 'Memproses...' : 'Lanjutkan Registrasi'}
        </button>
      </form>
    </div>
  );
};

const StepPayment = ({ member, onConfirm }: { member: MemberData, onConfirm: (method: PaymentMethod) => void }) => {
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>('TRANSFER');

  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm(method);
    setLoading(false);
  };

  const transferAmount = member.paymentAmount > 200500 ? member.paymentAmount : (200000 + member.paymentCode);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="text-center">
         <h3 className="text-lg font-bold text-slate-800">Pilih Metode Pembayaran</h3>
         <p className="text-sm text-slate-500">Silakan pilih cara pembayaran registrasi.</p>
      </div>
      
      <div className="flex bg-slate-100 p-1.5 rounded-xl">
        <button 
          onClick={() => setMethod('TRANSFER')}
          className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${method === 'TRANSFER' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Transfer Bank
        </button>
        <button 
          onClick={() => setMethod('CASH')}
          className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${method === 'CASH' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Tunai (Cash)
        </button>
      </div>

      <div className={`relative overflow-hidden ${method === 'TRANSFER' ? 'bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200' : 'bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200'} border rounded-2xl p-6 text-center space-y-4 transition-all shadow-sm`}>
        
        {method === 'TRANSFER' ? (
           <>
             <div className="bg-white/60 backdrop-blur-sm p-3 rounded-lg inline-block">
                <p className="text-xs font-bold text-orange-700 uppercase tracking-wide">Total Transfer</p>
             </div>
             <div className="py-2">
                <div className="text-4xl font-mono font-bold text-slate-800 tracking-tighter">
                  <span className="text-xl align-top text-slate-500 font-sans mr-1">Rp</span>
                  {transferAmount.toLocaleString('id-ID')}
                </div>
                <div className="inline-block mt-2 px-2 py-1 bg-orange-200/50 text-orange-800 text-[10px] font-bold rounded">
                  Kode Unik: {member.paymentCode}
                </div>
             </div>
             <p className="text-xs text-orange-800/80 leading-relaxed px-4">
               Mohon transfer <strong>sesuai nominal persis</strong> (hingga 3 digit terakhir) agar sistem dapat memverifikasi otomatis.
             </p>
             <div className="bg-white p-4 rounded-xl border border-orange-100 text-sm text-slate-600 shadow-sm">
               <p className="font-bold text-slate-800 mb-1">{BANK_INFO.bankName}</p>
               <p className="text-xl font-mono tracking-wider text-slate-800 select-all bg-slate-50 py-2 rounded mb-1">{BANK_INFO.accountNumber}</p>
               <p className="text-xs text-slate-400">{BANK_INFO.accountHolder}</p>
             </div>
           </>
        ) : (
           <>
             <div className="bg-white/60 backdrop-blur-sm p-3 rounded-lg inline-block">
                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Total Tagihan</p>
             </div>
             <div className="py-2">
                <div className="text-4xl font-mono font-bold text-slate-800 tracking-tighter">
                  <span className="text-xl align-top text-slate-500 font-sans mr-1">Rp</span>
                  200.000
                </div>
                <div className="inline-block mt-2 px-2 py-1 bg-emerald-200/50 text-emerald-800 text-[10px] font-bold rounded">
                  Tanpa Kode Unik
                </div>
             </div>
             <div className="bg-white p-5 rounded-xl border border-emerald-100 text-sm text-slate-600 flex items-start gap-3 text-left shadow-sm">
               <div className="bg-emerald-100 p-2 rounded-full text-emerald-600 shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
               </div>
               <p className="text-slate-600 text-xs leading-relaxed">
                 Wajib menyerahkan uang tunai saat <strong>Latihan/Kopdar</strong> secara langsung kepada Bendahara atau Admin yang bertugas.
               </p>
             </div>
           </>
        )}
      </div>

      <button
        onClick={handleConfirm}
        disabled={loading}
        className={`w-full text-white font-bold py-4 rounded-xl transition-all transform active:scale-95 disabled:opacity-50 shadow-lg ${method === 'TRANSFER' ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-200' : 'bg-slate-800 hover:bg-slate-900 shadow-slate-200'}`}
      >
        {loading ? 'Memproses...' : (method === 'TRANSFER' ? 'Saya Sudah Transfer' : 'Saya Akan Bayar Tunai')}
      </button>
      
      {method === 'TRANSFER' && (
        <p className="text-center text-[10px] text-slate-400 uppercase tracking-wide">Tidak perlu upload bukti transfer</p>
      )}
    </div>
  );
};

// Polling Component: Checks status every 5 seconds
const StepWaitingApproval = ({ onCheckStatus }: { onCheckStatus: () => void }) => {
  useEffect(() => {
    // Auto refresh status every 5 seconds to see if admin approved
    const interval = setInterval(() => {
      onCheckStatus();
    }, 5000);
    return () => clearInterval(interval);
  }, [onCheckStatus]);

  return (
    <div className="animate-fade-in text-center space-y-8 py-10">
      <div className="relative w-24 h-24 mx-auto">
         <div className="absolute inset-0 bg-yellow-100 rounded-full animate-ping opacity-75"></div>
         <div className="relative w-24 h-24 bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-full flex items-center justify-center text-yellow-600 shadow-inner border border-yellow-200">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
         </div>
      </div>
      
      <div className="space-y-3">
        <h2 className="text-2xl font-bold text-slate-800">Menunggu Verifikasi</h2>
        <p className="text-slate-500 text-sm max-w-xs mx-auto leading-relaxed">
          Terima kasih! Tim kami sedang mengecek status pembayaran Anda. Halaman ini akan otomatis berubah setelah disetujui.
        </p>
      </div>
      
      <div className="flex justify-center">
        <button
          onClick={onCheckStatus}
          className="flex items-center gap-2 text-orange-600 font-bold hover:text-orange-700 text-xs bg-orange-50 px-5 py-2.5 rounded-full border border-orange-100 hover:bg-orange-100 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          Cek Status Sekarang
        </button>
      </div>
    </div>
  );
};

const StepForm = ({ onSubmit, initialData }: { onSubmit: (data: Partial<MemberData>) => void, initialData?: MemberData }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    nickname: initialData?.nickname || '', // PRE-FILL NICKNAME
    birthYear: '' as unknown as number,
    birthDate: '',
    fatherName: '',
    motherName: '',
    addressKK: '',
    addressDomicile: '',
    shirtSize: '' as ShirtSize
  });
  const [sameAsKK, setSameAsKK] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (field: string, value: any) => {
    // AUTO KAPITAL (UPPERCASE)
    const finalValue = typeof value === 'string' ? value.toUpperCase() : value;

    setFormData(prev => {
      const newData = { ...prev, [field]: finalValue };
      if (field === 'addressKK' && sameAsKK) {
        newData.addressDomicile = finalValue;
      }
      return newData;
    });
  };

  const handleDatePartChange = (part: 'day' | 'month', val: string) => {
    const current = formData.birthDate || '';
    // Check if current format matches "DD Month"
    // If it's legacy YYYY-MM-DD, we overwrite it, which is fine for re-registration
    const parts = current.includes('-') ? ['',''] : current.split(' ');
    
    let d = parts[0] || '';
    let m = parts.slice(1).join(' ') || '';
    
    if (part === 'day') d = val;
    if (part === 'month') m = val;
    
    handleChange('birthDate', `${d} ${m}`.trim());
  };

  const currentDay = formData.birthDate && !formData.birthDate.includes('-') ? formData.birthDate.split(' ')[0] : '';
  const currentMonth = formData.birthDate && !formData.birthDate.includes('-') ? formData.birthDate.split(' ').slice(1).join(' ') : '';

  const toggleSameAddress = () => {
    setSameAsKK(!sameAsKK);
    if (!sameAsKK) {
      setFormData(prev => ({ ...prev, addressDomicile: prev.addressKK }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit(formData);
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="animate-fade-in space-y-8">
      <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 px-4 py-4 rounded-xl text-sm flex gap-3 items-start shadow-sm">
        <div className="bg-emerald-100 p-1 rounded-full shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
        <div>
          <strong>Pembayaran Terverifikasi!</strong>
          <p className="text-emerald-600/80 text-xs mt-1">Silakan lengkapi biodata anak dengan benar untuk pencetakan ID Card.</p>
        </div>
      </div>
      
      {/* SECTION: CHILD DATA */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">Data Diri Anak</h2>
        
        <div>
          <label className="text-sm font-semibold text-slate-700 block mb-1.5">Nama Lengkap Anak</label>
          <input required type="text" className="w-full p-3.5 border border-slate-200 bg-slate-50 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none uppercase placeholder:normal-case transition" 
            placeholder="CONTOH: BUDI SANTOSO"
            value={formData.fullName} onChange={e => handleChange('fullName', e.target.value)} />
        </div>
        
        <div>
          <label className="text-sm font-semibold text-slate-700 block mb-1.5">Nama Panggilan</label>
          <input required type="text" className="w-full p-3.5 border border-slate-200 bg-slate-50 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none uppercase placeholder:normal-case transition" 
            placeholder="BUDI"
            value={formData.nickname} onChange={e => handleChange('nickname', e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1.5">Tahun Lahir</label>
            <div className="relative">
              <select required className="w-full p-3.5 border border-slate-200 bg-slate-50 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none appearance-none transition"
                value={formData.birthYear} onChange={e => handleChange('birthYear', parseInt(e.target.value))}>
                <option value="">Pilih</option>
                {BIRTH_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <div className="absolute right-3 top-4 pointer-events-none text-slate-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1.5">Tanggal Lahir (Tgl & Bulan)</label>
            <div className="flex gap-2">
              <div className="relative w-1/3">
                <select 
                  required 
                  className="w-full p-3.5 border border-slate-200 bg-slate-50 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none appearance-none transition"
                  value={currentDay}
                  onChange={(e) => handleDatePartChange('day', e.target.value)}
                >
                  <option value="">Tgl</option>
                  {Array.from({length: 31}, (_, i) => i + 1).map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-4 pointer-events-none text-slate-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
              
              <div className="relative w-2/3">
                <select 
                  required 
                  className="w-full p-3.5 border border-slate-200 bg-slate-50 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none appearance-none transition"
                  value={currentMonth}
                  onChange={(e) => handleDatePartChange('month', e.target.value)}
                >
                  <option value="">Bulan</option>
                  {MONTHS.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-4 pointer-events-none text-slate-500">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION: PARENT DATA */}
      <div className="space-y-4 pt-2">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">Data Orang Tua</h2>
        <div className="grid gap-4">
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1.5">Nama Ayah</label>
            <input required type="text" className="w-full p-3.5 border border-slate-200 bg-slate-50 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none uppercase transition"
              value={formData.fatherName} onChange={e => handleChange('fatherName', e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-1.5">Nama Ibu</label>
            <input required type="text" className="w-full p-3.5 border border-slate-200 bg-slate-50 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none uppercase transition"
              value={formData.motherName} onChange={e => handleChange('motherName', e.target.value)} />
          </div>
        </div>
      </div>

      {/* SECTION: ADDRESS */}
      <div className="space-y-4 pt-2">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">Alamat</h2>
        <div>
          <label className="text-sm font-semibold text-slate-700 block mb-1.5">Alamat Sesuai KK</label>
          <textarea required rows={2} className="w-full p-3.5 border border-slate-200 bg-slate-50 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none uppercase transition"
            value={formData.addressKK} onChange={e => handleChange('addressKK', e.target.value)} />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-semibold text-slate-700">Alamat Domisili</label>
            <button type="button" onClick={toggleSameAddress} className="text-xs flex items-center text-orange-600 font-bold bg-orange-50 px-2 py-1 rounded-md border border-orange-100 hover:bg-orange-100 transition">
              <span className={`w-3 h-3 border rounded-sm mr-1.5 flex items-center justify-center transition ${sameAsKK ? 'bg-orange-600 border-orange-600' : 'border-slate-400 bg-white'}`}>
                {sameAsKK && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>}
              </span>
              Sama dengan KK
            </button>
          </div>
          <textarea required rows={2} className={`w-full p-3.5 border border-slate-200 rounded-xl outline-none uppercase transition ${sameAsKK ? 'bg-slate-100 text-slate-400' : 'bg-slate-50 focus:bg-white focus:ring-2 focus:ring-orange-500'}`}
            value={formData.addressDomicile} onChange={e => handleChange('addressDomicile', e.target.value)} readOnly={sameAsKK} />
        </div>
      </div>

      {/* SECTION: ATTRIBUTES */}
      <div className="space-y-4 pt-2">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">Atribut</h2>
        <div>
          <label className="text-sm font-semibold text-slate-700 block mb-2">Ukuran Jersey</label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {Object.values(ShirtSize).map(size => (
              <button
                key={size}
                type="button"
                onClick={() => handleChange('shirtSize', size)}
                className={`px-2 py-3 rounded-lg border text-sm font-bold transition-all ${formData.shirtSize === size ? 'bg-slate-900 text-white border-slate-900 shadow-lg transform scale-105' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full mt-6 bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-all transform active:scale-95 disabled:opacity-50 shadow-xl shadow-slate-200"
      >
        {loading ? 'Menyimpan...' : 'Simpan Data'}
      </button>
    </form>
  );
};

const App = () => {
  const [view, setView] = useState<'user' | 'admin'>('user');
  const [member, setMember] = useState<MemberData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  // Check URL for config
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const config = params.get('config');
    if (config) {
      SheetService.setScriptUrl(config);
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleViewChange = (newView: 'user' | 'admin') => {
    if (newView === 'admin' && !isAdminLoggedIn) {
      setShowAdminLogin(true);
    } else {
      setView(newView);
    }
  };

  const handleAdminSuccess = () => {
    setIsAdminLoggedIn(true);
    setShowAdminLogin(false);
    setView('admin');
  };

  const handleLogin = async (wa: string, nickname: string) => {
    setLoading(true);
    try {
      const data = await SheetService.checkMemberStatus(wa, nickname);
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
      const data = await SheetService.checkMemberStatus(member.whatsapp);
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
      const updated = await SheetService.submitRegistration(member.whatsapp, data);
      setMember(updated);
    } catch (e) {
      alert("Gagal menyimpan data: " + e);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
      setMember(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
       <Header onViewChange={handleViewChange} currentView={view} />
       
       <main className="flex-grow w-full max-w-md mx-auto p-4">
          {view === 'admin' ? (
             <AdminDashboard />
          ) : (
             <>
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600 mb-4"></div>
                        <p className="text-slate-500 text-sm">Memproses...</p>
                    </div>
                ) : !member ? (
                    <StepLogin onLogin={handleLogin} />
                ) : member.status === UserStatus.NEW ? (
                    <StepPayment member={member} onConfirm={handlePaymentConfirm} />
                ) : member.status === UserStatus.WAITING_APPROVAL ? (
                    <StepWaitingApproval onCheckStatus={handleCheckStatus} />
                ) : member.status === UserStatus.APPROVED ? (
                    <StepForm onSubmit={handleSubmitForm} initialData={member} />
                ) : member.status === UserStatus.REGISTERED ? (
                    <div className="text-center py-10 animate-fade-in space-y-6">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600 shadow-inner">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800">Pendaftaran Selesai!</h2>
                            <p className="text-slate-500 text-sm mt-2 max-w-xs mx-auto">
                                Terima kasih telah mendaftar ulang. Sampai jumpa di latihan berikutnya!
                            </p>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-100 max-w-sm mx-auto text-left space-y-3">
                            <div className="border-b pb-2 mb-2">
                                <p className="text-xs text-slate-400 uppercase tracking-wide">Member Card</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500">Nama Lengkap</p>
                                <p className="font-bold text-slate-800 text-lg">{member.fullName}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-slate-500">Panggilan</p>
                                    <p className="font-
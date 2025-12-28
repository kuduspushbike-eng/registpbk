import React, { useState, useEffect } from 'react';
import { MemberData, UserStatus, ShirtSize, BIRTH_YEARS, PaymentMethod } from './types';
import * as SheetService from './services/sheetService';
import QRCode from 'react-qr-code';

// --- KONFIGURASI APLIKASI ---

// 1. UBAH DATA REKENING BANK DISINI
const BANK_INFO = {
  bankName: "Bank BNI",
  accountNumber: "0290945110",
  accountHolder: "a/n Indah Hari Utami"
};

// 2. PIN UNTUK MASUK HALAMAN ADMIN
const ADMIN_PIN = "757515"; 

// 3. LINK GRUP WHATSAPP (Isi link di dalam tanda kutip, kosongkan jika belum ada)
const WA_GROUP_LINK = "https://chat.whatsapp.com/FaZDznBOKxSGEqHEMC9FkS"; 

// 4. URL LOGO APLIKASI (Ganti link gambar disini)
const DEFAULT_APP_LOGO = "https://i.ibb.co.com/1YLtbnnD/logo-new-2.png";

// 5. URL GAMBAR SIZE CHART
const SIZE_CHART_URL = "https://i.ibb.co.com/6cDkDj4Y/size-charrt.jpg";

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

// --- GOOGLE APPS SCRIPT CODE TEMPLATE ---
const GOOGLE_SCRIPT_CODE = `
// --- COPY KODE INI KE GOOGLE APPS SCRIPT ---
// Cara: Extensions > Apps Script > Paste > Deploy as Web App (Access: Anyone)
// Versi: v8 (Fix Update Price for Re-entry)

var FIELD_MAPPING = [
  { key: "timestamp", label: "Waktu Input", aliases: ["Timestamp", "Waktu"] },
  { key: "whatsapp", label: "No. WhatsApp", aliases: ["WhatsApp", "Nomor WA", "Phone"] },
  { key: "status", label: "Status Member", aliases: ["Status"] },
  { key: "paymentAmount", label: "Nominal Transfer", aliases: ["PaymentAmount", "Jumlah", "Harga"] },
  { key: "paymentCode", label: "Kode Unik", aliases: ["PaymentCode", "Kode"] },
  { key: "paymentMethod", label: "Metode Bayar", aliases: ["PaymentMethod", "Via"] },
  { key: "childCount", label: "Jumlah Anak", aliases: ["ChildCount", "Jml Anak", "Jumlah"] },
  
  // Child 1 (Added aliases for old column names without "1")
  { key: "fullName", label: "Nama Lengkap Anak 1", aliases: ["FullName", "Nama Lengkap", "Nama Lengkap Anak"] },
  { key: "nickname", label: "Nama Panggilan 1", aliases: ["Nickname", "Panggilan", "Nama Panggilan"] },
  { key: "gender", label: "Jenis Kelamin 1", aliases: ["Gender", "JK", "Jenis Kelamin"] },
  { key: "birthYear", label: "Tahun Lahir 1", aliases: ["BirthYear", "Tahun", "Tahun Lahir"] },
  { key: "birthDate", label: "Tanggal Lahir 1", aliases: ["BirthDate", "Tgl Lahir", "Tanggal Lahir"] },
  { key: "shirtSize", label: "Ukuran Baju 1", aliases: ["ShirtSize", "Jersey", "Size", "Ukuran Baju"] },

  // Child 2 (Optional)
  { key: "fullName2", label: "Nama Lengkap Anak 2", aliases: ["FullName2"] },
  { key: "nickname2", label: "Nama Panggilan 2", aliases: ["Nickname2"] },
  { key: "gender2", label: "Jenis Kelamin 2", aliases: ["Gender2", "JK2"] },
  { key: "birthYear2", label: "Tahun Lahir 2", aliases: ["BirthYear2"] },
  { key: "birthDate2", label: "Tanggal Lahir 2", aliases: ["BirthDate2"] },
  { key: "shirtSize2", label: "Ukuran Baju 2", aliases: ["ShirtSize2"] },

  // Parents
  { key: "fatherName", label: "Nama Ayah", aliases: ["FatherName", "Ayah"] },
  { key: "motherName", label: "Nama Ibu", aliases: ["MotherName", "Ibu"] },
  { key: "addressKK", label: "Alamat KK", aliases: ["AddressKK", "KK"] },
  { key: "addressDomicile", label: "Alamat Domisili", aliases: ["AddressDomicile", "Domisili"] }
];

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("MemberData") || ss.getSheets()[0];
    var colMap = setupColumns(sheet);
    
    var params = JSON.parse(e.postData.contents);
    var action = params.action;
    var result = {};
    
    if (action == "get_all") {
      result = getAllMembers(sheet, colMap);
    } else if (action == "check_status") {
      result = handleCheckStatus(sheet, colMap, params);
    } else if (action == "confirm_payment") {
      result = handleConfirmPayment(sheet, colMap, params);
    } else if (action == "admin_approve") {
      result = handleAdminApprove(sheet, colMap, params);
    } else if (action == "submit_registration") {
      result = handleSubmitRegistration(sheet, colMap, params);
    } else if (action == "wipe_all") {
      sheet.clearContents();
      setupColumns(sheet);
      result = {success: true};
    }
    
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({error: e.toString()})).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function setupColumns(sheet) {
  var lastCol = sheet.getLastColumn();
  var headers = [];
  if (lastCol > 0) {
    headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  }
  var map = {};
  var headersChanged = false;
  
  for (var i = 0; i < FIELD_MAPPING.length; i++) {
    var field = FIELD_MAPPING[i];
    var foundIndex = -1;
    
    // 1. Check exact label
    var idx = headers.indexOf(field.label);
    if (idx > -1) {
      foundIndex = idx + 1;
    }
    
    // 2. Check aliases if label not found
    if (foundIndex === -1 && field.aliases) {
      for (var j = 0; j < field.aliases.length; j++) {
        var aliasIdx = headers.indexOf(field.aliases[j]);
        if (aliasIdx > -1) {
          foundIndex = aliasIdx + 1;
          break;
        }
      }
    }
    
    // 3. Create new if missing
    if (foundIndex === -1) {
      var newColIdx = headers.length + 1;
      sheet.getRange(1, newColIdx).setValue(field.label);
      headers.push(field.label);
      foundIndex = newColIdx;
      headersChanged = true;
    }
    map[field.key] = foundIndex;
  }
  
  if (headersChanged) sheet.getRange(1, 1, 1, sheet.getLastColumn()).setFontWeight("bold");
  return map;
}

function getAllMembers(sheet, colMap) {
  var data = sheet.getDataRange().getValues();
  var members = [];
  var waColIdx = colMap['whatsapp'] - 1;
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (row.length > waColIdx && row[waColIdx]) {
      members.push(rowToMember(row, colMap));
    }
  }
  return members;
}

function handleCheckStatus(sheet, colMap, params) {
  var wa = params.whatsapp;
  var nickname = params.nickname || "";
  var childCount = Number(params.childCount) || 1;
  var rowIndex = findRowIndex(sheet, colMap, wa);
  
  if (rowIndex == -1) {
    var randomCode = Math.floor(Math.random() * 90 + 10);
    var basePrice = childCount == 2 ? 300000 : 200000;
    var amount = basePrice + randomCode;
    var waString = "'" + wa; 
    
    var newRowIdx = sheet.getLastRow() + 1;
    sheet.getRange(newRowIdx, colMap['timestamp']).setValue(new Date());
    sheet.getRange(newRowIdx, colMap['whatsapp']).setValue(waString);
    sheet.getRange(newRowIdx, colMap['status']).setValue("NEW");
    sheet.getRange(newRowIdx, colMap['paymentAmount']).setValue(amount);
    sheet.getRange(newRowIdx, colMap['paymentCode']).setValue(randomCode);
    sheet.getRange(newRowIdx, colMap['childCount']).setValue(childCount);
    if(nickname) sheet.getRange(newRowIdx, colMap['nickname']).setValue(nickname);
    
    return getMemberAtRow(sheet, colMap, newRowIdx);
  } else {
    // Member Exists. Check if we need to update childCount/Price
    var m = getMemberAtRow(sheet, colMap, rowIndex);
    
    // Only update if status is 'NEW' and childCount is different
    if (m.status === 'NEW') {
       var currentCount = Number(m.childCount) || 1;
       if (currentCount !== childCount) {
          var basePrice = childCount == 2 ? 300000 : 200000;
          // Keep existing code if possible, or generate new
          var code = m.paymentCode || Math.floor(Math.random() * 90 + 10); 
          var newAmount = basePrice + code;
          
          sheet.getRange(rowIndex, colMap['childCount']).setValue(childCount);
          sheet.getRange(rowIndex, colMap['paymentAmount']).setValue(newAmount);
          sheet.getRange(rowIndex, colMap['paymentCode']).setValue(code); // Ensure code exists
          
          // Update the object to return
          m.childCount = childCount;
          m.paymentAmount = newAmount;
          m.paymentCode = code;
       }
       // Also update nickname if provided and different
       if (nickname && m.nickname !== nickname) {
          sheet.getRange(rowIndex, colMap['nickname']).setValue(nickname);
          m.nickname = nickname;
       }
    }
    
    return m;
  }
}

function handleConfirmPayment(sheet, colMap, params) {
  var rowIndex = findRowIndex(sheet, colMap, params.whatsapp);
  if (rowIndex == -1) throw "Member not found";
  
  sheet.getRange(rowIndex, colMap['status']).setValue("WAITING_APPROVAL");
  sheet.getRange(rowIndex, colMap['paymentMethod']).setValue(params.method);
  
  if (params.method === "CASH") {
     var currentChildCount = sheet.getRange(rowIndex, colMap['childCount']).getValue() || 1;
     var basePrice = currentChildCount == 2 ? 300000 : 200000;
     sheet.getRange(rowIndex, colMap['paymentAmount']).setValue(basePrice);
  }
  return getMemberAtRow(sheet, colMap, rowIndex);
}

function handleAdminApprove(sheet, colMap, params) {
  var rowIndex = findRowIndex(sheet, colMap, params.whatsapp);
  if (rowIndex == -1) throw "Member not found";
  sheet.getRange(rowIndex, colMap['status']).setValue("APPROVED");
  return getMemberAtRow(sheet, colMap, rowIndex);
}

function handleSubmitRegistration(sheet, colMap, params) {
  var rowIndex = findRowIndex(sheet, colMap, params.whatsapp);
  if (rowIndex == -1) throw "Member not found";
  var data = params.data;
  sheet.getRange(rowIndex, colMap['status']).setValue("REGISTERED");
  for (var key in data) {
    if (colMap[key]) {
      sheet.getRange(rowIndex, colMap[key]).setValue(data[key]);
    }
  }
  return getMemberAtRow(sheet, colMap, rowIndex);
}

function findRowIndex(sheet, colMap, wa) {
  var data = sheet.getDataRange().getValues();
  var target = normalizePhone(wa);
  var colIdx = colMap['whatsapp'] - 1;
  for (var i = 1; i < data.length; i++) {
    if (data[i].length > colIdx) {
      var rowVal = data[i][colIdx];
      if (normalizePhone(rowVal) == target && target.length > 5) return i + 1;
    }
  }
  return -1;
}

function getMemberAtRow(sheet, colMap, rowIndex) {
  var lastCol = sheet.getLastColumn();
  var maxIdx = 0;
  for(var k in colMap) { if(colMap[k] > maxIdx) maxIdx = colMap[k]; }
  var finalLastCol = Math.max(lastCol, maxIdx);
  var rowValues = sheet.getRange(rowIndex, 1, 1, finalLastCol).getValues()[0];
  return rowToMember(rowValues, colMap);
}

function rowToMember(rowArray, colMap) {
  var m = {};
  for (var key in colMap) {
    var idx = colMap[key] - 1;
    if (idx < rowArray.length) {
      var val = rowArray[idx];
      if (key === 'whatsapp') val = String(val).replace(/'/g, '');
      
      // Default childCount to 1 if empty (legacy data)
      if (key === 'childCount') {
         if (val === "" || val === null || val === undefined) val = 1;
         else val = Number(val);
      }
      
      m[key] = val;
    }
  }
  // Fallback for childCount if column didn't exist in range
  if (!m.childCount) m.childCount = 1;
  
  return m;
}

function normalizePhone(phone) {
  if (!phone) return "";
  var p = String(phone).replace(/\\D/g, ''); 
  if (p.startsWith('62')) p = p.substring(2);
  if (p.startsWith('0')) p = p.substring(1);
  return p;
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

const Header = ({ onViewChange, currentView, logoUrl }: { onViewChange: (view: 'user' | 'admin') => void, currentView: 'user' | 'admin', logoUrl: string }) => (
  <header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-20 shadow-sm">
    <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3 cursor-pointer transition hover:opacity-80" onClick={() => onViewChange('user')}>
        <img src={logoUrl} alt="Logo" className="w-10 h-10 object-contain drop-shadow-sm" />
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

const Footer = ({ logoUrl }: { logoUrl: string }) => (
  <footer className="py-8 text-center text-slate-400">
    <div className="max-w-md mx-auto px-4 flex flex-col items-center gap-3">
      <img src={logoUrl} alt="Logo" className="w-8 h-8 object-contain opacity-50 grayscale" />
      <p className="text-xs font-medium text-slate-500">
        &copy; {new Date().getFullYear()} Pushbike Kudus. All rights reserved.
      </p>
      <p className="text-[10px] text-slate-400">
        Made with <span className="text-red-400">❤</span> by Pushbike Kudus Team
      </p>
    </div>
  </footer>
);

const SizeChartModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const [imgError, setImgError] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full overflow-hidden relative animate-fade-in" onClick={e => e.stopPropagation()}>
         <div className="p-3 border-b flex justify-between items-center bg-slate-50">
            <h3 className="font-bold text-slate-800 text-sm">Panduan Ukuran (Size Chart)</h3>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 transition">
              &times;
            </button>
         </div>
         <div className="p-1 bg-slate-100 max-h-[80vh] overflow-y-auto">
            {!imgError ? (
              <img 
                src={SIZE_CHART_URL} 
                alt="Size Chart" 
                className="w-full h-auto block" 
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="p-6 text-center space-y-4">
                 <div className="text-red-500 font-bold text-sm">Gagal memuat gambar Size Chart.</div>
                 <div className="bg-white border rounded-lg p-2 text-xs text-left overflow-x-auto">
                    <table className="w-full border-collapse">
                       <thead>
                         <tr className="bg-slate-100">
                           <th className="border p-2">Size</th>
                           <th className="border p-2">Lebar Dada</th>
                           <th className="border p-2">Panjang</th>
                         </tr>
                       </thead>
                       <tbody>
                         <tr><td className="border p-2 font-bold text-center">XS</td><td className="border p-2 text-center">30 cm</td><td className="border p-2 text-center">40 cm</td></tr>
                         <tr><td className="border p-2 font-bold text-center">S</td><td className="border p-2 text-center">32 cm</td><td className="border p-2 text-center">42 cm</td></tr>
                         <tr><td className="border p-2 font-bold text-center">M</td><td className="border p-2 text-center">34 cm</td><td className="border p-2 text-center">45 cm</td></tr>
                         <tr><td className="border p-2 font-bold text-center">L</td><td className="border p-2 text-center">36 cm</td><td className="border p-2 text-center">48 cm</td></tr>
                         <tr><td className="border p-2 font-bold text-center">XL</td><td className="border p-2 text-center">38 cm</td><td className="border p-2 text-center">51 cm</td></tr>
                       </tbody>
                    </table>
                    <p className="mt-2 text-[10px] text-slate-400">* Toleransi ukuran 1-2 cm</p>
                 </div>
              </div>
            )}
         </div>
      </div>
    </div>
  );
};

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
              <li>Description: "v8".</li>
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

const AdminDashboard = ({ onConfigUpdate }: { onConfigUpdate: () => void }) => {
  const [members, setMembers] = useState<MemberData[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // Integration Settings State
  const [configUrl, setConfigUrl] = useState(SheetService.getScriptUrl());
  const [logoUrl, setLogoUrl] = useState(SheetService.getLogoUrl(DEFAULT_APP_LOGO));
  
  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [isEditingLogo, setIsEditingLogo] = useState(false);
  
  const [urlInput, setUrlInput] = useState(SheetService.getScriptUrl());
  const [logoInput, setLogoInput] = useState(SheetService.getLogoUrl(DEFAULT_APP_LOGO));

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

  const handleSaveLogo = () => {
    SheetService.setLogoUrl(logoInput);
    setLogoUrl(logoInput);
    setIsEditingLogo(false);
    onConfigUpdate(); // Update parent state
  };

  // Logic untuk membuat URL Share yang mengandung Config dan Logo
  const getShareUrl = () => {
    const baseUrl = window.location.href.split('?')[0];
    const params = new URLSearchParams();
    
    if (configUrl) {
      params.append('config', configUrl);
    }
    
    // Append logo only if it's not the default one to keep URL shorter
    if (logoUrl && logoUrl !== SheetService.DEFAULT_LOGO) {
      params.append('logo', logoUrl);
    }
    
    const queryString = params.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  };

  const copyShareLink = () => {
    if (!configUrl) return alert("Belum ada URL Google Sheet yang tersimpan.");
    navigator.clipboard.writeText(getShareUrl());
    alert("Link Integrasi berhasil disalin! Bagikan link ini ke member/device lain.");
  };

  const handleDownloadQR = () => {
    const svg = document.getElementById("qr-code-container")?.querySelector("svg");
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
      ctx.drawImage(img, padding, padding, size - (padding * 2), size - (padding * 2));
      
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

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgStr)));
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
                <div className="space-y-1 w-full">
                   {/* PACK BADGE */}
                  {m.childCount === 2 && (
                    <div className="inline-block mb-1">
                      <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded border border-purple-200">PAKET 2 ANAK</span>
                    </div>
                  )}

                  {/* NAMA PANGGILAN (Highlight Utama) */}
                  <div className="flex flex-col gap-1">
                    <div>
                        <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Anak 1</span>
                        <div className="font-bold text-xl text-slate-800 uppercase leading-none">
                        {m.nickname || "(Tanpa Nama)"}
                        </div>
                    </div>
                    {m.childCount === 2 && (
                        <div>
                            <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Anak 2</span>
                            <div className="font-bold text-xl text-slate-800 uppercase leading-none">
                            {m.nickname2 || "(Belum Diisi)"}
                            </div>
                        </div>
                    )}
                  </div>

                  {/* NOMOR WHATSAPP */}
                  <div className="flex items-center gap-1.5 text-slate-500 mt-2">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                     <span className="font-mono text-sm">{sanitizePhoneNumber(m.whatsapp)}</span>
                  </div>

                  {/* NOMINAL BAYAR */}
                  <div className="pt-2 flex justify-between items-end">
                     <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-md border text-xs ${m.paymentMethod === 'CASH' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
                        <span className="font-semibold">{m.paymentMethod === 'CASH' ? 'TUNAI' : 'TRANSFER'}</span>
                        <span className="w-px h-3 bg-current opacity-20"></span>
                        <span className="font-bold font-mono text-sm">Rp {m.paymentAmount.toLocaleString('id-ID')}</span>
                     </div>
                     
                     <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider 
                        ${m.status === UserStatus.WAITING_APPROVAL ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' : 
                        m.status === UserStatus.APPROVED ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                        m.status === UserStatus.REGISTERED ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                        {m.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>

              {m.status === UserStatus.REGISTERED && (
                 <div className="text-sm bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-3">
                    {/* Data Anak 1 */}
                    <div className="space-y-1">
                        <p className="font-bold text-slate-400 text-[10px] uppercase border-b pb-1 mb-1">Data Anak 1</p>
                        <p className="flex justify-between">
                        <span className="text-slate-500">Nama:</span>
                        <span className="font-medium text-slate-800">{m.fullName}</span>
                        </p>
                        <p className="flex justify-between">
                        <span className="text-slate-500">Lahir:</span>
                        <span className="font-medium text-slate-800">{m.birthYear} ({m.gender})</span>
                        </p>
                         <p className="flex justify-between">
                        <span className="text-slate-500">Size:</span>
                        <span className="font-medium text-slate-800">{m.shirtSize}</span>
                        </p>
                    </div>

                    {/* Data Anak 2 (If Exists) */}
                     {m.childCount === 2 && (
                        <div className="space-y-1 pt-1">
                            <p className="font-bold text-slate-400 text-[10px] uppercase border-b pb-1 mb-1">Data Anak 2</p>
                            <p className="flex justify-between">
                            <span className="text-slate-500">Nama:</span>
                            <span className="font-medium text-slate-800">{m.fullName2}</span>
                            </p>
                            <p className="flex justify-between">
                            <span className="text-slate-500">Lahir:</span>
                            <span className="font-medium text-slate-800">{m.birthYear2} ({m.gender2})</span>
                            </p>
                            <p className="flex justify-between">
                            <span className="text-slate-500">Size:</span>
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

      {/* APPEARANCE SETTINGS SECTION */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mt-8 shadow-sm">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
          <h3 className="font-bold text-slate-700 text-sm">Pengaturan Tampilan</h3>
        </div>
        
        <div className="p-4">
          {isEditingLogo ? (
            <div className="space-y-3">
               <div className="text-xs text-slate-600">
                 Masukkan URL gambar/logo (Direct Link). Bisa gunakan link dari image hosting atau Google Drive (direct link).
               </div>
               <input 
                type="text" 
                value={logoInput}
                onChange={(e) => setLogoInput(e.target.value)}
                placeholder="https://example.com/logo.png"
                className="w-full text-sm p-2 border rounded focus:ring-2 focus:ring-orange-500 outline-none transition"
               />
               <div className="flex gap-2 justify-end">
                 <button onClick={() => setIsEditingLogo(false)} className="text-slate-600 text-sm px-4 py-2 hover:bg-slate-100 rounded-lg">Batal</button>
                 <button onClick={handleSaveLogo} className="bg-orange-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-orange-700 shadow">Simpan Logo</button>
               </div>
            </div>
          ) : (
             <div className="flex items-center gap-4 p-2">
                 <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center p-1">
                    <img src={logoUrl} alt="Preview" className="w-full h-full object-contain" />
                 </div>
                 <div className="flex-1 overflow-hidden">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Logo Aplikasi</div>
                    <div className="text-sm text-slate-800 truncate">{logoUrl}</div>
                 </div>
                 <button onClick={() => { setLogoInput(logoUrl); setIsEditingLogo(true); }} className="text-xs bg-white border border-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-50 text-slate-600 font-medium">
                    Ganti
                 </button>
             </div>
          )}
        </div>
      </div>

      {/* INTEGRATION SETTINGS SECTION */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mt-6 shadow-sm">
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
            
            <div className="flex justify-center" id="qr-code-container">
               <div className="border-4 border-slate-900 p-3 rounded-xl bg-white shadow-xl">
                 <QRCode value={getShareUrl()} size={220} />
               </div>
            </div>

            <button
               onClick={handleDownloadQR}
               className="w-full bg-slate-100 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-200 transition flex items-center justify-center gap-2"
            >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
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

const StepLogin = ({ onLogin, logoUrl }: { onLogin: (wa: string, nickname: string, childCount: number) => void, logoUrl: string }) => {
  const [phone, setPhone] = useState('');
  const [nickname, setNickname] = useState('');
  const [childCount, setChildCount] = useState<number>(1);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length < 9) return alert('Nomor WhatsApp tidak valid');
    if (nickname.trim().length < 2) return alert('Nama panggilan anak pertama harus diisi');
    
    setLoading(true);
    // Sanitize input before sending
    const cleanNumber = sanitizePhoneNumber(phone);
    const cleanNick = nickname.toUpperCase(); // Force uppercase on submit
    await onLogin(cleanNumber, cleanNick, childCount);
    setLoading(false);
  };

  return (
    <div className="animate-fade-in space-y-8 py-4">
      <div className="text-center space-y-3">
        <img src={logoUrl} alt="Logo" className="w-24 h-24 object-contain mx-auto mb-4 drop-shadow-md" />
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Selamat Datang</h2>
        <p className="text-slate-500 text-sm leading-relaxed max-w-xs mx-auto">
          Silakan lengkapi data awal untuk memulai proses registrasi ulang member Pushbike Kudus.
        </p>
      </div>
      
      {/* CHILD COUNT SELECTOR */}
      <div className="bg-white p-1 rounded-xl border border-slate-200 flex shadow-sm">
         <button 
            type="button" 
            onClick={() => setChildCount(1)}
            className={`flex-1 py-3 px-2 rounded-lg text-xs font-bold transition-all ${childCount === 1 ? 'bg-orange-500 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}
         >
           1 RIDER (Rp 200rb)
         </button>
         <button 
            type="button" 
            onClick={() => setChildCount(2)}
            className={`flex-1 py-3 px-2 rounded-lg text-xs font-bold transition-all ${childCount === 2 ? 'bg-purple-600 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}
         >
           2 RIDER (Rp 300rb)
         </button>
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
          <label className="block text-sm font-semibold text-slate-700 mb-2">Nama Panggilan Anak 1</label>
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
          {loading ? 'Memproses...' : 'Lanjutkan Registrasi'}
        </button>
      </form>
    </div>
  );
};

const StepPayment = ({ member, onConfirm }: { member: MemberData, onConfirm: (method: PaymentMethod) => void }) => {
  const [method, setMethod] = useState<PaymentMethod>('TRANSFER');

  return (
    <div className="animate-fade-in space-y-6">
       <div className="text-center">
         <h2 className="text-xl font-bold text-slate-800">Pembayaran Registrasi</h2>
         <p className="text-slate-500 text-sm">
             Paket: <strong className="text-slate-800">{member.childCount === 2 ? '2 Rider' : '1 Rider'}</strong>
         </p>
       </div>

       <div className="grid grid-cols-2 gap-3">
         <button 
           onClick={() => setMethod('TRANSFER')}
           className={`p-4 rounded-xl border-2 transition-all ${method === 'TRANSFER' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'}`}
         >
           <div className="font-bold text-sm">Transfer Bank</div>
         </button>
         <button 
           onClick={() => setMethod('CASH')}
           className={`p-4 rounded-xl border-2 transition-all ${method === 'CASH' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'}`}
         >
           <div className="font-bold text-sm">Tunai (Cash)</div>
         </button>
       </div>

       {method === 'TRANSFER' ? (
         <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
           <div className="bg-yellow-50 text-yellow-800 text-xs p-3 rounded-lg border border-yellow-200">
             <strong>PENTING:</strong> Transfer HARUS SESUAI nominal hingga 2 digit terakhir agar terverifikasi otomatis.
           </div>
           <div className="text-center py-2">
             <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Total Transfer</p>
             <div className="text-3xl font-bold text-slate-900 font-mono tracking-tight">
               Rp {member.paymentAmount.toLocaleString('id-ID')}
             </div>
             <p className="text-[10px] text-slate-400 mt-1">Kode unik: {member.paymentCode}</p>
           </div>
           <div className="border-t border-dashed pt-4 space-y-2">
             <div className="flex justify-between text-sm">
               <span className="text-slate-500">Bank Tujuan</span>
               <span className="font-bold text-slate-800">{BANK_INFO.bankName}</span>
             </div>
             <div className="flex justify-between text-sm">
               <span className="text-slate-500">No. Rekening</span>
               <span className="font-bold text-slate-800 font-mono tracking-wide">{BANK_INFO.accountNumber}</span>
             </div>
             <div className="flex justify-between text-sm">
               <span className="text-slate-500">Atas Nama</span>
               <span className="font-bold text-slate-800">{BANK_INFO.accountHolder}</span>
             </div>
           </div>
         </div>
       ) : (
         <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600 mb-2">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </div>
            <p className="text-sm text-slate-600">
              Silakan serahkan uang tunai sebesar <strong>Rp {(member.childCount === 2 ? 300000 : 200000).toLocaleString('id-ID')}</strong> kepada Admin/Pengurus saat latihan.
            </p>
            <p className="text-xs text-slate-400">
              Admin akan melakukan verifikasi manual setelah uang diterima.
            </p>
         </div>
       )}

       <button
         onClick={() => onConfirm(method)}
         className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition shadow-lg"
       >
         Saya Sudah Transfer / Bayar
       </button>
    </div>
  );
};

const StepWaitingApproval = ({ onCheckStatus }: { onCheckStatus: () => void }) => {
  return (
    <div className="animate-fade-in text-center py-10 space-y-6">
       <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto animate-pulse text-yellow-600">
         <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
       </div>
       <div>
         <h2 className="text-xl font-bold text-slate-800">Menunggu Verifikasi</h2>
         <p className="text-slate-500 text-sm mt-2 max-w-xs mx-auto">
           Mohon tunggu sebentar, Admin sedang memverifikasi pembayaran Anda.
         </p>
       </div>
       <button 
         onClick={onCheckStatus}
         className="bg-white border border-slate-300 text-slate-700 font-medium py-2 px-6 rounded-full hover:bg-slate-50 transition"
       >
         Cek Status Berkala
       </button>
       <p className="text-xs text-slate-400 italic">
         Jika lama belum berubah, hubungi Admin di lapangan.
       </p>
    </div>
  );
};

const StepForm = ({ onSubmit, initialData }: { onSubmit: (data: Partial<MemberData>) => void, initialData: MemberData }) => {
  const [formData, setFormData] = useState<Partial<MemberData>>({
    fullName: initialData.fullName || '',
    nickname: initialData.nickname || '',
    gender: initialData.gender || 'BOY',
    birthYear: initialData.birthYear || BIRTH_YEARS[0],
    birthDate: initialData.birthDate || '',
    shirtSize: initialData.shirtSize || ShirtSize.S,
    
    // Child 2 Defaults
    fullName2: initialData.fullName2 || '',
    nickname2: initialData.nickname2 || '',
    gender2: initialData.gender2 || 'BOY',
    birthYear2: initialData.birthYear2 || BIRTH_YEARS[0],
    birthDate2: initialData.birthDate2 || '',
    shirtSize2: initialData.shirtSize2 || ShirtSize.S,

    fatherName: initialData.fatherName || '',
    motherName: initialData.motherName || '',
    addressKK: initialData.addressKK || '',
    addressDomicile: initialData.addressDomicile || '',
  });

  const [sameAddress, setSameAddress] = useState(false);
  const [showSizeChart, setShowSizeChart] = useState(false);

  useEffect(() => {
    if (sameAddress) {
      setFormData(prev => ({ ...prev, addressDomicile: prev.addressKK }));
    }
  }, [sameAddress, formData.addressKK]);

  const handleChange = (field: keyof MemberData, value: any) => {
    // REMOVED: Immediate toUpperCase() to prevent mobile keyboard glitches
    // Logic moved to handleSubmit
    
    // --- Sync Logic: Date Picker -> Dropdown (Child 1) ---
    if (field === 'birthDate') {
        const year = parseInt(value.split('-')[0]);
        if (!isNaN(year)) { setFormData(prev => ({ ...prev, [field]: value, birthYear: year })); return; }
    }
    // --- Sync Logic: Dropdown -> Date Picker (Child 1) ---
    if (field === 'birthYear') { setFormData(prev => ({ ...prev, [field]: value, birthDate: '' })); return; }

     // --- Sync Logic: Date Picker -> Dropdown (Child 2) ---
    if (field === 'birthDate2') {
        const year = parseInt(value.split('-')[0]);
        if (!isNaN(year)) { setFormData(prev => ({ ...prev, [field]: value, birthYear2: year })); return; }
    }
    // --- Sync Logic: Dropdown -> Date Picker (Child 2) ---
    if (field === 'birthYear2') { setFormData(prev => ({ ...prev, [field]: value, birthDate2: '' })); return; }

    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // --- FORCE UPPERCASE ON SUBMIT ---
    // This ensures data entering the spreadsheet is clean and capitalized,
    // while allowing the user to type naturally on mobile keyboards without glitches.
    const cleanData = { ...formData };
    
    // List of keys to uppercase
    const textKeys: (keyof MemberData)[] = [
      'fullName', 'nickname', 'fullName2', 'nickname2', 
      'fatherName', 'motherName', 'addressKK', 'addressDomicile'
    ];

    textKeys.forEach(key => {
      const val = cleanData[key];
      if (typeof val === 'string') {
        // @ts-ignore
        cleanData[key] = val.toUpperCase();
      }
    });

    // --- FIX: REMOVE CHILD 2 DEFAULTS IF 1 RIDER ---
    // Jika user hanya memilih 1 rider, kita hapus data default anak ke-2 
    // agar tidak ikut tersimpan ke spreadsheet.
    if (initialData.childCount === 1) {
        delete cleanData.fullName2;
        delete cleanData.nickname2;
        delete cleanData.gender2;
        delete cleanData.birthYear2;
        delete cleanData.birthDate2;
        delete cleanData.shirtSize2;
    }

    onSubmit(cleanData);
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="animate-fade-in space-y-5 pb-10">
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-slate-800">Lengkapi Data Diri</h2>
          <p className="text-slate-500 text-sm">Mohon isi data dengan benar.</p>
        </div>

        <div className="space-y-4">
          
          {/* CHILD 1 SECTION */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">ANAK 1</div>
              <h3 className="text-sm font-bold text-orange-600 uppercase tracking-wider border-b pb-2">Data Anak 1</h3>
              
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Lengkap</label>
                <input 
                  type="text" required 
                  className="uppercase w-full p-2 text-sm border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" 
                  value={formData.fullName} 
                  onChange={e => handleChange('fullName', e.target.value)} 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Panggilan</label>
                <input 
                  type="text" required 
                  className="uppercase w-full p-2 text-sm border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" 
                  value={formData.nickname} 
                  onChange={e => handleChange('nickname', e.target.value)} 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Jenis Kelamin</label>
                <div className="grid grid-cols-2 gap-3">
                     <button type="button" onClick={() => handleChange('gender', 'BOY')} className={`p-3 rounded-lg border flex items-center justify-center gap-2 transition ${formData.gender === 'BOY' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                        <span className="font-bold text-sm">BOYS</span>
                     </button>
                     <button type="button" onClick={() => handleChange('gender', 'GIRL')} className={`p-3 rounded-lg border flex items-center justify-center gap-2 transition ${formData.gender === 'GIRL' ? 'bg-pink-50 border-pink-500 text-pink-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                        <span className="font-bold text-sm">GIRLS</span>
                     </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Tahun Lahir</label>
                  <select className="w-full p-2 text-sm border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none bg-white"
                    value={formData.birthYear} onChange={e => handleChange('birthYear', Number(e.target.value))}>
                    {BIRTH_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Tanggal Lahir</label>
                <input 
                  type="date" required 
                  className="w-full p-2 text-sm border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" 
                  min={`${formData.birthYear}-01-01`} max={`${formData.birthYear}-12-31`}
                  value={formData.birthDate} 
                  onChange={e => handleChange('birthDate', e.target.value)} 
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-slate-600">Ukuran Baju</label>
                  <button type="button" onClick={() => setShowSizeChart(true)} className="text-[10px] text-blue-600 font-bold hover:underline">Lihat Size Chart</button>
                </div>
                <div className="grid grid-cols-6 gap-1">
                  {Object.values(ShirtSize).map(size => (
                    <div key={size} onClick={() => handleChange('shirtSize', size)}
                      className={`cursor-pointer text-center py-2 text-xs font-bold rounded border transition-colors ${formData.shirtSize === size ? 'bg-orange-500 text-white border-orange-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                    >{size}</div>
                  ))}
                </div>
              </div>
          </div>

          {/* CHILD 2 SECTION (CONDITIONAL) */}
          {initialData.childCount === 2 && (
             <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-purple-600 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">ANAK 2</div>
                <h3 className="text-sm font-bold text-purple-700 uppercase tracking-wider border-b pb-2">Data Anak 2</h3>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Lengkap Anak 2</label>
                  <input type="text" required className="uppercase w-full p-2 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" 
                    value={formData.fullName2} onChange={e => handleChange('fullName2', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Panggilan Anak 2</label>
                  <input type="text" required className="uppercase w-full p-2 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" 
                    value={formData.nickname2} onChange={e => handleChange('nickname2', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Jenis Kelamin</label>
                  <div className="grid grid-cols-2 gap-3">
                      <button type="button" onClick={() => handleChange('gender2', 'BOY')} className={`p-3 rounded-lg border flex items-center justify-center gap-2 transition ${formData.gender2 === 'BOY' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                          <span className="font-bold text-sm">BOYS</span>
                      </button>
                      <button type="button" onClick={() => handleChange('gender2', 'GIRL')} className={`p-3 rounded-lg border flex items-center justify-center gap-2 transition ${formData.gender2 === 'GIRL' ? 'bg-pink-50 border-pink-500 text-pink-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                          <span className="font-bold text-sm">GIRLS</span>
                      </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Tahun Lahir</label>
                    <select className="w-full p-2 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                      value={formData.birthYear2} onChange={e => handleChange('birthYear2', Number(e.target.value))}>
                      {BIRTH_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Tanggal Lahir</label>
                  <input type="date" required className="w-full p-2 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" 
                    min={`${formData.birthYear2}-01-01`} max={`${formData.birthYear2}-12-31`}
                    value={formData.birthDate2} onChange={e => handleChange('birthDate2', e.target.value)} 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Ukuran Baju</label>
                  <div className="grid grid-cols-6 gap-1">
                    {Object.values(ShirtSize).map(size => (
                      <div key={size} onClick={() => handleChange('shirtSize2', size)}
                        className={`cursor-pointer text-center py-2 text-xs font-bold rounded border transition-colors ${formData.shirtSize2 === size ? 'bg-purple-600 text-white border-purple-700' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                      >{size}</div>
                    ))}
                  </div>
                </div>
            </div>
          )}

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-orange-600 uppercase tracking-wider border-b pb-2">Data Orang Tua</h3>
              
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Ayah</label>
                <input 
                  type="text" 
                  required 
                  className="uppercase w-full p-2 text-sm border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" 
                  value={formData.fatherName} 
                  onChange={e => handleChange('fatherName', e.target.value)} 
                  autoCapitalize="characters"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Ibu</label>
                <input 
                  type="text" 
                  required 
                  className="uppercase w-full p-2 text-sm border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" 
                  value={formData.motherName} 
                  onChange={e => handleChange('motherName', e.target.value)} 
                  autoCapitalize="characters"
                />
              </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-orange-600 uppercase tracking-wider border-b pb-2">Alamat</h3>
              
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Alamat Sesuai KK</label>
                <textarea 
                  required 
                  rows={2} 
                  className="uppercase w-full p-2 text-sm border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" 
                  value={formData.addressKK} 
                  onChange={e => handleChange('addressKK', e.target.value)}
                  autoCapitalize="characters"
                ></textarea>
              </div>

              <div className="flex items-center gap-2 py-1">
                <input type="checkbox" id="sameAddr" className="rounded text-orange-500 focus:ring-orange-500" 
                  checked={sameAddress} onChange={e => setSameAddress(e.target.checked)} />
                <label htmlFor="sameAddr" className="text-xs text-slate-600 cursor-pointer">Alamat Domisili sama dengan KK</label>
              </div>

              {!sameAddress && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Alamat Domisili</label>
                  <textarea 
                    required 
                    rows={2} 
                    className="uppercase w-full p-2 text-sm border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" 
                    value={formData.addressDomicile} 
                    onChange={e => handleChange('addressDomicile', e.target.value)}
                    autoCapitalize="characters"
                  ></textarea>
                </div>
              )}
          </div>
        </div>

        <button
            type="submit"
            className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition shadow-lg shadow-slate-200"
          >
            Simpan Data Pendaftaran
          </button>
      </form>
      <SizeChartModal isOpen={showSizeChart} onClose={() => setShowSizeChart(false)} />
    </>
  );
};

const App = () => {
  const [view, setView] = useState<'user' | 'admin'>('user');
  const [member, setMember] = useState<MemberData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  
  // Use DEFAULT_APP_LOGO as fallback if localStorage is empty
  const [appLogo, setAppLogo] = useState(SheetService.getLogoUrl(DEFAULT_APP_LOGO));

  // Check URL for config
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const config = params.get('config');
    const logo = params.get('logo');
    
    if (config) {
      SheetService.setScriptUrl(config);
    }
    
    if (logo) {
      SheetService.setLogoUrl(logo);
      setAppLogo(logo);
    }
    
    if (config || logo) {
       // Clean URL
       window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleConfigUpdate = () => {
    setAppLogo(SheetService.getLogoUrl(DEFAULT_APP_LOGO));
  };

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

  const handleLogin = async (wa: string, nickname: string, childCount: number) => {
    setLoading(true);
    try {
      const data = await SheetService.checkMemberStatus(wa, nickname, childCount);
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
      const data = await SheetService.checkMemberStatus(member.whatsapp, undefined, member.childCount);
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
       <Header onViewChange={handleViewChange} currentView={view} logoUrl={appLogo} />
       
       <main className="flex-grow w-full max-w-md mx-auto p-4">
          {view === 'admin' ? (
             <AdminDashboard onConfigUpdate={handleConfigUpdate} />
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
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800">Pendaftaran Selesai!</h2>
                            <p className="text-slate-500 text-sm mt-2 max-w-xs mx-auto">
                                Terima kasih telah mendaftar ulang. Sampai jumpa di latihan berikutnya!
                            </p>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-100 max-w-sm mx-auto text-left space-y-4">
                            <div className="border-b pb-2 mb-2 flex justify-between items-center">
                                <p className="text-xs text-slate-400 uppercase tracking-wide">Member Card</p>
                                {member.childCount === 2 && <span className="bg-purple-100 text-purple-700 text-[10px] px-2 py-0.5 rounded font-bold">2 Rider</span>}
                            </div>
                            
                            {/* CHILD 1 */}
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Anak 1</p>
                                <p className="font-bold text-slate-800 text-lg uppercase">{member.nickname}</p>
                                <div className="flex gap-4 mt-1 text-sm text-slate-600">
                                   <span>Size: <strong>{member.shirtSize}</strong></span>
                                   <span>Gender: <strong>{member.gender}</strong></span>
                                </div>
                            </div>

                            {/* CHILD 2 */}
                            {member.childCount === 2 && (
                              <div className="border-t pt-3">
                                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Anak 2</p>
                                <p className="font-bold text-slate-800 text-lg uppercase">{member.nickname2}</p>
                                <div className="flex gap-4 mt-1 text-sm text-slate-600">
                                   <span>Size: <strong>{member.shirtSize2}</strong></span>
                                   <span>Gender: <strong>{member.gender2}</strong></span>
                                </div>
                              </div>
                            )}
                        </div>
                        
                        {WA_GROUP_LINK && (
                          <div className="pt-4 px-2">
                             <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-1 shadow-lg shadow-green-200 transform transition hover:scale-[1.02] cursor-pointer" onClick={() => window.open(WA_GROUP_LINK, '_blank')}>
                               <div className="bg-white rounded-xl p-4 flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                      <div className="bg-green-100 p-2 rounded-full text-green-600">
                                         <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-8.68-2.031-9.67-.272-.099-.47-.149-.643-.149-.174 0-.347 0-.496 0-.149 0-.397.05-.62.347-.223.297-.868.843-.868 2.056 0 1.213.892 2.38 1.016 2.529.124.149 1.734 2.648 4.202 3.714 2.468 1.066 2.468.71 2.914.66.446-.05 1.438-.595 1.636-1.166.198-.57.198-1.066.149-1.166z"/></svg>
                                      </div>
                                      <div>
                                         <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Langkah Terakhir</p>
                                         <p className="font-bold text-slate-800 text-sm">Gabung Grup WhatsApp</p>
                                      </div>
                                  </div>
                                  <div className="bg-green-50 text-green-700 p-2 rounded-lg">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
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
       <AdminLoginModal isOpen={showAdminLogin} onClose={() => setShowAdminLogin(false)} onSuccess={handleAdminSuccess} />
    </div>
  );
};

export default App;
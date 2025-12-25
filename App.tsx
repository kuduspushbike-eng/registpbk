import React, { useState, useEffect } from 'react';
import { MemberData, UserStatus, ShirtSize, BIRTH_YEARS } from './types';
import * as SheetService from './services/sheetService';
import GeminiChat from './components/GeminiChat';

// --- UTILS ---

// Standarisasi nomor WA agar tidak double data (selalu 08xxx)
const sanitizePhoneNumber = (phone: string): string => {
  let clean = phone.replace(/\D/g, ''); // Hapus non-angka
  if (clean.startsWith('62')) {
    clean = '0' + clean.substring(2);
  } else if (clean.startsWith('8')) {
    clean = '0' + clean;
  }
  return clean;
};

// --- Sub-components ---

const Header = ({ onViewChange, currentView }: { onViewChange: (view: 'user' | 'admin') => void, currentView: 'user' | 'admin' }) => (
  <header className="bg-white border-b sticky top-0 z-10">
    <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => onViewChange('user')}>
        <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center text-white font-bold text-xs">PK</div>
        <h1 className="font-bold text-slate-800 text-lg">Pushbike Kudus</h1>
      </div>
      <div className="flex items-center gap-2">
         {currentView === 'user' ? (
           <button onClick={() => onViewChange('admin')} className="text-xs text-slate-500 hover:text-orange-600 font-medium">
             Login Admin
           </button>
         ) : (
           <button onClick={() => onViewChange('user')} className="text-xs text-slate-500 hover:text-orange-600 font-medium">
             Mode Member
           </button>
         )}
      </div>
    </div>
  </header>
);

const AdminDashboard = () => {
  const [members, setMembers] = useState<MemberData[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // Integration Settings State
  const [configUrl, setConfigUrl] = useState(SheetService.getScriptUrl());
  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [urlInput, setUrlInput] = useState(SheetService.getScriptUrl());
  const [wiping, setWiping] = useState(false);

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
    const confirmationText = configUrl ? "Data di Google Sheet akan DIHAPUS PERMANEN." : "Data lokal akan dihapus.";
    
    if (window.confirm("PERINGATAN: Apakah Anda yakin ingin MENGHAPUS SEMUA DATA MEMBER?")) {
      if (window.confirm(`KONFIRMASI TERAKHIR: ${confirmationText} Tindakan ini tidak bisa dibatalkan.`)) {
        setWiping(true);
        try {
          await SheetService.wipeAllData();
          alert("Semua data berhasil dihapus.");
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

  return (
    <div className="animate-fade-in p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800">Admin Dashboard</h2>
        <button onClick={() => loadData(true)} className="text-sm text-orange-600 hover:underline">Refresh Data</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-10 text-slate-400 bg-white rounded-lg border border-dashed">Belum ada data member.</div>
      ) : (
        <div className="space-y-4">
          {members.map((m) => (
            <div key={m.whatsapp} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex flex-col gap-3 transition hover:shadow-md">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-mono text-lg font-bold text-slate-800 tracking-wide">
                    {sanitizePhoneNumber(m.whatsapp)}
                  </div>
                  <div className="text-xs text-slate-500">
                    Tagihan: <span className="font-medium text-slate-700">Rp {m.paymentAmount.toLocaleString('id-ID')}</span>
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
                 <div className="text-sm bg-slate-50 p-3 rounded border border-slate-100 space-y-1">
                    <p className="flex justify-between">
                      <span className="text-slate-500">Anak:</span>
                      <span className="font-medium">{m.fullName} ({m.nickname})</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-500">Lahir:</span>
                      <span>{m.birthYear}</span>
                    </p>
                 </div>
              )}

              {(m.status === UserStatus.WAITING_APPROVAL || m.status === UserStatus.NEW) && (
                <div className="pt-2 border-t mt-1">
                  <button 
                    onClick={() => handleApprove(m.whatsapp)}
                    disabled={processingId === m.whatsapp}
                    className={`w-full flex justify-center items-center py-2 px-4 rounded text-sm font-semibold transition-colors
                      ${processingId === m.whatsapp 
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed' 
                        : m.status === UserStatus.WAITING_APPROVAL 
                           ? 'bg-green-600 hover:bg-green-700 text-white shadow-sm'
                           : 'bg-white border border-green-600 text-green-700 hover:bg-green-50'
                      }`}
                  >
                    {processingId === m.whatsapp ? 'Memproses...' : (m.status === UserStatus.WAITING_APPROVAL ? 'Verifikasi Pembayaran' : 'Setujui Manual (Override)')}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* INTEGRATION SETTINGS SECTION */}
      <div className="border-t border-slate-200 pt-8 mt-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-slate-800">Pengaturan Integrasi</h3>
          <span className={`text-xs px-2 py-1 rounded font-medium ${configUrl ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
            {configUrl ? 'Mode Live (Google Sheet)' : 'Mode Demo (Offline)'}
          </span>
        </div>
        
        {isEditingConfig ? (
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
             <div className="text-xs text-slate-600">
               Paste URL Web App dari Google Apps Script Deployment di bawah ini. Pastikan akses diatur ke <strong>'Anyone'</strong>.
             </div>
             <input 
              type="text" 
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://script.google.com/macros/s/..."
              className="w-full text-sm p-2 border rounded focus:ring-1 focus:ring-orange-500 outline-none"
             />
             <div className="flex gap-2 justify-end">
               <button onClick={() => setIsEditingConfig(false)} className="text-slate-600 text-sm px-3 py-1 hover:bg-slate-200 rounded">Batal</button>
               <button onClick={handleSaveConfig} className="bg-orange-600 text-white text-sm px-3 py-1 rounded hover:bg-orange-700">Simpan Koneksi</button>
             </div>
          </div>
        ) : (
          <div className="text-sm text-slate-500 flex justify-between items-center bg-slate-50 p-3 rounded border border-slate-100">
            <span className="truncate max-w-[250px]">
              {configUrl ? configUrl : "Menggunakan database lokal (simulasi)."}
            </span>
            <button onClick={() => { setUrlInput(configUrl); setIsEditingConfig(true); }} className="text-orange-600 font-medium text-xs hover:underline">
              {configUrl ? "Ubah URL" : "Hubungkan Google Sheet"}
            </button>
          </div>
        )}
      </div>

      <div className="mt-8 border-t pt-8">
        <button onClick={handleWipeData} disabled={wiping} className="text-xs text-red-400 hover:text-red-600">
          {wiping ? 'Menghapus...' : 'Reset Database'}
        </button>
      </div>

    </div>
  );
};

const StepLogin = ({ onLogin }: { onLogin: (wa: string) => void }) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (input.length < 9) return alert('Nomor WhatsApp tidak valid');
    
    setLoading(true);
    // Sanitize input before sending
    const cleanNumber = sanitizePhoneNumber(input);
    await onLogin(cleanNumber);
    setLoading(false);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-slate-800">Selamat Datang</h2>
        <p className="text-slate-500">Silakan masukkan nomor WhatsApp untuk memulai proses registrasi ulang.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nomor WhatsApp</label>
          <input
            type="tel"
            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition"
            placeholder="08123456789"
            value={input}
            onChange={(e) => setInput(e.target.value.replace(/\D/g, ''))}
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-slate-900 text-white font-semibold py-3 rounded-lg hover:bg-slate-800 transition disabled:opacity-50"
        >
          {loading ? 'Memuat...' : 'Lanjut'}
        </button>
      </form>
    </div>
  );
};

const StepPayment = ({ member, onConfirm }: { member: MemberData, onConfirm: () => void }) => {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm();
    setLoading(false);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 text-center space-y-4">
        <h3 className="font-semibold text-orange-800">Detail Pembayaran</h3>
        <p className="text-sm text-orange-700">Silakan transfer dengan nominal TEPAT hingga 2 digit terakhir untuk verifikasi otomatis.</p>
        
        <div className="py-4">
          <div className="text-sm text-slate-500">Total Transfer</div>
          <div className="text-3xl font-mono font-bold text-slate-900 tracking-tight">
            Rp {member.paymentAmount.toLocaleString('id-ID')}
          </div>
          <div className="text-xs text-slate-400 mt-1">Kode Unik: {member.paymentCode}</div>
        </div>
        
        <div className="bg-white p-3 rounded-lg border text-sm text-slate-600">
          <p className="font-semibold">Bank BCA</p>
          <p>123 456 7890</p>
          <p>a.n Pushbike Kudus</p>
        </div>
      </div>

      <button
        onClick={handleConfirm}
        disabled={loading}
        className="w-full bg-green-600 text-white font-semibold py-3 rounded-lg hover:bg-green-700 transition disabled:opacity-50 shadow-md shadow-green-200"
      >
        {loading ? 'Memproses...' : 'Saya Sudah Transfer'}
      </button>
      <p className="text-center text-xs text-slate-400">Tidak perlu upload bukti transfer</p>
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
    <div className="animate-fade-in text-center space-y-6 py-8">
      <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto text-yellow-600 relative">
        <div className="absolute inset-0 rounded-full border-4 border-yellow-200 animate-ping opacity-25"></div>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-slate-800">Menunggu Verifikasi</h2>
        <p className="text-slate-600">
          Tim kami sedang mengecek pembayaran Anda.<br/>
          Halaman ini akan otomatis berubah setelah disetujui.
        </p>
      </div>
      <div className="flex justify-center">
        <button
          onClick={onCheckStatus}
          className="flex items-center gap-2 text-orange-600 font-medium hover:text-orange-700 text-sm bg-orange-50 px-4 py-2 rounded-full"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          Cek Status Sekarang
        </button>
      </div>
    </div>
  );
};

const StepForm = ({ onSubmit }: { onSubmit: (data: Partial<MemberData>) => void }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    nickname: '',
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
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      if (field === 'addressKK' && sameAsKK) {
        newData.addressDomicile = value;
      }
      return newData;
    });
  };

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
    <form onSubmit={handleSubmit} className="animate-fade-in space-y-6">
      <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm mb-6">
        ✅ Pembayaran telah diverifikasi. Silakan lengkapi data anak di bawah ini.
      </div>
      
      {/* SECTION: CHILD DATA */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-800 border-b pb-2">Data Diri Anak</h2>
        
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1">Nama Lengkap Anak</label>
          <input required type="text" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" 
            value={formData.fullName} onChange={e => handleChange('fullName', e.target.value)} />
        </div>
        
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1">Nama Panggilan</label>
          <input required type="text" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" 
            value={formData.nickname} onChange={e => handleChange('nickname', e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Tahun Lahir</label>
            <select required className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none bg-white"
              value={formData.birthYear} onChange={e => handleChange('birthYear', parseInt(e.target.value))}>
              <option value="">Pilih</option>
              {BIRTH_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Tanggal Lahir</label>
            <input required type="date" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
              value={formData.birthDate} onChange={e => handleChange('birthDate', e.target.value)} />
          </div>
        </div>
      </div>

      {/* SECTION: PARENT DATA */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-800 border-b pb-2 pt-2">Data Orang Tua</h2>
        <div className="grid gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Nama Ayah</label>
            <input required type="text" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
              value={formData.fatherName} onChange={e => handleChange('fatherName', e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Nama Ibu</label>
            <input required type="text" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
              value={formData.motherName} onChange={e => handleChange('motherName', e.target.value)} />
          </div>
        </div>
      </div>

      {/* SECTION: ADDRESS */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-800 border-b pb-2 pt-2">Alamat</h2>
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1">Alamat Sesuai KK</label>
          <textarea required rows={2} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
            value={formData.addressKK} onChange={e => handleChange('addressKK', e.target.value)} />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-sm font-medium text-slate-700">Alamat Domisili</label>
            <button type="button" onClick={toggleSameAddress} className="text-xs flex items-center text-orange-600 font-medium">
              <span className={`w-4 h-4 border rounded mr-1 flex items-center justify-center ${sameAsKK ? 'bg-orange-600 border-orange-600' : 'border-slate-300'}`}>
                {sameAsKK && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
              </span>
              Sama dengan KK
            </button>
          </div>
          <textarea required rows={2} className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none ${sameAsKK ? 'bg-slate-100 text-slate-500' : ''}`}
            value={formData.addressDomicile} onChange={e => handleChange('addressDomicile', e.target.value)} readOnly={sameAsKK} />
        </div>
      </div>

      {/* SECTION: ATTRIBUTES */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-800 border-b pb-2 pt-2">Atribut</h2>
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1">Ukuran Jersey</label>
          <div className="flex flex-wrap gap-2">
            {Object.values(ShirtSize).map(size => (
              <button
                key={size}
                type="button"
                onClick={() => handleChange('shirtSize', size)}
                className={`px-4 py-2 rounded-md border text-sm font-medium transition ${formData.shirtSize === size ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
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
        className="w-full mt-6 bg-slate-900 text-white font-semibold py-4 rounded-lg hover:bg-slate-800 transition disabled:opacity-50 shadow-lg"
      >
        {loading ? 'Menyimpan...' : 'Simpan Data'}
      </button>
    </form>
  );
};

const StepSuccess = () => (
  <div className="animate-fade-in text-center space-y-6 py-10">
    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600 animate-bounce">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    </div>
    <div>
      <h2 className="text-2xl font-bold text-slate-800">Registrasi Berhasil!</h2>
      <p className="text-slate-600 mt-2">Data Anda telah tersimpan di sistem kami.</p>
    </div>
    <div className="p-4 bg-slate-50 rounded-lg text-sm text-slate-500">
      Terima kasih telah melakukan daftar ulang. Sampai jumpa di latihan berikutnya!
    </div>
  </div>
);

// --- Main App ---

export default function App() {
  const [viewMode, setViewMode] = useState<'user' | 'admin'>('user');
  const [member, setMember] = useState<MemberData | null>(null);

  const handleLogin = async (wa: string) => {
    try {
      const data = await SheetService.checkMemberStatus(wa);
      setMember(data);
    } catch (error) {
      console.error(error);
      // Don't alert on background polling unless it's a hard failure
    }
  };

  const handlePaymentConfirm = async () => {
    if (!member) return;
    try {
      const updated = await SheetService.confirmPayment(member.whatsapp);
      setMember(updated);
    } catch (error) {
      console.error(error);
      alert("Gagal melakukan konfirmasi. Silakan coba lagi.");
    }
  };

  const handleSubmitForm = async (data: Partial<MemberData>) => {
    if (!member) return;
    try {
      const updated = await SheetService.submitRegistration(member.whatsapp, data);
      setMember(updated);
    } catch (error) {
      console.error(error);
      alert("Gagal menyimpan data. Silakan coba lagi.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      <Header currentView={viewMode} onViewChange={setViewMode} />
      
      <main className="max-w-md mx-auto p-4 mt-6">
        {viewMode === 'admin' ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
            <AdminDashboard />
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            {!member && (
              <StepLogin onLogin={handleLogin} />
            )}

            {member && member.status === UserStatus.NEW && (
              <StepPayment member={member} onConfirm={handlePaymentConfirm} />
            )}

            {member && member.status === UserStatus.WAITING_APPROVAL && (
               <div className="relative">
                  <StepWaitingApproval onCheckStatus={() => handleLogin(member.whatsapp)} />
               </div>
            )}

            {member && member.status === UserStatus.APPROVED && (
              <StepForm onSubmit={handleSubmitForm} />
            )}

            {member && member.status === UserStatus.REGISTERED && (
              <StepSuccess />
            )}
          </div>
        )}
      </main>

      {viewMode === 'user' && <GeminiChat />}
    </div>
  );
}
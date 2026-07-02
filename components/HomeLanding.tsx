import React from "react";
import { ENABLE_RACE_KOLEKTIF } from "../config";

const HomeLanding = ({ onViewChange }: { onViewChange: (view: "user" | "kolektif") => void }) => {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 space-y-8 animate-fade-in">
      <div className="text-center space-y-2 mb-4">
        <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Menu Utama</h2>
        <p className="text-slate-500 max-w-sm mx-auto text-sm">Silakan pilih jenis layanan yang Anda butuhkan di bawah ini.</p>
      </div>
      
      <div className="grid grid-cols-1 gap-5 w-full max-w-md mx-auto">
        <button 
          onClick={() => onViewChange('user')}
          className="flex items-center p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-400 hover:ring-2 hover:ring-blue-100 transition-all group text-left"
        >
          <div className="bg-blue-50 p-4 rounded-xl text-blue-600 mr-5 group-hover:bg-blue-100 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          </div>
          <div>
             <span className="block font-bold text-slate-800 text-lg group-hover:text-blue-600 transition-colors">Registrasi Member</span>
             <span className="block text-xs text-slate-500 mt-1">Daftar ulang member / Member baru</span>
          </div>
        </button>
        
        {ENABLE_RACE_KOLEKTIF && (
          <button 
            onClick={() => onViewChange('kolektif')}
            className="flex items-center p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:border-orange-400 hover:ring-2 hover:ring-orange-100 transition-all group text-left"
          >
            <div className="bg-orange-50 p-4 rounded-xl text-orange-600 mr-5 group-hover:bg-orange-100 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </div>
            <div>
               <span className="block font-bold text-slate-800 text-lg group-hover:text-orange-600 transition-colors">Daftar Kolektif Race</span>
               <span className="block text-xs text-slate-500 mt-1">Pendaftaran event race secara kolektif</span>
            </div>
          </button>
        )}
      </div>
    </div>
  );
};
export default HomeLanding;

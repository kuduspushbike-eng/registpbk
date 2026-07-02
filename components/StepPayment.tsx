import React, { useState } from "react";
import { MemberData } from "../types";
import { BANK_INFO } from "../config";

const StepPayment = ({
  member,
  onConfirm,
}: {
  member: MemberData;
  onConfirm: (method: PaymentMethod) => void;
}) => {
  const [method, setMethod] = useState<PaymentMethod>("TRANSFER");

  return (
    <div className="animate-fade-in space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-slate-800">
          Pembayaran Registrasi
        </h2>
        <p className="text-slate-500 text-sm">
          Paket:{" "}
          <strong className="text-slate-800">
            {member.childCount === 2 ? "2 Rider" : "1 Rider"}
          </strong>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setMethod("TRANSFER")}
          className={`p-4 rounded-xl border-2 transition-all ${method === "TRANSFER" ? "border-orange-500 bg-orange-50 text-orange-700" : "border-slate-100 bg-white text-slate-500 hover:border-slate-200"}`}
        >
          <div className="font-bold text-sm">Transfer Bank</div>
        </button>
        <button
          onClick={() => setMethod("CASH")}
          className={`p-4 rounded-xl border-2 transition-all ${method === "CASH" ? "border-orange-500 bg-orange-50 text-orange-700" : "border-slate-100 bg-white text-slate-500 hover:border-slate-200"}`}
        >
          <div className="font-bold text-sm">Tunai (Cash)</div>
        </button>
      </div>

      {method === "TRANSFER" ? (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
          <div className="bg-yellow-50 text-yellow-800 text-xs p-3 rounded-lg border border-yellow-200">
            <strong>PENTING:</strong> Transfer HARUS SESUAI nominal hingga 2
            digit terakhir agar terverifikasi otomatis.
          </div>
          <div className="text-center py-2">
            <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">
              Total Transfer
            </p>
            <div className="text-3xl font-bold text-slate-900 font-mono tracking-tight">
              Rp {member.paymentAmount.toLocaleString("id-ID")}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Kode unik: {member.paymentCode}
            </p>
          </div>
          <div className="border-t border-dashed pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Bank Tujuan</span>
              <span className="font-bold text-slate-800">
                {BANK_INFO.bankName}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">No. Rekening</span>
              <span className="font-bold text-slate-800 font-mono tracking-wide">
                {BANK_INFO.accountNumber}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Atas Nama</span>
              <span className="font-bold text-slate-800">
                {BANK_INFO.accountHolder}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600 mb-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <p className="text-sm text-slate-600">
            Silakan serahkan uang tunai sebesar{" "}
            <strong>
              Rp{" "}
              {(member.childCount === 2 ? 200000 : 100000).toLocaleString(
                "id-ID",
              )}
            </strong>{" "}
            kepada Admin/Pengurus saat latihan.
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
export default StepPayment;

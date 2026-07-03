import React, { useState } from "react";
import { MemberData } from "../types";

const StepWaitingApproval = ({
  member,
  onCheckStatus,
}: {
  member: MemberData;
  onCheckStatus: () => void;
}) => {
  return (
    <div className="animate-fade-in text-center py-10 space-y-6">
      <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto animate-pulse text-yellow-600">
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
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <div>
        <h2 className="text-xl font-bold text-slate-800">
          Menunggu Verifikasi
        </h2>
        <p className="text-slate-500 text-sm mt-2 max-w-xs mx-auto">
          {member.paymentMethod === "KLAIM_MEMBER_LAMA" 
  ? "Admin sedang memverifikasi klaim Member Lama Anda. Mohon ditunggu." 
  : "Mohon tunggu sebentar, Admin sedang memverifikasi pembayaran Anda."}
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
export default StepWaitingApproval;

import React, { useState } from "react";
import { RaceCategory, RaceShirtSize, RaceKolektifData } from "../types";

interface Props {
  onSubmit: (data: RaceKolektifData) => Promise<void>;
  isLoading: boolean;
  onCancel: () => void;
}

export default function RaceKolektifForm({
  onSubmit,
  isLoading,
  onCancel,
}: Props) {
  const [formData, setFormData] = useState<Partial<RaceKolektifData>>({
    community: "PUSHBIKE KUDUS",
  });
  const [error, setError] = useState<string>("");

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "kkAktaFile" | "buktiTransferFile",
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("Ukuran file maksimal 5MB");
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setFormData((prev) => ({ ...prev, [field]: base64 }));
        setError("");
      };
      reader.onerror = () => {
        setError("Gagal membaca file");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.category ||
      !formData.riderName ||
      !formData.teamName ||
      !formData.community ||
      !formData.shirtSize ||
      !formData.startNumber ||
      !formData.bornDate ||
      !formData.kkAktaFile ||
      !formData.buktiTransferFile
    ) {
      setError("Mohon lengkapi semua data dan upload file.");
      return;
    }

    await onSubmit(formData as RaceKolektifData);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-slate-100 max-w-2xl mx-auto mt-6">
      <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            Daftar Kolektif Race
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Isi formulir pendaftaran race secara kolektif.
          </p>
        </div>
        <button
          onClick={onCancel}
          className="text-slate-400 hover:text-slate-600 transition-colors"
          type="button"
        >
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
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 text-red-700 p-4 rounded-xl text-sm flex items-start">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-2 shrink-0 mt-0.5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Kategori <span className="text-red-500">*</span>
            </label>
            <select
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-slate-50"
              value={formData.category || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  category: e.target.value as RaceCategory,
                })
              }
            >
              <option value="" disabled>
                Pilih Kategori
              </option>
              {Object.values(RaceCategory).map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nama Rider <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-slate-50 uppercase"
              placeholder="Nama lengkap rider"
              value={formData.riderName || ""}
              onChange={(e) =>
                setFormData({ ...formData, riderName: e.target.value.toUpperCase() })
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nama Tim <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-slate-50 uppercase"
              placeholder="Nama Tim"
              value={formData.teamName || ""}
              onChange={(e) =>
                setFormData({ ...formData, teamName: e.target.value.toUpperCase() })
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Komunitas <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-slate-50 uppercase"
              placeholder="Asal komunitas"
              value={formData.community || ""}
              onChange={(e) =>
                setFormData({ ...formData, community: e.target.value.toUpperCase() })
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nomor Start <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-slate-50 uppercase"
              placeholder="Contoh: 99"
              value={formData.startNumber || ""}
              onChange={(e) =>
                setFormData({ ...formData, startNumber: e.target.value.toUpperCase() })
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Tanggal Lahir <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-slate-50"
              value={formData.bornDate || ""}
              onChange={(e) =>
                setFormData({ ...formData, bornDate: e.target.value })
              }
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Ukuran Baju <span className="text-red-500">*</span>
            </label>
            <select
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-slate-50"
              value={formData.shirtSize || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  shirtSize: e.target.value as RaceShirtSize,
                })
              }
            >
              <option value="" disabled>
                Pilih Ukuran Baju
              </option>
              {Object.values(RaceShirtSize).map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
          <div className="border border-slate-200 p-4 rounded-xl bg-slate-50">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Upload KK / Akta <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              accept="image/*,.pdf"
              required
              onChange={(e) => handleFileChange(e, "kkAktaFile")}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {formData.kkAktaFile && (
              <p className="text-xs text-emerald-600 mt-2">
                ✓ File KK/Akta siap diupload
              </p>
            )}
          </div>

          <div className="border border-slate-200 p-4 rounded-xl bg-slate-50">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Upload Bukti Transfer <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              accept="image/*,.pdf"
              required
              onChange={(e) => handleFileChange(e, "buktiTransferFile")}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {formData.buktiTransferFile && (
              <p className="text-xs text-emerald-600 mt-2">
                ✓ File Bukti Transfer siap diupload
              </p>
            )}
          </div>
        </div>

        <div className="pt-4 mt-6 border-t border-slate-100">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3.5 px-4 rounded-xl transition-colors shadow-sm disabled:opacity-70 flex justify-center items-center"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Memproses Pendaftaran...
              </>
            ) : (
              "Kirim Pendaftaran Kolektif"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

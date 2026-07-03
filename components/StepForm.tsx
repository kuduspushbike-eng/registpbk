import React, { useState, useEffect } from "react";
import { MemberData, ShirtSize, BIRTH_YEARS } from "../types";
import { SIZE_CHART_URL, MONTHS } from "../config";
import { SizeChartModal } from "./SizeChartModal";

const StepForm = ({
  onSubmit,
  initialData,
}: {
  onSubmit: (data: Partial<MemberData>) => void;
  initialData: MemberData;
}) => {
  const [formData, setFormData] = useState<Partial<MemberData>>({
    fullName: initialData.fullName || "",
    nickname: initialData.nickname || "",
    gender: initialData.gender || "BOY",
    birthYear: initialData.birthYear || BIRTH_YEARS[0],
    birthDate: initialData.birthDate || "",
    shirtSize: initialData.shirtSize || ShirtSize.S,

    // Child 2 Defaults
    fullName2: initialData.fullName2 || "",
    nickname2: initialData.nickname2 || "",
    gender2: initialData.gender2 || "BOY",
    birthYear2: initialData.birthYear2 || BIRTH_YEARS[0],
    birthDate2: initialData.birthDate2 || "",
    shirtSize2: initialData.shirtSize2 || ShirtSize.S,

    fatherName: initialData.fatherName || "",
    motherName: initialData.motherName || "",
    addressKK: initialData.addressKK || "",
    addressDomicile: initialData.addressDomicile || "",
  });

  const isOldMember =
    initialData.paymentMethod === "MEMBER_LAMA" ||
    initialData.paymentMethod === "KLAIM_MEMBER_LAMA";

  const [sameAddress, setSameAddress] = useState(false);
  const [showSizeChart, setShowSizeChart] = useState(false);

  useEffect(() => {
    if (sameAddress) {
      setFormData((prev) => ({ ...prev, addressDomicile: prev.addressKK }));
    }
  }, [sameAddress, formData.addressKK]);

  const handleChange = (field: keyof MemberData, value: any) => {
    // REMOVED: Immediate toUpperCase() to prevent mobile keyboard glitches
    // Logic moved to handleSubmit

    // --- Sync Logic: Date Picker -> Dropdown (Child 1) ---
    if (field === "birthDate") {
      const year = parseInt(value.split("-")[0]);
      if (!isNaN(year)) {
        setFormData((prev) => ({ ...prev, [field]: value, birthYear: year }));
        return;
      }
    }
    // --- Sync Logic: Dropdown -> Date Picker (Child 1) ---
    if (field === "birthYear") {
      setFormData((prev) => ({ ...prev, [field]: value, birthDate: "" }));
      return;
    }

    // --- Sync Logic: Date Picker -> Dropdown (Child 2) ---
    if (field === "birthDate2") {
      const year = parseInt(value.split("-")[0]);
      if (!isNaN(year)) {
        setFormData((prev) => ({ ...prev, [field]: value, birthYear2: year }));
        return;
      }
    }
    // --- Sync Logic: Dropdown -> Date Picker (Child 2) ---
    if (field === "birthYear2") {
      setFormData((prev) => ({ ...prev, [field]: value, birthDate2: "" }));
      return;
    }

    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // --- VALIDASI MANUAL (EXTRA SAFETY) ---
    // Memastikan field tidak kosong dan tidak hanya berisi spasi
    const missingFields: string[] = [];

    // Anak 1
    if (!formData.fullName?.trim()) missingFields.push("Nama Lengkap Anak 1");
    if (!formData.nickname?.trim()) missingFields.push("Nama Panggilan Anak 1");
    if (!formData.birthDate) missingFields.push("Tanggal Lahir Anak 1");

    // Anak 2 (Jika Paket 2 Anak)
    if (initialData.childCount === 2) {
      if (!formData.fullName2?.trim())
        missingFields.push("Nama Lengkap Anak 2");
      if (!formData.nickname2?.trim())
        missingFields.push("Nama Panggilan Anak 2");
      if (!formData.birthDate2) missingFields.push("Tanggal Lahir Anak 2");
    }

    // Orang Tua
    if (!formData.fatherName?.trim()) missingFields.push("Nama Ayah");
    if (!formData.motherName?.trim()) missingFields.push("Nama Ibu");

    // Alamat
    if (!formData.addressKK?.trim()) missingFields.push("Alamat KK");
    if (!sameAddress && !formData.addressDomicile?.trim())
      missingFields.push("Alamat Domisili");

    if (missingFields.length > 0) {
      alert(`Mohon lengkapi data berikut:\n\n- ${missingFields.join("\n- ")}`);
      return;
    }

    // --- FORCE UPPERCASE ON SUBMIT ---
    // This ensures data entering the spreadsheet is clean and capitalized,
    // while allowing the user to type naturally on mobile keyboards without glitches.
    const cleanData = { ...formData };

    // List of keys to uppercase
    const textKeys: (keyof MemberData)[] = [
      "fullName",
      "nickname",
      "fullName2",
      "nickname2",
      "fatherName",
      "motherName",
      "addressKK",
      "addressDomicile",
    ];

    textKeys.forEach((key) => {
      const val = cleanData[key];
      if (typeof val === "string") {
        // @ts-ignore
        cleanData[key] = val.toUpperCase();
      }
    });

    if (isOldMember) {
      // @ts-ignore
      cleanData.shirtSize = "-";
      if (initialData.childCount === 2) {
        // @ts-ignore
        cleanData.shirtSize2 = "-";
      }
    }

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
          <h2 className="text-xl font-bold text-slate-800">
            Lengkapi Data Diri
          </h2>
          <p className="text-slate-500 text-sm">Mohon isi data dengan benar.</p>
        </div>

        <div className="space-y-4">
          {/* CHILD 1 SECTION */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">
              ANAK 1
            </div>
            <h3 className="text-sm font-bold text-orange-600 uppercase tracking-wider border-b pb-2">
              Data Anak 1
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Nama Lengkap
              </label>
              <input
                type="text"
                required
                className="uppercase w-full p-2 text-sm border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                value={formData.fullName}
                onChange={(e) => handleChange("fullName", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Nama Panggilan
              </label>
              <input
                type="text"
                required
                className="uppercase w-full p-2 text-sm border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                value={formData.nickname}
                onChange={(e) => handleChange("nickname", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Jenis Kelamin
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleChange("gender", "BOY")}
                  className={`p-3 rounded-lg border flex items-center justify-center gap-2 transition ${formData.gender === "BOY" ? "bg-blue-50 border-blue-500 text-blue-700" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"}`}
                >
                  <span className="font-bold text-sm">BOYS</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleChange("gender", "GIRL")}
                  className={`p-3 rounded-lg border flex items-center justify-center gap-2 transition ${formData.gender === "GIRL" ? "bg-pink-50 border-pink-500 text-pink-700" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"}`}
                >
                  <span className="font-bold text-sm">GIRLS</span>
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Tahun Lahir
                </label>
                <select
                  className="w-full p-2 text-sm border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none bg-white"
                  value={formData.birthYear}
                  onChange={(e) =>
                    handleChange("birthYear", Number(e.target.value))
                  }
                >
                  {BIRTH_YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Tanggal Lahir
              </label>
              <input
                type="date"
                required
                className="w-full p-2 text-sm border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                min={`${formData.birthYear}-01-01`}
                max={`${formData.birthYear}-12-31`}
                value={formData.birthDate}
                onChange={(e) => handleChange("birthDate", e.target.value)}
              />
            </div>
            {!isOldMember && (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-slate-600">
                    Ukuran Baju
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowSizeChart(true)}
                    className="text-[10px] text-blue-600 font-bold hover:underline"
                  >
                    Lihat Size Chart
                  </button>
                </div>
                <div className="grid grid-cols-6 gap-1">
                  {Object.values(ShirtSize).map((size) => (
                    <div
                      key={size}
                      onClick={() => handleChange("shirtSize", size)}
                      className={`cursor-pointer text-center py-2 text-xs font-bold rounded border transition-colors ${formData.shirtSize === size ? "bg-orange-500 text-white border-orange-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
                    >
                      {size}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* CHILD 2 SECTION (CONDITIONAL) */}
          {initialData.childCount === 2 && (
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-purple-600 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                ANAK 2
              </div>
              <h3 className="text-sm font-bold text-purple-700 uppercase tracking-wider border-b pb-2">
                Data Anak 2
              </h3>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Nama Lengkap Anak 2
                </label>
                <input
                  type="text"
                  required
                  className="uppercase w-full p-2 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  value={formData.fullName2}
                  onChange={(e) => handleChange("fullName2", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Nama Panggilan Anak 2
                </label>
                <input
                  type="text"
                  required
                  className="uppercase w-full p-2 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  value={formData.nickname2}
                  onChange={(e) => handleChange("nickname2", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Jenis Kelamin
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleChange("gender2", "BOY")}
                    className={`p-3 rounded-lg border flex items-center justify-center gap-2 transition ${formData.gender2 === "BOY" ? "bg-blue-50 border-blue-500 text-blue-700" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"}`}
                  >
                    <span className="font-bold text-sm">BOYS</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange("gender2", "GIRL")}
                    className={`p-3 rounded-lg border flex items-center justify-center gap-2 transition ${formData.gender2 === "GIRL" ? "bg-pink-50 border-pink-500 text-pink-700" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"}`}
                  >
                    <span className="font-bold text-sm">GIRLS</span>
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Tahun Lahir
                  </label>
                  <select
                    className="w-full p-2 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                    value={formData.birthYear2}
                    onChange={(e) =>
                      handleChange("birthYear2", Number(e.target.value))
                    }
                  >
                    {BIRTH_YEARS.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Tanggal Lahir
                </label>
                <input
                  type="date"
                  required
                  className="w-full p-2 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  min={`${formData.birthYear2}-01-01`}
                  max={`${formData.birthYear2}-12-31`}
                  value={formData.birthDate2}
                  onChange={(e) => handleChange("birthDate2", e.target.value)}
                />
              </div>
              {!isOldMember && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Ukuran Baju
                  </label>
                  <div className="grid grid-cols-6 gap-1">
                    {Object.values(ShirtSize).map((size) => (
                      <div
                        key={size}
                        onClick={() => handleChange("shirtSize2", size)}
                        className={`cursor-pointer text-center py-2 text-xs font-bold rounded border transition-colors ${formData.shirtSize2 === size ? "bg-purple-600 text-white border-purple-700" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
                      >
                        {size}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-orange-600 uppercase tracking-wider border-b pb-2">
              Data Orang Tua
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Nama Ayah
              </label>
              <input
                type="text"
                required
                className="uppercase w-full p-2 text-sm border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                value={formData.fatherName}
                onChange={(e) => handleChange("fatherName", e.target.value)}
                autoCapitalize="characters"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Nama Ibu
              </label>
              <input
                type="text"
                required
                className="uppercase w-full p-2 text-sm border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                value={formData.motherName}
                onChange={(e) => handleChange("motherName", e.target.value)}
                autoCapitalize="characters"
              />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-orange-600 uppercase tracking-wider border-b pb-2">
              Alamat
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Alamat Sesuai KK
              </label>
              <textarea
                required
                rows={2}
                className="uppercase w-full p-2 text-sm border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                value={formData.addressKK}
                onChange={(e) => handleChange("addressKK", e.target.value)}
                autoCapitalize="characters"
              ></textarea>
            </div>

            <div className="flex items-center gap-2 py-1">
              <input
                type="checkbox"
                id="sameAddr"
                className="rounded text-orange-500 focus:ring-orange-500"
                checked={sameAddress}
                onChange={(e) => setSameAddress(e.target.checked)}
              />
              <label
                htmlFor="sameAddr"
                className="text-xs text-slate-600 cursor-pointer"
              >
                Alamat Domisili sama dengan KK
              </label>
            </div>

            {!sameAddress && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Alamat Domisili
                </label>
                <textarea
                  required
                  rows={2}
                  className="uppercase w-full p-2 text-sm border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  value={formData.addressDomicile}
                  onChange={(e) =>
                    handleChange("addressDomicile", e.target.value)
                  }
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
      <SizeChartModal
        isOpen={showSizeChart}
        onClose={() => setShowSizeChart(false)}
      />
    </>
  );
};
export default StepForm;

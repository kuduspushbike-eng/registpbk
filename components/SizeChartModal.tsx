import React, { useState } from "react";
import { SIZE_CHART_URL } from "../config";

export const SizeChartModal = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const [imgError, setImgError] = useState(false);
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-2xl max-w-lg w-full overflow-hidden relative animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-3 border-b flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-800 text-sm">
            Panduan Ukuran (Size Chart)
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 transition"
          >
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
              <div className="text-red-500 font-bold text-sm">
                Gagal memuat gambar Size Chart.
              </div>
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
                    <tr>
                      <td className="border p-2 font-bold text-center">XS</td>
                      <td className="border p-2 text-center">30 cm</td>
                      <td className="border p-2 text-center">40 cm</td>
                    </tr>
                    <tr>
                      <td className="border p-2 font-bold text-center">S</td>
                      <td className="border p-2 text-center">32 cm</td>
                      <td className="border p-2 text-center">42 cm</td>
                    </tr>
                    <tr>
                      <td className="border p-2 font-bold text-center">M</td>
                      <td className="border p-2 text-center">34 cm</td>
                      <td className="border p-2 text-center">45 cm</td>
                    </tr>
                    <tr>
                      <td className="border p-2 font-bold text-center">L</td>
                      <td className="border p-2 text-center">36 cm</td>
                      <td className="border p-2 text-center">48 cm</td>
                    </tr>
                    <tr>
                      <td className="border p-2 font-bold text-center">XL</td>
                      <td className="border p-2 text-center">38 cm</td>
                      <td className="border p-2 text-center">51 cm</td>
                    </tr>
                  </tbody>
                </table>
                <p className="mt-2 text-[10px] text-slate-400">
                  * Toleransi ukuran 1-2 cm
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

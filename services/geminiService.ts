import { GoogleGenAI } from "@google/genai";

// NOTE: In a real production app, ensure API keys are secured or proxied.
const API_KEY = process.env.API_KEY || ''; 

let ai: GoogleGenAI | null = null;

try {
  if (API_KEY) {
    ai = new GoogleGenAI({ apiKey: API_KEY });
  }
} catch (error) {
  console.error("Failed to initialize Gemini Client", error);
}

export const askGeminiAssistant = async (question: string): Promise<string> => {
  if (!ai) return "Maaf, asisten AI sedang tidak aktif (API Key missing).";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: question,
      config: {
        systemInstruction: `Anda adalah asisten virtual ramah untuk 'Pushbike Kudus'. 
        Tugas anda membantu orang tua mendaftarkan anak mereka.
        
        Informasi penting:
        - Biaya registrasi: Rp 200.000 + kode unik (2 digit) atau tunai saat latihan.
        - Tahun kelahiran yang diterima: 2017 sampai 2024.
        - Data yang dibutuhkan: Nama anak, nama panggilan, tanggal lahir, nama ayah, nama ibu, alamat KK dan domisili, serta ukuran baju.
        - Ukuran baju tersedia: XS, S, M, L, XL.
        - Alamat domisili bisa disamakan dengan KK.
        - Setelah transfer, tidak perlu upload bukti, cukup klik konfirmasi.
        - Tunggu admin approve baru bisa isi formulir.
        
        Jawablah dengan singkat, sopan, dan menyemangati. Gunakan Bahasa Indonesia.`,
      },
    });
    return response.text || "Maaf, saya tidak mengerti.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Maaf, terjadi kesalahan pada sistem AI.";
  }
};
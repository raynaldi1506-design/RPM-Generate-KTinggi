
import { GoogleGenAI, Type } from "@google/genai";
import { RPMFormData, GeneratedRPMContent } from "../types";

export const getAITopics = async (subject: string, grade: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Sebagai pakar Kurikulum Merdeka Indonesia, berikan daftar 10 topik materi pelajaran yang PALING AKURAT dan SESUAI dengan buku teks utama Kemendikbudristek untuk SEMESTER 2 (GENAP) TAHUN 2025:
    Mata Pelajaran: ${subject}
    Jenjang: SD
    Kelas: ${grade}
    
    Ketentuan:
    1. Materi harus spesifik untuk Semester 2 (Bab-bab akhir buku).
    2. Contoh: Jika Matematika Kelas 4, fokus pada Luas & Volume, Bangun Datar, atau Penyajian Data.
    3. Jika IPAS Kelas 5, fokus pada Ekosistem, Magnet, Listrik, atau Warisan Budaya.
    4. Output harus berupa JSON array of strings berisi judul topik yang profesional.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    }
  });

  try {
    return JSON.parse(response.text || '[]');
  } catch (e) {
    return [];
  }
};

export const pregenerateCPandTP = async (subject: string, material: string, grade: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Sebagai pakar Kurikulum Merdeka Indonesia versi 2025, buatkan detail berikut:
    Mata Pelajaran: ${subject}
    Materi: ${material}
    Kelas: ${grade} SD (Semester 2)
    
    1. Capaian Pembelajaran (CP) sesuai regulasi Kemdikbudristek No. 12 Tahun 2024 yang relevan dengan topik ini.
    2. Minimal 3 Tujuan Pembelajaran (TP) yang logis dan operasional.
    3. Daftar Dimensi Profil Pelajar Pancasila (Pilih: Keimanan & Ketakwaan, Kewargaan, Penalaran Kritis, Kreativitas, Kolaborasi, Kemandirian, Kesehatan, Komunikasi).
    4. Saran jumlah pertemuan ideal untuk menuntaskan materi ini.
    5. Saran Praktik Pedagogis utama (PjBL, Discovery, dll).

    Output dalam format JSON.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          cp: { type: Type.STRING },
          tp: { type: Type.ARRAY, items: { type: Type.STRING } },
          dimensions: { type: Type.ARRAY, items: { type: Type.STRING } },
          suggestedMeetings: { type: Type.INTEGER },
          suggestedPedagogy: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["cp", "tp", "dimensions", "suggestedMeetings", "suggestedPedagogy"]
      }
    }
  });

  return JSON.parse(response.text || '{}');
};

export const generateRPMContent = async (formData: RPMFormData): Promise<GeneratedRPMContent> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
    Buatkan konten otomatis untuk Rencana Pembelajaran Mendalam (RPM) SD Semester 2 Kurikulum Merdeka 2025:
    - Mata Pelajaran: ${formData.subject}
    - Kelas: ${formData.grade}
    - Materi Pokok: ${formData.material}
    - CP: ${formData.cp}
    - TP: ${formData.tp}
    - Praktik Pedagogis: ${formData.pedagogy.join(", ")}
    - Dimensi Lulusan: ${formData.dimensions.join(", ")}
    - Jumlah Pertemuan: ${formData.meetingCount}
    
    Instruksi Khusus untuk ${formData.meetingCount} Pertemuan:
    Setiap pertemuan HARUS berbeda aktivitasnya namun berkesinambungan. 
    Misal Pertemuan 1 fokus Membangun Pemahaman, Pertemuan 2 fokus Aplikasi/Proyek, Pertemuan 3 fokus Evaluasi/Refleksi.

    Persyaratan Output JSON:
    1. students: Profil singkat siswa SD kelas tersebut.
    2. interdisciplinary: Kaitan materi ini dengan mata pelajaran lain.
    3. partnership: Melibatkan orang tua/komunitas.
    4. environment: Penataan kelas/lingkungan yang mendukung.
    5. digitalTools: Aplikasi/media digital yang relevan.
    6. summary: Ringkasan materi yang padat dan jelas.
    7. meetings: Array berisi tepat ${formData.meetingCount} objek meeting (opening, understand, apply, reflect, closing).
    8. assessments: Detail asesmen awal, proses, dan akhir (technique, instrument, rubric).
    9. lkpd: Lembar kerja siswa yang kreatif.
    10. formativeQuestions: 10 soal pilihan ganda berkualitas tinggi.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          students: { type: Type.STRING },
          interdisciplinary: { type: Type.STRING },
          partnership: { type: Type.STRING },
          environment: { type: Type.STRING },
          digitalTools: { type: Type.STRING },
          summary: { type: Type.STRING },
          meetings: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                opening: {
                  type: Type.OBJECT,
                  properties: { steps: { type: Type.STRING }, duration: { type: Type.STRING } },
                  required: ["steps", "duration"]
                },
                understand: {
                  type: Type.OBJECT,
                  properties: { type: { type: Type.STRING }, steps: { type: Type.STRING } },
                  required: ["type", "steps"]
                },
                apply: {
                  type: Type.OBJECT,
                  properties: { type: { type: Type.STRING }, steps: { type: Type.STRING } },
                  required: ["type", "steps"]
                },
                reflect: {
                  type: Type.OBJECT,
                  properties: { type: { type: Type.STRING }, steps: { type: Type.STRING } },
                  required: ["type", "steps"]
                },
                closing: {
                  type: Type.OBJECT,
                  properties: { steps: { type: Type.STRING }, duration: { type: Type.STRING } },
                  required: ["steps", "duration"]
                }
              },
              required: ["opening", "understand", "apply", "reflect", "closing"]
            }
          },
          assessments: {
            type: Type.OBJECT,
            properties: {
              initial: {
                type: Type.OBJECT,
                properties: { technique: { type: Type.STRING }, instrument: { type: Type.STRING }, rubric: { type: Type.STRING } },
                required: ["technique", "instrument", "rubric"]
              },
              process: {
                type: Type.OBJECT,
                properties: { technique: { type: Type.STRING }, instrument: { type: Type.STRING }, rubric: { type: Type.STRING } },
                required: ["technique", "instrument", "rubric"]
              },
              final: {
                type: Type.OBJECT,
                properties: { technique: { type: Type.STRING }, instrument: { type: Type.STRING }, rubric: { type: Type.STRING } },
                required: ["technique", "instrument", "rubric"]
              }
            },
            required: ["initial", "process", "final"]
          },
          lkpd: { type: Type.STRING },
          formativeQuestions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                options: {
                  type: Type.OBJECT,
                  properties: {
                    a: { type: Type.STRING },
                    b: { type: Type.STRING },
                    c: { type: Type.STRING },
                    d: { type: Type.STRING }
                  },
                  required: ["a", "b", "c", "d"]
                },
                answer: { type: Type.STRING }
              },
              required: ["question", "options", "answer"]
            }
          }
        },
        required: ["students", "interdisciplinary", "partnership", "environment", "digitalTools", "summary", "meetings", "assessments", "lkpd", "formativeQuestions"]
      }
    }
  });

  return JSON.parse(response.text || '{}');
};

export const generateRPMImage = async (material: string): Promise<string | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Visual media for elementary students about "${material}". Clear, vibrant educational illustration. Clean style, no text.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: { aspectRatio: "16:9" }
      }
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    return `https://picsum.photos/seed/${encodeURIComponent(material)}/800/450`;
  }
};

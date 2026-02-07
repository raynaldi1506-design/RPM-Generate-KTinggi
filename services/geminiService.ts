
import { GoogleGenAI, Type } from "@google/genai";
import { RPMFormData, GeneratedRPMContent, ProtaEntry, PromesEntry, PedagogicalPractice, GraduateDimension } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getAITopics = async (subject: string, grade: string, searchQuery?: string) => {
  const ai = getAI();
  const prompt = searchQuery 
    ? `Sebagai pakar Kurikulum Merdeka Indonesia, berikan 5 judul Bab atau sub-materi yang spesifik berkaitan dengan "${searchQuery}" untuk mata pelajaran ${subject} ${grade} SD Semester 2 (Genap).
       Gunakan pedoman silabus terbaru tahun pelajaran 2025/2026.
       Format output: "Bab X: [Judul Materi]".
       Output harus berupa JSON array of strings.`
    : `Sebagai pakar Kurikulum Merdeka Indonesia, berikan daftar Bab (Chapters) yang SANGAT AKURAT dan SESUAI dengan Buku Teks Utama Kemendikbudristek/Silabus terbaru 2025/2026 untuk SEMESTER 2 (GENAP):
       Mata Pelajaran: ${subject}
       Jenjang: SD
       Kelas: ${grade}
       
       Ketentuan:
       1. Hanya berikan materi untuk Semester 2 (biasanya dimulai dari Bab pertengahan buku, misal Bab 5 atau 6).
       2. Format setiap item harus: "Bab X: [Nama Bab/Topik]".
       3. Sesuaikan dengan lingkup materi Kurikulum Merdeka untuk SD.
       4. Output harus berupa JSON array of strings.`;

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
  const ai = getAI();
  const prompt = `Sebagai pakar Kurikulum Merdeka Indonesia versi terbaru (Regulasi 2024/2025), buatkan detail berikut untuk perencanaan pembelajaran:
    Mata Pelajaran: ${subject}
    Materi: ${material}
    Kelas: ${grade} SD (Semester 2)
    
    TUGAS:
    1. Capaian Pembelajaran (CP) yang sesuai dengan Fase (A/B/C) untuk kelas tersebut berdasarkan regulasi No. 12 Tahun 2024.
    2. Minimal 3 Tujuan Pembelajaran (TP) yang logis, terukur (ABCD), dan operasional.
    3. Pilih Dimensi Profil Pelajar Pancasila yang PALING RELEVAN (maksimal 3) dari daftar ini: ${Object.values(GraduateDimension).join(", ")}.
    4. Pilih Praktik Pedagogis yang PALING COCOK dari daftar ini: ${Object.values(PedagogicalPractice).join(", ")}.
    5. Saran jumlah pertemuan yang ideal untuk menuntaskan materi ini.

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

export const generateProta = async (subject: string, grade: string): Promise<ProtaEntry[]> => {
  const ai = getAI();
  const prompt = `Sebagai pakar Kurikulum Merdeka, buatkan Program Tahunan (PROTA) lengkap untuk mata pelajaran ${subject} kelas ${grade} SD Tahun Pelajaran 2025/2026.
  
  Ketentuan:
  1. Hasilkan daftar materi yang mencakup seluruh tahun (Semester 1 dan Semester 2).
  2. Berikan alokasi Jam Pelajaran (JP) yang akurat (biasanya 2-5 JP per materi per minggu).
  3. Gunakan penomoran Bab yang benar sesuai silabus nasional.
  
  Output JSON array of objects.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            material: { type: Type.STRING },
            hours: { type: Type.INTEGER },
            semester: { type: Type.INTEGER }
          },
          required: ["material", "hours", "semester"]
        }
      }
    }
  });
  return JSON.parse(response.text || '[]');
};

export const generatePromes = async (subject: string, grade: string, semester: number): Promise<PromesEntry[]> => {
  const ai = getAI();
  const prompt = `Sebagai pakar kurikulum, buatkan tabel Program Semester (PROMES) Kurikulum Merdeka Semester 2 (Januari-Juni 2025/2026) untuk mata pelajaran ${subject} kelas ${grade} SD.
  
  Ketentuan:
  1. Daftar materi harus lengkap untuk Semester 2 saja (mulai dari Bab pertengahan buku).
  2. Alokasi JP harus logis sesuai beban jam mingguan.
  3. Pemetaan minggu harus spesifik menggunakan kode: "Jan-1", "Feb-2", "Mar-4", dst sesuai distribusi materi.

  Output JSON array of objects.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            material: { type: Type.STRING },
            hours: { type: Type.INTEGER },
            weeks: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["material", "hours", "weeks"]
        }
      }
    }
  });
  return JSON.parse(response.text || '[]');
};

export const generateRPMContent = async (formData: RPMFormData): Promise<GeneratedRPMContent> => {
  const ai = getAI();
  const prompt = `
    Buatkan konten otomatis untuk Rencana Pembelajaran Mendalam (RPM) SD Semester 2 Kurikulum Merdeka 2025/2026 yang SANGAT RINCI dan PROFESIONAL:
    - Mata Pelajaran: ${formData.subject}
    - Kelas: ${formData.grade}
    - Materi Pokok: ${formData.material}
    - CP: ${formData.cp}
    - TP: ${formData.tp}
    - Praktik Pedagogis: ${formData.pedagogy.join(", ")}
    - Profil Pelajar Pancasila: ${formData.dimensions.join(", ")}
    - Jumlah Pertemuan: ${formData.meetingCount}
    
    Ketentuan Khusus:
    - Gunakan bahasa Indonesia yang formal dan edukatif.
    - Pada bagian "MEETINGS", buat langkah-langkah yang konkret dan mudah dipraktikkan guru.
    - Bagian "LKPD" harus berisi aktivitas yang mengaktifkan siswa (Deep Learning).
    - Bagian "FORMATIVEQUESTIONS" harus terdiri dari 20 soal HOTS pilihan ganda (A, B, C, D) dengan stimulus teks/gambar (deskripsi) yang menantang nalar.

    STRUKTUR WAJIB DALAM JSON:
    (Sesuai schema yang ditentukan).
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
          pedagogy: { type: Type.STRING },
          dimensions: { type: Type.STRING },
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
                  properties: { type: { type: Type.STRING }, steps: { type: Type.STRING }, duration: { type: Type.STRING } },
                  required: ["type", "steps", "duration"]
                },
                apply: {
                  type: Type.OBJECT,
                  properties: { type: { type: Type.STRING }, steps: { type: Type.STRING }, duration: { type: Type.STRING } },
                  required: ["type", "steps", "duration"]
                },
                reflect: {
                  type: Type.OBJECT,
                  properties: { type: { type: Type.STRING }, steps: { type: Type.STRING }, duration: { type: Type.STRING } },
                  required: ["type", "steps", "duration"]
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
                  properties: { a: { type: Type.STRING }, b: { type: Type.STRING }, c: { type: Type.STRING }, d: { type: Type.STRING } },
                  required: ["a", "b", "c", "d"]
                },
                answer: { type: Type.STRING }
              },
              required: ["question", "options", "answer"]
            }
          }
        },
        required: ["students", "interdisciplinary", "partnership", "environment", "digitalTools", "summary", "pedagogy", "dimensions", "meetings", "assessments", "lkpd", "formativeQuestions"]
      }
    }
  });

  return JSON.parse(response.text || '{}');
};

export const generateRPMImage = async (material: string): Promise<string | null> => {
  try {
    const ai = getAI();
    const prompt = `Highly educational, detailed and clear illustration for elementary school students about the topic: "${material}". The style should be vibrant, 3D render or professional flat vector art, clean background, no text, informative and safe for children. Suitable for a teaching aid.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: { imageConfig: { aspectRatio: "16:9" } }
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    return null;
  } catch (error) {
    return null;
  }
};

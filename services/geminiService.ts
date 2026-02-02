
import { GoogleGenAI, Type } from "@google/genai";
import { RPMFormData, GeneratedRPMContent, ProtaEntry, PromesEntry, PedagogicalPractice, GraduateDimension } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getAITopics = async (subject: string, grade: string, searchQuery?: string) => {
  const ai = getAI();
  const prompt = searchQuery 
    ? `Sebagai pakar Kurikulum Merdeka Indonesia, berikan 5 judul topik materi yang spesifik berkaitan dengan "${searchQuery}" untuk mata pelajaran ${subject} kelas ${grade} SD Semester 2.
       Pastikan judul materi profesional dan sesuai dengan buku teks Kemendikbudristek terbaru.
       Output harus berupa JSON array of strings.`
    : `Sebagai pakar Kurikulum Merdeka Indonesia, berikan daftar 10 topik materi pelajaran yang PALING AKURAT dan SESUAI dengan buku teks utama Kemendikbudristek untuk SEMESTER 2 (GENAP) TAHUN 2025:
       Mata Pelajaran: ${subject}
       Jenjang: SD
       Kelas: ${grade}
       Ketentuan:
       1. Materi harus spesifik untuk Semester 2 (Bab-bab akhir buku).
       2. Output harus berupa JSON array of strings berisi judul topik yang profesional.`;

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
  const prompt = `Sebagai pakar Kurikulum Merdeka Indonesia versi 2025, buatkan detail berikut:
    Mata Pelajaran: ${subject}
    Materi: ${material}
    Kelas: ${grade} SD (Semester 2)
    
    TUGAS:
    1. Capaian Pembelajaran (CP) sesuai regulasi Kemdikbudristek No. 12 Tahun 2024.
    2. Minimal 3 Tujuan Pembelajaran (TP) yang logis dan operasional.
    3. Pilih Dimensi Profil Pelajar Pancasila yang PALING RELEVAN dari daftar ini SAJA: ${Object.values(GraduateDimension).join(", ")}.
    4. Pilih Praktik Pedagogis yang PALING COCOK dari daftar ini SAJA: ${Object.values(PedagogicalPractice).join(", ")}.
    5. Saran jumlah pertemuan.

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
  const prompt = `Sebagai pakar Kurikulum Merdeka, buatkan Program Tahunan (PROTA) lengkap untuk mata pelajaran ${subject} kelas ${grade} SD Tahun Pelajaran 2024/2025.
  
  Ketentuan:
  1. Hasilkan daftar materi yang mencakup seluruh tahun (Semester 1 dan Semester 2).
  2. Berikan alokasi Jam Pelajaran (JP) yang akurat sesuai standar kurikulum nasional.
  3. Pastikan urutan materi logis dan sistematis.
  
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
  const prompt = `Sebagai pakar kurikulum, buatkan tabel Program Semester (PROMES) Kurikulum Merdeka Semester 2 (Januari-Juni 2025) untuk mata pelajaran ${subject} kelas ${grade} SD.
  
  Ketentuan:
  1. Daftar materi harus lengkap untuk satu semester.
  2. Alokasi JP harus logis (misal 3-5 JP per materi).
  3. Pemetaan minggu harus spesifik menggunakan kode: "Jan-1", "Feb-2", "Mar-4", dst.
  4. Sesuaikan dengan kalender pendidikan Indonesia (Januari-Juni).

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
    Buatkan konten otomatis untuk Rencana Pembelajaran Mendalam (RPM) SD Semester 2 Kurikulum Merdeka 2025 yang SANGAT RINCI dan JELAS:
    - Mata Pelajaran: ${formData.subject}
    - Kelas: ${formData.grade}
    - Materi Pokok: ${formData.material}
    - CP: ${formData.cp}
    - TP: ${formData.tp}
    - Praktik Pedagogis Terpilih: ${formData.pedagogy.join(", ")}
    - Profil Pelajar Pancasila Terpilih: ${formData.dimensions.join(", ")}
    - Jumlah Pertemuan: ${formData.meetingCount}
    
    STRUKTUR WAJIB DALAM JSON:
    1. STUDENTS: Karakteristik peserta didik yang relevan.
    2. INTERDISCIPLINARY: Kaitan dengan mata pelajaran lain.
    3. PARTNERSHIP: Pelibatan orang tua/masyarakat.
    4. ENVIRONMENT: Pemanfaatan lingkungan belajar.
    5. DIGITALTOOLS: Alat bantu digital yang digunakan.
    6. SUMMARY: Ringkasan materi esensial dalam poin-poin.
    7. PEDAGOGY: Jelaskan implementasi Praktik Pedagogis utama yang digunakan (integrasikan dengan materi).
    8. DIMENSIONS: Jelaskan bagaimana Dimensi Profil Pelajar Pancasila dikembangkan dalam pembelajaran ini.
    9. MEETINGS: Detail setiap pertemuan (Pendahuluan, Inti: Understand, Apply, Reflect, Penutup). Langkah-langkah harus bernomor urut ke bawah.
    10. ASSESSMENTS: Detail asesmen Awal, Proses, dan Akhir (Teknik, Instrumen, Rubrik).
    11. LKPD: Instruksi kerja terperinci untuk peserta didik.
    12. FORMATIVEQUESTIONS: Buatkan tepat 20 soal pilihan ganda (A, B, C, D) yang WAJIB memenuhi kriteria HOTS (Higher Order Thinking Skills):
        - Level Kognitif: Minimal C4 (Analisis), C5 (Evaluasi), atau C6 (Mencipta).
        - Stimulus: Setiap soal harus diawali dengan stimulus kontekstual (kasus, data, atau situasi nyata).
        - Konstruksi Soal: Gunakan kata kerja operasional HOTS.
        - Opsi Jawaban: Harus homogen, logis, dan tidak bias.
        - Kunci Jawaban: Berikan kunci yang akurat.

    PENTING: Pastikan semua teks mendukung baris baru (\\n) untuk tampilan yang rapi.
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

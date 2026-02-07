
import { GoogleGenAI, Type } from "@google/genai";
import { RPMFormData, GeneratedRPMContent, ProtaEntry, PromesEntry, PedagogicalPractice, GraduateDimension } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface ChapterInfo {
  chapter: string;
  title: string;
  materials: string[];
}

export const getAITopics = async (subject: string, grade: string, searchQuery?: string): Promise<ChapterInfo[]> => {
  const ai = getAI();
  const prompt = searchQuery 
    ? `Sebagai pakar Kurikulum Merdeka Indonesia 2025/2026, berikan rincian Bab dan materi pokok yang spesifik berkaitan dengan "${searchQuery}" untuk mata pelajaran ${subject} ${grade} SD Semester 2 (Genap). 
       Format harus menyertakan nama Bab dan daftar materi di dalamnya. 
       Output harus berupa JSON array of objects.`
    : `Sebagai pakar Kurikulum Merdeka Indonesia, berikan rincian Bab dan Materi Pokok yang SANGAT AKURAT sesuai Silabus/Buku Teks Utama terbaru 2025/2026 untuk SEMESTER 2 (GENAP):
       Mata Pelajaran: ${subject}
       Jenjang: SD
       Kelas: ${grade}
       
       Ketentuan:
       1. Hanya berikan materi untuk Semester 2 (Genap).
       2. Harus terbagi per Bab dengan daftar materi pokok yang detail di bawahnya.
       3. Gunakan istilah yang sesuai dengan Kurikulum Merdeka (Fase A/B/C).
       4. Output harus berupa JSON array of objects dengan properti: chapter, title, dan materials (array of strings).`;

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
            chapter: { type: Type.STRING, description: "Nomor Bab, misal: Bab 5" },
            title: { type: Type.STRING, description: "Judul Bab" },
            materials: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Daftar materi pokok di dalam bab tersebut"
            }
          },
          required: ["chapter", "title", "materials"]
        }
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
  const prompt = `Sebagai pakar Kurikulum Merdeka Indonesia versi terbaru (Regulasi No. 12 Tahun 2024), buatkan detail berikut untuk perencanaan pembelajaran:
    Mata Pelajaran: ${subject}
    Materi: ${material}
    Kelas: ${grade} SD (Semester 2)
    
    TUGAS:
    1. Capaian Pembelajaran (CP) yang sesuai dengan Fase (A/B/C) untuk kelas tersebut.
    2. Minimal 3 Tujuan Pembelajaran (TP) yang logis, terukur, dan operasional.
    3. Pilih Dimensi Profil Pelajar Pancasila yang PALING RELEVAN (maksimal 3) dari daftar ini: ${Object.values(GraduateDimension).join(", ")}.
    4. Pilih Praktik Pedagogis yang PALING COCOK dari daftar ini: ${Object.values(PedagogicalPractice).join(", ")}.
    5. Saran jumlah pertemuan yang ideal (JP).

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
  Hasilkan daftar materi Semester 1 dan 2 dengan alokasi JP yang akurat.
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
  const prompt = `Sebagai pakar kurikulum, buatkan Program Semester (PROMES) Kurikulum Merdeka Semester 2 (Januari-Juni 2026) untuk mata pelajaran ${subject} kelas ${grade} SD.
  Gunakan distribusi materi per minggu (Jan-1, Feb-2, dst).
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
    Buatkan konten otomatis untuk Rencana Pembelajaran Mendalam (RPM) SD Semester 2 Kurikulum Merdeka 2025/2026:
    - Mata Pelajaran: ${formData.subject}
    - Kelas: ${formData.grade}
    - Materi Pokok: ${formData.material}
    - TP: ${formData.tp}
    - Praktik Pedagogis: ${formData.pedagogy.join(", ")}
    
    Ketentuan:
    - Bagian "MEETINGS" harus sangat operasional (Understand, Apply, Reflect).
    - Bagian "FORMATIVEQUESTIONS" harus 20 soal HOTS pilihan ganda.
    - Gunakan bahasa Indonesia formal.
    Output JSON.
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
    const prompt = `Educational illustration for SD students: "${material}". Vibrant, clean, no text, 3D vector style.`;
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

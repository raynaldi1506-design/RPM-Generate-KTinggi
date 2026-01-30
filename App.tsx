
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  RPMFormData, 
  PedagogicalPractice, 
  GraduateDimension, 
  RPMState, 
  SD_SUBJECTS,
  LibraryEntry,
  ProtaEntry,
  PromesEntry
} from './types';
import { 
  generateRPMContent, 
  generateRPMImage, 
  pregenerateCPandTP, 
  getAITopics,
  generateProta,
  generatePromes
} from './services/geminiService';
import { 
  Printer, 
  Loader2, 
  BookOpen, 
  Sparkles,
  FileText,
  Download,
  CheckCircle2,
  School,
  UserCircle,
  Layout,
  FileDown,
  AlertCircle,
  Library,
  Search,
  Zap,
  Save,
  ChevronRight,
  Trash2,
  Calendar,
  ClipboardList
} from 'lucide-react';

const TEACHERS = [
  "Nasriwanto, S.Pd",
  "Raynaldi, S.Pd",
  "Randi Maikel, S.Or",
  "Nilam Melani Putri, S.Pd",
  "Lelis Mawati, S.Pd",
  "Raflinda Roza, S.Pd",
  "Sarwenda, S.PdI"
];

const SD_GRADES = [
  "Kelas 4",
  "Kelas 5",
  "Kelas 6"
];

const SEMESTER_2_MONTHS = [
  { name: "Januari", code: "Jan" },
  { name: "Februari", code: "Feb" },
  { name: "Maret", code: "Mar" },
  { name: "April", code: "Apr" },
  { name: "Mei", code: "Mei" },
  { name: "Juni", code: "Jun" }
];

const INITIAL_FORM: RPMFormData = {
  schoolName: "SDN 14 Andopan",
  teacherName: TEACHERS[0],
  teacherNip: "19XXXXXXXXXXXXX",
  principalName: "Drs. H. Ahmad",
  principalNip: "19XXXXXXXXXXXXX",
  grade: "Kelas 4",
  academicYear: "2025/2026",
  subject: "Bahasa Indonesia",
  cp: "",
  tp: "",
  material: "",
  meetingCount: 2,
  duration: "2 x 35 menit",
  pedagogy: [],
  dimensions: []
};

declare const html2pdf: any;

export default function App() {
  const [state, setState] = useState<RPMState>({
    formData: INITIAL_FORM,
    generatedContent: null,
    generatedImageUrl: null,
    isGenerating: false,
    isPrefilling: false,
    error: null
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [aiTopics, setAiTopics] = useState<string[]>([]);
  const [isFetchingTopics, setIsFetchingTopics] = useState(false);
  
  const [library, setLibrary] = useState<LibraryEntry[]>([]);
  const [showLibrary, setShowLibrary] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");

  // Prota/Promes States
  const [protaData, setProtaData] = useState<ProtaEntry[] | null>(null);
  const [promesData, setPromesData] = useState<PromesEntry[] | null>(null);
  const [isGeneratingExtra, setIsGeneratingExtra] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('rpm_library');
    if (saved) setLibrary(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('rpm_library', JSON.stringify(library));
  }, [library]);

  useEffect(() => {
    const fetchTopics = async () => {
      setIsFetchingTopics(true);
      try {
        const topics = await getAITopics(state.formData.subject, state.formData.grade);
        setAiTopics(topics);
      } catch (err) {
        setAiTopics([]);
      } finally {
        setIsFetchingTopics(false);
      }
    };
    fetchTopics();
  }, [state.formData.subject, state.formData.grade]);

  useEffect(() => {
    const triggerPrefill = async () => {
      if (state.formData.material && state.formData.subject) {
        setState(prev => ({ ...prev, isPrefilling: true, error: null }));
        try {
          const result = await pregenerateCPandTP(state.formData.subject, state.formData.material, state.formData.grade);
          
          setState(prev => ({
            ...prev,
            formData: {
              ...prev.formData,
              cp: result.cp,
              tp: (result.tp || []).map((t: string, i: number) => `${i + 1}. ${t}`).join("\n"),
              dimensions: (result.dimensions || []).map((d: string) => {
                const vals = Object.values(GraduateDimension);
                return vals.find(v => v.toLowerCase().includes(d.toLowerCase()) || d.toLowerCase().includes(v.toLowerCase()));
              }).filter(Boolean) as GraduateDimension[],
              pedagogy: (result.suggestedPedagogy || []).map((p: string) => {
                const vals = Object.values(PedagogicalPractice);
                return vals.find(v => v.toLowerCase().includes(p.toLowerCase()) || p.toLowerCase().includes(v.toLowerCase()));
              }).filter(Boolean) as PedagogicalPractice[],
              meetingCount: result.suggestedMeetings || prev.formData.meetingCount
            },
            isPrefilling: false
          }));
        } catch (err: any) {
          setState(prev => ({ ...prev, isPrefilling: false, error: "Gagal memproses data otomatis dari AI." }));
        }
      }
    };
    triggerPrefill();
  }, [state.formData.material, state.formData.subject, state.formData.grade]);

  const filteredLibrary = useMemo(() => {
    return library.filter(entry => {
      const kw = searchKeyword.toLowerCase();
      return entry.material.toLowerCase().includes(kw) || entry.subject.toLowerCase().includes(kw);
    });
  }, [library, searchKeyword]);

  const saveToLibrary = () => {
    if (!state.formData.cp || !state.formData.tp) return;
    const newEntry: LibraryEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      subject: state.formData.subject,
      material: state.formData.material,
      cp: state.formData.cp,
      tp: state.formData.tp,
      grade: state.formData.grade
    };
    setLibrary(prev => [newEntry, ...prev]);
    alert("Berhasil disimpan ke Pustaka!");
  };

  const loadFromLibrary = (entry: LibraryEntry) => {
    setState(prev => ({
      ...prev,
      formData: { ...prev.formData, ...entry }
    }));
    setShowLibrary(false);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!state.formData.subject) errors.subject = "Wajib dipilih.";
    if (!state.formData.material) errors.material = "Wajib dipilih.";
    if (!state.formData.teacherName) errors.teacherName = "Wajib diisi.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setState(prev => ({
      ...prev,
      formData: { ...prev.formData, [name]: (name === 'meetingCount' ? parseInt(value) || 1 : value) }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setState(prev => ({ ...prev, isGenerating: true, error: null }));
    try {
      const [content, imageUrl] = await Promise.all([
        generateRPMContent(state.formData),
        generateRPMImage(state.formData.material)
      ]);
      setState(prev => ({ ...prev, generatedContent: content, generatedImageUrl: imageUrl, isGenerating: false }));
    } catch (err) {
      setState(prev => ({ ...prev, isGenerating: false, error: "Gagal menghasilkan konten RPM." }));
    }
  };

  const handleGenProta = async () => {
    setIsGeneratingExtra(true);
    try {
      const data = await generateProta(state.formData.subject, state.formData.grade);
      setProtaData(data);
    } catch (e) {
      alert("Gagal membuat Prota");
    } finally {
      setIsGeneratingExtra(false);
    }
  };

  const handleGenPromes = async () => {
    setIsGeneratingExtra(true);
    try {
      const data = await generatePromes(state.formData.subject, state.formData.grade, 2);
      setPromesData(data);
    } catch (e) {
      alert("Gagal membuat Promes");
    } finally {
      setIsGeneratingExtra(false);
    }
  };

  // Improved Generic Download Logic
  const downloadDocument = (elementId: string, filename: string, type: 'pdf' | 'word') => {
    const element = document.getElementById(elementId);
    if (!element) return;

    if (type === 'pdf') {
      const opt = {
        margin: 5,
        filename: `${filename}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      html2pdf().set(opt).from(element).save();
    } else {
      const html = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><style>
          body { font-family: 'Times New Roman', serif; font-size: 10pt; line-height: 1.5; }
          table { border-collapse: collapse; width: 100%; border: 1pt solid black; }
          td, th { border: 1pt solid black; padding: 6pt; vertical-align: top; text-align: left; }
          .text-center { text-align: center !important; }
          .bg-header { background-color: #fce4ec; font-weight: bold; }
        </style></head>
        <body>${element.innerHTML}</body></html>`;
      const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${filename}.doc`;
      link.click();
    }
  };

  const handleDownloadWord = () => downloadDocument('rpm-print-area', `RPM_2025_${state.formData.material.replace(/\s+/g, '_')}`, 'word');
  const handleDownloadPDF = () => downloadDocument('rpm-print-area', `RPM_2025_${state.formData.material.replace(/\s+/g, '_')}`, 'pdf');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-indigo-900 text-white py-4 px-6 no-print shadow-lg sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-center gap-6">
          <div className="flex items-center gap-4 shrink-0">
            <div className="bg-white/20 p-2 rounded-xl">
              <Sparkles className="text-yellow-400" size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black italic tracking-tighter leading-none">GENERATOR RPM</h1>
              <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest mt-1">Semester 2 • Kurikulum Merdeka 2025</p>
            </div>
          </div>
          <div className="marquee-container flex-1 bg-black/30 rounded-full py-2 overflow-hidden border border-white/10">
            <div className="animate-marquee inline-block whitespace-nowrap px-8">
              <span className="text-sm font-bold text-yellow-300 uppercase tracking-wide">
                SDN 14 ANDOPAN • PELATIHAN PEMBELAJARAN MENDALAM (DEEP LEARNING) • TP 2024/2025 • ADMINISTRASI GURU PROFESIONAL
              </span>
            </div>
          </div>
          <button 
            onClick={() => setShowLibrary(true)} 
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-black text-sm transition-all shadow-md active:scale-95"
          >
            <Library size={18} /> PUSTAKA CP/TP
          </button>
        </div>
      </header>

      {/* Improved Prota Modal */}
      {protaData && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-4xl max-h-[85vh] rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl">
            <div className="bg-indigo-900 p-8 flex justify-between items-center text-white shrink-0">
              <div className="flex items-center gap-4">
                <ClipboardList size={32} className="text-amber-400" />
                <div>
                   <h3 className="text-2xl font-black tracking-tight uppercase">PROGRAM TAHUNAN (PROTA)</h3>
                   <p className="text-xs text-indigo-300 font-bold">{state.formData.subject} - {state.formData.grade}</p>
                </div>
              </div>
              <button onClick={() => setProtaData(null)} className="text-3xl font-bold hover:text-red-400 transition-colors">&times;</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-10 bg-slate-50">
              <div id="prota-print-area" className="bg-white p-8 shadow-sm border border-slate-200">
                <div className="text-center mb-10">
                  <h2 className="text-xl font-bold underline uppercase">PROGRAM TAHUNAN (PROTA)</h2>
                  <p className="font-bold uppercase mt-2">KURIKULUM MERDEKA TAHUN PELAJARAN 2024/2025</p>
                  <div className="flex justify-center gap-10 mt-6 text-sm font-bold">
                    <span>Mata Pelajaran: {state.formData.subject}</span>
                    <span>Satuan Pendidikan: {state.formData.schoolName}</span>
                    <span>Kelas: {state.formData.grade}</span>
                  </div>
                </div>

                <table className="table-spreadsheet">
                  <thead>
                    <tr className="table-header-pink">
                      <th className="w-[8%] text-center">No</th>
                      <th className="w-[15%] text-center">Semester</th>
                      <th className="w-[60%]">Materi / Lingkup Materi</th>
                      <th className="w-[17%] text-center">Alokasi JP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {protaData.map((item, idx) => (
                      <tr key={idx} className="hover:bg-indigo-50/50 transition-colors">
                        <td className="text-center">{idx + 1}</td>
                        <td className="text-center font-bold">{item.semester}</td>
                        <td className="px-4">{item.material}</td>
                        <td className="text-center font-black text-indigo-700">{item.hours} JP</td>
                      </tr>
                    ))}
                    <tr className="bg-indigo-50 font-black">
                      <td colSpan={3} className="text-right px-6 py-4 uppercase">Total Alokasi Waktu per Tahun</td>
                      <td className="text-center py-4">{protaData.reduce((sum, i) => sum + i.hours, 0)} JP</td>
                    </tr>
                  </tbody>
                </table>

                <div className="mt-16 grid grid-cols-2 text-center text-[10pt]">
                   <div>
                     <p>Mengetahui,</p><p>Kepala Sekolah</p><div className="h-[60pt]"></div>
                     <p className="font-bold underline uppercase">{state.formData.principalName}</p>
                     <p>NIP. {state.formData.principalNip}</p>
                   </div>
                   <div>
                     <p>Andopan, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                     <p>Guru Kelas</p><div className="h-[60pt]"></div>
                     <p className="font-bold underline uppercase">{state.formData.teacherName}</p>
                     <p>NIP. {state.formData.teacherNip}</p>
                   </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-white border-t flex justify-end gap-3 no-print">
               <button 
                  onClick={() => downloadDocument('prota-print-area', `PROTA_${state.formData.subject.replace(/\s+/g, '_')}`, 'word')}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-xs hover:bg-blue-700 transition-all shadow-md"
               >
                 <Download size={16} /> WORD
               </button>
               <button 
                  onClick={() => downloadDocument('prota-print-area', `PROTA_${state.formData.subject.replace(/\s+/g, '_')}`, 'pdf')}
                  className="flex items-center gap-2 px-6 py-3 bg-rose-600 text-white rounded-2xl font-black text-xs hover:bg-rose-700 transition-all shadow-md"
               >
                 <FileDown size={16} /> PDF
               </button>
               <button 
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs hover:bg-indigo-700 transition-all shadow-md"
               >
                 <Printer size={16} /> CETAK
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Promes Modal */}
      {promesData && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-[95vw] max-h-[90vh] rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl">
            <div className="bg-indigo-900 p-6 flex justify-between items-center text-white shrink-0">
              <div className="flex items-center gap-4">
                <Calendar size={28} className="text-emerald-400" />
                <div>
                  <h3 className="text-xl font-black tracking-tight uppercase">PROGRAM SEMESTER (PROMES)</h3>
                  <p className="text-[10px] font-bold text-indigo-300">SEMESTER 2 - {state.formData.subject} - {state.formData.grade}</p>
                </div>
              </div>
              <button onClick={() => setPromesData(null)} className="text-3xl font-bold hover:text-red-400 transition-colors">&times;</button>
            </div>
            
            <div className="flex-1 overflow-auto p-6 bg-slate-50">
              <div id="promes-print-area" className="bg-white p-6 shadow-sm border border-slate-200" style={{ minWidth: '1100px' }}>
                <div className="text-center mb-8">
                  <h2 className="text-xl font-bold underline uppercase">PROGRAM SEMESTER (PROMES)</h2>
                  <p className="font-bold uppercase mt-2">SEMESTER 2 TAHUN PELAJARAN 2024/2025</p>
                  <div className="flex justify-center gap-10 mt-4 text-sm font-bold">
                    <span>Mata Pelajaran: {state.formData.subject}</span>
                    <span>Kelas: {state.formData.grade}</span>
                  </div>
                </div>

                <table className="table-spreadsheet bg-white shadow-sm">
                  <thead>
                    <tr className="bg-indigo-700 text-white font-bold text-center">
                      <th rowSpan={2} className="w-[3%]">No</th>
                      <th rowSpan={2} className="w-[30%]">Tujuan Pembelajaran / Lingkup Materi</th>
                      <th rowSpan={2} className="w-[5%]">JP</th>
                      {SEMESTER_2_MONTHS.map(m => (
                        <th key={m.code} colSpan={4} className="border-l border-white/20 uppercase text-[9px]">{m.name}</th>
                      ))}
                    </tr>
                    <tr className="bg-indigo-600 text-white font-bold text-[8pt] text-center">
                      {SEMESTER_2_MONTHS.map(m => (
                        <React.Fragment key={`${m.code}-weeks`}>
                          <th className="border-l border-white/10">1</th>
                          <th className="border-l border-white/10">2</th>
                          <th className="border-l border-white/10">3</th>
                          <th className="border-l border-white/10">4</th>
                        </React.Fragment>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="text-[9pt]">
                    {promesData.map((item, idx) => (
                      <tr key={idx} className="hover:bg-indigo-50/50 transition-colors">
                        <td className="text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="font-bold text-slate-700 px-4">{item.material}</td>
                        <td className="text-center font-black text-indigo-700">{item.hours}</td>
                        {SEMESTER_2_MONTHS.map(m => (
                          <React.Fragment key={`${m.code}-checks`}>
                            {[1, 2, 3, 4].map(w => {
                              const isScheduled = item.weeks.some(sw => sw.includes(m.code) && sw.includes(w.toString()));
                              return (
                                <td key={`${m.code}-${w}`} className={`text-center border-l ${isScheduled ? 'bg-emerald-400/20' : ''}`}>
                                  {isScheduled && <div className="mx-auto w-3 h-3 bg-emerald-600 rounded-full"></div>}
                                </td>
                              );
                            })}
                          </React.Fragment>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-6 bg-white border-t flex justify-end gap-3 no-print">
               <button 
                  onClick={() => downloadDocument('promes-print-area', `PROMES_${state.formData.subject.replace(/\s+/g, '_')}`, 'word')}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-xs hover:bg-blue-700 transition-all shadow-md"
               >
                 <Download size={16} /> WORD
               </button>
               <button 
                  onClick={() => downloadDocument('promes-print-area', `PROMES_${state.formData.subject.replace(/\s+/g, '_')}`, 'pdf')}
                  className="flex items-center gap-2 px-6 py-3 bg-rose-600 text-white rounded-2xl font-black text-xs hover:bg-rose-700 transition-all shadow-md"
               >
                 <FileDown size={16} /> PDF
               </button>
               <button 
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs hover:bg-indigo-700 transition-all shadow-md"
               >
                 <Printer size={16} /> CETAK
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Library Modal */}
      {showLibrary && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-4xl max-h-[85vh] rounded-[2rem] overflow-hidden flex flex-col shadow-2xl border-4 border-indigo-50">
            <div className="bg-indigo-900 p-8 flex justify-between items-center text-white">
              <div className="flex items-center gap-4">
                <Library size={32} className="text-yellow-400" />
                <h3 className="text-2xl font-black tracking-tight">RIWAYAT CP/TP</h3>
              </div>
              <button onClick={() => setShowLibrary(false)} className="text-3xl font-bold hover:text-red-400 transition-colors">&times;</button>
            </div>
            <div className="p-6 bg-slate-50 border-b">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="text" 
                  placeholder="Cari materi atau mata pelajaran..." 
                  className="w-full pl-12 pr-4 py-4 border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none font-bold"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar">
              {filteredLibrary.length === 0 ? (
                <div className="text-center py-20 text-slate-300 flex flex-col items-center">
                  <Search size={64} strokeWidth={1} className="mb-4" />
                  <p className="font-bold uppercase tracking-widest text-xs">Belum ada data tersimpan</p>
                </div>
              ) : (
                filteredLibrary.map(entry => (
                  <div 
                    key={entry.id} 
                    onClick={() => loadFromLibrary(entry)} 
                    className="group p-6 border-2 border-slate-100 rounded-3xl hover:border-indigo-400 hover:bg-indigo-50/30 cursor-pointer transition-all relative"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex gap-2">
                        <span className="text-[10px] bg-indigo-100 text-indigo-700 px-3 py-1 rounded-lg font-black uppercase">{entry.subject}</span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg font-black uppercase">{entry.grade}</span>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if(confirm("Hapus?")) setLibrary(prev => prev.filter(i => i.id !== entry.id));
                        }}
                        className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <h4 className="font-black text-slate-800 text-lg group-hover:text-indigo-700 transition-colors">{entry.material}</h4>
                    <p className="text-xs text-slate-500 mt-2 line-clamp-2 italic">CP: {entry.cp}</p>
                    <ChevronRight className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-200 group-hover:text-indigo-400 transition-all group-hover:translate-x-1" size={24} />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <main className="max-w-[1600px] mx-auto w-full px-6 mt-8 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Section: Form */}
        <section className="lg:col-span-5 no-print space-y-8 pb-12">
          <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden">
            <div className="bg-indigo-700 px-8 py-6 flex justify-between items-center shadow-inner">
              <h2 className="text-xl font-black text-white flex items-center gap-3 uppercase tracking-tight">
                <Layout size={24} /> Input Perencanaan
              </h2>
              {state.formData.cp && (
                <button 
                  onClick={saveToLibrary} 
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-[10px] font-black transition-all border border-white/20"
                >
                  <Save size={14} /> SIMPAN CP/TP
                </button>
              )}
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-10">
              {state.error && (
                <div className="p-4 bg-red-50 border-2 border-red-100 rounded-2xl flex items-start gap-3 text-red-700 animate-bounce">
                  <AlertCircle className="shrink-0" size={20} />
                  <p className="text-xs font-bold">{state.error}</p>
                </div>
              )}

              <div className="space-y-6">
                <div className="flex items-center gap-2 text-indigo-700 font-black uppercase text-xs tracking-widest border-l-4 border-indigo-600 pl-3">
                  <School size={16} />
                  <span>01. Identitas Pembelajaran</span>
                </div>
                <div className="grid grid-cols-2 gap-5">
                  <div className="col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Mata Pelajaran *</label>
                    <select 
                      name="subject" 
                      value={state.formData.subject} 
                      onChange={handleInputChange} 
                      className="w-full p-4 border-2 border-slate-100 rounded-2xl font-bold bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all cursor-pointer"
                    >
                      {SD_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Kelas</label>
                    <select name="grade" value={state.formData.grade} onChange={handleInputChange} className="w-full p-4 border-2 border-slate-100 rounded-2xl font-bold bg-slate-50 focus:bg-white outline-none">
                      {SD_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2 grid grid-cols-2 gap-4">
                    <button 
                      type="button" 
                      onClick={handleGenProta}
                      disabled={isGeneratingExtra}
                      className="flex items-center justify-center gap-2 py-4 bg-amber-100 text-amber-800 rounded-2xl font-black text-sm hover:bg-amber-200 transition-all border-2 border-amber-200 shadow-sm active:scale-95"
                    >
                      {isGeneratingExtra ? <Loader2 className="animate-spin" size={18}/> : <ClipboardList size={20} />} 
                      GENERATE PROTA
                    </button>
                    <button 
                      type="button" 
                      onClick={handleGenPromes}
                      disabled={isGeneratingExtra}
                      className="flex items-center justify-center gap-2 py-4 bg-emerald-100 text-emerald-800 rounded-2xl font-black text-sm hover:bg-emerald-200 transition-all border-2 border-emerald-200 shadow-sm active:scale-95"
                    >
                      {isGeneratingExtra ? <Loader2 className="animate-spin" size={18}/> : <Calendar size={20} />} 
                      GENERATE PROMES
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-2 text-indigo-700 font-black uppercase text-xs tracking-widest border-l-4 border-indigo-600 pl-3">
                  <BookOpen size={16} />
                  <span>02. Materi & Kurikulum</span>
                </div>
                <div>
                  <label className="text-[10px] font-black text-indigo-700 uppercase mb-3 flex items-center gap-2">
                    Pilih Topik Semester 2 {isFetchingTopics && <Loader2 className="animate-spin" size={12}/>}
                  </label>
                  <select 
                    name="material" 
                    value={state.formData.material} 
                    onChange={handleInputChange} 
                    className="w-full p-4 border-2 border-indigo-100 rounded-2xl font-black bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all shadow-sm"
                  >
                    <option value="">-- Pilih Materi Berdasarkan Buku Kemendikbud --</option>
                    {aiTopics.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  {state.isPrefilling && (
                    <div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-indigo-500 italic animate-pulse">
                      <Zap size={14} /> Menyusun CP & TP Otomatis...
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-5">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Tujuan Pembelajaran (TP)</label>
                    <textarea 
                      name="tp" 
                      value={state.formData.tp} 
                      onChange={handleInputChange} 
                      rows={4}
                      className="w-full p-4 border-2 border-slate-100 rounded-2xl font-bold text-sm bg-slate-50 focus:bg-white outline-none" 
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-2 text-indigo-700 font-black uppercase text-xs tracking-widest border-l-4 border-indigo-600 pl-3">
                  <UserCircle size={16} />
                  <span>03. Data Penandatangan</span>
                </div>
                <div className="grid grid-cols-2 gap-5">
                  <div className="col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Nama Guru Kelas *</label>
                    <select 
                      name="teacherName" 
                      value={state.formData.teacherName} 
                      onChange={handleInputChange} 
                      className="w-full p-4 border-2 border-slate-100 rounded-2xl font-bold bg-slate-50 focus:bg-white outline-none"
                    >
                      {TEACHERS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Nama Kepala Sekolah</label>
                    <input 
                      name="principalName" 
                      value={state.formData.principalName} 
                      onChange={handleInputChange} 
                      className="w-full p-4 border-2 border-slate-100 rounded-2xl font-bold bg-slate-50 focus:bg-white outline-none" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">NIP Kepala Sekolah</label>
                    <input 
                      name="principalNip" 
                      value={state.formData.principalNip} 
                      onChange={handleInputChange} 
                      className="w-full p-4 border-2 border-slate-100 rounded-2xl font-bold bg-slate-50 focus:bg-white outline-none" 
                    />
                  </div>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={state.isGenerating || !state.formData.material} 
                className="w-full py-6 bg-indigo-700 text-white rounded-[2rem] font-black text-xl shadow-2xl hover:bg-indigo-800 disabled:bg-slate-200 disabled:text-slate-400 transition-all flex items-center justify-center gap-4 active:scale-95 group"
              >
                {state.isGenerating ? (
                  <><Loader2 className="animate-spin" size={28} /> MENYUSUN RPM 2025...</>
                ) : (
                  <><Zap className="group-hover:text-yellow-400 transition-colors" size={28} /> HASILKAN RPM SEKARANG</>
                )}
              </button>
            </form>
          </div>
        </section>

        {/* Right Section: Preview */}
        <section className="lg:col-span-7 space-y-6">
          {!state.generatedContent ? (
            <div className="bg-slate-200 rounded-[3rem] p-20 flex flex-col items-center justify-center text-slate-400 border-4 border-dashed border-slate-300 h-[800px] text-center sticky top-28">
              <div className="bg-slate-300/50 p-10 rounded-full mb-8">
                <BookOpen size={100} strokeWidth={1} className="opacity-50" />
              </div>
              <h3 className="text-3xl font-black uppercase tracking-tighter opacity-50">Preview Dokumen F4</h3>
              <p className="mt-4 max-w-xs font-bold text-sm uppercase tracking-widest">Isi form di samping untuk mulai menyusun Rencana Pembelajaran</p>
            </div>
          ) : (
            <div className="space-y-6 sticky top-28 pb-12">
              <div className="flex flex-wrap items-center justify-between p-5 bg-white rounded-[2rem] shadow-2xl no-print border border-indigo-100 gap-4">
                <span className="text-indigo-900 font-black flex items-center gap-3 text-sm px-4 py-2 bg-indigo-50 rounded-full">
                  <CheckCircle2 className="text-emerald-500" size={20} />
                  RPM SIAP DICETAK
                </span>
                <div className="flex gap-2">
                  <button onClick={handleDownloadWord} className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-2xl font-black text-xs hover:bg-blue-700 transition-all shadow-md active:scale-95">
                    <Download size={16} /> WORD
                  </button>
                  <button onClick={handleDownloadPDF} className="flex items-center gap-2 px-5 py-3 bg-rose-600 text-white rounded-2xl font-black text-xs hover:bg-rose-700 transition-all shadow-md active:scale-95">
                    <FileDown size={16} /> PDF
                  </button>
                  <button onClick={() => window.print()} className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs hover:bg-indigo-700 transition-all shadow-md active:scale-95">
                    <Printer size={16} /> CETAK
                  </button>
                </div>
              </div>

              <div className="f4-preview-wrapper shadow-2xl">
                <div id="rpm-print-area" className="f4-page-container">
                  <div className="f4-page">
                    <h2 className="text-center text-xl font-bold mb-8 underline uppercase tracking-tight">RENCANA PEMBELAJARAN MENDALAM (RPM)</h2>

                    <table className="table-spreadsheet">
                      <thead><tr><th colSpan={2} className="table-header-pink">I. IDENTITAS PEMBELAJARAN</th></tr></thead>
                      <tbody>
                        <tr><td className="col-key">Satuan Pendidikan</td><td>{state.formData.schoolName}</td></tr>
                        <tr><td className="col-key">Mata Pelajaran</td><td>{state.formData.subject}</td></tr>
                        <tr><td className="col-key">Kelas / Semester</td><td>{state.formData.grade} / Semester 2 (Genap)</td></tr>
                        <tr><td className="col-key">Tahun Pelajaran</td><td>{state.formData.academicYear}</td></tr>
                        <tr><td className="col-key">Topik Materi</td><td>{state.formData.material}</td></tr>
                        <tr><td className="col-key">Alokasi Waktu</td><td>{state.formData.duration} ({state.formData.meetingCount} Pertemuan)</td></tr>
                      </tbody>
                    </table>

                    <table className="table-spreadsheet">
                      <thead><tr><th colSpan={2} className="table-header-pink">II. DESAIN PEMBELAJARAN</th></tr></thead>
                      <tbody>
                        <tr><td className="col-key">Capaian Pembelajaran</td><td>{state.formData.cp}</td></tr>
                        <tr><td className="col-key">Tujuan Pembelajaran</td><td className="whitespace-pre-line font-bold leading-relaxed">{state.formData.tp}</td></tr>
                        <tr><td className="col-key">Praktik Pedagogis</td><td>{state.formData.pedagogy.join(", ")}</td></tr>
                        <tr><td className="col-key">Profil Pelajar Pancasila</td><td>{state.formData.dimensions.join(", ")}</td></tr>
                        <tr><td className="col-key">Kebutuhan Siswa</td><td>{state.generatedContent.students}</td></tr>
                      </tbody>
                    </table>

                    <div className="mt-8 mb-4">
                      <div className="bg-[#fce4ec] border border-black text-center font-bold uppercase p-2 mb-4 text-[10.5pt]">
                        III. PENGALAMAN BELAJAR (PEMBELAJARAN MENDALAM)
                      </div>
                      {state.generatedContent.meetings.map((meeting, idx) => (
                        <div key={idx} className="section-meeting">
                          <div className="meeting-badge">SESI PERTEMUAN KE-{idx + 1}</div>
                          <table className="table-spreadsheet">
                            <tbody>
                              <tr className="bg-gray-100">
                                <td colSpan={2} className="font-bold text-center">1. KEGIATAN PENDAHULUAN ({meeting.opening.duration})</td>
                              </tr>
                              <tr>
                                <td colSpan={2} className="whitespace-pre-line pl-4">{meeting.opening.steps}</td>
                              </tr>
                              
                              <tr className="bg-gray-100">
                                <td colSpan={2} className="font-bold text-center">2. KEGIATAN INTI (CORE DEEP LEARNING)</td>
                              </tr>
                              <tr>
                                <td className="col-key pl-4">A. Understand (Memahami)<br/>
                                  <span className="italic font-normal text-[9pt]">({meeting.understand.type})</span><br/>
                                  <span className="font-bold text-[9pt] underline">Waktu: {meeting.understand.duration}</span>
                                </td>
                                <td>{meeting.understand.steps}</td>
                              </tr>
                              <tr>
                                <td className="col-key pl-4">B. Apply (Aplikasi)<br/>
                                  <span className="italic font-normal text-[9pt]">({meeting.apply.type})</span><br/>
                                  <span className="font-bold text-[9pt] underline">Waktu: {meeting.apply.duration}</span>
                                </td>
                                <td>{meeting.apply.steps}</td>
                              </tr>
                              <tr>
                                <td className="col-key pl-4">C. Reflect (Refleksi)<br/>
                                  <span className="italic font-normal text-[9pt]">({meeting.reflect.type})</span><br/>
                                  <span className="font-bold text-[9pt] underline">Waktu: {meeting.reflect.duration}</span>
                                </td>
                                <td>{meeting.reflect.steps}</td>
                              </tr>
                              
                              <tr className="bg-gray-100">
                                <td colSpan={2} className="font-bold text-center">3. KEGIATAN PENUTUP ({meeting.closing.duration})</td>
                              </tr>
                              <tr>
                                <td colSpan={2} className="whitespace-pre-line pl-4">{meeting.closing.steps}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      ))}
                    </div>

                    <div className="page-break"></div>
                    <div className="pt-8">
                      <table className="table-spreadsheet">
                        <thead><tr><th colSpan={4} className="table-header-pink">IV. ASESMEN PEMBELAJARAN</th></tr></thead>
                        <thead>
                          <tr className="bg-gray-200 font-bold text-center">
                            <td className="w-[20%]">Komponen</td>
                            <td className="w-[25%]">Teknik</td>
                            <td className="w-[25%]">Instrumen</td>
                            <td>Kriteria Rubrik</td>
                          </tr>
                        </thead>
                        <tbody>
                          <tr><td className="font-bold">Awal</td><td>{state.generatedContent.assessments.initial.technique}</td><td>{state.generatedContent.assessments.initial.instrument}</td><td>{state.generatedContent.assessments.initial.rubric}</td></tr>
                          <tr><td className="font-bold">Proses</td><td>{state.generatedContent.assessments.process.technique}</td><td>{state.generatedContent.assessments.process.instrument}</td><td>{state.generatedContent.assessments.process.rubric}</td></tr>
                          <tr><td className="font-bold">Akhir</td><td>{state.generatedContent.assessments.final.technique}</td><td>{state.generatedContent.assessments.final.instrument}</td><td>{state.generatedContent.assessments.final.rubric}</td></tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-8 border-t-2 border-black pt-8">
                      <h3 className="font-bold underline mb-4 text-center uppercase tracking-wider">RINGKASAN MATERI DAN MEDIA VISUAL</h3>
                      <table className="table-spreadsheet" style={{ border: 'none' }}>
                        <tbody>
                          <tr>
                            <td style={{ border: 'none', paddingRight: '12pt', width: '65%' }}>
                              <div className="whitespace-pre-line leading-relaxed italic">{state.generatedContent.summary}</div>
                            </td>
                            <td style={{ border: 'none' }} className="media-container">
                              {state.generatedImageUrl && (
                                <div className="media-wrapper">
                                  <img src={state.generatedImageUrl} alt="Media" />
                                  <p className="mt-2 text-[8pt] italic text-slate-600">Ilustrasi Pendukung Materi</p>
                                </div>
                              )}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-16">
                      <table style={{ border: 'none', width: '100%', tableLayout: 'fixed' }}>
                        <tbody>
                          <tr>
                            <td style={{ border: 'none', textAlign: 'center' }}>
                              <p>Mengetahui,</p><p>Kepala Sekolah</p><div className="h-[60pt]"></div>
                              <p className="font-bold underline uppercase">{state.formData.principalName}</p>
                              <p>NIP. {state.formData.principalNip}</p>
                            </td>
                            <td style={{ border: 'none', textAlign: 'center' }}>
                              <p>Andopan, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                              <p>Guru Kelas</p><div className="h-[60pt]"></div>
                              <p className="font-bold underline uppercase">{state.formData.teacherName}</p>
                              <p>NIP. {state.formData.teacherNip}</p>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="page-break pt-8">
                      <div className="bg-[#fce4ec] border border-black text-center font-bold uppercase p-2 mb-6 text-[11pt]">
                        V. LEMBAR KERJA PESERTA DIDIK (LKPD)
                      </div>
                      <div className="border border-black p-6 mb-8 text-left leading-relaxed whitespace-pre-line">
                        {state.generatedContent.lkpd}
                      </div>

                      <div className="bg-[#fce4ec] border border-black text-center font-bold uppercase p-2 mb-6 text-[11pt]">
                        VI. SOAL FORMATIF (HOTS)
                      </div>
                      <div className="space-y-6 text-left">
                        {state.generatedContent.formativeQuestions.map((q, qIdx) => (
                          <div key={qIdx} className="pb-4 border-b border-dashed border-slate-300">
                            <p className="font-bold mb-2">{qIdx + 1}. {q.question}</p>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 pl-4">
                              <p>A. {q.options.a}</p>
                              <p>B. {q.options.b}</p>
                              <p>C. {q.options.c}</p>
                              <p>D. {q.options.d}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-8 p-4 bg-slate-50 border border-black">
                        <p className="font-bold underline mb-2">KUNCI JAWABAN SOAL FORMATIF:</p>
                        <div className="grid grid-cols-5 gap-2 text-[9pt] font-bold">
                          {state.generatedContent.formativeQuestions.map((q, idx) => (
                            <span key={idx}>{idx + 1}. {q.answer.toUpperCase()}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      <footer className="mt-12 py-10 bg-indigo-950 text-indigo-300 text-center no-print">
        <p className="text-[10px] font-black uppercase tracking-[0.3em]">SDN 14 Andopan • TP 2024/2025 • Kurikulum Merdeka Terintegrasi AI</p>
        <p className="mt-2 text-[9px] opacity-50">Deep Learning Lesson Plan Generator v2.5 Stable</p>
      </footer>
    </div>
  );
}

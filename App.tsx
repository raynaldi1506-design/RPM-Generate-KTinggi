"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  ClipboardList,
  ChevronDown,
  Plus,
  CheckSquare,
  Square,
  Info,
  PenTool,
  BookMarked,
  Eye
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

  const [aiTopics, setAiTopics] = useState<string[]>([]);
  const [isFetchingTopics, setIsFetchingTopics] = useState(false);
  const [topicSearchQuery, setTopicSearchQuery] = useState("");
  const [isComboboxOpen, setIsComboboxOpen] = useState(false);
  const comboboxRef = useRef<HTMLDivElement>(null);
  
  const [library, setLibrary] = useState<LibraryEntry[]>([]);
  const [showLibrary, setShowLibrary] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");

  const [protaData, setProtaData] = useState<ProtaEntry[] | null>(null);
  const [promesData, setPromesData] = useState<PromesEntry[] | null>(null);
  const [isGeneratingExtra, setIsGeneratingExtra] = useState(false);

  // Load persistence data on mount
  useEffect(() => {
    const savedFormData = localStorage.getItem('rpm_form_data');
    if (savedFormData) {
      try {
        const parsed = JSON.parse(savedFormData);
        setState(prev => ({ ...prev, formData: { ...INITIAL_FORM, ...parsed } }));
      } catch (e) {
        console.error("Failed to parse saved form data", e);
      }
    }

    const savedLibrary = localStorage.getItem('rpm_library');
    if (savedLibrary) {
      try {
        setLibrary(JSON.parse(savedLibrary));
      } catch (e) {
        console.error("Failed to parse saved library", e);
      }
    }
  }, []);

  // Save form data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('rpm_form_data', JSON.stringify(state.formData));
  }, [state.formData]);

  // Save library separately
  useEffect(() => {
    localStorage.setItem('rpm_library', JSON.stringify(library));
  }, [library]);

  useEffect(() => {
    const fetchDefaultTopics = async () => {
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
    fetchDefaultTopics();
  }, [state.formData.subject, state.formData.grade]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (comboboxRef.current && !comboboxRef.current.contains(event.target as Node)) {
        setIsComboboxOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const triggerPrefill = async () => {
      if (state.formData.material && state.formData.subject) {
        setState(prev => ({ ...prev, isPrefilling: true, error: null }));
        try {
          const result = await pregenerateCPandTP(state.formData.subject, state.formData.material, state.formData.grade);
          
          const allDimensions = Object.values(GraduateDimension);
          const autoDimensions = (result.dimensions || []).map((d: string) => {
            return allDimensions.find(v => 
              v.toLowerCase().includes(d.toLowerCase()) || 
              d.toLowerCase().includes(v.toLowerCase())
            );
          }).filter(Boolean) as GraduateDimension[];

          const allPedagogies = Object.values(PedagogicalPractice);
          const autoPedagogy = (result.suggestedPedagogy || []).map((p: string) => {
            return allPedagogies.find(v => 
              v.toLowerCase().includes(p.toLowerCase()) || 
              p.toLowerCase().includes(v.toLowerCase())
            );
          }).filter(Boolean) as PedagogicalPractice[];

          setState(prev => ({
            ...prev,
            formData: {
              ...prev.formData,
              cp: result.cp || prev.formData.cp,
              tp: result.tp ? (result.tp || []).map((t: string, i: number) => `${i + 1}. ${t}`).join("\n") : prev.formData.tp,
              dimensions: autoDimensions.length > 0 ? autoDimensions : prev.formData.dimensions,
              pedagogy: autoPedagogy.length > 0 ? autoPedagogy : prev.formData.pedagogy,
              meetingCount: result.suggestedMeetings || prev.formData.meetingCount
            },
            isPrefilling: false
          }));
        } catch (err: any) {
          setState(prev => ({ ...prev, isPrefilling: false, error: "Gagal memproses data otomatis." }));
        }
      }
    };
    const isActuallyEmpty = !state.formData.cp && !state.formData.tp;
    if (isActuallyEmpty) {
       triggerPrefill();
    }
  }, [state.formData.material, state.formData.subject, state.formData.grade]);

  const handleGenerateNewTopics = async () => {
    if (!topicSearchQuery.trim()) {
      alert("Masukkan kata kunci untuk mencari topik baru.");
      return;
    }
    setIsFetchingTopics(true);
    try {
      const newTopics = await getAITopics(state.formData.subject, state.formData.grade, topicSearchQuery);
      setAiTopics(prev => [...new Set([...newTopics, ...prev])]);
      setIsComboboxOpen(true);
    } catch (err) {
      alert("Gagal menghasilkan topik baru.");
    } finally {
      setIsFetchingTopics(false);
    }
  };

  const filteredTopics = useMemo(() => {
    return aiTopics.filter(t => t.toLowerCase().includes(topicSearchQuery.toLowerCase()));
  }, [aiTopics, topicSearchQuery]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setState(prev => ({
      ...prev,
      formData: { ...prev.formData, [name]: (name === 'meetingCount' ? parseInt(value) || 1 : value) }
    }));
  };

  const toggleCheckbox = (type: 'pedagogy' | 'dimensions', value: any) => {
    setState(prev => {
      const current = [...prev.formData[type]];
      const index = current.indexOf(value);
      if (index > -1) current.splice(index, 1);
      else current.push(value);
      return { ...prev, formData: { ...prev.formData, [type]: current } };
    });
  };

  const handleTopicSelect = (topic: string) => {
    setState(prev => ({
      ...prev,
      formData: { ...prev.formData, material: topic, cp: "", tp: "" }
    }));
    setTopicSearchQuery(topic);
    setIsComboboxOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.formData.material) return;
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
    } catch (e) { alert("Gagal membuat Prota"); }
    finally { setIsGeneratingExtra(false); }
  };

  const handleGenPromes = async () => {
    setIsGeneratingExtra(true);
    try {
      const data = await generatePromes(state.formData.subject, state.formData.grade, 2);
      setPromesData(data);
    } catch (e) { alert("Gagal membuat Promes"); }
    finally { setIsGeneratingExtra(false); }
  };

  const resetForm = () => {
    if (confirm("Apakah Anda yakin ingin menghapus semua input dan mereset form?")) {
      localStorage.removeItem('rpm_form_data');
      setState(prev => ({ ...prev, formData: INITIAL_FORM, generatedContent: null, generatedImageUrl: null }));
    }
  };

  const downloadDocument = (elementId: string, filename: string, type: 'pdf' | 'word' | 'preview') => {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const opt = {
      margin: 0,
      filename: `${filename}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: [210, 330], orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] }
    };

    if (type === 'preview') {
      // Menggunakan API output('bloburl') untuk membuka tab baru secara langsung
      html2pdf().from(element).set(opt).output('bloburl').then((url: string) => {
        window.open(url, '_blank');
      });
    } else if (type === 'pdf') {
      html2pdf().from(element).set(opt).save();
    } else {
      const html = `
        <html><head><meta charset='utf-8'><style>
          body { font-family: 'Times New Roman', serif; font-size: 11pt; line-height: 1.5; color: black; }
          table { border-collapse: collapse; width: 100%; border: 1.5pt solid black; }
          td, th { border: 1pt solid black; padding: 6pt; vertical-align: top; text-align: left; }
          .whitespace-pre-line { white-space: pre-line; }
          .bg-header { background-color: #fce4ec; font-weight: bold; }
          .text-center { text-align: center; }
          .font-bold { font-weight: bold; }
          .uppercase { text-transform: uppercase; }
          .underline { text-decoration: underline; }
          .table-signatures td { text-align: center; width: 50%; border: none !important; }
          .table-answer-key { width: 100%; border-collapse: collapse; border: 1pt solid black; }
          .table-answer-key td { border: 1pt solid black; padding: 4pt; text-align: center; font-weight: bold; width: 20%; }
          @page { size: 210mm 330mm; margin: 10mm; }
        </style></head><body>${element.innerHTML}</body></html>`;
      const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${filename}.doc`;
      link.click();
    }
  };

  const handleDownloadWord = () => downloadDocument('rpm-page-container', `RPM_${state.formData.subject}_${state.formData.grade}`, 'word');
  const handleDownloadPDF = () => downloadDocument('rpm-page-container', `RPM_${state.formData.subject}_${state.formData.grade}`, 'pdf');
  const handlePrintPreview = () => downloadDocument('rpm-page-container', `RPM_${state.formData.subject}_${state.formData.grade}`, 'preview');

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-indigo-950 text-white py-5 px-6 no-print shadow-xl sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-center gap-6">
          <div className="flex items-center gap-4 shrink-0">
            <div className="bg-indigo-600/30 p-2.5 rounded-2xl border border-indigo-500/30 shadow-inner">
              <Sparkles className="text-yellow-400 drop-shadow-glow" size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-black italic tracking-tighter leading-none uppercase">Generator RPM</h1>
              <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-1">Deep Learning Specialist</p>
            </div>
          </div>
          <div className="marquee-container flex-1 bg-black/40 rounded-2xl py-2.5 overflow-hidden border border-white/5 shadow-inner">
            <div className="animate-marquee inline-block whitespace-nowrap px-8">
              <span className="text-sm font-bold text-indigo-300 uppercase tracking-wide">
                SDN 14 ANDOPAN • PERENCANAAN PEMBELAJARAN MENDALAM (DEEP LEARNING) KURIKULUM MERDEKA 2025 • ADMINISTRASI OTOMATIS GURU SD
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={resetForm} className="flex items-center gap-2 px-6 py-3 bg-rose-700/50 hover:bg-rose-600 rounded-2xl font-black text-xs transition-all border border-rose-500/30">
              <Trash2 size={16} /> RESET DATA
            </button>
            <button onClick={() => setShowLibrary(true)} className="flex items-center gap-2 px-8 py-3 bg-indigo-700 hover:bg-indigo-600 rounded-2xl font-black text-sm transition-all shadow-lg active:scale-95 group">
              <Library size={18} className="group-hover:rotate-12 transition-transform" /> PUSTAKA
            </button>
          </div>
        </div>
      </header>

      {/* MODALS for PROTA/PROMES/LIBRARY */}
      {(protaData || promesData) && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-indigo-950/80 backdrop-blur-md p-4 no-print">
          <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-[3rem] overflow-hidden flex flex-col shadow-2xl border border-white/20">
            <div className="bg-indigo-900 p-8 flex justify-between items-center text-white">
               <h3 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
                 <ClipboardList size={28} /> {protaData ? "Program Tahunan" : "Program Semester"}
               </h3>
               <button onClick={() => { setProtaData(null); setPromesData(null); }} className="p-2 hover:bg-white/10 rounded-full transition-colors"><Trash2 size={24} /></button>
            </div>
            <div className="flex-1 overflow-auto p-10 bg-slate-100">
               <div id="extra-print-area" className="bg-white p-12 shadow-md border border-slate-200 mx-auto max-w-[210mm]">
                  {protaData ? (
                    <>
                      <h2 className="text-center text-xl font-bold underline mb-8 uppercase">PROGRAM TAHUNAN (PROTA)</h2>
                      <table className="table-spreadsheet">
                        <thead><tr className="table-header-pink"><th>No</th><th>Semester</th><th>Materi Pokok</th><th>Alokasi JP</th></tr></thead>
                        <tbody>{protaData.map((item, idx) => (
                          <tr key={idx}><td className="text-center font-bold">{idx + 1}</td><td className="text-center">SMT {item.semester}</td><td>{item.material}</td><td className="text-center">{item.hours} JP</td></tr>
                        ))}</tbody>
                      </table>
                    </>
                  ) : (
                    <>
                      <h2 className="text-center text-xl font-bold underline mb-8 uppercase">PROGRAM SEMESTER (PROMES)</h2>
                      <table className="table-spreadsheet">
                        <thead>
                          <tr className="bg-indigo-900 text-white text-center">
                            <th rowSpan={2} className="w-[40px]">No</th><th rowSpan={2}>Materi Pokok</th><th rowSpan={2} className="w-[60px]">JP</th>
                            {SEMESTER_2_MONTHS.map(m => <th key={m.code} colSpan={4}>{m.name}</th>)}
                          </tr>
                          <tr className="bg-indigo-800 text-white text-[8pt] text-center">
                            {SEMESTER_2_MONTHS.map(m => <React.Fragment key={m.code}><th>1</th><th>2</th><th>3</th><th>4</th></React.Fragment>)}
                          </tr>
                        </thead>
                        <tbody>{promesData?.map((item, idx) => (
                          <tr key={idx}><td className="text-center font-bold">{idx + 1}</td><td>{item.material}</td><td className="text-center">{item.hours}</td>
                            {SEMESTER_2_MONTHS.map(m => <React.Fragment key={m.code}>{[1,2,3,4].map(w => (
                              <td key={w} className="text-center">{item.weeks.some(sw => sw.includes(m.code) && sw.includes(w.toString())) ? '●' : ''}</td>
                            ))}</React.Fragment>)}
                          </tr>
                        ))}</tbody>
                      </table>
                    </>
                  )}
               </div>
            </div>
            <div className="p-8 border-t bg-white flex justify-end gap-4">
               <button onClick={() => downloadDocument('extra-print-area', 'Dokumen_Administrasi', 'word')} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-sm shadow-lg hover:bg-blue-700 transition-colors">WORD</button>
               <button onClick={() => downloadDocument('extra-print-area', 'Dokumen_Administrasi', 'pdf')} className="bg-rose-600 text-white px-8 py-3 rounded-2xl font-black text-sm shadow-lg hover:bg-rose-700 transition-colors">PDF</button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM MARQUEE MERAH PUTIH */}
      <div className="no-print mx-auto max-w-[1700px] w-full px-6 mt-4">
        <div className="marquee-container bg-red-600 rounded-2xl py-3 border-4 border-white shadow-2xl overflow-hidden">
          <div className="animate-marquee inline-block whitespace-nowrap px-8">
            <span className="text-lg font-black text-white uppercase tracking-[0.2em] drop-shadow-md">
              okok sabatang, adm siap....nan ibuk-ibuk walid bulie isok okok lo sambie kojo
            </span>
          </div>
        </div>
      </div>

      <main className="max-w-[1700px] mx-auto w-full px-6 mt-10 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Form Column */}
        <section className="lg:col-span-4 xl:col-span-4 no-print space-y-8 pb-12">
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden sticky top-32">
            <div className="bg-indigo-800 px-10 py-8 flex justify-between items-center border-b border-indigo-900/10">
              <h2 className="text-xl font-black text-white uppercase flex items-center gap-3">
                <PenTool size={24} className="text-indigo-300" /> Input Data RPM
              </h2>
              <div className="flex gap-2">
                <span className="bg-emerald-500 w-3 h-3 rounded-full animate-pulse"></span>
                <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest">Auto-Save On</span>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="p-10 space-y-10 max-h-[75vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b-2 border-slate-100 mb-4">
                  <Info className="text-indigo-600" size={18} />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Identitas Umum</span>
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Mata Pelajaran</label>
                    <select name="subject" value={state.formData.subject} onChange={handleInputChange} className="w-full p-4 border-2 border-slate-200 rounded-2xl font-bold bg-slate-50 outline-none focus:border-indigo-500 transition-all cursor-pointer">
                      {SD_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Kelas</label>
                    <select name="grade" value={state.formData.grade} onChange={handleInputChange} className="w-full p-4 border-2 border-slate-200 rounded-2xl font-bold bg-slate-50 outline-none focus:border-indigo-500 transition-all cursor-pointer">
                      {SD_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Jml Pertemuan</label>
                    <input type="number" name="meetingCount" value={state.formData.meetingCount} onChange={handleInputChange} className="w-full p-4 border-2 border-slate-200 rounded-2xl font-bold bg-slate-50 outline-none focus:border-indigo-500 transition-all" min="1" max="10"/>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button type="button" onClick={handleGenProta} className="flex-1 py-4 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm">
                    <ClipboardList size={16}/> GENERATE PROTA
                  </button>
                  <button type="button" onClick={handleGenPromes} className="flex-1 py-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm">
                    <Calendar size={16}/> GENERATE PROMES
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b-2 border-slate-100 mb-4">
                  <BookMarked className="text-indigo-600" size={18} />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Materi & Topik</span>
                </div>
                
                <div className="space-y-4" ref={comboboxRef}>
                  <label className="text-[10px] font-black text-indigo-700 uppercase flex items-center gap-2">
                    Cari Topik Semester 2 {isFetchingTopics && <Loader2 className="animate-spin" size={12}/>}
                  </label>
                  <div className="relative">
                    <div className="flex items-center border-2 border-indigo-200 rounded-2xl bg-indigo-50/30 overflow-hidden focus-within:border-indigo-500 transition-all shadow-sm">
                       <Search className="ml-4 text-indigo-400" size={18} />
                       <input 
                         type="text" placeholder="Masukkan materi atau kata kunci..." 
                         value={topicSearchQuery}
                         onChange={(e) => { setTopicSearchQuery(e.target.value); setIsComboboxOpen(true); }}
                         onFocus={() => setIsComboboxOpen(true)}
                         className="flex-1 p-4 font-bold outline-none bg-transparent"
                       />
                       <button type="button" onClick={() => setIsComboboxOpen(!isComboboxOpen)} className="px-4 text-indigo-500 hover:bg-indigo-100 transition-colors border-l border-indigo-200">
                         <ChevronDown size={20} />
                       </button>
                    </div>
                    {isComboboxOpen && (
                      <div className="absolute z-[60] left-0 right-0 mt-3 bg-white border-2 border-indigo-200 rounded-3xl shadow-2xl max-h-[300px] overflow-y-auto">
                        {filteredTopics.map((topic, i) => (
                          <div key={i} onClick={() => handleTopicSelect(topic)} className="p-4 hover:bg-indigo-50 cursor-pointer border-b border-indigo-50 last:border-0 font-bold text-slate-700 transition-colors flex items-center gap-3">
                            <BookOpen size={16} className="text-indigo-400 shrink-0" /> {topic}
                          </div>
                        ))}
                        <div className="p-4 bg-indigo-50 sticky bottom-0 border-t border-indigo-100">
                           <button type="button" onClick={handleGenerateNewTopics} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs shadow-md">GENERATE TOPIK BARU</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b-2 border-slate-100 mb-4">
                  <Layout className="text-indigo-600" size={18} />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Desain Pembelajaran (Otomatis)</span>
                </div>
                
                {state.isPrefilling ? (
                  <div className="p-10 bg-indigo-50 rounded-3xl text-center border-2 border-indigo-100 space-y-4 animate-pulse">
                    <Loader2 className="animate-spin mx-auto text-indigo-600" size={32} />
                    <p className="text-xs font-black text-indigo-800 uppercase tracking-widest">Sinkronisasi Kurikulum 2025...</p>
                  </div>
                ) : (
                  <div className="space-y-8 animate-in fade-in duration-500">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Capaian Pembelajaran (CP)</label>
                      <textarea name="cp" value={state.formData.cp} onChange={handleInputChange} className="w-full p-4 border-2 border-slate-200 rounded-2xl font-medium text-sm h-32 outline-none focus:border-indigo-500 bg-slate-50/50 resize-none custom-scrollbar"></textarea>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Tujuan Pembelajaran (TP)</label>
                      <textarea name="tp" value={state.formData.tp} onChange={handleInputChange} className="w-full p-4 border-2 border-slate-200 rounded-2xl font-medium text-sm h-32 outline-none focus:border-indigo-500 bg-slate-50/50 resize-none custom-scrollbar"></textarea>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase block">Praktik Pedagogis (Otomatis)</label>
                      <div className="grid grid-cols-1 gap-2">
                        {Object.values(PedagogicalPractice).map(p => (
                          <button key={p} type="button" onClick={() => toggleCheckbox('pedagogy', p)} className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left text-[11px] font-bold ${state.formData.pedagogy.includes(p) ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-sm' : 'border-slate-100 text-slate-500 hover:bg-slate-50'}`}>
                            {state.formData.pedagogy.includes(p) ? <CheckSquare size={16} className="shrink-0" /> : <Square size={16} className="shrink-0" />} {p}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase block">Dimensi Profil Lulusan (Otomatis)</label>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.values(GraduateDimension).map(d => (
                          <button key={d} type="button" onClick={() => toggleCheckbox('dimensions', d)} className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left text-[10px] font-bold ${state.formData.dimensions.includes(d) ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-sm' : 'border-slate-100 text-slate-500 hover:bg-slate-50'}`}>
                            {state.formData.dimensions.includes(d) ? <CheckSquare size={14} className="shrink-0" /> : <Square size={14} className="shrink-0" />} {d}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b-2 border-slate-100 mb-4">
                  <UserCircle className="text-indigo-600" size={18} />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Identitas Penanda Tangan</span>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <input type="text" name="teacherName" placeholder="Nama Guru" value={state.formData.teacherName} onChange={handleInputChange} className="w-full p-4 border-2 border-slate-200 rounded-2xl font-bold text-sm bg-slate-50 outline-none" />
                  <input type="text" name="teacherNip" placeholder="NIP Guru" value={state.formData.teacherNip} onChange={handleInputChange} className="w-full p-4 border-2 border-slate-200 rounded-2xl text-sm bg-slate-50 outline-none" />
                  <input type="text" name="principalName" placeholder="Nama Kepala Sekolah" value={state.formData.principalName} onChange={handleInputChange} className="w-full p-4 border-2 border-slate-200 rounded-2xl font-bold text-sm bg-slate-50 outline-none" />
                  <input type="text" name="principalNip" placeholder="NIP Kepala Sekolah" value={state.formData.principalNip} onChange={handleInputChange} className="w-full p-4 border-2 border-slate-200 rounded-2xl text-sm bg-slate-50 outline-none" />
                </div>
              </div>

              <button type="submit" disabled={state.isGenerating || !state.formData.material} className="w-full py-7 bg-indigo-700 text-white rounded-[2.5rem] font-black text-xl shadow-2xl hover:bg-indigo-800 disabled:bg-slate-300 transition-all flex items-center justify-center gap-4">
                {state.isGenerating ? <Loader2 className="animate-spin" size={32} /> : "HASILKAN RPM LENGKAP"}
              </button>
            </form>
          </div>
        </section>

        <section className="lg:col-span-8 xl:col-span-8 space-y-10">
          {state.generatedContent ? (
            <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
              <div className="flex flex-wrap items-center justify-between p-8 bg-indigo-950 rounded-[3rem] shadow-2xl border border-white/10 gap-6 no-print">
                <div className="flex items-center gap-4">
                  <div className="bg-emerald-500/20 p-3 rounded-2xl border border-emerald-500/30">
                    <CheckCircle2 className="text-emerald-400" size={32}/>
                  </div>
                  <div>
                    <span className="text-white font-black text-xl block">RPM Berhasil Dibuat</span>
                    <span className="text-indigo-400 text-xs font-bold uppercase tracking-wider">Otomatis & Terstruktur</span>
                  </div>
                </div>
                <div className="flex gap-4">
                  <button onClick={handleDownloadWord} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-black text-sm shadow-xl transition-all">WORD</button>
                  <button onClick={handleDownloadPDF} className="bg-rose-600 hover:bg-rose-700 text-white px-8 py-4 rounded-2xl font-black text-sm shadow-xl transition-all">PDF</button>
                  <button onClick={handlePrintPreview} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-black text-sm shadow-xl transition-all flex items-center gap-2"><Eye size={18} /> PRINT PREVIEW PDF</button>
                </div>
              </div>

              <div className="f4-preview-wrapper shadow-2xl rounded-[3rem] p-12 bg-slate-300/50">
                <div id="rpm-page-container" className="f4-page-container">
                  <div className="f4-page">
                    <h2 className="text-center text-xl font-bold mb-10 underline uppercase tracking-tight">RENCANA PEMBELAJARAN MENDALAM (RPM)</h2>
                    
                    <table className="table-spreadsheet">
                      <thead><tr><th colSpan={2} className="table-header-pink">1. IDENTITAS PEMBELAJARAN</th></tr></thead>
                      <tbody>
                        <tr><td className="col-key">Satuan Pendidikan</td><td>{state.formData.schoolName}</td></tr>
                        <tr><td className="col-key">Mata Pelajaran</td><td>{state.formData.subject}</td></tr>
                        <tr><td className="col-key">Kelas / Semester</td><td>{state.formData.grade} / Semester 2 (Genap)</td></tr>
                        <tr><td className="col-key">Topik Materi Pokok</td><td className="font-bold">{state.formData.material}</td></tr>
                        <tr><td className="col-key">Alokasi Waktu</td><td>{state.formData.duration} ({state.formData.meetingCount} Pertemuan)</td></tr>
                        <tr><td className="col-key">Tahun Pelajaran</td><td>{state.formData.academicYear}</td></tr>
                      </tbody>
                    </table>

                    <table className="table-spreadsheet">
                      <thead><tr><th colSpan={2} className="table-header-pink">2. DESAIN PEMBELAJARAN</th></tr></thead>
                      <tbody>
                        <tr><td className="col-key">Capaian Pembelajaran (CP)</td><td className="text-justify leading-relaxed">{state.formData.cp}</td></tr>
                        <tr><td className="col-key">Tujuan Pembelajaran (TP)</td><td className="whitespace-pre-line leading-relaxed">{state.formData.tp}</td></tr>
                        <tr><td className="col-key">Karakteristik Siswa</td><td>{state.generatedContent.students}</td></tr>
                        <tr><td className="col-key">Kaitan Antar Mapel</td><td>{state.generatedContent.interdisciplinary}</td></tr>
                        <tr><td className="col-key">Praktik Pedagogis</td><td className="font-bold">{state.generatedContent.pedagogy}</td></tr>
                        <tr><td className="col-key">Dimensi Profil Lulusan</td><td className="font-bold">{state.generatedContent.dimensions}</td></tr>
                      </tbody>
                    </table>

                    <div className="bg-[#fce4ec] border-[1.5pt] border-black text-center font-bold uppercase p-3 mb-6 mt-8">3. PENGALAMAN BELAJAR (PEMBELAJARAN MENDALAM)</div>
                    {state.generatedContent.meetings.map((meeting, idx) => (
                      <div key={idx} className="mb-10">
                        <div className="meeting-badge">PERTEMUAN KE-{idx + 1}</div>
                        <table className="table-spreadsheet">
                          <tbody>
                            <tr className="bg-gray-100 font-bold"><td colSpan={2} className="text-center">A. PENDAHULUAN ({meeting.opening.duration})</td></tr>
                            <tr><td colSpan={2} className="whitespace-pre-line pl-8 py-4 leading-relaxed">{meeting.opening.steps}</td></tr>
                            
                            <tr className="bg-gray-100 font-bold"><td colSpan={2} className="text-center">B. KEGIATAN INTI</td></tr>
                            <tr><td className="col-key pl-8 italic">Understand ({meeting.understand.duration})</td><td className="whitespace-pre-line px-6 py-4 leading-relaxed">{meeting.understand.steps}</td></tr>
                            <tr><td className="col-key pl-8 italic">Apply ({meeting.apply.duration})</td><td className="whitespace-pre-line px-6 py-4 leading-relaxed">{meeting.apply.steps}</td></tr>
                            <tr><td className="col-key pl-8 italic">Reflect ({meeting.reflect.duration})</td><td className="whitespace-pre-line px-6 py-4 leading-relaxed">{meeting.reflect.steps}</td></tr>
                            
                            <tr className="bg-gray-100 font-bold"><td colSpan={2} className="text-center">C. PENUTUP ({meeting.closing.duration})</td></tr>
                            <tr><td colSpan={2} className="whitespace-pre-line pl-8 py-4 leading-relaxed">{meeting.closing.steps}</td></tr>
                          </tbody>
                        </table>
                      </div>
                    ))}

                    <div className="page-break"></div>

                    <table className="table-spreadsheet mt-10">
                      <thead><tr><th colSpan={4} className="table-header-pink">4. ASESMEN PEMBELAJARAN</th></tr></thead>
                      <tr className="bg-gray-100 font-bold text-center">
                        <td className="w-[15%]">Jenis</td><td className="w-[25%]">Teknik</td><td className="w-[25%]">Instrumen</td><td>Rubrik/Kriteria</td>
                      </tr>
                      <tbody>
                        <tr><td className="font-bold text-center uppercase">Awal</td><td>{state.generatedContent.assessments.initial.technique}</td><td>{state.generatedContent.assessments.initial.instrument}</td><td>{state.generatedContent.assessments.initial.rubric}</td></tr>
                        <tr><td className="font-bold text-center uppercase">Proses</td><td>{state.generatedContent.assessments.process.technique}</td><td>{state.generatedContent.assessments.process.instrument}</td><td>{state.generatedContent.assessments.process.rubric}</td></tr>
                        <tr><td className="font-bold text-center uppercase">Akhir</td><td>{state.generatedContent.assessments.final.technique}</td><td>{state.generatedContent.assessments.final.instrument}</td><td>{state.generatedContent.assessments.final.rubric}</td></tr>
                      </tbody>
                    </table>

                    <div className="bg-[#fce4ec] border-[1.5pt] border-black text-center font-bold uppercase p-3 mb-6 mt-12">5. RINGKASAN MATERI POKOK</div>
                    <table className="table-spreadsheet">
                      <tbody>
                        {state.generatedImageUrl ? (
                          <tr>
                            <td className="w-[60%] p-8 text-justify leading-relaxed whitespace-pre-line">
                              {state.generatedContent.summary}
                            </td>
                            <td className="w-[40%] p-4 text-center">
                              <div className="border border-black p-1 bg-white mb-2 shadow-sm">
                                <img src={state.generatedImageUrl} alt="Visual Materi" className="w-full h-auto block" />
                              </div>
                              <p className="text-[8pt] italic text-slate-600">Media Visual: Ilustrasi {state.formData.material}</p>
                            </td>
                          </tr>
                        ) : (
                          <tr>
                            <td className="p-10 text-justify leading-relaxed whitespace-pre-line">
                              {state.generatedContent.summary}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>

                    <div className="page-break"></div>

                    <div className="bg-[#fce4ec] border-[1.5pt] border-black text-center font-bold uppercase p-3 mb-6 mt-10">7. LEMBAR KERJA PESERTA DIDIK (LKPD)</div>
                    <div className="border-[1.5pt] border-black p-12 min-h-[160mm]">
                      <h3 className="text-center font-bold underline uppercase mb-10 text-lg">LKPD: {state.formData.material}</h3>
                      <div className="whitespace-pre-line leading-loose text-justify">
                        {state.generatedContent.lkpd}
                      </div>
                    </div>

                    <div className="page-break"></div>

                    <div className="bg-[#fce4ec] border-[1.5pt] border-black text-center font-bold uppercase p-3 mb-10 mt-10">8. SOAL FORMATIF (HOTS) & KUNCI</div>
                    <table className="table-spreadsheet">
                      <thead><tr className="bg-gray-100 text-center font-bold"><th style={{width: '40px'}}>No</th><th>Butir Soal & Pilihan Jawaban</th></tr></thead>
                      <tbody>{state.generatedContent.formativeQuestions.map((q, qIdx) => (
                        <tr key={qIdx}>
                          <td className="text-center font-bold">{qIdx + 1}</td>
                          <td style={{padding: '12pt'}}>
                            <p className="font-bold mb-4 leading-relaxed">{q.question}</p>
                            <table style={{width: '100%', border: 'none'}}>
                              <tbody>
                                <tr>
                                  <td style={{border: 'none', padding: '2pt', width: '50%'}}>A. {q.options.a}</td>
                                  <td style={{border: 'none', padding: '2pt', width: '50%'}}>B. {q.options.b}</td>
                                </tr>
                                <tr>
                                  <td style={{border: 'none', padding: '2pt', width: '50%'}}>C. {q.options.c}</td>
                                  <td style={{border: 'none', padding: '2pt', width: '50%'}}>D. {q.options.d}</td>
                                </tr>
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      ))}</tbody>
                    </table>

                    <div className="mt-12">
                      <p className="font-bold underline text-center uppercase mb-6 text-base">KUNCI JAWABAN</p>
                      <table className="table-answer-key">
                        <tbody>
                          {[0, 5, 10, 15].map(rowStart => (
                            <tr key={rowStart}>
                              {state.generatedContent?.formativeQuestions.slice(rowStart, rowStart + 5).map((q, idx) => (
                                <td key={idx}>
                                  {rowStart + idx + 1}. {q.answer.toUpperCase()}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <table className="table-signatures">
                      <tbody>
                        <tr>
                          <td>
                            <p className="mb-1">Mengetahui,</p>
                            <p className="font-bold mb-20 uppercase">Kepala Sekolah</p>
                            <p className="font-bold underline text-base">{state.formData.principalName}</p>
                            <p className="text-sm">NIP. {state.formData.principalNip}</p>
                          </td>
                          <td>
                            <p className="mb-1">Andopan, .................... 2026</p>
                            <p className="font-bold mb-20 uppercase">Guru Kelas</p>
                            <p className="font-bold underline text-base">{state.formData.teacherName}</p>
                            <p className="text-sm">NIP. {state.formData.teacherNip}</p>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[600px] text-center p-12 bg-white rounded-[3rem] shadow-xl border-2 border-dashed border-slate-200">
               <div className="bg-indigo-50 p-8 rounded-[3rem] mb-8 animate-bounce">
                 <Layout className="text-indigo-600" size={80} strokeWidth={1}/>
               </div>
               <h3 className="text-3xl font-black text-slate-800 mb-4 tracking-tight">Belum Ada RPM</h3>
               <p className="text-slate-500 max-w-lg mx-auto text-lg leading-relaxed">
                 Pilih topik di sebelah kiri. CP, TP, Pedagogi, and Dimensi akan terisi otomatis oleh AI.
               </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
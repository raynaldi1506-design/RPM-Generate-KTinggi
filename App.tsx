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
  generatePromes,
  ChapterInfo
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
  Eye,
  FileText
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

  const [aiTopics, setAiTopics] = useState<ChapterInfo[]>([]);
  const [isFetchingTopics, setIsFetchingTopics] = useState(false);
  const [topicSearchQuery, setTopicSearchQuery] = useState("");
  const [isComboboxOpen, setIsComboboxOpen] = useState(false);
  const comboboxRef = useRef<HTMLDivElement>(null);
  
  const [library, setLibrary] = useState<LibraryEntry[]>([]);
  const [showLibrary, setShowLibrary] = useState(false);

  const [protaData, setProtaData] = useState<ProtaEntry[] | null>(null);
  const [promesData, setPromesData] = useState<PromesEntry[] | null>(null);
  const [isGeneratingExtra, setIsGeneratingExtra] = useState(false);

  useEffect(() => {
    const savedFormData = localStorage.getItem('rpm_form_data');
    if (savedFormData) {
      try {
        const parsed = JSON.parse(savedFormData);
        setState(prev => ({ ...prev, formData: { ...INITIAL_FORM, ...parsed } }));
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('rpm_form_data', JSON.stringify(state.formData));
  }, [state.formData]);

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
          setState(prev => ({ ...prev, isPrefilling: false, error: "Gagal sinkronisasi otomatis." }));
        }
      }
    };
    const isActuallyEmpty = !state.formData.cp && !state.formData.tp;
    if (isActuallyEmpty) {
       triggerPrefill();
    }
  }, [state.formData.material, state.formData.subject, state.formData.grade]);

  const handleGenerateNewTopics = async () => {
    if (!topicSearchQuery.trim()) return;
    setIsFetchingTopics(true);
    try {
      const newTopics = await getAITopics(state.formData.subject, state.formData.grade, topicSearchQuery);
      setAiTopics(newTopics);
      setIsComboboxOpen(true);
    } catch (err) {
      alert("Gagal menghasilkan topik baru.");
    } finally {
      setIsFetchingTopics(false);
    }
  };

  const filteredTopics = useMemo(() => {
    if (!topicSearchQuery) return aiTopics;
    const query = topicSearchQuery.toLowerCase();
    return aiTopics.map(chap => ({
      ...chap,
      materials: chap.materials.filter(m => m.toLowerCase().includes(query))
    })).filter(chap => chap.materials.length > 0 || chap.title.toLowerCase().includes(query));
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

  const handleTopicSelect = (material: string) => {
    setState(prev => ({
      ...prev,
      formData: { ...prev.formData, material, cp: "", tp: "" }
    }));
    setTopicSearchQuery(material);
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
    } catch (e) { alert("Gagal"); }
    finally { setIsGeneratingExtra(false); }
  };

  const handleGenPromes = async () => {
    setIsGeneratingExtra(true);
    try {
      const data = await generatePromes(state.formData.subject, state.formData.grade, 2);
      setPromesData(data);
    } catch (e) { alert("Gagal"); }
    finally { setIsGeneratingExtra(false); }
  };

  const resetForm = () => {
    if (confirm("Reset data form?")) {
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
      html2pdf().from(element).set(opt).output('bloburl').then((url: string) => {
        window.open(url, '_blank');
      });
    } else if (type === 'pdf') {
      html2pdf().from(element).set(opt).save();
    } else {
      const html = `<html><body style="font-family:'Times New Roman'">${element.innerHTML}</body></html>`;
      const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${filename}.doc`;
      link.click();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans">
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

      {/* MODALS for PROTA/PROMES */}
      {(protaData || promesData) && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-indigo-950/80 backdrop-blur-md p-4 no-print">
          <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-[3rem] overflow-hidden flex flex-col shadow-2xl">
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
                      <h2 className="text-center text-xl font-bold underline mb-8 uppercase">PROGRAM TAHUNAN (PROTA) 2025/2026</h2>
                      <table className="table-spreadsheet">
                        <thead><tr className="table-header-pink"><th>No</th><th>Semester</th><th>Materi Pokok</th><th>Alokasi JP</th></tr></thead>
                        <tbody>{protaData.map((item, idx) => (
                          <tr key={idx}><td className="text-center font-bold">{idx + 1}</td><td className="text-center">SMT {item.semester}</td><td>{item.material}</td><td className="text-center">{item.hours} JP</td></tr>
                        ))}</tbody>
                      </table>
                    </>
                  ) : (
                    <>
                      <h2 className="text-center text-xl font-bold underline mb-8 uppercase">PROGRAM SEMESTER (PROMES) GENAP 2026</h2>
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
               <button onClick={() => downloadDocument('extra-print-area', 'Administrasi', 'word')} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-sm shadow-lg">WORD</button>
               <button onClick={() => downloadDocument('extra-print-area', 'Administrasi', 'pdf')} className="bg-rose-600 text-white px-8 py-3 rounded-2xl font-black text-sm shadow-lg">PDF</button>
            </div>
          </div>
        </div>
      )}

      {/* MARQUEE */}
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
        {/* FORM SECTION */}
        <section className="lg:col-span-4 xl:col-span-4 no-print space-y-8 pb-12">
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden sticky top-32">
            <div className="bg-indigo-800 px-10 py-8 border-b border-indigo-900/10">
              <h2 className="text-xl font-black text-white uppercase flex items-center gap-3">
                <PenTool size={24} className="text-indigo-300" /> Input Data RPM
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-10 space-y-10 max-h-[75vh] overflow-y-auto custom-scrollbar">
              {/* SUBJECT & GRADE */}
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Mata Pelajaran</label>
                    <select name="subject" value={state.formData.subject} onChange={handleInputChange} className="w-full p-4 border-2 border-slate-200 rounded-2xl font-bold bg-slate-50 focus:border-indigo-500 transition-all">
                      {SD_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Kelas</label>
                    <select name="grade" value={state.formData.grade} onChange={handleInputChange} className="w-full p-4 border-2 border-slate-200 rounded-2xl font-bold bg-slate-50">
                      {SD_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Jml Pertemuan</label>
                    <input type="number" name="meetingCount" value={state.formData.meetingCount} onChange={handleInputChange} className="w-full p-4 border-2 border-slate-200 rounded-2xl font-bold bg-slate-50" min="1" max="10"/>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button type="button" onClick={handleGenProta} className="py-4 bg-amber-50 text-amber-700 border border-amber-200 rounded-2xl font-black text-xs flex items-center justify-center gap-2">
                    <ClipboardList size={16}/> PROTA
                  </button>
                  <button type="button" onClick={handleGenPromes} className="py-4 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-2xl font-black text-xs flex items-center justify-center gap-2">
                    <Calendar size={16}/> PROMES
                  </button>
                </div>
              </div>

              {/* TOPIK/MATERI DROPDOWN (DETAIL) */}
              <div className="space-y-6" ref={comboboxRef}>
                <label className="text-[10px] font-black text-indigo-700 uppercase flex items-center gap-2 mb-2">
                  Pilih Bab & Materi Pokok (Smt 2) {isFetchingTopics && <Loader2 className="animate-spin" size={12}/>}
                </label>
                <div className="relative">
                    <div className="flex items-center border-2 border-indigo-200 rounded-2xl bg-indigo-50/30 overflow-hidden focus-within:border-indigo-500 transition-all shadow-sm">
                       <Search className="ml-4 text-indigo-400" size={18} />
                       <input 
                         type="text" placeholder="Cari materi pokok..." 
                         value={topicSearchQuery}
                         onChange={(e) => { setTopicSearchQuery(e.target.value); setIsComboboxOpen(true); }}
                         onFocus={() => setIsComboboxOpen(true)}
                         className="flex-1 p-4 font-bold outline-none bg-transparent"
                       />
                    </div>
                    {isComboboxOpen && (
                      <div className="absolute z-[60] left-0 right-0 mt-3 bg-white border-2 border-indigo-200 rounded-3xl shadow-2xl max-h-[350px] overflow-y-auto custom-scrollbar">
                        {filteredTopics.length > 0 ? filteredTopics.map((chap, i) => (
                          <div key={i} className="border-b border-indigo-50 last:border-0">
                             <div className="bg-indigo-900/5 px-6 py-3 font-black text-indigo-900 text-xs uppercase flex items-center gap-2">
                                <BookMarked size={14}/> {chap.chapter}: {chap.title}
                             </div>
                             <div className="py-2">
                               {chap.materials.map((mat, j) => (
                                 <div 
                                   key={j} 
                                   onClick={() => handleTopicSelect(mat)}
                                   className="px-10 py-3 hover:bg-indigo-50 cursor-pointer text-sm font-bold text-slate-700 flex items-center gap-3 transition-colors"
                                 >
                                   <FileText size={14} className="text-slate-400" /> {mat}
                                 </div>
                               ))}
                             </div>
                          </div>
                        )) : (
                          <div className="p-10 text-center space-y-4">
                             <p className="text-sm font-bold text-slate-400 uppercase">Materi tidak ditemukan</p>
                             <button type="button" onClick={handleGenerateNewTopics} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase shadow-md">Buat Rincian Khusus</button>
                          </div>
                        )}
                      </div>
                    )}
                </div>
              </div>

              {/* CURRICULUM FIELDS */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b-2 border-slate-100 mb-4">
                  <Layout className="text-indigo-600" size={18} />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Desain Pembelajaran</span>
                </div>
                
                {state.isPrefilling ? (
                  <div className="p-10 bg-indigo-50 rounded-3xl text-center border-2 border-indigo-100 animate-pulse">
                    <Loader2 className="animate-spin mx-auto text-indigo-600 mb-4" size={32} />
                    <p className="text-xs font-black text-indigo-800 uppercase tracking-widest">Memproses Silabus 2026...</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">CP</label>
                      <textarea name="cp" value={state.formData.cp} onChange={handleInputChange} className="w-full p-4 border-2 border-slate-200 rounded-2xl text-sm h-32 bg-slate-50 resize-none"></textarea>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">TP</label>
                      <textarea name="tp" value={state.formData.tp} onChange={handleInputChange} className="w-full p-4 border-2 border-slate-200 rounded-2xl text-sm h-32 bg-slate-50 resize-none"></textarea>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase block">Praktik Pedagogis</label>
                      <div className="grid grid-cols-1 gap-2">
                        {Object.values(PedagogicalPractice).map(p => (
                          <button key={p} type="button" onClick={() => toggleCheckbox('pedagogy', p)} className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left text-[11px] font-bold ${state.formData.pedagogy.includes(p) ? 'border-indigo-600 bg-indigo-50 text-indigo-900' : 'border-slate-100 text-slate-500 hover:bg-slate-50'}`}>
                            {state.formData.pedagogy.includes(p) ? <CheckSquare size={16} /> : <Square size={16} />} {p}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase block">Profil Lulusan</label>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.values(GraduateDimension).map(d => (
                          <button key={d} type="button" onClick={() => toggleCheckbox('dimensions', d)} className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left text-[10px] font-bold ${state.formData.dimensions.includes(d) ? 'border-indigo-600 bg-indigo-50 text-indigo-900' : 'border-slate-100 text-slate-500 hover:bg-slate-50'}`}>
                            {state.formData.dimensions.includes(d) ? <CheckSquare size={14} /> : <Square size={14} />} {d}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SIGNATORIES */}
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4">
                  <input type="text" name="teacherName" placeholder="Nama Guru" value={state.formData.teacherName} onChange={handleInputChange} className="w-full p-4 border-2 border-slate-200 rounded-2xl font-bold text-sm bg-slate-50" />
                  <input type="text" name="teacherNip" placeholder="NIP Guru" value={state.formData.teacherNip} onChange={handleInputChange} className="w-full p-4 border-2 border-slate-200 rounded-2xl text-sm bg-slate-50" />
                  <input type="text" name="principalName" placeholder="Nama Kepala Sekolah" value={state.formData.principalName} onChange={handleInputChange} className="w-full p-4 border-2 border-slate-200 rounded-2xl font-bold text-sm bg-slate-50" />
                  <input type="text" name="principalNip" placeholder="NIP Kepala Sekolah" value={state.formData.principalNip} onChange={handleInputChange} className="w-full p-4 border-2 border-slate-200 rounded-2xl text-sm bg-slate-50" />
                </div>
              </div>

              <button type="submit" disabled={state.isGenerating || !state.formData.material} className="w-full py-7 bg-indigo-700 text-white rounded-[2.5rem] font-black text-xl shadow-2xl hover:bg-indigo-800 disabled:bg-slate-300 transition-all">
                {state.isGenerating ? <Loader2 className="animate-spin mx-auto" size={32} /> : "HASILKAN RPM LENGKAP"}
              </button>
            </form>
          </div>
        </section>

        {/* PREVIEW SECTION */}
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
                  <button onClick={() => window.print()} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-sm shadow-xl flex items-center gap-2"><Eye size={18} /> PRINT PREVIEW PDF</button>
                  <button onClick={() => downloadDocument('rpm-page-container', 'RPM', 'word')} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-sm shadow-xl">WORD</button>
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
                        <tr><td className="col-key">Tahun Pelajaran</td><td>{state.formData.academicYear}</td></tr>
                      </tbody>
                    </table>

                    <table className="table-spreadsheet">
                      <thead><tr><th colSpan={2} className="table-header-pink">2. DESAIN PEMBELAJARAN</th></tr></thead>
                      <tbody>
                        <tr><td className="col-key">CP</td><td className="text-justify">{state.formData.cp}</td></tr>
                        <tr><td className="col-key">TP</td><td className="whitespace-pre-line">{state.formData.tp}</td></tr>
                        <tr><td className="col-key">Praktik Pedagogis</td><td className="font-bold">{state.generatedContent.pedagogy}</td></tr>
                        <tr><td className="col-key">Profil Lulusan</td><td className="font-bold">{state.generatedContent.dimensions}</td></tr>
                      </tbody>
                    </table>

                    <div className="bg-[#fce4ec] border-[1.5pt] border-black text-center font-bold uppercase p-3 mb-6 mt-8">3. PENGALAMAN BELAJAR</div>
                    {state.generatedContent.meetings.map((meeting, idx) => (
                      <div key={idx} className="mb-10">
                        <div className="meeting-badge">PERTEMUAN KE-{idx + 1}</div>
                        <table className="table-spreadsheet">
                          <tbody>
                            <tr className="bg-gray-100 font-bold"><td colSpan={2} className="text-center uppercase">A. Pendahuluan ({meeting.opening.duration})</td></tr>
                            <tr><td colSpan={2} className="whitespace-pre-line pl-8 py-4 leading-relaxed">{meeting.opening.steps}</td></tr>
                            <tr className="bg-gray-100 font-bold"><td colSpan={2} className="text-center uppercase">B. Kegiatan Inti</td></tr>
                            <tr><td className="col-key pl-8 italic">Understand</td><td className="whitespace-pre-line px-6 py-4">{meeting.understand.steps}</td></tr>
                            <tr><td className="col-key pl-8 italic">Apply</td><td className="whitespace-pre-line px-6 py-4">{meeting.apply.steps}</td></tr>
                            <tr><td className="col-key pl-8 italic">Reflect</td><td className="whitespace-pre-line px-6 py-4">{meeting.reflect.steps}</td></tr>
                            <tr className="bg-gray-100 font-bold"><td colSpan={2} className="text-center uppercase">C. Penutup ({meeting.closing.duration})</td></tr>
                            <tr><td colSpan={2} className="whitespace-pre-line pl-8 py-4">{meeting.closing.steps}</td></tr>
                          </tbody>
                        </table>
                      </div>
                    ))}

                    <div className="page-break"></div>
                    <div className="bg-[#fce4ec] border-[1.5pt] border-black text-center font-bold uppercase p-3 mb-6 mt-12">4. RINGKASAN MATERI POKOK</div>
                    <table className="table-spreadsheet">
                      <tbody>
                        <tr>
                          <td className="p-8 text-justify leading-relaxed whitespace-pre-line">
                            {state.generatedContent.summary}
                          </td>
                          {state.generatedImageUrl && (
                            <td className="w-[40%] p-4 text-center">
                              <img src={state.generatedImageUrl} alt="Visual" className="w-full h-auto border border-black p-1 bg-white" />
                            </td>
                          )}
                        </tr>
                      </tbody>
                    </table>

                    <div className="page-break"></div>
                    <div className="bg-[#fce4ec] border-[1.5pt] border-black text-center font-bold uppercase p-3 mb-6 mt-10">5. SOAL FORMATIF HOTS</div>
                    <table className="table-spreadsheet">
                      <tbody>{state.generatedContent.formativeQuestions.map((q, qIdx) => (
                        <tr key={qIdx}>
                          <td className="text-center font-bold">{qIdx + 1}</td>
                          <td className="p-4">
                            <p className="font-bold mb-2">{q.question}</p>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <span>A. {q.options.a}</span><span>B. {q.options.b}</span>
                              <span>C. {q.options.c}</span><span>D. {q.options.d}</span>
                            </div>
                          </td>
                        </tr>
                      ))}</tbody>
                    </table>

                    <table className="table-signatures mt-20">
                      <tbody>
                        <tr>
                          <td>
                            <p className="font-bold mb-20 uppercase">Kepala Sekolah</p>
                            <p className="font-bold underline">{state.formData.principalName}</p>
                            <p>NIP. {state.formData.principalNip}</p>
                          </td>
                          <td>
                            <p className="font-bold mb-20 uppercase">Guru Kelas</p>
                            <p className="font-bold underline">{state.formData.teacherName}</p>
                            <p>NIP. {state.formData.teacherNip}</p>
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
               <h3 className="text-3xl font-black text-slate-800 mb-4">Belum Ada RPM</h3>
               <p className="text-slate-500 max-w-lg mx-auto text-lg">Pilih materi pokok kurikulum merdeka semester 2 di sebelah kiri untuk memulai.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
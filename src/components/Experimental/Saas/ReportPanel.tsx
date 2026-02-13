import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { FileText, Printer, Calendar, Sparkles, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { ReportDocument } from '../../Reporting/ReportDocument';

export default function ReportPanel() {
    // Default to current month
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const [loading, setLoading] = useState(false);
    const [startDate, setStartDate] = useState(firstDay);
    const [endDate, setEndDate] = useState(lastDay);
    const [status, setStatus] = useState('');

    // Data state
    const [reportData, setReportData] = useState<any>(null);
    const [showPreview, setShowPreview] = useState(false);

    const handleGenerate = async () => {
        setLoading(true);
        setStatus('Consultando IA...');
        setReportData(null);

        try {
            // 1. Call the Edge Function
            const { data: result, error } = await supabase.functions.invoke('generate-report', {
                body: {
                    startDate,
                    endDate,
                    distritoId: 6, // Default or dynamic if needed later
                }
            });

            if (error) throw new Error(error.message || "Error en función");
            if (!result) throw new Error("Sin datos de IA");

            // 2. Set Data
            setReportData(result);
            setStatus('Reporte Listo');
            setShowPreview(true);

        } catch (err: any) {
            console.error(err);
            setStatus('Error: ' + (err.message || 'Desconocido'));
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <>
            {/* PANEL LATERAL */}
            <div className="fixed right-6 top-24 z-[1050] w-80 animate-in slide-in-from-right-10 fade-in duration-500 pointer-events-auto">
                <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">

                    {/* Header */}
                    <div className="p-4 border-b border-white/10 bg-white/5 flex justify-between items-center">
                        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                            <Sparkles size={14} className="text-purple-400" />
                            Reportes IA
                        </h2>
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-1 rounded">
                            BETA
                        </span>
                    </div>

                    {/* Controls */}
                    <div className="p-5 space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs text-slate-400 font-medium ml-1 flex items-center gap-1">
                                <Calendar size={12} /> Inicio
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                className="w-full bg-slate-950/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors/[0.2] cursor-pointer"
                                style={{ colorScheme: 'dark' }}
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs text-slate-400 font-medium ml-1 flex items-center gap-1">
                                <Calendar size={12} /> Fin
                            </label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                                className="w-full bg-slate-950/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors cursor-pointer"
                                style={{ colorScheme: 'dark' }}
                            />
                        </div>

                        <button
                            onClick={handleGenerate}
                            disabled={loading}
                            className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all shadow-lg
                                ${loading
                                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-500 hover:to-blue-500 active:scale-95 shadow-purple-900/20'
                                }
                            `}
                        >
                            {loading ? (
                                <>
                                    <Sparkles size={16} className="animate-spin" />
                                    Generando...
                                </>
                            ) : (
                                <>
                                    <FileText size={16} />
                                    Generar Informe
                                </>
                            )}
                        </button>

                        {/* Status Message */}
                        {status && (
                            <div className={`text-xs text-center p-2 rounded-lg border ${status.includes('Error')
                                ? 'bg-red-500/10 border-red-500/20 text-red-400'
                                : 'bg-green-500/10 border-green-500/20 text-green-400'
                                }`}>
                                {status.includes('Error') ? <AlertCircle size={12} className="inline mr-1" /> : <CheckCircle2 size={12} className="inline mr-1" />}
                                {status}
                            </div>
                        )}

                        {/* Recent Reports / Actions */}
                        {reportData && !loading && (
                            <div className="pt-4 border-t border-white/10">
                                <button
                                    onClick={() => setShowPreview(true)}
                                    className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-slate-300 transition-colors flex items-center justify-center gap-2"
                                >
                                    <FileText size={12} />
                                    Ver Último Reporte generado
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* PREVIEW MODAL */}
            {showPreview && reportData && (
                <div className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300 pointer-events-auto">
                    <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">

                        {/* Modal Header */}
                        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <FileText className="text-purple-600" />
                                Vista Previa del Reporte
                            </h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={handlePrint}
                                    className="px-3 py-1.5 bg-slate-800 text-white text-sm rounded hover:bg-slate-700 flex items-center gap-2 transition-colors"
                                >
                                    <Printer size={16} />
                                    Imprimir / PDF
                                </button>
                                <button
                                    onClick={() => setShowPreview(false)}
                                    className="p-1.5 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body (Scrollable) */}
                        <div className="flex-1 overflow-y-auto p-8 bg-white print:p-0">
                            <ReportDocument
                                data={reportData}
                                startDate={startDate}
                                endDate={endDate}
                            />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

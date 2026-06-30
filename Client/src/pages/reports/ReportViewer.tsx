import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { AiReportResponse, ReportSection } from "../../types";
import { GlassCard } from "../shared";

interface ReportViewerProps {
  report: AiReportResponse;
  onClose: () => void;
  onDownloadPdf: (reportType: string) => void;
}

const colorMap: Record<string, string> = {
  indigo: "bg-indigo-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  violet: "bg-violet-500",
  blue: "bg-blue-500",
  cyan: "bg-cyan-500",
  green: "bg-green-500",
  orange: "bg-orange-500",
  pink: "bg-pink-500",
};

const textColorMap: Record<string, string> = {
  indigo: "text-indigo-600",
  emerald: "text-emerald-600",
  amber: "text-amber-600",
  red: "text-red-600",
  violet: "text-violet-600",
  blue: "text-blue-600",
  cyan: "text-cyan-600",
  green: "text-green-600",
  orange: "text-orange-600",
  pink: "text-pink-600",
};

const bgLightMap: Record<string, string> = {
  indigo: "bg-indigo-50",
  emerald: "bg-emerald-50",
  amber: "bg-amber-50",
  red: "bg-red-50",
  violet: "bg-violet-50",
  blue: "bg-blue-50",
  cyan: "bg-cyan-50",
  green: "bg-green-50",
  orange: "bg-orange-50",
  pink: "bg-pink-50",
};

function sectionIcon(type: string): string {
  switch (type) {
    case "analysis": return "insights";
    case "detail": return "info";
    case "recommendation": return "lightbulb";
    default: return "article";
  }
}

export function ReportViewer({ report, onClose, onDownloadPdf }: ReportViewerProps) {
  const chartData = useMemo(() => {
    return report.metrics.map((m) => ({
      name: m.label,
      value: parseFloat(m.value.replace(/[^0-9.-]/g, "")) || 0,
    }));
  }, [report.metrics]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 backdrop-blur-sm pt-6 pb-12">
      <div className="w-full max-w-5xl mx-4">
        <GlassCard className="p-0 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-indigo-500 to-indigo-600">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined">description</span>
                {report.title}
              </h2>
              <p className="text-xs text-indigo-100 mt-0.5">
                Generated {new Date(report.generatedAt).toLocaleString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onDownloadPdf(report.reportType)}
                className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">download</span>
                PDF
              </button>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-white text-lg">close</span>
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
            {/* Summary */}
            {report.summary && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-sm text-slate-700 leading-relaxed">{report.summary}</p>
              </div>
            )}

            {/* Metrics */}
            {report.metrics.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-indigo-500">dashboard</span>
                  Key Metrics
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {report.metrics.map((metric, i) => (
                    <div
                      key={i}
                      className={`p-4 rounded-xl border ${bgLightMap[metric.color] || "bg-slate-50"} border-slate-200`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`material-symbols-outlined text-lg ${textColorMap[metric.color] || "text-slate-500"}`}
                        >
                          {metric.icon}
                        </span>
                        <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                          {metric.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-slate-800">{metric.value}</span>
                        <span className={`text-xs font-semibold ${
                          metric.trend === "up" ? "text-emerald-500" :
                          metric.trend === "down" ? "text-red-500" : "text-slate-400"
                        }`}>
                          <span className="material-symbols-outlined text-sm">
                            {metric.trend === "up" ? "trending_up" :
                             metric.trend === "down" ? "trending_down" : "trending_flat"}
                          </span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Chart */}
            {chartData.length > 1 && (
              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-indigo-500">bar_chart</span>
                  Metrics Overview
                </h3>
                <div className="p-4 rounded-xl border border-slate-200 bg-white">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "10px",
                          border: "1px solid #e2e8f0",
                          fontSize: "12px",
                        }}
                      />
                      <Bar dataKey="value" fill="#6366f1" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Sections */}
            {report.sections.length > 0 && (
              <div className="space-y-4">
                {report.sections.map((section: ReportSection, i: number) => (
                  <div key={i} className="p-4 rounded-xl border border-slate-200 bg-white">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-indigo-500 text-lg">
                        {sectionIcon(section.type)}
                      </span>
                      <h4 className="text-sm font-bold text-slate-800">{section.title}</h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium capitalize ml-auto">
                        {section.type}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">{section.content}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Tables */}
            {report.tables.length > 0 && (
              <div className="space-y-4">
                {report.tables.map((table, i) => (
                  <div key={i}>
                    <h4 className="text-sm font-bold text-slate-800 mb-2">{table.title}</h4>
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-100">
                            {table.columns.map((col, j) => (
                              <th key={j} className="px-4 py-2.5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {table.rows.map((row, j) => (
                            <tr key={j} className={j % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                              {row.map((cell, k) => (
                                <td key={k} className="px-4 py-2 text-slate-700">{cell}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Insights */}
            {report.insights.length > 0 && (
              <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200">
                <h3 className="text-sm font-bold text-amber-800 mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-600">insights</span>
                  Key Insights
                </h3>
                <ul className="space-y-2">
                  {report.insights.map((insight, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-amber-900">
                      <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {report.recommendations.length > 0 && (
              <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
                <h3 className="text-sm font-bold text-blue-800 mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-600">lightbulb</span>
                  Recommendations
                </h3>
                <ol className="space-y-2">
                  {report.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      {rec}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

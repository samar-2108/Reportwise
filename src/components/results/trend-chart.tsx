"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceArea,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { parseReferenceRange } from "@/lib/medical/deterministic-check";

export interface HistoricalTestPoint {
  date: string;
  value: number;
  unit?: string;
  refRange?: string;
  reportTitle?: string;
}

interface TrendChartProps {
  currentTestName: string;
  availableTests: string[];
  data: HistoricalTestPoint[];
  onSelectTest?: (testName: string) => void;
}

export function TrendChart({
  currentTestName,
  availableTests,
  data,
  onSelectTest,
}: TrendChartProps) {
  const [selectedTest, setSelectedTest] = useState(currentTestName);

  const handleTestChange = (name: string) => {
    setSelectedTest(name);
    if (onSelectTest) onSelectTest(name);
  };

  const chartData = data.filter((d) => !isNaN(d.value));

  // Determine reference range min and max from first point if available
  const sampleRef = chartData[0]?.refRange;
  const { min: refMin, max: refMax } = parseReferenceRange(sampleRef);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-teal-600" />
            Biomarker Trend Over Time
          </h4>
          <p className="text-xs text-slate-500">
            Compare values across your diagnostic history to observe changes.
          </p>
        </div>

        {/* Test Selector Dropdown */}
        {availableTests.length > 0 && (
          <select
            value={selectedTest}
            onChange={(e) => handleTestChange(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 focus:border-teal-500 focus:outline-none"
          >
            {availableTests.map((test) => (
              <option key={test} value={test}>
                {test}
              </option>
            ))}
          </select>
        )}
      </div>

      {chartData.length < 2 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-xs text-slate-500 space-y-2">
          <p className="font-semibold text-slate-700">Single Report Recorded</p>
          <p className="max-w-xs mx-auto text-[11px] text-slate-400">
            Current recorded value for <span className="font-semibold text-slate-600">{selectedTest}</span> is{" "}
            <span className="font-semibold font-mono text-teal-600">{chartData[0]?.value ?? "-"} {chartData[0]?.unit ?? ""}</span>.
            Future uploaded reports will automatically generate historical trend curves here.
          </p>
        </div>
      ) : (
        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#64748b" }}
                tickLine={false}
                axisLine={{ stroke: "#e2e8f0" }}
              />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fontSize: 11, fill: "#64748b" }}
                tickLine={false}
                axisLine={{ stroke: "#e2e8f0" }}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const point = payload[0].payload as HistoricalTestPoint;
                    return (
                      <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-md text-xs space-y-1">
                        <div className="font-semibold text-slate-800">{label}</div>
                        <div className="text-teal-600 font-mono font-bold">
                          {point.value} {point.unit || ""}
                        </div>
                        {point.refRange && (
                          <div className="text-[11px] text-slate-400">Ref: {point.refRange}</div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {/* Reference Range Band if min & max exist */}
              {refMin !== null && refMax !== null && (
                <ReferenceArea
                  y1={refMin}
                  y2={refMax}
                  fill="#10b981"
                  fillOpacity={0.08}
                  stroke="#10b981"
                  strokeOpacity={0.2}
                />
              )}

              <Line
                type="monotone"
                dataKey="value"
                stroke="#0d9488"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "#0d9488", strokeWidth: 2, stroke: "#fff" }}
                activeDot={{ r: 6, fill: "#0f766e" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

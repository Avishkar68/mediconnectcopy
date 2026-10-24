import i18n from "../i18n/index.js";
import React, { useState } from 'react';
import {
  Heart,
  Activity,
  Thermometer,
  Scale,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Calendar,
} from 'lucide-react';

const HealthTrendChart = ({ vitals = [], height = 240 }) => {
  const [metric, setMetric] = useState('bp'); // 'bp', 'hr', 'temp', 'weight'
  const [hoveredPoint, setHoveredPoint] = useState(null);

  if (!vitals || vitals.length === 0) {
    return (
      <div className="p-8 text-center border border-dashed border-slate-800 rounded-2xl text-xs text-slate-500">
        {i18n.t("No vital sign readings logged yet. Add readings above to generate interactive trend curves.")}
      </div>
    );
  }

  // Sort chronological
  const sortedVitals = [...vitals].sort(
    (a, b) => new Date(a.recordedAt || a.createdAt) - new Date(b.recordedAt || b.createdAt)
  );

  // SVG Chart dimensions
  const svgWidth = 600;
  const svgHeight = height;
  const padding = { top: 25, right: 30, bottom: 40, left: 45 };
  const innerWidth = svgWidth - padding.left - padding.right;
  const innerHeight = svgHeight - padding.top - padding.bottom;

  // Extract metric data
  let points = [];
  let yMin = 0;
  let yMax = 200;
  let unit = '';
  let metricTitle = '';

  if (metric === 'bp') {
    metricTitle = 'Blood Pressure Trend (Systolic & Diastolic)';
    unit = 'mmHg';
    const systolicVals = sortedVitals.map((v) => v.bloodPressureSystolic || 120);
    const diastolicVals = sortedVitals.map((v) => v.bloodPressureDiastolic || 80);
    yMin = Math.max(40, Math.min(...diastolicVals) - 15);
    yMax = Math.min(220, Math.max(...systolicVals) + 20);

    points = sortedVitals.map((v, i) => {
      const x = padding.left + (i / Math.max(1, sortedVitals.length - 1)) * innerWidth;
      const sys = v.bloodPressureSystolic || 120;
      const dia = v.bloodPressureDiastolic || 80;
      const ySys = padding.top + innerHeight - ((sys - yMin) / (yMax - yMin)) * innerHeight;
      const yDia = padding.top + innerHeight - ((dia - yMin) / (yMax - yMin)) * innerHeight;
      return {
        x,
        ySys,
        yDia,
        sys,
        dia,
        date: new Date(v.recordedAt || v.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' }),
        fullDate: new Date(v.recordedAt || v.createdAt).toLocaleString(),
        raw: v,
      };
    });
  } else if (metric === 'hr') {
    metricTitle = 'Heart Rate & Pulse Trend';
    unit = 'BPM';
    const hrVals = sortedVitals.map((v) => v.heartRate || 72);
    yMin = Math.max(40, Math.min(...hrVals) - 15);
    yMax = Math.min(180, Math.max(...hrVals) + 20);

    points = sortedVitals.map((v, i) => {
      const x = padding.left + (i / Math.max(1, sortedVitals.length - 1)) * innerWidth;
      const val = v.heartRate || 72;
      const y = padding.top + innerHeight - ((val - yMin) / (yMax - yMin)) * innerHeight;
      return {
        x,
        y,
        val,
        date: new Date(v.recordedAt || v.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' }),
        fullDate: new Date(v.recordedAt || v.createdAt).toLocaleString(),
        raw: v,
      };
    });
  } else if (metric === 'temp') {
    metricTitle = 'Body Temperature Trend';
    unit = '°C';
    const tempVals = sortedVitals.map((v) => v.temperature || 37.0);
    yMin = Math.max(34.0, Math.min(...tempVals) - 1.0);
    yMax = Math.min(42.0, Math.max(...tempVals) + 1.0);

    points = sortedVitals.map((v, i) => {
      const x = padding.left + (i / Math.max(1, sortedVitals.length - 1)) * innerWidth;
      const val = v.temperature || 37.0;
      const y = padding.top + innerHeight - ((val - yMin) / (yMax - yMin)) * innerHeight;
      return {
        x,
        y,
        val,
        date: new Date(v.recordedAt || v.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' }),
        fullDate: new Date(v.recordedAt || v.createdAt).toLocaleString(),
        raw: v,
      };
    });
  } else if (metric === 'weight') {
    metricTitle = 'Body Weight Trend';
    unit = 'kg';
    const weightVals = sortedVitals.map((v) => v.weight || 70);
    yMin = Math.max(30, Math.min(...weightVals) - 5);
    yMax = Math.max(...weightVals) + 5;

    points = sortedVitals.map((v, i) => {
      const x = padding.left + (i / Math.max(1, sortedVitals.length - 1)) * innerWidth;
      const val = v.weight || 70;
      const y = padding.top + innerHeight - ((val - yMin) / (yMax - yMin)) * innerHeight;
      return {
        x,
        y,
        val,
        date: new Date(v.recordedAt || v.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' }),
        fullDate: new Date(v.recordedAt || v.createdAt).toLocaleString(),
        raw: v,
      };
    });
  }

  // Create SVG path string
  const createLinePath = (coords, yKey = 'y') => {
    if (coords.length === 0) return '';
    if (coords.length === 1) {
      return `M ${coords[0].x - 10} ${coords[0][yKey]} L ${coords[0].x + 10} ${coords[0][yKey]}`;
    }
    return coords.reduce((acc, curr, i) => {
      return i === 0 ? `M ${curr.x} ${curr[yKey]}` : `${acc} L ${curr.x} ${curr[yKey]}`;
    }, '');
  };

  // Create SVG gradient area path
  const createAreaPath = (coords, yKey = 'y') => {
    if (coords.length < 2) return '';
    const line = coords.reduce((acc, curr, i) => {
      return i === 0 ? `M ${curr.x} ${curr[yKey]}` : `${acc} L ${curr.x} ${curr[yKey]}`;
    }, '');
    const firstX = coords[0].x;
    const lastX = coords[coords.length - 1].x;
    const bottomY = padding.top + innerHeight;
    return `${line} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  };

  // Summary calculations
  const calculateAverages = () => {
    if (metric === 'bp') {
      const avgSys = Math.round(
        points.reduce((acc, p) => acc + p.sys, 0) / points.length
      );
      const avgDia = Math.round(
        points.reduce((acc, p) => acc + p.dia, 0) / points.length
      );
      const latest = points[points.length - 1];
      const isElevated = latest.sys >= 130 || latest.dia >= 85;
      return {
        avgText: `${avgSys}/${avgDia} mmHg`,
        latestText: `${latest.sys}/${latest.dia} mmHg`,
        status: isElevated ? 'Elevated Range' : 'Optimal Normotensive',
        statusColor: isElevated ? 'text-amber-400 bg-amber-500/10' : 'text-emerald-400 bg-emerald-500/10',
      };
    }
    const avg = (points.reduce((acc, p) => acc + p.val, 0) / points.length).toFixed(1);
    const latest = points[points.length - 1]?.val;
    return {
      avgText: `${avg} ${unit}`,
      latestText: `${latest} ${unit}`,
      status: 'Tracking Normative',
      statusColor: 'text-brand-400 bg-brand-500/10',
    };
  };

  const stats = calculateAverages();

  return (
    <div className="glass-card rounded-2xl p-5 border border-slate-800 space-y-4 text-left shadow-xl">
      
      {/* Metric Selector Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setMetric('bp')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 border ${
              metric === 'bp'
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 shadow-sm'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-sky-400" />
            <span>{i18n.t("Blood Pressure")}</span>
          </button>

          <button
            onClick={() => setMetric('hr')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 border ${
              metric === 'hr'
                ? 'bg-red-500/20 text-red-300 border-red-500/40 shadow-sm'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            <Heart className="w-3.5 h-3.5 text-red-400" />
            <span>{i18n.t("Heart Rate")}</span>
          </button>

          <button
            onClick={() => setMetric('temp')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 border ${
              metric === 'temp'
                ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40 shadow-sm'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            <Thermometer className="w-3.5 h-3.5 text-yellow-400" />
            <span>{i18n.t("Temperature")}</span>
          </button>

          <button
            onClick={() => setMetric('weight')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 border ${
              metric === 'weight'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            <Scale className="w-3.5 h-3.5 text-emerald-400" />
            <span>{i18n.t("Weight")}</span>
          </button>
        </div>

        {/* Status Pill */}
        <div className="flex items-center space-x-2">
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border border-current ${stats.statusColor}`}>
            {stats.status}
          </span>
        </div>
      </div>

      {/* SVG Interactive Chart Canvas */}
      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto min-w-[500px] select-none"
        >
          <defs>
            <linearGradient id="cyanAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="emeraldAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="redAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Background Grid Lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const yPos = padding.top + innerHeight * (1 - pct);
            const val = Math.round(yMin + (yMax - yMin) * pct);
            return (
              <g key={i}>
                <line
                  x1={padding.left}
                  y1={yPos}
                  x2={padding.left + innerWidth}
                  y2={yPos}
                  stroke="#334155"
                  strokeDasharray="3 3"
                  strokeOpacity="0.4"
                />
                <text
                  x={padding.left - 8}
                  y={yPos + 3}
                  textAnchor="end"
                  fontSize="9"
                  fill="#64748b"
                  fontWeight="bold"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* X Axis Date Labels */}
          {points.map((p, i) => {
            // Show up to 6 evenly spaced labels to prevent crowding
            const step = Math.max(1, Math.floor(points.length / 6));
            if (i % step !== 0 && i !== points.length - 1) return null;
            return (
              <text
                key={i}
                x={p.x}
                y={svgHeight - 12}
                textAnchor="middle"
                fontSize="9"
                fill="#94a3b8"
                fontWeight="bold"
              >
                {p.date}
              </text>
            );
          })}

          {/* METRIC 1: BLOOD PRESSURE (TWO LINES) */}
          {metric === 'bp' && (
            <>
              {/* Systolic Area & Line */}
              <path
                d={createAreaPath(points, 'ySys')}
                fill="url(#cyanAreaGradient)"
              />
              <path
                d={createLinePath(points, 'ySys')}
                fill="none"
                stroke="#06b6d4"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Diastolic Area & Line */}
              <path
                d={createAreaPath(points, 'yDia')}
                fill="url(#emeraldAreaGradient)"
              />
              <path
                d={createLinePath(points, 'yDia')}
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Data points */}
              {points.map((p, i) => (
                <g key={i} className="cursor-pointer">
                  {/* Systolic dot */}
                  <circle
                    cx={p.x}
                    cy={p.ySys}
                    r={hoveredPoint === i ? 6 : 4}
                    fill="#06b6d4"
                    stroke="#0f172a"
                    strokeWidth="2"
                    onMouseEnter={() => setHoveredPoint(i)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                  {/* Diastolic dot */}
                  <circle
                    cx={p.x}
                    cy={p.yDia}
                    r={hoveredPoint === i ? 6 : 4}
                    fill="#10b981"
                    stroke="#0f172a"
                    strokeWidth="2"
                    onMouseEnter={() => setHoveredPoint(i)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                </g>
              ))}
            </>
          )}

          {/* METRIC 2: SINGLE VALUE (HEART RATE, TEMP, WEIGHT) */}
          {metric !== 'bp' && (
            <>
              <path
                d={createAreaPath(points, 'y')}
                fill={metric === 'hr' ? 'url(#redAreaGradient)' : 'url(#emeraldAreaGradient)'}
              />
              <path
                d={createLinePath(points, 'y')}
                fill="none"
                stroke={metric === 'hr' ? '#f43f5e' : metric === 'temp' ? '#eab308' : '#10b981'}
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {points.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={hoveredPoint === i ? 6 : 4}
                  fill={metric === 'hr' ? '#f43f5e' : metric === 'temp' ? '#eab308' : '#10b981'}
                  stroke="#0f172a"
                  strokeWidth="2"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredPoint(i)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              ))}
            </>
          )}

          {/* Hover Tooltip Overlay in SVG */}
          {hoveredPoint !== null && points[hoveredPoint] && (
            <g>
              <line
                x1={points[hoveredPoint].x}
                y1={padding.top}
                x2={points[hoveredPoint].x}
                y2={padding.top + innerHeight}
                stroke="#64748b"
                strokeDasharray="2 2"
              />
              <rect
                x={Math.min(points[hoveredPoint].x - 60, svgWidth - 130)}
                y={padding.top + 5}
                width="120"
                height="34"
                rx="6"
                fill="#020617"
                stroke="#334155"
                strokeWidth="1"
              />
              <text
                x={Math.min(points[hoveredPoint].x, svgWidth - 70)}
                y={padding.top + 18}
                textAnchor="middle"
                fontSize="9"
                fill="#94a3b8"
                fontWeight="bold"
              >
                {points[hoveredPoint].date}
              </text>
              <text
                x={Math.min(points[hoveredPoint].x, svgWidth - 70)}
                y={padding.top + 31}
                textAnchor="middle"
                fontSize="11"
                fill="#f8fafc"
                fontWeight="extrabold"
              >
                {metric === 'bp'
                  ? `${points[hoveredPoint].sys}/${points[hoveredPoint].dia} mmHg`
                  : `${points[hoveredPoint].val} ${unit}`}
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Analytics Summary Footer */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800 text-xs">
        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
          <span className="text-[10px] text-slate-500 uppercase font-bold block">{i18n.t("Latest Reading")}</span>
          <span className="font-extrabold text-white text-sm">{stats.latestText}</span>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
          <span className="text-[10px] text-slate-500 uppercase font-bold block">{i18n.t("Historical Average")}</span>
          <span className="font-extrabold text-slate-200 text-sm">{stats.avgText}</span>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
          <span className="text-[10px] text-slate-500 uppercase font-bold block">{i18n.t("Readings Cataloged")}</span>
          <span className="font-extrabold text-brand-400 text-sm">{points.length} {i18n.t("Entries")}</span>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
          <span className="text-[10px] text-slate-500 uppercase font-bold block">{i18n.t("Clinical Trend")}</span>
          <span className="font-extrabold text-emerald-400 text-sm flex items-center">
            <TrendingUp className="w-3.5 h-3.5 mr-1" /> {i18n.t("Stable")}
          </span>
        </div>
      </div>

    </div>
  );
};

export default HealthTrendChart;

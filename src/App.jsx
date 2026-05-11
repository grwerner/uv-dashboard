import { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

const ZIP = "20010";
const CITY = "Washington, DC";

const UV_LEVELS = [
  { max: 2,  label: "Low",       color: "#4ade80" },
  { max: 5,  label: "Moderate",  color: "#facc15" },
  { max: 7,  label: "High",      color: "#fb923c" },
  { max: 10, label: "Very High", color: "#f87171" },
  { max: 99, label: "Extreme",   color: "#c084fc" },
];

function getLevel(uvi) {
  return UV_LEVELS.find(l => uvi <= l.max) || UV_LEVELS[4];
}

function parseHour(dateTime) {
  if (!dateTime) return null;
  const parts = dateTime.trim().split(" ");
  if (parts.length < 3) return null;
  let hour = parseInt(parts[1], 10);
  const ampm = parts[2].toUpperCase();
  if (ampm === "PM" && hour !== 12) hour += 12;
  if (ampm === "AM" && hour === 12) hour = 0;
  return hour;
}

function formatHour(dateTime) {
  if (!dateTime) return "—";
  const parts = dateTime.trim().split(" ");
  if (parts.length < 3) return "—";
  return `${parseInt(parts[1], 10)}${parts[2].toLowerCase()}`;
}

function TimeDisplay({ dateTime, numSize = 16, color = "#bbb" }) {
  if (!dateTime) return <span style={{ fontSize: numSize, color, fontFamily: "\"EB Garamond\", Georgia, serif" }}>—</span>;
  const parts = dateTime.trim().split(" ");
  if (parts.length < 3) return <span style={{ fontSize: numSize, color }}>—</span>;
  const num = parseInt(parts[1], 10);
  const suffix = parts[2].toLowerCase();
  return (
    <span style={{ display: "inline-flex", alignItems: "baseline", gap: "1px", fontFamily: "\"EB Garamond\", Georgia, serif" }}>
      <span style={{ fontSize: numSize, color, lineHeight: 1 }}>{num}</span>
      <span style={{ fontSize: numSize * 0.7, color, lineHeight: 1 }}>{suffix}</span>
    </span>
  );
}

const serif = '"EB Garamond", Georgia, serif';
const display = '"Bebas Neue", sans-serif';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const uvi = payload[0].value;
    const level = getLevel(uvi);
    return (
      <div style={{
        background: "#0a0a18",
        border: `1px solid ${level.color}44`,
        padding: "8px 14px",
        borderRadius: "3px",
        fontFamily: serif,
        fontSize: "14px",
      }}>
        <div style={{ color: level.color, fontWeight: "600" }}>UVI {uvi}</div>
        <div style={{ color: "#bbb", fontSize: "13px", marginTop: "2px" }}>{label} · {level.label}</div>
      </div>
    );
  }
  return null;
};

export default function UVDashboard() {
  const [hourlyData, setHourlyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);

  const now = new Date();
  const currentHour = now.getHours();

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;1,400;1,500&family=Bebas+Neue&display=swap";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`https://data.epa.gov/efservice/getEnvirofactsUVHOURLY/ZIP/${ZIP}/JSON`);
      if (!res.ok) throw new Error("API error");
      const hourly = await res.json();
      setHourlyData(Array.isArray(hourly) ? hourly : []);
      setLastFetched(new Date());
    } catch (e) {
      setError("Could not reach EPA UV API.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  const chartData = hourlyData
    .filter(d => {
      const h = parseHour(d.DATE_TIME);
      return d.UV_VALUE >= 0 && h !== null && h >= 7 && h <= 19;
    })
    .map(d => ({
      label: formatHour(d.DATE_TIME),
      hour: parseHour(d.DATE_TIME),
      uvi: d.UV_VALUE,
    }));

  const currentEntry = hourlyData.length
    ? hourlyData.reduce((closest, entry) => {
        if (!closest) return entry;
        const entryHour = parseHour(entry.DATE_TIME);
        const closestHour = parseHour(closest.DATE_TIME);
        return Math.abs(entryHour - currentHour) < Math.abs(closestHour - currentHour)
          ? entry : closest;
      }, null)
    : null;

  const peakEntry = hourlyData.length
    ? hourlyData.reduce((peak, entry) =>
        (!peak || entry.UV_VALUE > peak.UV_VALUE) ? entry : peak, null)
    : null;

  const currentUVI = currentEntry?.UV_VALUE ?? null;
  const currentLevel = currentUVI !== null ? getLevel(currentUVI) : null;
  const peakLevel = peakEntry ? getLevel(peakEntry.UV_VALUE) : null;

  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const root = {
    minHeight: "100vh",
    background: "#080810",
    padding: "36px 28px",
    fontFamily: serif,
    color: "#c0c0d0",
    maxWidth: "600px",
    margin: "0 auto",
    boxSizing: "border-box",
  };

  const card = {
    background: "#0d0d20",
    border: "1px solid #1a1a30",
    borderRadius: "3px",
    padding: "20px 22px",
  };

  const lbl = {
    fontSize: "16px",
    color: "#bbb",
    fontStyle: "italic",
    fontFamily: serif,
  };

  if (loading) return (
    <div style={{ ...root, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={lbl}>Fetching UV data…</div>
    </div>
  );

  if (error) return (
    <div style={{ ...root, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px" }}>
      <div style={{ ...lbl, color: "#f87171" }}>{error}</div>
      <button onClick={fetchData} style={{
        background: "none", border: "1px solid #333", color: "#bbb",
        fontFamily: serif, fontSize: "14px", padding: "8px 16px", cursor: "pointer",
      }}>Retry</button>
    </div>
  );

  return (
    <div style={root}>

      {/* Header */}
      <div style={{ marginBottom: "28px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontFamily: serif, fontStyle: "italic", fontSize: "26px", color: "#e0e0f0", lineHeight: 1 }}>
            UV Index
          </div>
          <div style={{ ...lbl, fontSize: "14px", marginTop: "6px" }}>
            {CITY} · {dateStr}
          </div>
        </div>
        <button onClick={fetchData} style={{
          background: "none", border: "1px solid #1a1a30", color: "#bbb",
          fontFamily: serif, fontSize: "14px", fontStyle: "italic",
          padding: "6px 12px", cursor: "pointer", borderRadius: "2px",
        }}>↻ Refresh</button>
      </div>

      {/* Main row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "24px" }}>

        {/* Left: Now */}
        <div style={{
          ...card,
          borderLeft: `3px solid ${currentLevel?.color || "#333"}`,
          borderRadius: "0 3px 3px 0",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}>
          <div>
            <div style={lbl}>Now</div>
            <div style={{ marginTop: "2px" }}>
              <TimeDisplay dateTime={currentEntry?.DATE_TIME} numSize={16} color="#bbb" />
            </div>
          </div>
          <div style={{ marginTop: "16px" }}>
            <div style={{ fontFamily: display, fontSize: "80px", color: currentLevel?.color, lineHeight: 0.9 }}>
              {currentUVI ?? "—"}
            </div>
            <div style={{ fontSize: "20px", color: currentLevel?.color, fontStyle: "italic", marginTop: "8px" }}>
              {currentLevel?.label}
            </div>
          </div>
        </div>

        {/* Right: Peak */}
        <div style={{
          ...card,
          borderLeft: `3px solid ${peakLevel?.color || "#333"}`,
          borderRadius: "0 3px 3px 0",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}>
          <div>
            <div style={lbl}>Peak</div>
            <div style={{ marginTop: "2px" }}>
              <TimeDisplay dateTime={peakEntry?.DATE_TIME} numSize={16} color="#bbb" />
            </div>
          </div>
          <div style={{ marginTop: "16px" }}>
            <div style={{ fontFamily: display, fontSize: "80px", color: peakLevel?.color, lineHeight: 0.9 }}>
              {peakEntry?.UV_VALUE ?? "—"}
            </div>
            <div style={{ fontSize: "20px", color: peakLevel?.color, fontStyle: "italic", marginTop: "8px" }}>
              {peakLevel?.label}
            </div>
          </div>
        </div>

      </div>

      {/* Hourly chart */}
      <div style={{ ...card, marginBottom: "20px" }}>
        <div style={{ ...lbl, fontSize: "15px", marginBottom: "16px" }}>Hourly forecast · 7am–7pm</div>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="uvGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="10%" stopColor={peakLevel?.color || "#facc15"} stopOpacity={0.25} />
                <stop offset="95%" stopColor={peakLevel?.color || "#facc15"} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              tick={{ fill: "#bbb", fontSize: 13, fontFamily: "EB Garamond, Georgia, serif", fontStyle: "italic" }}
              axisLine={{ stroke: "#1a1a30" }}
              tickLine={false}
              interval={0}
            />
            <YAxis
              tick={{ fill: "#bbb", fontSize: 13, fontFamily: "EB Garamond, Georgia, serif" }}
              axisLine={false}
              tickLine={false}
              domain={[0, "dataMax + 1"]}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#ffffff10", strokeWidth: 1 }} />
            <ReferenceLine
              x={formatHour(currentEntry?.DATE_TIME)}
              stroke="#ffffff20"
              strokeDasharray="3 3"
              label={{ value: "Now", position: "insideTopRight", fill: "#bbb", fontSize: 13, fontFamily: "EB Garamond, Georgia, serif", fontStyle: "italic" }}
            />
            <Area
              type="monotone"
              dataKey="uvi"
              stroke={peakLevel?.color || "#facc15"}
              strokeWidth={1.5}
              fill="url(#uvGrad)"
              dot={false}
              activeDot={{ r: 3, fill: peakLevel?.color, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Scale */}
      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "24px" }}>
        {UV_LEVELS.map(l => (
          <div key={l.label} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "14px", color: "#bbb", fontFamily: serif }}>
            <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: l.color, flexShrink: 0 }} />
            {l.label}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ fontSize: "12px", color: "#888", lineHeight: 1.8, fontStyle: "italic", fontFamily: serif }}>
        Source: NOAA / EPA Envirofacts UV API · ZIP {ZIP}
        {lastFetched && ` · Fetched ${lastFetched.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`}
        <br />
        Forecast is cloud-adjusted · Broken cumulus may exceed by 25–40%
      </div>

    </div>
  );
}

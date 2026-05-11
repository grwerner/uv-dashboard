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

// DATE_TIME format from EPA API: "May/11/2026 07 AM"
function parseHour(dateTime) {
  if (!dateTime) return null;
  const parts = dateTime.trim().split(" ");
  if (parts.length < 3) return null;
  let hour = parseInt(parts[1], 10);
  const ampm = parts[2].toUpperCase();
  if (ampm === "PM" && hour !== 12) hour += 12;
  if (ampm === "AM" && hour === 12) hour = 0;
  return hour; // 0-23
}

function formatHour(dateTime) {
  if (!dateTime) return "—";
  const parts = dateTime.trim().split(" ");
  if (parts.length < 3) return "—";
  const h = parseInt(parts[1], 10);
  const ampm = parts[2].toUpperCase();
  return `${h}${ampm}`;
}

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
        fontFamily: "'DM Mono', monospace",
        fontSize: "12px",
      }}>
        <div style={{ color: level.color, fontWeight: "700" }}>UVI {uvi}</div>
        <div style={{ color: "#555", fontSize: "10px", marginTop: "2px" }}>{label} · {level.label}</div>
      </div>
    );
  }
  return null;
};

export default function UVDashboard() {
  const [hourlyData, setHourlyData] = useState([]);
  const [dailyData, setDailyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);

  const now = new Date();
  const currentHour = now.getHours();

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Bebas+Neue&display=swap";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const [hourlyRes, dailyRes] = await Promise.all([
        fetch(`https://data.epa.gov/efservice/getEnvirofactsUVHOURLY/ZIP/${ZIP}/JSON`),
        fetch(`https://data.epa.gov/efservice/getEnvirofactsUVDAILY/ZIP/${ZIP}/JSON`),
      ]);
      if (!hourlyRes.ok || !dailyRes.ok) throw new Error("API error");
      const hourly = await hourlyRes.json();
      const daily = await dailyRes.json();
      const hourlyArr = Array.isArray(hourly) ? hourly : [];
      setHourlyData(hourlyArr);
      setDailyData(Array.isArray(daily) ? daily[0] : null);
      setLastFetched(new Date());
    } catch (e) {
      setError("Could not reach EPA UV API. Check network connection.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  const chartData = hourlyData
    .filter(d => d.UV_VALUE >= 0)
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

  const styles = {
    root: {
      minHeight: "100vh",
      background: "#080810",
      padding: "36px 28px",
      fontFamily: "'DM Mono', monospace",
      color: "#c0c0d0",
      maxWidth: "600px",
      margin: "0 auto",
      boxSizing: "border-box",
    },
    label: {
      fontSize: "10px",
      letterSpacing: "0.22em",
      color: "#444",
      textTransform: "uppercase",
      marginBottom: "6px",
    },
    card: {
      background: "#0d0d20",
      border: "1px solid #1a1a30",
      borderRadius: "3px",
      padding: "22px 24px",
    },
  };

  if (loading) return (
    <div style={{ ...styles.root, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ ...styles.label, animation: "none" }}>FETCHING UV DATA…</div>
    </div>
  );

  if (error) return (
    <div style={{ ...styles.root, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: "16px" }}>
      <div style={{ ...styles.label, color: "#f87171" }}>{error}</div>
      <button onClick={fetchData} style={{
        background: "none", border: "1px solid #333", color: "#555",
        fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.15em",
        padding: "8px 16px", cursor: "pointer", textTransform: "uppercase",
      }}>Retry</button>
    </div>
  );

  return (
    <div style={styles.root}>

      {/* Header */}
      <div style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "28px", letterSpacing: "0.1em", color: "#e0e0f0", lineHeight: 1 }}>
            UV INDEX
          </div>
          <div style={{ ...styles.label, marginBottom: 0, marginTop: "5px" }}>
            {CITY} · {dateStr}
          </div>
        </div>
        <button onClick={fetchData} title="Refresh" style={{
          background: "none", border: "1px solid #1a1a30", color: "#444",
          fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "0.15em",
          padding: "6px 12px", cursor: "pointer", textTransform: "uppercase",
          borderRadius: "2px",
        }}>↻ REFRESH</button>
      </div>

      {/* Current UV */}
      <div style={{
        ...styles.card,
        borderLeft: `3px solid ${currentLevel?.color || "#333"}`,
        marginBottom: "16px",
      }}>
        <div style={styles.label}>Now · {formatHour(currentEntry?.DATE_TIME)}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "14px" }}>
          <span style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: "88px",
            color: currentLevel?.color,
            lineHeight: 0.9,
            letterSpacing: "0.02em",
          }}>
            {currentUVI ?? "—"}
          </span>
          <div>
            <div style={{ fontSize: "20px", color: currentLevel?.color, letterSpacing: "0.04em", fontFamily: "'Bebas Neue', sans-serif" }}>
              {currentLevel?.label}
            </div>
            <div style={{ ...styles.label, marginBottom: 0, marginTop: "4px" }}>UV INDEX</div>
          </div>
        </div>
      </div>

      {/* Peak row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "24px" }}>
        <div style={styles.card}>
          <div style={styles.label}>Peak Today</div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "48px", color: peakLevel?.color, lineHeight: 1 }}>
            {peakEntry?.UV_VALUE ?? "—"}
          </div>
          <div style={{ fontSize: "11px", color: peakLevel?.color, opacity: 0.75, marginTop: "2px" }}>
            {peakLevel?.label}
          </div>
        </div>
        <div style={styles.card}>
          <div style={styles.label}>Peak Time</div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "48px", color: "#c0c0d0", lineHeight: 1 }}>
            {peakEntry ? formatHour(peakEntry.DATE_TIME) : "—"}
          </div>
          <div style={{ ...styles.label, marginBottom: 0, marginTop: "2px" }}>solar noon ±</div>
        </div>
      </div>

      {/* Hourly chart */}
      <div style={{ ...styles.card, marginBottom: "20px" }}>
        <div style={{ ...styles.label, marginBottom: "16px" }}>Hourly Forecast</div>
        <ResponsiveContainer width="100%" height={150}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
            <defs>
              <linearGradient id="uvGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="10%" stopColor={peakLevel?.color || "#facc15"} stopOpacity={0.25} />
                <stop offset="95%" stopColor={peakLevel?.color || "#facc15"} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              tick={{ fill: "#3a3a5a", fontSize: 9, fontFamily: "'DM Mono', monospace", letterSpacing: "0.05em" }}
              axisLine={{ stroke: "#1a1a30" }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: "#3a3a5a", fontSize: 9, fontFamily: "'DM Mono', monospace" }}
              axisLine={false}
              tickLine={false}
              domain={[0, "dataMax + 1"]}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#ffffff10", strokeWidth: 1 }} />
            <ReferenceLine
              x={formatHour(currentEntry?.DATE_TIME)}
              stroke="#ffffff14"
              strokeDasharray="3 3"
              label={{ value: "NOW", position: "insideTopRight", fill: "#444", fontSize: 8, fontFamily: "'DM Mono', monospace" }}
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
      <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", marginBottom: "20px" }}>
        {UV_LEVELS.map(l => (
          <div key={l.label} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "9px", color: "#444", letterSpacing: "0.12em" }}>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: l.color, flexShrink: 0 }} />
            {l.label.toUpperCase()}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ fontSize: "9px", color: "#2a2a40", letterSpacing: "0.1em", lineHeight: 1.8 }}>
        SOURCE: NOAA / EPA ENVIROFACTS UV API · ZIP {ZIP}
        {lastFetched && ` · FETCHED ${lastFetched.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`}
        <br />
        FORECAST IS CLOUD-ADJUSTED · BROKEN CUMULUS MAY EXCEED BY 25–40%
      </div>

    </div>
  );
}

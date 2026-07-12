"use client";

import { useEffect, useState, useMemo } from "react";
import { Clock, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ReferenceLine } from "recharts";
import { createClient } from "@/lib/supabase/client";

export default function BestTimeHeatmap({ accountId }: { accountId?: string }) {
  const [data, setData] = useState<any[]>([]);
  const [topSlots, setTopSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      if (!accountId) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`http://localhost:8000/api/instagram/best-time/${accountId}`);
        if (res.ok) {
          const json = await res.json();
          setData(json.heatmap || []);
          setTopSlots(json.top_slots || []);
        }
      } catch (err) {
        console.error("Failed to fetch best time data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [accountId]);

  const chartData = useMemo(() => {
    if (!data.length) return [];
    return data.map((d) => {
      const hour = d.hour_ist;
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const formattedHour = hour % 12 === 0 ? 12 : hour % 12;
      return {
        ...d,
        label: `${formattedHour}${ampm}`,
        isTop: topSlots.some(t => t.hour_ist === d.hour_ist)
      };
    });
  }, [data, topSlots]);

  const maxWeight = Math.max(...chartData.map(d => d.weight), 1);

  if (loading) {
    return (
      <div className="glass p-6 rounded-3xl min-h-[300px] flex items-center justify-center">
        <Loader2 className="animate-spin text-purple-400" size={32} />
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="glass p-6 rounded-3xl min-h-[300px] flex flex-col items-center justify-center text-center">
        <AlertCircle className="text-[var(--text-muted)] mb-3" size={32} />
        <h3 className="text-white font-bold mb-1">No Data Available</h3>
        <p className="text-sm text-[var(--text-secondary)] max-w-xs">Connect an Instagram account to see when your audience is most active online (IST).</p>
      </div>
    );
  }

  return (
    <div className="glass p-6 rounded-3xl border border-[var(--border-subtle)] hover:border-purple-500/30 transition-colors">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-xl font-bold text-white font-['Space_Grotesk'] flex items-center gap-2">
            <Clock size={20} className="text-purple-400" /> Best Time to Post
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">Based on your followers' online activity (IST)</p>
        </div>
        
        {topSlots.length > 0 && (
          <div className="flex gap-2">
            {topSlots.map((slot, i) => {
              const hour = slot.hour_ist;
              const ampm = hour >= 12 ? 'PM' : 'AM';
              const h = hour % 12 === 0 ? 12 : hour % 12;
              return (
                <div key={hour} className="bg-purple-500/10 border border-purple-500/20 px-3 py-1.5 rounded-lg text-sm font-semibold text-purple-400 flex items-center gap-1.5 shadow-[0_0_10px_rgba(168,85,247,0.1)]">
                  {i === 0 && <Sparkles size={14} className="text-yellow-400" />}
                  {h}:00 {ampm}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis 
              dataKey="label" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
              interval={2}
            />
            <YAxis hide domain={[0, maxWeight * 1.1]} />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  return (
                    <div className="bg-[#0d0d1f] border border-[var(--border-subtle)] p-3 rounded-xl shadow-xl">
                      <p className="text-white font-bold text-sm mb-1">{d.label} IST</p>
                      <p className="text-xs text-purple-400">{Math.round(d.weight * 100)}% of max activity</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="weight" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.isTop ? '#a855f7' : '#4c1d95'} 
                  className="transition-all duration-300"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

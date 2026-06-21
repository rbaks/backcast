import { useEffect, useRef } from "react";
import {
  AreaSeries,
  ColorType,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from "lightweight-charts";
import type { ValuePoint } from "../core/types.ts";
import { readChartColors, type Theme } from "../lib/theme.ts";

interface Props {
  series: ValuePoint[];
  /** Re-themes the chart in JS when this changes (CSS can't reach the canvas). */
  theme: Theme;
}

export function ChartPanel({ series, theme }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);

  // Create the chart once.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = createChart(el, {
      layout: { background: { type: ColorType.Solid, color: "transparent" } },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, fixLeftEdge: true, fixRightEdge: true },
      crosshair: { mode: 0 },
      handleScale: false,
      handleScroll: false,
      autoSize: true,
    });
    const area = chart.addSeries(AreaSeries, { lineWidth: 2, priceLineVisible: false });

    chartRef.current = chart;
    seriesRef.current = area;

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  // Push data on change.
  useEffect(() => {
    seriesRef.current?.setData(
      series.map((p) => ({ time: p.date as Time, value: p.value })),
    );
    chartRef.current?.timeScale().fitContent();
  }, [series]);

  // Re-theme in JS whenever the theme token set changes.
  useEffect(() => {
    const chart = chartRef.current;
    const area = seriesRef.current;
    if (!chart || !area) return;
    const c = readChartColors();
    chart.applyOptions({
      layout: { textColor: c.text },
      grid: {
        vertLines: { color: c.grid },
        horzLines: { color: c.grid },
      },
    });
    area.applyOptions({
      lineColor: c.line,
      topColor: c.areaTop,
      bottomColor: c.areaBottom,
    });
  }, [theme]);

  return <div className="chart" ref={containerRef} />;
}

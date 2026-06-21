import { useEffect, useRef } from "react";
import {
  AreaSeries,
  ColorType,
  createChart,
  LineSeries,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from "lightweight-charts";
import type { ConePoint } from "../core/montecarlo.ts";
import type { ValuePoint } from "../core/types.ts";
import { readChartColors, type Theme } from "../lib/theme.ts";

interface Props {
  series: ValuePoint[];
  /** Forward projection band, anchored at the last historical point, or null. */
  cone: ConePoint[] | null;
  /** Monte Carlo run in flight — shows a non-blocking "projecting…" overlay. */
  computing?: boolean;
  /** Re-themes the chart in JS when this changes (CSS can't reach the canvas). */
  theme: Theme;
}

export function ChartPanel({ series, cone, computing = false, theme }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const histRef = useRef<ISeriesApi<"Area"> | null>(null);
  const p90Ref = useRef<ISeriesApi<"Area"> | null>(null);
  const p10Ref = useRef<ISeriesApi<"Area"> | null>(null);
  const p75Ref = useRef<ISeriesApi<"Line"> | null>(null);
  const p25Ref = useRef<ISeriesApi<"Line"> | null>(null);
  const medianRef = useRef<ISeriesApi<"Line"> | null>(null);

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

    // Draw order is creation order. Cone fills go underneath; the p10 area uses
    // the solid background color to mask everything below p10, leaving a filled
    // band between p10 and p90. History (green) and the median sit on top.
    const p90 = chart.addSeries(AreaSeries, {
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });
    const p10 = chart.addSeries(AreaSeries, {
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });
    const hist = chart.addSeries(AreaSeries, {
      lineWidth: 2,
      priceLineVisible: false,
    });
    // p25/p75 quartile lines sit inside the 80% band, marking the tighter 50%
    // interquartile range — a denser cone without a second fill to mask.
    const p75 = chart.addSeries(LineSeries, {
      lineWidth: 1,
      lineStyle: LineStyle.Dotted,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });
    const p25 = chart.addSeries(LineSeries, {
      lineWidth: 1,
      lineStyle: LineStyle.Dotted,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });
    const median = chart.addSeries(LineSeries, {
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });

    chartRef.current = chart;
    p90Ref.current = p90;
    p10Ref.current = p10;
    p75Ref.current = p75;
    p25Ref.current = p25;
    histRef.current = hist;
    medianRef.current = median;

    return () => {
      chart.remove();
      chartRef.current = null;
      histRef.current = p90Ref.current = p10Ref.current = null;
      p75Ref.current = p25Ref.current = null;
      medianRef.current = null;
    };
  }, []);

  // Push data on change.
  useEffect(() => {
    histRef.current?.setData(
      series.map((p) => ({ time: p.date as Time, value: p.value })),
    );
    // Anchor each cone line at the last historical point so it emanates from the
    // line rather than floating a month out.
    const anchor = series[series.length - 1];
    const coneLine = (pick: (p: ConePoint) => number) =>
      cone
        ? [
            ...(anchor
              ? [{ time: anchor.date as Time, value: anchor.value }]
              : []),
            ...cone.map((p) => ({ time: p.date as Time, value: pick(p) })),
          ]
        : [];
    p90Ref.current?.setData(coneLine((p) => p.p90));
    p10Ref.current?.setData(coneLine((p) => p.p10));
    p75Ref.current?.setData(coneLine((p) => p.p75));
    p25Ref.current?.setData(coneLine((p) => p.p25));
    medianRef.current?.setData(coneLine((p) => p.p50));
    chartRef.current?.timeScale().fitContent();
  }, [series, cone]);

  // Re-theme in JS whenever the theme token set changes.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const c = readChartColors();
    chart.applyOptions({
      layout: {
        background: { type: ColorType.Solid, color: c.bg },
        textColor: c.text,
      },
      grid: {
        vertLines: { color: c.grid },
        horzLines: { color: c.grid },
      },
    });
    histRef.current?.applyOptions({
      lineColor: c.line,
      topColor: c.areaTop,
      bottomColor: c.areaBottom,
    });
    // p90: translucent accent band fill, faint accent top edge.
    p90Ref.current?.applyOptions({
      lineColor: c.cone,
      topColor: c.coneFill,
      bottomColor: c.coneFill,
    });
    // p10: solid-bg fill masks below the band; faint accent bottom edge.
    p10Ref.current?.applyOptions({
      lineColor: c.cone,
      topColor: c.bg,
      bottomColor: c.bg,
    });
    // Quartile lines: dotted accent, fainter than the solid median.
    p75Ref.current?.applyOptions({ color: c.coneInner });
    p25Ref.current?.applyOptions({ color: c.coneInner });
    medianRef.current?.applyOptions({ color: c.cone });
  }, [theme]);

  return (
    <div className="chart-wrap">
      <div className="chart" ref={containerRef} />
      {computing && (
        <div className="chart-computing" aria-live="polite">
          <span className="chart-computing-pill">◴ projecting…</span>
        </div>
      )}
    </div>
  );
}

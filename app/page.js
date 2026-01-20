"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  ComposedChart,
} from "recharts";
import {
  Users,
  DollarSign,
  Activity,
  ShoppingCart,
  Menu,
  X,
  Home,
  BarChart2,
  Settings,
  LogOut,
  InfoIcon,
  Coins,
  ShoppingBag,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";
import { supabase } from "./lib/supabaseClient";
import { formatLargeNumber } from "./lib/formatLargeNumber";
import ModalFilter from "./components/ModalFilter";
import { calculateGrowth } from "./lib/calculateGrowth";

const CardIndikatorKesra = ({
  title,
  value,
  unit,
  growth,
  growthUnit,
  growthDescription,
  tooltipText,
  growthNote,
  waktu,
}) => {
  const growthType =
    growth > 0 ? "positive" : growth < 0 ? "negative" : "neutral";

  const GrowthIcon = () => {
    if (growthType === "positive")
      return <ArrowUpRight className="w-5 h-5 mr-1 text-green-500" />;
    if (growthType === "negative")
      return <ArrowDownRight className="w-5 h-5 mr-1 text-red-500" />;
    return <Minus className="w-5 h-5 mr-1 text-gray-500" />;
  };

  const growthColorClass = {
    positive: "text-green-600",
    negative: "text-red-600",
    neutral: "text-gray-600",
  }[growthType];

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow duration-200 relative">
      {tooltipText && (
        <div
          className="absolute top-2 right-2 text-gray-400 cursor-help"
          title={tooltipText}
        >
          <InfoIcon className="w-4 h-4" />
        </div>
      )}
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-gray-500 mb-2">{title}</p>
        {waktu && (
          <p className="text-xs item-center text-gray-400 mb-2">{waktu}</p>
        )}
      </div>
      <div className="flex items-baseline mb-2">
        <p className="text-3xl font-semibold text-gray-900">{value}</p>
        {unit && <span className="ml-2 text-base text-gray-500">{unit}</span>}
      </div>
      <div
        className={`flex items-center text-sm font-medium ${growthColorClass}`}
      >
        <GrowthIcon />
        {growth !== null && growth !== undefined ? (
          <>
            <span>{Math.abs(growth).toFixed(2)}</span>
            {growthUnit && <span className="ml-0.5">{growthUnit}</span>}
            {growthDescription && (
              <span className="ml-1 text-xs text-gray-500">
                {growthDescription}
              </span>
            )}
          </>
        ) : growthNote ? (
          <span className="text-gray-500">{growthNote}</span>
        ) : (
          <span className="text-gray-500">Data pertumbuhan tidak tersedia</span>
        )}
      </div>
      <p className="text-xs italic text-gray-400 mt-1">
        Sumber: <a href="https://www.bps.go.id/" target="_blank" rel="noopener noreferrer">BPS Sulawesi Tengah</a>
      </p>
    </div>
  );
};

// Small reusable growth badge used in metric cards (standardized)
const GrowthBadge = ({ growth, note, description = "YoY" }) => {
  // sanitize note (remove leading '#' markers if present)
  const sanitizedNote = note ? String(note).replace(/^#\s*/, "") : null;

  if (growth !== null && growth !== undefined) {
    const type = growth > 0 ? "positive" : growth < 0 ? "negative" : "neutral";
    const colorClass =
      type === "positive"
        ? "text-green-600"
        : type === "negative"
          ? "text-red-600"
          : "text-gray-600";
    const Icon =
      type === "positive"
        ? ArrowUpRight
        : type === "negative"
          ? ArrowDownRight
          : Minus;
    const sign = growth > 0 ? "+" : growth < 0 ? "-" : "";
    return (
      <div
        className={`flex items-center text-sm font-medium ${colorClass} mt-2`}
      >
        <Icon className="w-4 h-4 mr-2" />
        <span className="font-semibold">{`${sign}${Math.abs(growth).toFixed(
          2
        )}%`}</span>
        {description && (
          <span className="ml-2 text-gray-500">{description}</span>
        )}
      </div>
    );
  }

  if (sanitizedNote)
    return <div className="text-sm text-gray-500 mt-2">{sanitizedNote}</div>;

  return (
    <div className="text-sm text-gray-500 mt-2">
      Data pertumbuhan tidak tersedia
    </div>
  );
};

export default function Dashboard() {
  const [PDRBData, setPDRBData] = useState([]);
  const [inflasiData, setInflasiData] = useState([]);
  const [inflasiUniqueDaerah, setInflasiUniqueDaerah] = useState([]);
  const [pendapatanNegara, setPendapatanNegara] = useState(0);
  const [belanjaNegara, setBelanjaNegara] = useState(0);
  // raw numeric values (for debugging / verification)
  const [rawPendapatanNegara, setRawPendapatanNegara] = useState(0);
  const [rawBelanjaNegara, setRawBelanjaNegara] = useState(0);
  const [pendapatanNegaraGrowth, setPendapatanNegaraGrowth] = useState(null);
  const [pendapatanNegaraGrowthNote, setPendapatanNegaraGrowthNote] =
    useState(null);
  const [belanjaNegaraGrowth, setBelanjaNegaraGrowth] = useState(null);
  const [belanjaNegaraGrowthNote, setBelanjaNegaraGrowthNote] = useState(null);
  const [surplusAPBN, setSurplusAPBN] = useState(null);
  const [surplusAPBNGrowth, setSurplusAPBNGrowth] = useState(null);
  const [surplusAPBNGrowthNote, setSurplusAPBNGrowthNote] = useState(null);
  const [pendapatanDaerah, setPendapatanDaerah] = useState(0);
  const [belanjaDaerah, setBelanjaDaerah] = useState(0);
  const [pendapatanDaerahGrowth, setPendapatanDaerahGrowth] = useState(null);
  const [pendapatanDaerahGrowthNote, setPendapatanDaerahGrowthNote] =
    useState(null);
  const [belanjaDaerahGrowth, setBelanjaDaerahGrowth] = useState(null);
  const [belanjaDaerahGrowthNote, setBelanjaDaerahGrowthNote] = useState(null);
  const [rawPendapatanDaerah, setRawPendapatanDaerah] = useState(0);
  const [rawBelanjaDaerah, setRawBelanjaDaerah] = useState(0);
  const [surplusAPBD, setSurplusAPBD] = useState(null);
  const [surplusAPBDGrowth, setSurplusAPBDGrowth] = useState(null);
  const [surplusAPBDGrowthNote, setSurplusAPBDGrowthNote] = useState(null);
  const [makroKesraData, setMakroKesraData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const waktuSekarang = new Date();
  const [appliedFilters, setAppliedFilters] = useState({
    waktu_awal: `${waktuSekarang.getFullYear()}-01-01`,
    waktu_akhir: `${waktuSekarang.getFullYear()}-${String(
      waktuSekarang.getMonth() + 1
    ).padStart(2, "0")}-${String(
      new Date(
        waktuSekarang.getFullYear(),
        waktuSekarang.getMonth() + 1,
        0
      ).getDate()
    ).padStart(2, "0")}`, // Default to end of current month
  });

  // Define categories for APBN components (must match komp_ang in DB)
  const apbnPendapatanKompAng = [
    "p_pajak_dn",
    "p_pajak_ln",
    "p_pnbp_lain",
    "p_blu",
  ];
  const apbnBelanjaKompAng = [
    "b_pegawai",
    "b_barang",
    "b_modal",
    "b_bansos",
    "b_dbh",
    "b_dakfisik",
    "b_daknonfisik",
    "b_dau",
    "b_infis",
    "b_danadesa",
  ];

  const formatDateToQuarter = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      if (dateString.match(/^\d{4} Q[1-4]$/)) {
        return dateString;
      }
      return null;
    }
    const year = date.getFullYear();
    const month = date.getMonth();
    const quarter = Math.floor(month / 3) + 1;
    return `${year} Q${quarter}`;
  };

  const formatDateToMonth = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      const matchMonth = dateString.match(/^(\d{4})-(\d{1,2})$/);
      if (matchMonth) {
        const year = parseInt(matchMonth[1]);
        const monthNum = parseInt(matchMonth[2]);
        const formattedMonth = (monthNum + 1).toString().padStart(2, "0");
        return `${year}-${formattedMonth}`;
      }
      return null;
    }
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    return `${year}-${month}`;
  };

  const getLineColor = (index) => {
    const colors = [
      "#8884d8",
      "#82ca9d",
      "#ffc658",
      "#f55d3e",
      "#00bcd4",
      "#9c27b0",
      "#a4d8c2",
      "#d8a4c2",
      "#c2d8a4",
      "#d8c2a4",
    ];
    return colors[index % colors.length];
  };

  const fetchPDRBData = async () => {
    setIsLoading(true);
    try {
      let { data, error } = await supabase
        .from("pdrb_sulteng_agg")
        .select("*")
        .eq("daerah", "Provinsi Sulawesi Tengah")
        .gte("waktu", appliedFilters.waktu_awal)
        .lte("waktu", appliedFilters.waktu_akhir)
        .order("waktu", { ascending: true });

      if (error) {
        throw error;
      }

      const transformedData = data.map((item) => ({
        ...item,
        waktu: formatDateToQuarter(item.waktu),
      }));

      setPDRBData(transformedData);
    } catch (err) {
      console.warn("Error fetching PDRB data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInflasi = async () => {
    setIsLoading(true);
    try {
      let { data, error } = await supabase
        .from("inflasi")
        .select("*")
        .gte("waktu", appliedFilters.waktu_awal)
        .lte("waktu", appliedFilters.waktu_akhir)
        .order("waktu", { ascending: true });

      if (error) {
        throw error;
      }

      const uniqueDaerah = new Set();
      data.forEach((item) => uniqueDaerah.add(item.daerah));
      setInflasiUniqueDaerah(Array.from(uniqueDaerah));

      const groupedByWaktu = new Map();
      data.forEach((item) => {
        const waktuBulanan = formatDateToMonth(item.waktu);
        if (!groupedByWaktu.has(waktuBulanan)) {
          groupedByWaktu.set(waktuBulanan, {});
        }
        groupedByWaktu.get(waktuBulanan)[item.daerah] = item.inflasi_tahunan;
      });

      const transformedData = [];
      const sortedMonthKeys = Array.from(groupedByWaktu.keys()).sort((a, b) =>
        a.localeCompare(b)
      );
      sortedMonthKeys.forEach((key) => {
        const entry = { waktu: key };
        const daerahDataForWaktu = groupedByWaktu.get(key);

        Array.from(uniqueDaerah).forEach((daerah) => {
          entry[daerah] =
            daerahDataForWaktu[daerah] !== undefined
              ? daerahDataForWaktu[daerah]
              : null;
        });
        transformedData.push(entry);
      });

      setInflasiData(transformedData);
    } catch (err) {
      console.warn("Error fetching Inflasi data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to find the latest cumulative value from a dataset
  const getLatestCumulativeValue = (data, valueKey, dateKey) => {
    if (!data || data.length === 0) return 0;

    // Find the latest date in the current filtered data
    const latestDate = data.reduce((maxDate, item) => {
      const currentDate = new Date(item[dateKey]);
      return currentDate > maxDate ? currentDate : maxDate;
    }, new Date(0));

    // Filter to get only entries for the latest date
    const latestEntries = data.filter(
      (item) => new Date(item[dateKey]).getTime() === latestDate.getTime()
    );

    // Sum the values for the latest date
    return latestEntries.reduce((sum, item) => sum + (item[valueKey] || 0), 0);
  };

  const fetchAPBN = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch all APBN data within the filter range from the 'fiskal_apbn' table
      // We need 'komp_ang' and 'realisasi' from this table
      const { data, error } = await supabase
        .from("fiskal_apbn") // Changed to 'fiskal_apbn'
        .select("tgl_cutoff, komp_ang, realisasi") // Select komp_ang and realisasi
        .gte("tgl_cutoff", appliedFilters.waktu_awal)
        .lte("tgl_cutoff", appliedFilters.waktu_akhir)
        .order("tgl_cutoff", { ascending: true });

      if (error) throw error;

      let totalPendapatanRealisasi = 0;
      let totalBelanjaRealisasi = 0;

      // Find the latest tgl_cutoff in the fetched data
      const latestDate = data.reduce((maxDate, item) => {
        const currentDate = new Date(item.tgl_cutoff);
        return currentDate > maxDate ? currentDate : maxDate;
      }, new Date(0));

      // Filter data to only include records from the latest date
      const latestDataForSummary = data.filter(
        (item) => new Date(item.tgl_cutoff).getTime() === latestDate.getTime()
      );

      // Aggregate pendapatan and belanja from the latest data
      latestDataForSummary.forEach((item) => {
        if (apbnPendapatanKompAng.includes(item.komp_ang)) {
          totalPendapatanRealisasi += item.realisasi || 0;
        } else if (apbnBelanjaKompAng.includes(item.komp_ang)) {
          totalBelanjaRealisasi += item.realisasi || 0;
        }
      });

      // set raw numeric states for verification
      setRawPendapatanNegara(totalPendapatanRealisasi);
      setRawBelanjaNegara(totalBelanjaRealisasi);

      setPendapatanNegara(formatLargeNumber(totalPendapatanRealisasi, 2));
      setBelanjaNegara(formatLargeNumber(totalBelanjaRealisasi, 2));

      // compute YoY for pendapatan & belanja separately
      try {
        const latestYear = new Date(latestDate).getFullYear();
        const prevYearStart = `${latestYear - 1}-01-01`;
        const prevYearEnd = `${latestYear - 1}-12-31`;

        const { data: prevData, error: prevError } = await supabase
          .from("fiskal_apbn")
          .select("tgl_cutoff, komp_ang, realisasi")
          .gte("tgl_cutoff", prevYearStart)
          .lte("tgl_cutoff", prevYearEnd);

        if (prevError) throw prevError;

        if (!prevData || prevData.length === 0) {
          setPendapatanNegaraGrowth(null);
          setPendapatanNegaraGrowthNote("# tidak ada data periode sebelumnya");
          setBelanjaNegaraGrowth(null);
          setBelanjaNegaraGrowthNote("# tidak ada data periode sebelumnya");
          console.debug("APBN previous-year data missing for YoY checks", {
            latestTotalPendapatan: totalPendapatanRealisasi,
            latestTotalBelanja: totalBelanjaRealisasi,
            prevCount: prevData ? prevData.length : 0,
          });
        } else {
          const prevLatestDate = prevData.reduce((maxDate, item) => {
            const currentDate = new Date(item.tgl_cutoff);
            return currentDate > maxDate ? currentDate : maxDate;
          }, new Date(0));

          const prevLatestData = prevData.filter(
            (item) =>
              new Date(item.tgl_cutoff).getTime() === prevLatestDate.getTime()
          );
          let prevPendapatan = 0;
          let prevBelanja = 0;
          prevLatestData.forEach((item) => {
            if (apbnPendapatanKompAng.includes(item.komp_ang))
              prevPendapatan += item.realisasi || 0;
            else if (apbnBelanjaKompAng.includes(item.komp_ang))
              prevBelanja += item.realisasi || 0;
          });

          console.debug("APBN latest vs prev totals", {
            latestTotalPendapatan: totalPendapatanRealisasi,
            latestTotalBelanja: totalBelanjaRealisasi,
            prevTotalPendapatan: prevPendapatan,
            prevTotalBelanja: prevBelanja,
          });

          if (!prevPendapatan) {
            setPendapatanNegaraGrowth(null);
            setPendapatanNegaraGrowthNote(
              "# tidak ada data periode sebelumnya"
            );
          } else {
            setPendapatanNegaraGrowth(
              calculateGrowth(totalPendapatanRealisasi, prevPendapatan)
            );
            setPendapatanNegaraGrowthNote(null);
          }

          if (!prevBelanja) {
            setBelanjaNegaraGrowth(null);
            setBelanjaNegaraGrowthNote("# tidak ada data periode sebelumnya");
          } else {
            setBelanjaNegaraGrowth(
              calculateGrowth(totalBelanjaRealisasi, prevBelanja)
            );
            setBelanjaNegaraGrowthNote(null);
          }
        }
      } catch (err) {
        console.warn("Error computing APBN component growths:", err);
        setPendapatanNegaraGrowth(null);
        setPendapatanNegaraGrowthNote("# tidak ada data periode sebelumnya");
        setBelanjaNegaraGrowth(null);
        setBelanjaNegaraGrowthNote("# tidak ada data periode sebelumnya");
      }

      // Calculate surplus/deficit for APBN (pendapatan - belanja) for latest period
      const surplus = totalPendapatanRealisasi - totalBelanjaRealisasi;
      setSurplusAPBN(surplus);

      console.debug("APBN surplus latest computed", {
        surplus,
        totalPendapatanRealisasi,
        totalBelanjaRealisasi,
      });

      // Try to compute growth vs same period last year
      try {
        // Determine same period last year range
        const latestYear = new Date(latestDate).getFullYear();
        const prevYearStart = `${latestYear - 1}-01-01`;
        const prevYearEnd = `${latestYear - 1}-12-31`;

        const { data: prevData, error: prevError } = await supabase
          .from("fiskal_apbn")
          .select("tgl_cutoff, komp_ang, realisasi")
          .gte("tgl_cutoff", prevYearStart)
          .lte("tgl_cutoff", prevYearEnd);

        if (prevError) throw prevError;

        if (!prevData || prevData.length === 0) {
          setSurplusAPBNGrowth(null);
          setSurplusAPBNGrowthNote("# tidak ada data periode sebelumnya");
          console.debug("APBN surplus prev-year missing", {
            latestSurplus: surplus,
          });
        } else {
          // find latest date in prev year
          const prevLatestDate = prevData.reduce((maxDate, item) => {
            const currentDate = new Date(item.tgl_cutoff);
            return currentDate > maxDate ? currentDate : maxDate;
          }, new Date(0));

          const prevLatestData = prevData.filter(
            (item) =>
              new Date(item.tgl_cutoff).getTime() === prevLatestDate.getTime()
          );
          let prevPendapatan = 0;
          let prevBelanja = 0;
          prevLatestData.forEach((item) => {
            if (apbnPendapatanKompAng.includes(item.komp_ang))
              prevPendapatan += item.realisasi || 0;
            else if (apbnBelanjaKompAng.includes(item.komp_ang))
              prevBelanja += item.realisasi || 0;
          });

          const prevSurplus = prevPendapatan - prevBelanja;
          console.debug("APBN surplus prev computed", {
            prevSurplus,
            prevPendapatan,
            prevBelanja,
          });
          if (
            prevSurplus === 0 ||
            prevSurplus === null ||
            prevSurplus === undefined
          ) {
            setSurplusAPBNGrowth(null);
            setSurplusAPBNGrowthNote("# tidak ada data periode sebelumnya");
          } else {
            const growth = calculateGrowth(surplus, prevSurplus);
            setSurplusAPBNGrowth(growth);
            setSurplusAPBNGrowthNote(null);
          }
        }
      } catch (err) {
        console.warn("Error computing APBN surplus growth:", err);
        setSurplusAPBNGrowth(null);
        setSurplusAPBNGrowthNote("# tidak ada data periode sebelumnya");
      }
    } catch (err) {
      console.warn("Error fetching APBN data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [appliedFilters, apbnPendapatanKompAng, apbnBelanjaKompAng]); // Added komp_ang arrays to dependencies

  const fetchAPBD = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch all APBD data within the filter range
      const { data, error } = await supabase
        .from("fiskal_pemda")
        .select("tgl_cutoff, pendapatan, belanja")
        .gte("tgl_cutoff", appliedFilters.waktu_awal)
        .lte("tgl_cutoff", appliedFilters.waktu_akhir)
        .order("tgl_cutoff", { ascending: true }); // Important for getting the latest cumulative

      if (error) throw error;

      // Calculate latest cumulative pendapatan and belanja
      const latestPendapatanDaerah = getLatestCumulativeValue(
        data,
        "pendapatan",
        "tgl_cutoff"
      );
      const latestBelanjaDaerah = getLatestCumulativeValue(
        data,
        "belanja",
        "tgl_cutoff"
      );

      // set raw numeric states
      setRawPendapatanDaerah(latestPendapatanDaerah);
      setRawBelanjaDaerah(latestBelanjaDaerah);

      setPendapatanDaerah(formatLargeNumber(latestPendapatanDaerah, 2));
      setBelanjaDaerah(formatLargeNumber(latestBelanjaDaerah, 2));

      // compute YoY for pendapatan & belanja daerah
      try {
        const latestDate = data.reduce((maxDate, item) => {
          const currentDate = new Date(item.tgl_cutoff);
          return currentDate > maxDate ? currentDate : maxDate;
        }, new Date(0));

        const latestYear = new Date(latestDate).getFullYear();
        const prevYearStart = `${latestYear - 1}-01-01`;
        const prevYearEnd = `${latestYear - 1}-12-31`;

        const { data: prevData, error: prevError } = await supabase
          .from("fiskal_pemda")
          .select("tgl_cutoff, pendapatan, belanja")
          .gte("tgl_cutoff", prevYearStart)
          .lte("tgl_cutoff", prevYearEnd)
          .order("tgl_cutoff", { ascending: true });

        if (prevError) throw prevError;

        if (!prevData || prevData.length === 0) {
          setPendapatanDaerahGrowth(null);
          setPendapatanDaerahGrowthNote("# tidak ada data periode sebelumnya");
          setBelanjaDaerahGrowth(null);
          setBelanjaDaerahGrowthNote("# tidak ada data periode sebelumnya");
          console.debug("APBD previous-year data missing for YoY checks", {
            latestPendapatanDaerah: latestPendapatanDaerah,
            latestBelanjaDaerah: latestBelanjaDaerah,
            prevCount: prevData ? prevData.length : 0,
          });
        } else {
          const prevLatestDate = prevData.reduce((maxDate, item) => {
            const currentDate = new Date(item.tgl_cutoff);
            return currentDate > maxDate ? currentDate : maxDate;
          }, new Date(0));

          const prevLatestEntries = prevData.filter(
            (item) =>
              new Date(item.tgl_cutoff).getTime() === prevLatestDate.getTime()
          );
          const prevPendapatan = prevLatestEntries.reduce(
            (s, it) => s + (it.pendapatan || 0),
            0
          );
          const prevBelanja = prevLatestEntries.reduce(
            (s, it) => s + (it.belanja || 0),
            0
          );

          console.debug("APBD latest vs prev totals", {
            latestPendapatanDaerah,
            latestBelanjaDaerah,
            prevPendapatan,
            prevBelanja,
          });

          if (!prevPendapatan) {
            setPendapatanDaerahGrowth(null);
            setPendapatanDaerahGrowthNote(
              "# tidak ada data periode sebelumnya"
            );
          } else {
            setPendapatanDaerahGrowth(
              calculateGrowth(latestPendapatanDaerah, prevPendapatan)
            );
            setPendapatanDaerahGrowthNote(null);
          }

          if (!prevBelanja) {
            setBelanjaDaerahGrowth(null);
            setBelanjaDaerahGrowthNote("# tidak ada data periode sebelumnya");
          } else {
            setBelanjaDaerahGrowth(
              calculateGrowth(latestBelanjaDaerah, prevBelanja)
            );
            setBelanjaDaerahGrowthNote(null);
          }
        }
      } catch (err) {
        console.warn("Error computing APBD component growths:", err);
        setPendapatanDaerahGrowth(null);
        setPendapatanDaerahGrowthNote("# tidak ada data periode sebelumnya");
        setBelanjaDaerahGrowth(null);
        setBelanjaDaerahGrowthNote("# tidak ada data periode sebelumnya");
      }

      // Calculate surplus/deficit for APBD using latest cumulative values
      const surplus = latestPendapatanDaerah - latestBelanjaDaerah;
      setSurplusAPBD(surplus);

      console.debug("APBD surplus latest computed", {
        surplus,
        latestPendapatanDaerah,
        latestBelanjaDaerah,
      });

      // Try to compute growth vs same period last year for APBD
      try {
        // get latest date in current data set
        const latestDate = data.reduce((maxDate, item) => {
          const currentDate = new Date(item.tgl_cutoff);
          return currentDate > maxDate ? currentDate : maxDate;
        }, new Date(0));

        const latestYear = new Date(latestDate).getFullYear();
        const prevYearStart = `${latestYear - 1}-01-01`;
        const prevYearEnd = `${latestYear - 1}-12-31`;

        const { data: prevData, error: prevError } = await supabase
          .from("fiskal_pemda")
          .select("tgl_cutoff, pendapatan, belanja")
          .gte("tgl_cutoff", prevYearStart)
          .lte("tgl_cutoff", prevYearEnd)
          .order("tgl_cutoff", { ascending: true });

        if (prevError) throw prevError;

        if (!prevData || prevData.length === 0) {
          setSurplusAPBDGrowth(null);
          setSurplusAPBDGrowthNote("# tidak ada data periode sebelumnya");
          console.debug("APBD surplus prev-year missing", {
            latestSurplus: surplus,
          });
        } else {
          // compute latest cumulative for prev year
          const prevLatestDate = prevData.reduce((maxDate, item) => {
            const currentDate = new Date(item.tgl_cutoff);
            return currentDate > maxDate ? currentDate : maxDate;
          }, new Date(0));

          const prevLatestEntries = prevData.filter(
            (item) =>
              new Date(item.tgl_cutoff).getTime() === prevLatestDate.getTime()
          );
          const prevPendapatan = prevLatestEntries.reduce(
            (s, it) => s + (it.pendapatan || 0),
            0
          );
          const prevBelanja = prevLatestEntries.reduce(
            (s, it) => s + (it.belanja || 0),
            0
          );
          const prevSurplus = prevPendapatan - prevBelanja;
          console.debug("APBD surplus prev computed", {
            prevSurplus,
            prevPendapatan,
            prevBelanja,
          });

          if (
            prevSurplus === 0 ||
            prevSurplus === null ||
            prevSurplus === undefined
          ) {
            setSurplusAPBDGrowth(null);
            setSurplusAPBDGrowthNote("# tidak ada data periode sebelumnya");
          } else {
            const growth = calculateGrowth(surplus, prevSurplus);
            setSurplusAPBDGrowth(growth);
            setSurplusAPBDGrowthNote(null);
          }
        }
      } catch (err) {
        console.warn("Error computing APBD surplus growth:", err);
        setSurplusAPBDGrowth(null);
        setSurplusAPBDGrowthNote("# tidak ada data periode sebelumnya");
      }
    } catch (err) {
      console.warn("Error fetching APBD data from fiskal_pemda:", err);
    } finally {
      setIsLoading(false);
    }
  }, [appliedFilters]); // Dependency on appliedFilters

  // REFINED fetchMakroKesra function
  const fetchMakroKesra = useCallback(async () => {
    setIsLoading(true);
    try {
      let { data, error } = await supabase
        .from("makro_kesra_indicators")
        .select("waktu, indikator, value, unit") // Select the new 'unit' column
        .gte("waktu", appliedFilters.waktu_awal)
        .lte("waktu", appliedFilters.waktu_akhir)
        .order("waktu", { ascending: true }); // Order by waktu to process latest/previous correctly

      if (error) throw error;

      // Group data by indicator and find latest/previous values
      const indicatorProcessedData = {};
      const indicatorValuesMap = new Map(); // Stores arrays of {waktu, value, unit} for each indicator

      data.forEach((item) => {
        if (!indicatorValuesMap.has(item.indikator)) {
          indicatorValuesMap.set(item.indikator, []);
        }
        indicatorValuesMap
          .get(item.indikator)
          .push({ waktu: item.waktu, value: item.value, unit: item.unit });
      });

      // Now, for each indicator, extract the latest two values and calculate growth
      for (const [indikatorName, values] of indicatorValuesMap.entries()) {
        // Sort values by date to ensure correct latest/previous comparison
        values.sort(
          (a, b) => new Date(a.waktu).getTime() - new Date(b.waktu).getTime()
        );

        const latestEntry =
          values.length > 0 ? values[values.length - 1] : null;
        const previousEntry =
          values.length > 1 ? values[values.length - 2] : null;

        indicatorProcessedData[indikatorName] = {
          value: latestEntry ? latestEntry.value : null,
          unit: latestEntry ? latestEntry.unit : null, // Get unit from the latest entry
          growth: calculateGrowth(latestEntry?.value, previousEntry?.value),
          waktu: latestEntry ? latestEntry.waktu : null,
          prevWaktu: previousEntry ? previousEntry.waktu : null,
        };
      }

      // Map raw indicator names to desired display names and structure
      const formattedMakroKesraData = {
        tingkatKemiskinan: indicatorProcessedData["tingkat_kemiskinan"] || {
          value: null,
          unit: null,
          growth: null,
        },
        tingkatPengangguran: indicatorProcessedData["tingkat_pengangguran"] || {
          value: null,
          unit: null,
          growth: null,
        },
        tpkHotel: indicatorProcessedData["tpk_hotel"] || {
          value: null,
          unit: null,
          growth: null,
        },
        ntp: indicatorProcessedData["ntp"] || {
          value: null,
          unit: null,
          growth: null,
        },
        ntn: indicatorProcessedData["ntn"] || {
          value: null,
          unit: null,
          growth: null,
        },
        penumpangLaut: indicatorProcessedData["penumpang_laut"] || {
          value: null,
          unit: null,
          growth: null,
        },
        penumpangUdara: indicatorProcessedData["penumpang_udara"] || {
          value: null,
          unit: null,
          growth: null,
        },
      };

      setMakroKesraData(formattedMakroKesraData);
    } catch (err) {
      console.warn("Error fetching Makro Kesra data:", err);
      setMakroKesraData(null);
    } finally {
      setIsLoading(false);
    }
  }, [appliedFilters]); // Dependency array

  const filterFields = [
    {
      label: "Waktu Awal",
      name: "waktu_awal",
      type: "input",
      inputType: "date",
      placeholder: "Pilih tanggal awal",
    },
    {
      label: "Waktu Akhir",
      name: "waktu_akhir",
      type: "input",
      inputType: "date",
      placeholder: "Pilih tanggal akhir",
    },
  ];

  const handleOpenFilterModal = () => {
    setIsFilterModalOpen(true);
  };

  // Fungsi untuk menutup modal
  const handleCloseFilterModal = () => {
    setIsFilterModalOpen(false);
  };

  // Fungsi yang akan dipanggil oleh modal saat filter diterapkan
  const handleApplyFilter = (filters) => {
    setAppliedFilters(filters);
  };

  useEffect(() => {
    fetchPDRBData();
    fetchInflasi();
    fetchAPBN();
    fetchAPBD(); // Call the updated fetchAPBD function
    fetchMakroKesra();
  }, [appliedFilters]); // Ensure all fetch functions are in the dependency array, including fetchMakroKesra because it's now wrapped in useCallback

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8 mt-16 md:mt-12">
      <div className="flex border-b border-gray-300 py-2 mb-4">
        <h2 className="flex-1 text-xl font-bold">Rangkuman Kinerja Fiskal</h2>
        <button
          className="flex-none btn btn-sm btn-ghost"
          onClick={handleOpenFilterModal}
        >
          <Filter className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* Bagian Filter dan Info Tanggal */}
      <div className="flex text-xs items-center mb-4 text-gray-600">
        <InfoIcon className="w-4 h-4 mr-2" />
        <p>Data ditampilkan hingga tanggal {appliedFilters.waktu_akhir}</p>
      </div>

      {isLoading && (
        <div className="text-center py-8">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="text-lg text-gray-600 mt-2">Memuat data...</p>
        </div>
      )}

      {!isLoading && (
        <>
          {/* Key Metrics Section - 2 rows x 3 columns */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="grid grid-cols-3 gap-6 col-span-3">
              {/* Row 1: Pendapatan, Belanja, Surplus APBN */}
              <div className="relative border-l-4 border-primary bg-white p-6 rounded-lg shadow-md">
                <p className="text-sm font-medium text-gray-500">
                  Pendapatan Negara
                </p>
                <p className="text-3xl font-semibold text-gray-900">
                  {pendapatanNegara}
                </p>
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-200">
                  <Coins className="w-10 h-10" />
                </div>
                <GrowthBadge
                  growth={pendapatanNegaraGrowth}
                  note={pendapatanNegaraGrowthNote}
                />
                <p className="text-xs italic text-gray-400 mt-1">
                  Sumber: ALCo Kemenkeu Satu Sulteng
                </p>
              </div>

              <div className="relative border-l-4 border-primary bg-white p-6 rounded-lg shadow-md">
                <p className="text-sm font-medium text-gray-500">
                  Belanja Negara
                </p>
                <p className="text-3xl font-semibold text-gray-900">
                  {belanjaNegara}
                </p>
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-200">
                  <ShoppingCart className="w-10 h-10" />
                </div>
                <GrowthBadge
                  growth={belanjaNegaraGrowth}
                  note={belanjaNegaraGrowthNote}
                />
                <p className="text-xs italic text-gray-400 mt-1">
                  Sumber: ALCo Kemenkeu Satu Sulteng
                </p>
              </div>

              <div className="relative border-l-4 border-accent bg-white p-6 rounded-lg shadow-md">
                <p className="text-sm font-medium text-gray-500">
                  Surplus / Defisit APBN
                </p>
                <p className="text-3xl font-semibold text-gray-900">
                  {surplusAPBN !== null
                    ? formatLargeNumber(surplusAPBN, 2)
                    : "-"}
                </p>
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-200">
                  <BarChart2 className="w-10 h-10" />
                </div>
                <GrowthBadge
                  growth={surplusAPBNGrowth}
                  note={surplusAPBNGrowthNote}
                />
                <p className="text-xs italic text-gray-400 mt-1">
                  Sumber: ALCo Kemenkeu Satu Sulteng
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6 col-span-3 mt-4">
              {/* Row 2: Pendapatan Daerah, Belanja Daerah, Surplus APBD */}
              <div className="relative border-l-4 border-secondary bg-white p-6 rounded-lg shadow-md">
                <p className="text-sm font-medium text-gray-500">
                  Pendapatan Daerah
                </p>
                <p className="text-3xl font-semibold text-gray-900">
                  {pendapatanDaerah}
                </p>
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-200">
                  <DollarSign className="w-10 h-10" />
                </div>
                <GrowthBadge
                  growth={pendapatanDaerahGrowth}
                  note={pendapatanDaerahGrowthNote}
                />
                <p className="text-xs italic text-gray-400 mt-1">
                  Sumber: Sistem Keuangan Republik Indonesia (SIKRI)
                </p>
              </div>

              <div className="relative border-l-4 border-secondary bg-white p-6 rounded-lg shadow-md">
                <p className="text-sm font-medium text-gray-500">
                  Belanja Daerah
                </p>
                <p className="text-3xl font-semibold text-gray-900">
                  {belanjaDaerah}
                </p>
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-200">
                  <ShoppingBag className="w-10 h-10" />
                </div>
                <GrowthBadge
                  growth={belanjaDaerahGrowth}
                  note={belanjaDaerahGrowthNote}
                />
                <p className="text-xs italic text-gray-400 mt-1">
                  Sumber: Sistem Keuangan Republik Indonesia (SIKRI)
                </p>
              </div>

              <div className="relative border-l-4 border-accent bg-white p-6 rounded-lg shadow-md">
                <p className="text-sm font-medium text-gray-500">
                  Surplus / Defisit APBD
                </p>
                <p className="text-3xl font-semibold text-gray-900">
                  {surplusAPBD !== null
                    ? formatLargeNumber(surplusAPBD, 2)
                    : "-"}
                </p>
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-200">
                  <Activity className="w-10 h-10" />
                </div>
                <GrowthBadge
                  growth={surplusAPBDGrowth}
                  note={surplusAPBDGrowthNote}
                />
                <p className="text-xs italic text-gray-400 mt-1">
                  Sumber: Sistem Keuangan Republik Indonesia (SIKRI)
                </p>
              </div>
            </div>
          </section>

          <h2 className="text-xl font-bold border-b border-gray-300 py-2 mb-4">
            <i>Overview</i> Ekonomi
          </h2>

          {/* Charts Section */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
            {/* Sales and Revenue Chart */}
            <div className="bg-white p-4 rounded-lg shadow-md">
              <h2 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">
                PDRB Nominal
              </h2>
              {PDRBData.length > 0 ? (
                <ResponsiveContainer
                  className={`text-xs`}
                  width="100%"
                  height={300}
                >
                  <ComposedChart data={PDRBData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="waktu" axisLine={false} tickLine={false} />
                    <YAxis
                      yAxisId="left"
                      dataKey="adhb"
                      axisLine={false}
                      tickLine={false}
                      label={{
                        value: "Miliar",
                        style: { textAnchor: "middle" },
                        angle: -90,
                        position: "left",
                        offset: 0,
                      }}
                    />
                    <YAxis
                      yAxisId="right"
                      dataKey="laju_tahunan"
                      axisLine={false}
                      tickLine={false}
                      orientation="right"
                      label={{
                        value: "Persen (%)",
                        style: { textAnchor: "middle" },
                        angle: -90,
                        position: "right",
                        offset: 0,
                      }}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(0,0,0,0.05)" }}
                      contentStyle={{
                        borderRadius: "8px",
                        border: "none",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: "10px" }} />
                    <Bar
                      yAxisId="left"
                      dataKey="adhb"
                      fill="#8884d8"
                      name="PDRB"
                      barSize={30}
                    />
                    <Line
                      yAxisId="right"
                      name="Laju Tahunan"
                      dataKey="laju_tahunan"
                      stroke="#82ca9d"
                      strokeWidth={4}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex justify-center items-center skeleton h-[300px] w-full">
                  <span className="loading loading-spinner text-secondary loading-lg"></span>
                </div>
              )}
            </div>

            <div className="bg-white p-4 rounded-lg shadow-md">
              <h2 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">
                Inflasi
              </h2>
              {inflasiData.length > 0 ? (
                <ResponsiveContainer
                  width="100%"
                  height={300}
                  className={`text-xs`}
                >
                  <LineChart data={inflasiData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis
                      dataKey="waktu"
                      axisLine={false}
                      tickLine={false}
                      label={{
                        style: { textAnchor: "middle" },
                        angle: -90,
                        offset: 0,
                      }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      label={{
                        value: "Persen (%)",
                        style: { textAnchor: "middle" },
                        angle: -90,
                        position: "left",
                        offset: 0,
                      }}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(0,0,0,0.05)" }}
                      contentStyle={{
                        borderRadius: "8px",
                        border: "none",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: "10px" }} />
                    {inflasiUniqueDaerah.map((daerah, index) => (
                      <Line
                        type="monotone"
                        key={daerah}
                        dataKey={daerah}
                        stroke={getLineColor(index)}
                        activeDot={{ r: 8 }}
                        strokeWidth={3}
                        name={`${daerah}`}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex justify-center items-center skeleton h-[300px] w-full">
                  <span className="loading loading-spinner text-secondary loading-lg"></span>
                </div>
              )}
            </div>
          </section>

          <h2 className="text-xl font-bold border-b border-gray-300 py-2 mb-4">
            Kondisi Makro-Kesra
          </h2>
          {isLoading && !makroKesraData ? (
            <div className="flex justify-center items-center py-8">
              <span className="loading loading-spinner text-primary loading-lg"></span>
            </div>
          ) : makroKesraData ? (
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
              <CardIndikatorKesra
                title="Tingkat Kemiskinan"
                value={
                  makroKesraData.tingkatKemiskinan.value
                    ? makroKesraData.tingkatKemiskinan.value.toFixed(2)
                    : "-"
                }
                unit={makroKesraData.tingkatKemiskinan.unit || "%"}
                growth={makroKesraData.tingkatKemiskinan.growth}
                waktu={formatWaktu(makroKesraData.tingkatKemiskinan.waktu)}
                growthUnit="%"
                growthDescription={
                  makroKesraData.tingkatKemiskinan.prevWaktu
                    ? `dibandingkan ${formatWaktu(
                      makroKesraData.tingkatKemiskinan.prevWaktu
                    )}`
                    : "YoY"
                }
                tooltipText="Persentase penduduk miskin terhadap total penduduk."
              />
              <CardIndikatorKesra
                title="Tingkat Pengangguran Terbuka (TPT)"
                value={
                  makroKesraData.tingkatPengangguran.value
                    ? makroKesraData.tingkatPengangguran.value.toFixed(2)
                    : "-"
                }
                unit={makroKesraData.tingkatPengangguran.unit || "%"}
                growth={makroKesraData.tingkatPengangguran.growth}
                waktu={formatWaktu(makroKesraData.tingkatPengangguran.waktu)}
                growthUnit="%"
                growthDescription={
                  makroKesraData.tingkatPengangguran.prevWaktu
                    ? `dibandingkan ${formatWaktu(
                      makroKesraData.tingkatPengangguran.prevWaktu
                    )}`
                    : "YoY"
                }
                tooltipText="Persentase angkatan kerja yang tidak memiliki pekerjaan."
              />
              <CardIndikatorKesra
                title="Tingkat Penghunian Kamar (TPK) Hotel"
                value={
                  makroKesraData.tpkHotel.value
                    ? makroKesraData.tpkHotel.value.toFixed(2)
                    : "-"
                }
                unit={makroKesraData.tpkHotel.unit || "%"}
                growth={makroKesraData.tpkHotel.growth}
                waktu={formatWaktu(makroKesraData.tpkHotel.waktu)}
                growthUnit="%"
                growthDescription={
                  makroKesraData.tpkHotel.prevWaktu
                    ? `dibandingkan ${formatWaktu(
                      makroKesraData.tpkHotel.prevWaktu
                    )}`
                    : "YoY"
                }
                tooltipText="Persentase rata-rata kamar hotel yang dihuni dari total kamar tersedia."
              />
              <CardIndikatorKesra
                title="Nilai Tukar Petani (NTP)"
                value={
                  makroKesraData.ntp.value
                    ? makroKesraData.ntp.value.toFixed(2)
                    : "-"
                }
                unit={makroKesraData.ntp.unit || "poin"}
                growth={makroKesraData.ntp.growth}
                waktu={formatWaktu(makroKesraData.ntp.waktu)}
                growthUnit="%"
                growthDescription={
                  makroKesraData.ntp.prevWaktu
                    ? `dibandingkan ${formatWaktu(
                      makroKesraData.ntp.prevWaktu
                    )}`
                    : "YoY"
                }
                tooltipText="Indikator daya beli petani di pedesaan."
              />
              <CardIndikatorKesra
                title="Nilai Tukar Nelayan (NTN)"
                value={
                  makroKesraData.ntn.value
                    ? makroKesraData.ntn.value.toFixed(2)
                    : "-"
                }
                unit={makroKesraData.ntn.unit || "poin"}
                growth={makroKesraData.ntn.growth}
                waktu={formatWaktu(makroKesraData.ntn.waktu)}
                growthUnit="%"
                growthDescription={
                  makroKesraData.ntn.prevWaktu
                    ? `dibandingkan ${formatWaktu(
                      makroKesraData.ntn.prevWaktu
                    )}`
                    : "YoY"
                }
                tooltipText="Indikator daya beli nelayan di pedesaan."
              />
              <CardIndikatorKesra
                title="Penumpang Angkutan Laut"
                value={
                  makroKesraData.penumpangLaut.value
                    ? formatLargeNumber(makroKesraData.penumpangLaut.value)
                    : "-"
                }
                unit={makroKesraData.penumpangLaut.unit || "jiwa"}
                growth={makroKesraData.penumpangLaut.growth}
                waktu={formatWaktu(makroKesraData.penumpangLaut.waktu)}
                growthUnit="%"
                growthDescription={
                  makroKesraData.penumpangLaut.prevWaktu
                    ? `dibandingkan ${formatWaktu(
                      makroKesraData.penumpangLaut.prevWaktu
                    )}`
                    : "YoY"
                }
                tooltipText="Jumlah penumpang yang menggunakan transportasi laut."
              />
              <CardIndikatorKesra
                title="Penumpang Angkutan Udara"
                value={
                  makroKesraData.penumpangUdara.value
                    ? formatLargeNumber(makroKesraData.penumpangUdara.value)
                    : "-"
                }
                unit={makroKesraData.penumpangUdara.unit || "jiwa"}
                growth={makroKesraData.penumpangUdara.growth}
                waktu={formatWaktu(makroKesraData.penumpangUdara.waktu)}
                growthUnit="%"
                growthDescription={
                  makroKesraData.penumpangUdara.prevWaktu
                    ? `dibandingkan ${formatWaktu(
                      makroKesraData.penumpangUdara.prevWaktu
                    )}`
                    : "YoY"
                }
                tooltipText="Jumlah penumpang yang menggunakan transportasi udara."
              />
            </section>
          ) : (
            <div className="bg-white p-6 rounded-lg shadow-md text-center text-gray-500">
              Tidak ada data Makro-Kesra yang tersedia untuk periode ini.
            </div>
          )}
        </>
      )}

      <ModalFilter
        isOpen={isFilterModalOpen}
        onClose={handleCloseFilterModal}
        onApplyFilter={handleApplyFilter}
        filterFields={filterFields}
        initialFilterValues={appliedFilters}
      />
    </main>
  );
}

// Helper to format waktu strings. If waktu looks like YYYY-MM or ISO date, format to YYYY-MM.
function formatWaktu(waktu) {
  if (!waktu) return null;
  // If it already contains 'Q' (quarter) or is short, return as-is
  if (typeof waktu === "string" && /Q/i.test(waktu)) return waktu;

  // Try parsing as ISO date
  const d = new Date(waktu);
  if (!isNaN(d.getTime())) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${yyyy}-${mm}`;
  }

  // If matches YYYY-MM already
  const match = waktu.match(/^(\d{4})[-/]?(\d{2})$/);
  if (match) return `${match[1]}-${match[2]}`;

  return waktu;
}

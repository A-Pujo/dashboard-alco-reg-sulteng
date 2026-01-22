"use client";

import React, { useState, useEffect, useCallback } from "react";
import ModalFilter from "../components/ModalFilter"; // Sesuaikan path jika berbeda
import {
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
  Info,
  CalendarDays,
  Filter,
} from "lucide-react";
import { formatLargeNumber } from "../lib/formatLargeNumber"; // Assuming this utility is correctly implemented
import { supabase } from "@/app/lib/supabaseClient"; // Import Supabase client
import Link from "next/link";

// Recharts Imports
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from "recharts";

//  Komponen Card untuk ringkasan kinerja
const CardKinerja = ({
  title,
  value,
  unit,
  change,
  changeType = "positive",
  description,
  icon: Icon,
}) => (
  <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
    <div className="flex justify-between items-start mb-3">
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      {Icon && <Icon className="w-5 h-5 text-gray-400" />}
    </div>
    <div className="flex items-end mb-2">
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {unit && <span className="ml-2 text-sm text-gray-500">{unit}</span>}
    </div>
    {change !== null && change !== undefined ? ( // Only show change if it's not null/undefined
      <div
        className={`flex items-center text-sm ${changeType === "positive" ? "text-green-600" : "text-red-600"}`}
      >
        {changeType === "positive" ? (
          <TrendingUp className="w-4 h-4 mr-1" />
        ) : (
          <TrendingDown className="w-4 h-4 mr-1" />
        )}
        {typeof change === "number" ? `${change.toFixed(2)}%` : change}{" "}
        {/* Format percentage */}
        <span className="ml-1 text-gray-500">{description}</span>
      </div>
    ) : (
      <div className={`flex items-center text-sm text-base-200`}>
        <span className="ml-1 text-gray-500">Tidak ada data pertumbuhan</span>
      </div>
    )}
  </div>
);

export default function DashboardKinerjaFiskal() {
  const now = new Date();
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState({
    waktu_awal: `${now.getFullYear()}-01-01`,
    waktu_akhir: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0",
    )}-${String(
      new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(),
    ).padStart(2, "0")}`, // Default to end of current month
  });
  const [fiskalData, setFiskalData] = useState(null);
  const [apbnIaccountData, setApbnIaccountData] = useState(null); // State for I-Account data
  const [apbdPemdaTableData, setApbdPemdaTableData] = useState(null); // NEW: State for APBD Pemda table**
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartData, setChartData] = useState([]); // State for chart data

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

  // Map for display names for I-Account table
  const componentDisplayNames = {
    p_pajak_dn: "Pajak Dalam Negeri",
    p_pajak_ln: "Pajak Perdagangan Internasional",
    p_pnbp_lain: "PNBP Lain",
    p_blu: "BLU",
    b_pegawai: "Belanja Pegawai",
    b_barang: "Belanja Barang",
    b_modal: "Belanja Modal",
    b_bansos: "Belanja Bansos",
    b_dbh: "Dana Bagi Hasil",
    b_dakfisik: "DAK Fisik",
    b_daknonfisik: "DAK Non-Fisik",
    b_dau: "DAU",
    b_infis: "Insentif Fiskal",
    b_danadesa: "Dana Desa",
  };

  // Konfigurasi dinamis untuk ModalFilter
  const filterFields = [
    {
      label: "Waktu Awal",
      name: "waktu_awal",
      type: "input",
      inputType: "date",
    },
    {
      label: "Waktu Akhir",
      name: "waktu_akhir",
      type: "input",
      inputType: "date",
    },
  ];

  const handleOpenFilterModal = useCallback(() => {
    setIsFilterModalOpen(true);
  }, []);

  const handleCloseFilterModal = useCallback(() => {
    setIsFilterModalOpen(false);
  }, []);

  const handleApplyFilter = useCallback(
    (filters) => {
      setAppliedFilters(filters);
      handleCloseFilterModal(); // Close modal after applying filters
    },
    [handleCloseFilterModal],
  );

  // Helper function to aggregate APBN data for summary cards
  const aggregateAPBNData = useCallback(
    (data) => {
      let totalPendapatanRealisasi = 0;
      let totalPendapatanPagu = 0;
      let totalBelanjaRealisasi = 0;
      let totalBelanjaPagu = 0;

      // Find the latest tgl_cutoff in the provided data
      const latestDate = data.reduce((maxDate, item) => {
        const currentDate = new Date(item.tgl_cutoff);
        return currentDate > maxDate ? currentDate : maxDate;
      }, new Date(0)); // Start with a very old date

      // Filter data to only include records from the latest date
      const latestData = data.filter(
        (item) => new Date(item.tgl_cutoff).getTime() === latestDate.getTime(),
      );

      latestData.forEach((item) => {
        if (apbnPendapatanKompAng.includes(item.komp_ang)) {
          totalPendapatanRealisasi += item.realisasi || 0;
          totalPendapatanPagu += item.pagu_target || 0;
        } else if (apbnBelanjaKompAng.includes(item.komp_ang)) {
          totalBelanjaRealisasi += item.realisasi || 0;
          totalBelanjaPagu += item.pagu_target || 0;
        }
      });

      return {
        totalPendapatanRealisasi,
        totalPendapatanPagu,
        totalBelanjaRealisasi,
        totalBelanjaPagu,
      };
    },
    [apbnPendapatanKompAng, apbnBelanjaKompAng],
  );

  // Helper function to aggregate APBD data for summary cards
  const aggregateAPBDData = useCallback((data) => {
    let totalPendapatan = 0;
    let totalBelanja = 0;
    let totalPembiayaan = 0;
    let totalSILPA = 0;

    // Find the latest tgl_cutoff in the provided data
    const latestDate = data.reduce((maxDate, item) => {
      const currentDate = new Date(item.tgl_cutoff);
      return currentDate > maxDate ? currentDate : maxDate;
    }, new Date(0));

    // Filter data to only include records from the latest date
    const latestData = data.filter(
      (item) => new Date(item.tgl_cutoff).getTime() === latestDate.getTime(),
    );

    latestData.forEach((item) => {
      totalPendapatan += item.pendapatan || 0;
      totalBelanja += item.belanja || 0;
      totalPembiayaan += item.pembiayaan || 0;
      totalSILPA += item.SILPA || 0;
    });

    return { totalPendapatan, totalBelanja, totalPembiayaan, totalSILPA };
  }, []);

  // NEW: Helper function to aggregate APBD data for the per-Pemda table
  const aggregateAPBDTableData = useCallback((rawData) => {
    const pemdaDataMap = new Map(); // Key: nama_pemda, Value: { latestDate: Date, pendapatan: number, belanja: number }

    rawData.forEach((item) => {
      const pemdaName = item.nama_pemda;
      const tglCutoff = new Date(item.tgl_cutoff);

      if (!pemdaDataMap.has(pemdaName)) {
        pemdaDataMap.set(pemdaName, {
          latestDate: tglCutoff,
          pendapatan: item.pendapatan || 0,
          belanja: item.belanja || 0,
        });
      } else {
        const existingData = pemdaDataMap.get(pemdaName);
        // Only update if the current item has a later tgl_cutoff
        if (tglCutoff > existingData.latestDate) {
          pemdaDataMap.set(pemdaName, {
            latestDate: tglCutoff,
            pendapatan: item.pendapatan || 0,
            belanja: item.belanja || 0,
          });
        }
      }
    });

    // Convert map to array for easier rendering
    const tableData = [];
    pemdaDataMap.forEach((value, key) => {
      tableData.push({
        nama_pemda: key,
        pendapatan: value.pendapatan,
        belanja: value.belanja,
      });
    });

    return tableData.sort((a, b) => a.nama_pemda.localeCompare(b.nama_pemda)); // Sort by pemda name**
  }, []);

  // Helper to aggregate APBN data for I-Account table
  const aggregateAPBNIaccountData = useCallback(
    (rawData) => {
      const aggregated = {
        pendapatan: {},
        belanja: {},
        totalPendapatanRealisasi: 0,
        totalPendapatanPagu: 0,
        totalBelanjaRealisasi: 0,
        totalBelanjaPagu: 0,
      };

      // Initialize all known components to 0
      [...apbnPendapatanKompAng, ...apbnBelanjaKompAng].forEach((komp) => {
        if (apbnPendapatanKompAng.includes(komp)) {
          aggregated.pendapatan[komp] = { realisasi: 0, pagu_target: 0 };
        } else if (apbnBelanjaKompAng.includes(komp)) {
          aggregated.belanja[komp] = { realisasi: 0, pagu_target: 0 };
        }
      });

      // For I-Account, we also want the cumulative sum as of the *latest* date in the filtered period.
      const latestDate = rawData.reduce((maxDate, item) => {
        const currentDate = new Date(item.tgl_cutoff);
        return currentDate > maxDate ? currentDate : maxDate;
      }, new Date(0));

      const latestData = rawData.filter(
        (item) => new Date(item.tgl_cutoff).getTime() === latestDate.getTime(),
      );

      latestData.forEach((item) => {
        const komp = item.komp_ang;
        const realisasi = item.realisasi || 0;
        const pagu_target = item.pagu_target || 0;

        if (apbnPendapatanKompAng.includes(komp)) {
          aggregated.pendapatan[komp].realisasi += realisasi;
          aggregated.pendapatan[komp].pagu_target += pagu_target;
          aggregated.totalPendapatanRealisasi += realisasi;
          aggregated.totalPendapatanPagu += pagu_target;
        } else if (apbnBelanjaKompAng.includes(komp)) {
          aggregated.belanja[komp].realisasi += realisasi;
          aggregated.belanja[komp].pagu_target += pagu_target;
          aggregated.totalBelanjaRealisasi += realisasi;
          aggregated.totalBelanjaPagu += pagu_target;
        }
      });

      aggregated.surplusDefisitRealisasi =
        aggregated.totalPendapatanRealisasi - aggregated.totalBelanjaRealisasi;
      aggregated.surplusDefisitPagu =
        aggregated.totalPendapatanPagu - aggregated.totalBelanjaPagu;

      return aggregated;
    },
    [apbnPendapatanKompAng, apbnBelanjaKompAng],
  );

  // Helper to format large numbers for Y-axis ticks
  const formatCurrencyAxis = (tickItem) => {
    return formatLargeNumber(tickItem, 0); // Format without decimals for axis
  };

  // Function to prepare data for Recharts - ADJUSTED FOR CUMULATIVE DATA
  const prepareChartData = useCallback(
    (apbnRawData, apbdRawData) => {
      const monthlyDataMap = new Map(); // Key: YYYY-MM, Value: { name, APBN_Pendapatan, APBN_Belanja, APBD_Pendapatan, APBD_Belanja }

      // First pass: Populate map with all unique YYYY-MM and store all items for the month
      apbnRawData.forEach((item) => {
        const date = new Date(item.tgl_cutoff);
        const yearMonth = `${date.getFullYear()}-${(date.getMonth() + 1)
          .toString()
          .padStart(2, "0")}`;
        const monthLabel = new Intl.DateTimeFormat("id-ID", {
          month: "short",
          year: "2-digit",
        }).format(date);

        if (!monthlyDataMap.has(yearMonth)) {
          monthlyDataMap.set(yearMonth, {
            name: monthLabel,
            APBN_Pendapatan: 0,
            APBN_Belanja: 0,
            APBD_Pendapatan: 0,
            APBD_Belanja: 0,
            apbnMonthlyItems: [],
            apbdMonthlyItems: [],
          });
        }
        monthlyDataMap.get(yearMonth).apbnMonthlyItems.push(item);
      });

      apbdRawData.forEach((item) => {
        const date = new Date(item.tgl_cutoff);
        const yearMonth = `${date.getFullYear()}-${(date.getMonth() + 1)
          .toString()
          .padStart(2, "0")}`;
        const monthLabel = new Intl.DateTimeFormat("id-ID", {
          month: "short",
          year: "2-digit",
        }).format(date);

        if (!monthlyDataMap.has(yearMonth)) {
          monthlyDataMap.set(yearMonth, {
            name: monthLabel,
            APBN_Pendapatan: 0,
            APBN_Belanja: 0,
            APBD_Pendapatan: 0,
            APBD_Belanja: 0,
            apbnMonthlyItems: [],
            apbdMonthlyItems: [],
          });
        }
        monthlyDataMap.get(yearMonth).apbdMonthlyItems.push(item);
      });

      // Second pass: Aggregate data for the *latest* tgl_cutoff within each month for each type
      monthlyDataMap.forEach((monthData, yearMonth) => {
        // Process APBN data for this month
        if (monthData.apbnMonthlyItems.length > 0) {
          const latestAPBNDateForMonth = monthData.apbnMonthlyItems.reduce(
            (maxDate, item) => {
              const currentDate = new Date(item.tgl_cutoff);
              return currentDate > maxDate ? currentDate : maxDate;
            },
            new Date(0),
          );

          const latestAPBNItemsForMonth = monthData.apbnMonthlyItems.filter(
            (item) =>
              new Date(item.tgl_cutoff).getTime() ===
              latestAPBNDateForMonth.getTime(),
          );

          latestAPBNItemsForMonth.forEach((item) => {
            if (apbnPendapatanKompAng.includes(item.komp_ang)) {
              monthData.APBN_Pendapatan += item.realisasi || 0;
            } else if (apbnBelanjaKompAng.includes(item.komp_ang)) {
              monthData.APBN_Belanja += item.realisasi || 0;
            }
          });
        }

        // Process APBD data for this month
        if (monthData.apbdMonthlyItems.length > 0) {
          const latestAPBDDateForMonth = monthData.apbdMonthlyItems.reduce(
            (maxDate, item) => {
              const currentDate = new Date(item.tgl_cutoff);
              return currentDate > maxDate ? currentDate : maxDate;
            },
            new Date(0),
          );

          const latestAPBDItemsForMonth = monthData.apbdMonthlyItems.filter(
            (item) =>
              new Date(item.tgl_cutoff).getTime() ===
              latestAPBDDateForMonth.getTime(),
          );

          // Sum across all `nama_pemda` for the latest date in this month
          latestAPBDItemsForMonth.forEach((item) => {
            monthData.APBD_Pendapatan += item.pendapatan || 0;
            monthData.APBD_Belanja += item.belanja || 0;
          });
        }

        // Clean up temporary arrays
        delete monthData.apbnMonthlyItems;
        delete monthData.apbdMonthlyItems;
      });

      // Sort data chronologically and convert Map values to array
      const sortedData = Array.from(monthlyDataMap.entries())
        .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
        .map(([, value]) => value);

      return sortedData;
    },
    [apbnPendapatanKompAng, apbnBelanjaKompAng],
  );

  // Function to fetch and process fiscal data
  const fetchFiskalData = useCallback(
    async (filters) => {
      setIsLoading(true);
      setError(null);

      const { waktu_awal, waktu_akhir } = filters;

      // Calculate previous year's period for YoY comparison
      const prevYearStart = new Date(waktu_awal);
      prevYearStart.setFullYear(prevYearStart.getFullYear() - 1);
      const prevWaktuAwal = prevYearStart.toISOString().split("T")[0];

      const prevYearEnd = new Date(waktu_akhir);
      prevYearEnd.setFullYear(prevYearEnd.getFullYear() - 1);
      const prevWaktuAkhir = prevYearEnd.toISOString().split("T")[0];

      try {
        //  Fetch Current Period APBN Data (raw components)
        const { data: apbnCurrentRawData, error: apbnError } = await supabase
          .from("fiskal_apbn")
          .select("tgl_cutoff, komp_ang, pagu_target, realisasi")
          .gte("tgl_cutoff", waktu_awal)
          .lte("tgl_cutoff", waktu_akhir)
          .order("tgl_cutoff", { ascending: true }); // Order by date for easier processing of cumulative data

        if (apbnError) throw apbnError;

        //  Fetch Previous Period APBN Data (raw components)
        const { data: apbnPrevRawData, error: apbnPrevError } = await supabase
          .from("fiskal_apbn")
          .select("tgl_cutoff, komp_ang, pagu_target, realisasi")
          .gte("tgl_cutoff", prevWaktuAwal)
          .lte("tgl_cutoff", prevWaktuAkhir)
          .order("tgl_cutoff", { ascending: true }); // Order by date

        if (apbnPrevError) throw apbnPrevError;

        //  Fetch Current Period APBD Data
        const { data: apbdCurrentRawData, error: apbdError } = await supabase
          .from("fiskal_pemda")
          .select(
            "tgl_cutoff, nama_pemda, pendapatan, belanja, pembiayaan, SILPA",
          ) // Added nama_pemda
          .gte("tgl_cutoff", waktu_awal)
          .lte("tgl_cutoff", waktu_akhir)
          .order("tgl_cutoff", { ascending: true }); // Order by date

        if (apbdError) throw apbdError;

        //  Fetch Previous Period APBD Data
        const { data: apbdPrevRawData, error: apbdPrevError } = await supabase
          .from("fiskal_pemda")
          .select(
            "tgl_cutoff, nama_pemda, pendapatan, belanja, pembiayaan, SILPA",
          ) // Added nama_pemda
          .gte("tgl_cutoff", prevWaktuAwal)
          .lte("tgl_cutoff", prevWaktuAkhir)
          .order("tgl_cutoff", { ascending: true }); // Order by date

        if (apbdPrevError) throw apbdPrevError;

        //  Aggregate Data for Summary Cards
        // These aggregation functions are modified to pick the latest cumulative value
        const apbnCurrentSummary = aggregateAPBNData(apbnCurrentRawData);
        const apbnPrevSummary = aggregateAPBNData(apbnPrevRawData);

        const apbdCurrentSummary = aggregateAPBDData(apbdCurrentRawData);
        const apbdPrevSummary = aggregateAPBDData(apbdPrevRawData);

        // NEW: Aggregate data for I-Account table display
        const iAccountAggregatedData =
          aggregateAPBNIaccountData(apbnCurrentRawData);
        setApbnIaccountData(iAccountAggregatedData);

        // NEW: Aggregate data for the APBD per-Pemda table
        const pemdaTableAggregatedData =
          aggregateAPBDTableData(apbdCurrentRawData);
        setApbdPemdaTableData(pemdaTableAggregatedData);

        //  Calculate YoY Changes
        const calculateYoYChange = (current, previous) => {
          if (previous === 0 || previous === null || previous === undefined)
            return null;
          return (current / previous - 1) * 100; // Return raw percentage for formatting in Card
        };

        const apbnPendapatanYoY = calculateYoYChange(
          apbnCurrentSummary.totalPendapatanRealisasi,
          apbnPrevSummary.totalPendapatanRealisasi,
        );
        const apbnBelanjaYoY = calculateYoYChange(
          apbnCurrentSummary.totalBelanjaRealisasi,
          apbnPrevSummary.totalBelanjaRealisasi,
        );
        const apbnSurplusYoY = calculateYoYChange(
          apbnCurrentSummary.totalPendapatanRealisasi -
            apbnCurrentSummary.totalBelanjaRealisasi,
          apbnPrevSummary.totalPendapatanRealisasi -
            apbnPrevSummary.totalBelanjaRealisasi,
        );
        const apbdPendapatanYoY = calculateYoYChange(
          apbdCurrentSummary.totalPendapatan,
          apbdPrevSummary.totalPendapatan,
        );
        const apbdBelanjaYoY = calculateYoYChange(
          apbdCurrentSummary.totalBelanja,
          apbdPrevSummary.totalBelanja,
        );
        const apbdPembiayaanYoY = calculateYoYChange(
          apbdCurrentSummary.totalPembiayaan,
          apbdPrevSummary.totalPembiayaan,
        );
        const apbdSILPAYoY = calculateYoYChange(
          apbdCurrentSummary.totalSILPA,
          apbdPrevSummary.totalSILPA,
        );

        //  Consolidate all data for state
        setFiskalData({
          // APBN Summary (using Realisasi for main display)
          apbn: {
            totalPendapatan: apbnCurrentSummary.totalPendapatanRealisasi,
            totalBelanja: apbnCurrentSummary.totalBelanjaRealisasi,
            surplusDefisit:
              apbnCurrentSummary.totalPendapatanRealisasi -
              apbnCurrentSummary.totalBelanjaRealisasi,
            pendapatanYoYChange: apbnPendapatanYoY,
            belanjaYoYChange: apbnBelanjaYoY,
            surplusYoYChange: apbnSurplusYoY,
            // You might want to display total pagu here too if desired
            totalPendapatanPagu: apbnCurrentSummary.totalPendapatanPagu,
            totalBelanjaPagu: apbnCurrentSummary.totalBelanjaPagu,
          },
          // APBD Summary
          apbd: {
            totalPendapatan: apbdCurrentSummary.totalPendapatan,
            totalBelanja: apbdCurrentSummary.totalBelanja,
            totalPembiayaan: apbdCurrentSummary.totalPembiayaan,
            totalSILPA: apbdCurrentSummary.totalSILPA,
            // Calculate APBD surplus/defisit as Pendapatan - Belanja + Pembiayaan
            surplusDefisit:
              apbdCurrentSummary.totalPendapatan -
              apbdCurrentSummary.totalBelanja +
              apbdCurrentSummary.totalPembiayaan,
            pendapatanYoYChange: apbdPendapatanYoY,
            belanjaYoYChange: apbdBelanjaYoY,
            pembiayaanYoYChange: apbdPembiayaanYoY,
            SILPAYoYChange: apbdSILPAYoY,
          },
          // Consolidated/Combined Summary (if needed, example below)
          totalKonsolidasi: {
            totalPendapatan:
              apbnCurrentSummary.totalPendapatanRealisasi +
              apbdCurrentSummary.totalPendapatan,
            totalBelanja:
              apbnCurrentSummary.totalBelanjaRealisasi +
              apbdCurrentSummary.totalBelanja,
            surplusDefisit:
              apbnCurrentSummary.totalPendapatanRealisasi -
              apbnCurrentSummary.totalBelanjaRealisasi +
              (apbdCurrentSummary.totalPendapatan -
                apbdCurrentSummary.totalBelanja +
                apbdCurrentSummary.totalPembiayaan),
          },
        });

        // Prepare data for charts using the raw data
        const preparedChartData = prepareChartData(
          apbnCurrentRawData,
          apbdCurrentRawData,
        );
        setChartData(preparedChartData);
      } catch (err) {
        console.error("Error fetching fiscal data:", err);
        setError("Gagal memuat data kinerja fiskal. Silakan coba lagi.");
      } finally {
        setIsLoading(false);
      }
    },
    [
      aggregateAPBNData,
      aggregateAPBDData,
      aggregateAPBNIaccountData,
      aggregateAPBDTableData,
      prepareChartData,
      apbnPendapatanKompAng,
      apbnBelanjaKompAng,
    ],
  ); // Added aggregateAPBDTableData to dependencies

  // Panggil fetch data saat komponen dimuat atau filter berubah
  useEffect(() => {
    fetchFiskalData(appliedFilters);
  }, [appliedFilters]); // Added fetchFiskalData to dependency array to prevent stale closure if it were to change

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
        <CalendarDays className="w-5 h-5 mr-2" />
        <p>
          Cut off data: {appliedFilters.waktu_awal} s.d.{" "}
          {appliedFilters.waktu_akhir}
        </p>
      </div>

      {isLoading && (
        <div className="text-center py-8">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="text-lg text-gray-600 mt-2">Memuat data...</p>
        </div>
      )}

      {error && (
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6"
          role="alert"
        >
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
          <button
            className="btn btn-sm btn-error mt-2"
            onClick={() => fetchFiskalData(appliedFilters)}
          >
            Coba Lagi
          </button>
        </div>
      )}

      {fiskalData && apbnIaccountData && !isLoading && !error && (
        <>
          {/* Ringkasan Kinerja APBN */}
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">Kinerja APBN</h3>
            <Link
              href={`/fiskal/belanja-negara`}
              className="btn btn-xs btn-primary rounded-full"
            >
              Rincian Belanja
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <CardKinerja
              title="Pendapatan APBN"
              value={formatLargeNumber(fiskalData.apbn.totalPendapatan, 2)}
              unit=""
              change={fiskalData.apbn.pendapatanYoYChange}
              changeType={
                fiskalData.apbn.pendapatanYoYChange >= 0
                  ? "positive"
                  : "negative"
              }
              description="YoY"
              icon={ArrowUpRight}
            />
            <CardKinerja
              title="Belanja APBN"
              value={formatLargeNumber(fiskalData.apbn.totalBelanja, 2)}
              unit=""
              change={fiskalData.apbn.belanjaYoYChange}
              changeType={
                fiskalData.apbn.belanjaYoYChange >= 0 ? "positive" : "negative"
              }
              description="YoY"
              icon={ArrowDownRight}
            />
            <CardKinerja
              title="Surplus/Defisit APBN"
              value={formatLargeNumber(fiskalData.apbn.surplusDefisit, 2)}
              unit=""
              change={fiskalData.apbn.surplusYoYChange}
              changeType={
                fiskalData.apbn.surplusYoYChange >= 0 ? "positive" : "negative"
              }
              description="YoY"
              icon={Info}
            />
          </div>

          {/* APBN I-Account Table */}
          <section className="bg-white p-4 rounded-lg shadow-md mb-6">
            <h2 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">
              APBN I-Account (Target vs Realisasi)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Penerimaan (Pendapatan Negara) */}
              <div className="border border-gray-200 rounded-md p-3">
                <h3 className="text-md font-bold text-gray-700 mb-3">
                  Penerimaan (Pendapatan Negara)
                </h3>
                <div className="flex justify-between items-center text-sm font-semibold text-gray-600 border-b pb-1 mb-2">
                  <span>Komponen</span>
                  <span className="text-right">Target / Realisasi</span>
                </div>
                {apbnPendapatanKompAng.map((komp) => (
                  <div
                    key={komp}
                    className="flex justify-between items-center text-sm py-1"
                  >
                    <span>{componentDisplayNames[komp] || komp}</span>
                    <span className="text-right">
                      {formatLargeNumber(
                        apbnIaccountData.pendapatan[komp]?.pagu_target || 0,
                        2,
                      )}{" "}
                      /{" "}
                      {formatLargeNumber(
                        apbnIaccountData.pendapatan[komp]?.realisasi || 0,
                        2,
                      )}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between items-center text-md font-bold text-gray-800 border-t pt-2 mt-2">
                  <span>Total Pendapatan</span>
                  <span className="text-right">
                    {formatLargeNumber(apbnIaccountData.totalPendapatanPagu, 2)}{" "}
                    /{" "}
                    {formatLargeNumber(
                      apbnIaccountData.totalPendapatanRealisasi,
                      2,
                    )}
                  </span>
                </div>
              </div>

              {/* Pengeluaran (Belanja Negara) */}
              <div className="border border-gray-200 rounded-md p-3">
                <h3 className="text-md font-bold text-gray-700 mb-3">
                  Pengeluaran (Belanja Negara)
                </h3>
                <div className="flex justify-between items-center text-sm font-semibold text-gray-600 border-b pb-1 mb-2">
                  <span>Komponen</span>
                  <span className="text-right">Target / Realisasi</span>
                </div>
                {apbnBelanjaKompAng.map((komp) => (
                  <div
                    key={komp}
                    className="flex justify-between items-center text-sm py-1"
                  >
                    <span>{componentDisplayNames[komp] || komp}</span>
                    <span className="text-right">
                      {formatLargeNumber(
                        apbnIaccountData.belanja[komp]?.pagu_target || 0,
                        2,
                      )}{" "}
                      /{" "}
                      {formatLargeNumber(
                        apbnIaccountData.belanja[komp]?.realisasi || 0,
                        2,
                      )}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between items-center text-md font-bold text-gray-800 border-t pt-2 mt-2">
                  <span>Total Belanja</span>
                  <span className="text-right">
                    {formatLargeNumber(apbnIaccountData.totalBelanjaPagu, 2)} /{" "}
                    {formatLargeNumber(
                      apbnIaccountData.totalBelanjaRealisasi,
                      2,
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Surplus/Defisit for I-Account */}
            <div className="mt-4 p-3 bg-base-200 rounded-md flex justify-between items-center text-lg font-bold text-gray-800">
              <span>Surplus/Defisit</span>
              <span className="text-right">
                {formatLargeNumber(apbnIaccountData.surplusDefisitPagu, 2)} /{" "}
                {formatLargeNumber(apbnIaccountData.surplusDefisitRealisasi, 2)}
              </span>
            </div>
          </section>

          {/* Ringkasan Kinerja APBD */}
          <h3 className="text-lg font-bold mb-4">Kinerja APBD (Realisasi)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <CardKinerja
              title="Pendapatan APBD"
              value={formatLargeNumber(fiskalData.apbd.totalPendapatan, 2)}
              unit=""
              change={fiskalData.apbd.pendapatanYoYChange}
              changeType={
                fiskalData.apbd.pendapatanYoYChange >= 0
                  ? "positive"
                  : "negative"
              }
              description="YoY"
              icon={ArrowUpRight}
            />
            <CardKinerja
              title="Belanja APBD"
              value={formatLargeNumber(fiskalData.apbd.totalBelanja, 2)}
              unit=""
              change={fiskalData.apbd.belanjaYoYChange}
              changeType={
                fiskalData.apbd.belanjaYoYChange >= 0 ? "positive" : "negative"
              }
              description="YoY"
              icon={ArrowDownRight}
            />
            <CardKinerja
              title="Pembiayaan APBD"
              value={formatLargeNumber(fiskalData.apbd.totalPembiayaan, 2)}
              unit=""
              change={fiskalData.apbd.pembiayaanYoYChange}
              changeType={
                fiskalData.apbd.pembiayaanYoYChange >= 0
                  ? "positive"
                  : "negative"
              }
              description="YoY"
              icon={Info}
            />
          </div>

          {apbdPemdaTableData && apbdPemdaTableData.length > 0 ? (
            <section className="bg-white p-4 rounded-lg shadow-md mb-6 overflow-x-auto">
              <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">
                Realisasi Pendapatan dan Belanja
              </h3>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Indikator
                    </th>
                    {apbdPemdaTableData.map((pemda) => (
                      <th
                        key={pemda.nama_pemda}
                        scope="col"
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {pemda.nama_pemda}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      Pendapatan
                    </td>
                    {apbdPemdaTableData.map((pemda) => (
                      <td
                        key={`${pemda.nama_pemda}-pendapatan`}
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right"
                      >
                        {formatLargeNumber(pemda.pendapatan, 2)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      Belanja
                    </td>
                    {apbdPemdaTableData.map((pemda) => (
                      <td
                        key={`${pemda.nama_pemda}-belanja`}
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right"
                      >
                        {formatLargeNumber(pemda.belanja, 2)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </section>
          ) : (
            <div className="bg-white p-6 rounded-lg shadow-md text-center text-gray-500 mb-6">
              Tidak ada data APBD per pemerintah daerah yang tersedia untuk
              periode ini.
            </div>
          )}

          {/* Tren APBN - Pendapatan & Belanja */}
          <section className="bg-white p-4 rounded-lg shadow-md mb-6">
            <h2 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">
              Tren APBN (Pendapatan & Belanja)
            </h2>
            <ResponsiveContainer
              width="100%"
              height={400}
              className={`text-xs`}
            >
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis
                  tickFormatter={formatCurrencyAxis}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip
                  formatter={(value) => "Rp" + formatLargeNumber(value, 2)}
                />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Line
                  type="monotone"
                  dataKey="APBN_Pendapatan"
                  stroke="#8884d8"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="APBN Pendapatan"
                >
                  <LabelList
                    dataKey="APBN_Pendapatan"
                    position="top"
                    formatter={(value) => formatLargeNumber(value, 0)}
                    style={{ fontSize: 10 }}
                  />
                </Line>
                <Line
                  type="monotone"
                  dataKey="APBN_Belanja"
                  stroke="#ffc658"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="APBN Belanja"
                >
                  <LabelList
                    dataKey="APBN_Belanja"
                    position="top"
                    formatter={(value) => formatLargeNumber(value, 0)}
                    style={{ fontSize: 10 }}
                  />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </section>

          {/* Tren APBD - Pendapatan & Belanja */}
          <section className="bg-white p-4 rounded-lg shadow-md">
            <h2 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">
              Tren APBD (Pendapatan & Belanja)
            </h2>
            <ResponsiveContainer
              width="100%"
              height={400}
              className={`text-xs`}
            >
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis
                  tickFormatter={formatCurrencyAxis}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip
                  formatter={(value) => "Rp" + formatLargeNumber(value, 2)}
                />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Line
                  type="monotone"
                  dataKey="APBD_Pendapatan"
                  stroke="#82ca9d"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="APBD Pendapatan"
                >
                  <LabelList
                    dataKey="APBD_Pendapatan"
                    position="top"
                    formatter={(value) => formatLargeNumber(value, 0)}
                    style={{ fontSize: 10 }}
                  />
                </Line>
                <Line
                  type="monotone"
                  dataKey="APBD_Belanja"
                  stroke="#ff7300"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="APBD Belanja"
                >
                  <LabelList
                    dataKey="APBD_Belanja"
                    position="top"
                    formatter={(value) => formatLargeNumber(value, 0)}
                    style={{ fontSize: 10 }}
                  />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </section>
        </>
      )}

      {/* Modal Filter */}
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

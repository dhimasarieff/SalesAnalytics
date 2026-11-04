
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Sale = {
  id: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  saleDate: string;
};

type ProductAnalysis = {
  productName: string;
  quantity_sold: number;
  revenue: number;
  transaction_count: number;
};

type DailyAnalysis = {
  sale_date: string;
  revenue: number;
  items_sold: number;
};

type AnalysisData = {
  summary: {
    totalRevenue: number;
    totalTransactions: number;
    totalItemsSold: number;
    averageTransaction: number;
  };
  topProduct: string;
  products: ProductAnalysis[];
  dailySales: DailyAnalysis[];
};

const API_URL = "http://localhost:5080/api/sales";

const rupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

const dateLabel = (value: string) =>
  new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

function localToday() {
  return "";
}

export default function Dashboard() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [saleDate, setSaleDate] = useState("");

  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [analysisError, setAnalysisError] = useState("");

  const loadSales = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(API_URL);

      if (!response.ok) {
        throw new Error(`API memberikan status ${response.status}`);
      }

      const data: Sale[] = await response.json();
      setSales(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal mengambil data penjualan."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAnalysis = useCallback(async () => {
  setAnalysisError("");

  try {
    const response = await fetch("/api/analysis", {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Analisis gagal dimuat (${response.status})`);
    }

    const data: AnalysisData = await response.json();

    setAnalysis(data);
  } catch (err) {
    setAnalysisError(
      err instanceof Error
        ? err.message
        : "Gagal mengambil hasil analisis Python."
    );
  }
  }, []);

  useEffect(() => {
  void loadSales();
  void loadAnalysis();
  }, [loadSales, loadAnalysis]);

  const filteredSales = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return sales.filter((sale) => {
      const productMatches = sale.productName
        .toLowerCase()
        .includes(keyword);

      const day = sale.saleDate.slice(0, 10);
      const afterStart = !startDate || day >= startDate;
      const beforeEnd = !endDate || day <= endDate;

      return productMatches && afterStart && beforeEnd;
    });
  }, [sales, search, startDate, endDate]);

  const summary = useMemo(() => {
    const revenue = filteredSales.reduce(
      (sum, sale) => sum + sale.quantity * sale.unitPrice,
      0
    );

    const items = filteredSales.reduce(
      (sum, sale) => sum + sale.quantity,
      0
    );

    return {
      revenue,
      transactions: filteredSales.length,
      items,
    };
  }, [filteredSales]);

  const dailySales = useMemo(() => {
    const grouped = new Map<string, number>();

    filteredSales.forEach((sale) => {
      const day = sale.saleDate.slice(0, 10);
      const revenue = sale.quantity * sale.unitPrice;
      grouped.set(day, (grouped.get(day) ?? 0) + revenue);
    });

    return Array.from(grouped, ([date, revenue]) => ({
      date,
      label: dateLabel(date),
      revenue,
    })).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredSales]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    const trimmedName = productName.trim();
    const parsedQuantity = Number(quantity);
    const parsedPrice = Number(unitPrice);

    if (!trimmedName) {
      setError("Nama produk wajib diisi.");
      return;
    }

    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      setError("Jumlah harus berupa bilangan bulat lebih dari 0.");
      return;
    }

    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setError("Harga satuan tidak boleh negatif.");
      return;
    }

    if (!saleDate) {
      setError("Tanggal penjualan wajib diisi.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productName: trimmedName,
          quantity: parsedQuantity,
          unitPrice: parsedPrice,
          saleDate: `${saleDate}T12:00:00`,
        }),
      });

      if (!response.ok) {
        const details = await response.text();
        throw new Error(
          details || `Gagal menyimpan transaksi (${response.status}).`
        );
      }

      setProductName("");
      setQuantity("1");
      setUnitPrice("");
      setSaleDate("");
      setSearch("");
      setStartDate("");
      setEndDate("");
      setMessage("Transaksi berhasil disimpan ke database.");

      await loadSales();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat menyimpan transaksi."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="dashboard">
      <header className="topbar">
        <div>
          <p className="eyebrow">SALES ANALYTICS</p>
          <h1>Dashboard Penjualan</h1>
          <p className="muted">
            Pantau pendapatan dan performa transaksi bisnismu.
          </p>
        </div>

        <button
          className="refresh-button"
          type="button"
          onClick={() => void loadSales()}
          disabled={loading}
        >
          ↻ Muat ulang
        </button>
      </header>

      {error && (
        <div className="error" role="alert">
          <strong>Terjadi masalah</strong>
          <p>{error}</p>
          <p>
            Pastikan backend aktif dan konfigurasi CORS sudah benar.
          </p>
        </div>
      )}

      {message && (
        <div className="success" role="status">
          {message}
        </div>
      )}

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Tambah Transaksi</h2>
            <p className="muted">
              Data akan disimpan melalui API ke PostgreSQL.
            </p>
          </div>
        </div>

        <form className="sale-form" onSubmit={handleSubmit}>
          <label>
            Nama produk
            <input
              value={productName}
              onChange={(event) => setProductName(event.target.value)}
              placeholder="Contoh: Laptop"
              maxLength={150}
              required
            />
          </label>

          <label>
            Jumlah
            <input
              type="number"
              min="1"
              step="1"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              required
            />
          </label>

          <label>
            Harga satuan (Rp)
            <input
              type="number"
              min="0"
              step="0.01"
              value={unitPrice}
              onChange={(event) => setUnitPrice(event.target.value)}
              placeholder="Contoh: 150000"
              required
            />
          </label>

          <label>
            Tanggal penjualan
            <input
              type="date"
              value={saleDate}
              onChange={(event) => setSaleDate(event.target.value)}
              required
            />
          </label>

          <div className="form-actions">
            <button className="primary-button" type="submit" disabled={saving}>
              {saving ? "Menyimpan..." : "+ Simpan Transaksi"}
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Filter Transaksi</h2>
            <p className="muted">
              Cari nama produk atau pilih rentang tanggal.
            </p>
          </div>
        </div>

        <div className="filter-grid">
          <label>
            Cari produk
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Ketik nama produk..."
            />
          </label>

          <label>
            Dari tanggal
            <input
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </label>

          <label>
            Sampai tanggal
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </label>

          <button
            className="refresh-button clear-button"
            type="button"
            onClick={() => {
              setSearch("");
              setStartDate("");
              setEndDate("");
            }}
          >
            Hapus filter
          </button>
        </div>
      </section>

      {loading ? (
        <p className="notice">Mengambil data dari API...</p>
      ) : (
        <>
          <section className="summary-grid">
            <article className="summary-card">
              <p>Total Pendapatan</p>
              <h2>{rupiah(summary.revenue)}</h2>
              <span>Sesuai transaksi yang ditampilkan</span>
            </article>

            <article className="summary-card">
              <p>Total Transaksi</p>
              <h2>{summary.transactions.toLocaleString("id-ID")}</h2>
              <span>Jumlah catatan penjualan</span>
            </article>

            <article className="summary-card">
              <p>Unit Terjual</p>
              <h2>{summary.items.toLocaleString("id-ID")}</h2>
              <span>Total kuantitas produk</span>
            </article>
          </section>

          {analysisError && (
            <div className="error" role="alert">
              <strong>Analisis Python bermasalah</strong>
              <p>{analysisError}</p>
            </div>
          )}

          {analysis && (
            <>
              <section className="summary-grid">
                <article className="summary-card">
                  <p>Rata-rata Transaksi</p>
                  <h2>{rupiah(analysis.summary.averageTransaction)}</h2>
                  <span>Rata-rata nilai setiap transaksi</span>
                </article>

                <article className="summary-card">
                  <p>Produk Terlaris</p>
                  <h2>{analysis.topProduct}</h2>
                  <span>Berdasarkan hasil analisis Python</span>
                </article>
              </section>

              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Performa Produk</h2>
                    <p className="muted">
                      Hasil pengelompokan data menggunakan Python Pandas
                    </p>
                  </div>
                </div>

                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Produk</th>
                        <th>Unit Terjual</th>
                        <th>Jumlah Transaksi</th>
                        <th>Total Pendapatan</th>
                      </tr>
                    </thead>

                    <tbody>
                      {analysis.products.map((product) => (
                        <tr key={product.productName}>
                          <td className="product-name">
                            {product.productName}
                          </td>
                          <td>{product.quantity_sold}</td>
                          <td>{product.transaction_count}</td>
                          <td className="amount">
                            {rupiah(product.revenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Analisis Pendapatan Harian Python</h2>
                    <p className="muted">
                      Grafik berdasarkan hasil pengolahan Python
                    </p>
                  </div>
                </div>

                {analysis.dailySales.length === 0 ? (
                  <p className="notice">Belum ada data analisis harian.</p>
                ) : (
                  <div className="chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analysis.dailySales}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="sale_date"
                          tickFormatter={(value) => dateLabel(value)}
                        />
                        <YAxis
                          tickFormatter={(value: number) =>
                            new Intl.NumberFormat("id-ID", {
                              notation: "compact",
                            }).format(value)
                          }
                        />
                        <Tooltip
                          formatter={(value) => [
                            rupiah(Number(value)),
                            "Pendapatan",
                          ]}
                          labelFormatter={(label) => dateLabel(String(label))}
                        />
                        <Line
                          type="monotone"
                          dataKey="revenue"
                          name="Pendapatan Python"
                          stroke="#16a34a"
                          strokeWidth={3}
                          dot={{ r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </section>
            </>
          )}

          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Tren Pendapatan</h2>
                <p className="muted">
                  Pendapatan per tanggal sesuai filter
                </p>
              </div>
            </div>

            {dailySales.length === 0 ? (
              <p className="notice">Tidak ada data untuk filter ini.</p>
            ) : (
              <div className="chart">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={dailySales}
                    margin={{ top: 12, right: 18, left: 12, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis
                      tickFormatter={(value: number) =>
                        new Intl.NumberFormat("id-ID", {
                          notation: "compact",
                        }).format(value)
                      }
                    />
                    <Tooltip
                      formatter={(value) => [
                        rupiah(Number(value)),
                        "Pendapatan",
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      name="Pendapatan"
                      stroke="#2563eb"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Transaksi Penjualan</h2>
                <p className="muted">
                  Daftar transaksi berdasarkan pencarian dan filter tanggal
                </p>
              </div>
              <span className="count">
                {filteredSales.length} dari {sales.length} transaksi
              </span>
            </div>

            {filteredSales.length === 0 ? (
              <p className="notice">Tidak ada transaksi yang cocok.</p>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Produk</th>
                      <th>Tanggal</th>
                      <th>Jumlah</th>
                      <th>Harga Satuan</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...filteredSales]
                      .sort((a, b) => b.id - a.id)
                      .map((sale) => (
                        <tr key={sale.id}>
                          <td>#{sale.id}</td>
                          <td className="product-name">{sale.productName}</td>
                          <td>{dateLabel(sale.saleDate)}</td>
                          <td>{sale.quantity}</td>
                          <td>{rupiah(sale.unitPrice)}</td>
                          <td className="amount">
                            {rupiah(sale.quantity * sale.unitPrice)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      <footer>Sales Analytics Dashboard · ASP.NET Core API · PostgreSQL</footer>
    </main>
  );
}

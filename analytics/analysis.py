
import json
from pathlib import Path

import pandas as pd
import requests

API_URL = "http://localhost:5080/api/sales"


def main():
    print("Mengambil data penjualan dari API C#...")

    response = requests.get(API_URL, timeout=15)
    response.raise_for_status()

    sales = response.json()

    if not sales:
        print("Belum ada data penjualan untuk dianalisis.")
        return

    df = pd.DataFrame(sales)

    # tipe data harus sesuai untuk analisis.
    df["quantity"] = pd.to_numeric(df["quantity"])
    df["unitPrice"] = pd.to_numeric(df["unitPrice"])
    df["saleDate"] = pd.to_datetime(df["saleDate"])

    # Hitung ulang pendapatan dari jumlah dan harga.
    df["revenue"] = df["quantity"] * df["unitPrice"]

    # Ringkasan keseluruhan.
    total_revenue = float(df["revenue"].sum())
    total_transactions = int(len(df))
    total_items_sold = int(df["quantity"].sum())

    average_transaction = (
        total_revenue / total_transactions
        if total_transactions > 0
        else 0
    )

    # Performa setiap produk.
    product_analysis = (
        df.groupby("productName", as_index=False)
        .agg(
            quantity_sold=("quantity", "sum"),
            revenue=("revenue", "sum"),
            transaction_count=("productName", "count"),
        )
        .sort_values("revenue", ascending=False)
    )

    # Penjualan berdasarkan tanggal.
    daily_analysis = (
        df.assign(sale_date=df["saleDate"].dt.strftime("%Y-%m-%d"))
        .groupby("sale_date", as_index=False)
        .agg(
            revenue=("revenue", "sum"),
            items_sold=("quantity", "sum"),
        )
        .sort_values("sale_date")
    )

    result = {
        "summary": {
            "totalRevenue": total_revenue,
            "totalTransactions": total_transactions,
            "totalItemsSold": total_items_sold,
            "averageTransaction": average_transaction,
        },
        "topProduct": (
            product_analysis.iloc[0]["productName"]
        ),
        "products": product_analysis.to_dict(orient="records"),
        "dailySales": daily_analysis.to_dict(orient="records"),
    }

    output_path = Path(__file__).parent / "analysis_result.json"

    output_path.write_text(
        json.dumps(result, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    print("\n=== RINGKASAN PENJUALAN ===")
    print(f"Total pendapatan : Rp{total_revenue:,.0f}")
    print(f"Total transaksi  : {total_transactions}")
    print(f"Unit terjual     : {total_items_sold}")
    print(f"Rata-rata transaksi: Rp{average_transaction:,.0f}")

    print("\n=== PERFORMA PRODUK ===")
    print(
        product_analysis.to_string(
            index=False,
            formatters={
                "revenue": lambda value: f"Rp{value:,.0f}"
            },
        )
    )

    print(f"\nHasil analisis tersimpan di: {output_path}")


if __name__ == "__main__":
    main()


using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SalesAnalytics.Api.Data;
using SalesAnalytics.Api.Models;

namespace SalesAnalytics.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SalesController : ControllerBase
{
    private readonly SalesDbContext _db;

    public SalesController(SalesDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Sale>>> GetSales()
    {
        var sales = await _db.Sales
            .OrderBy(s => s.Id)
            .ToListAsync();

        return Ok(sales);
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary()
    {
        var sales = await _db.Sales.ToListAsync();

        return Ok(new
        {
            totalRevenue = sales.Sum(s => s.Total),
            totalTransactions = sales.Count,
            totalItemsSold = sales.Sum(s => s.Quantity)
        });
    }

    [HttpPost]
    public async Task<ActionResult<Sale>> CreateSale(Sale sale)
    {
        if (string.IsNullOrWhiteSpace(sale.ProductName))
            return BadRequest("Nama produk wajib diisi.");

        if (sale.Quantity <= 0 || sale.UnitPrice < 0)
            return BadRequest(
                "Jumlah harus positif dan harga tidak boleh negatif."
            );

        // ID dibuat otomatis oleh PostgreSQL.
        sale.Id = 0;

        // Pastikan DateTime sesuai dengan PostgreSQL timestamptz.
        if (sale.SaleDate.Kind == DateTimeKind.Unspecified)
        {
            sale.SaleDate = DateTime.SpecifyKind(
                sale.SaleDate,
                DateTimeKind.Utc
            );
        }
        else
        {
            sale.SaleDate = sale.SaleDate.ToUniversalTime();
        }

        _db.Sales.Add(sale);
        await _db.SaveChangesAsync();

        return CreatedAtAction(
            nameof(GetSales),
            new { id = sale.Id },
            sale
        );
    }
}

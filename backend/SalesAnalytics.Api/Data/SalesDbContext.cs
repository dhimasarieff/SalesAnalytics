using Microsoft.EntityFrameworkCore;
using SalesAnalytics.Api.Models;

namespace SalesAnalytics.Api.Data;

public class SalesDbContext : DbContext
{
    public SalesDbContext(
        DbContextOptions<SalesDbContext> options)
        : base(options)
    {
    }

    public DbSet<Sale> Sales => Set<Sale>();
}
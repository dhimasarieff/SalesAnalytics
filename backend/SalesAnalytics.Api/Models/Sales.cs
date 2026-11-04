namespace SalesAnalytics.Api.Models;

    public class Sale
    {
        public int Id { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public DateTime SaleDate { get; set; }
        public decimal Total => Quantity * UnitPrice;
    }

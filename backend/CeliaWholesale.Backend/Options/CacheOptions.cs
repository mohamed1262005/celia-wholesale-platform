namespace CeliaWholesale.Backend.Options;

public sealed class CacheOptions
{
    public RedisCacheOptions Redis { get; set; } = new();
    public CachePolicyOptions ProductList { get; set; } = new();
    public CachePolicyOptions ProductDetail { get; set; } = new();
    public CachePolicyOptions CategoryList { get; set; } = new();
}

public sealed class RedisCacheOptions
{
    public bool Enabled { get; set; }
    public string ConnectionString { get; set; } = "localhost:6379";
    public string InstanceName { get; set; } = "celia-backend:";
}

public sealed class CachePolicyOptions
{
    public int AbsoluteMinutes { get; set; } = 10;
    public int SlidingMinutes { get; set; } = 2;
    public int AbsoluteHours { get; set; } = 1;
}

using CeliaWholesale.Backend.Options;
using CeliaWholesale.Backend.Services;
using StackExchange.Redis;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<CacheOptions>(builder.Configuration.GetSection("Cache"));

var supabaseUrl = builder.Configuration["Supabase:Url"]!;
var supabaseAnonKey = builder.Configuration["Supabase:AnonKey"]!;
builder.Services.AddSingleton(sp =>
{
    var client = new HttpClient();
    client.BaseAddress = new Uri($"{supabaseUrl.TrimEnd('/')}/rest/v1/");
    if (!string.IsNullOrWhiteSpace(supabaseAnonKey))
    {
        client.DefaultRequestHeaders.Add("apikey", supabaseAnonKey);
    }
    return client;
});
builder.Services.AddSingleton<SupabaseCatalogClient>();
builder.Services.AddHttpClient<SupabaseAdminAuthorizer>(client =>
{
    client.BaseAddress = new Uri($"{supabaseUrl.TrimEnd('/')}/");
    if (!string.IsNullOrWhiteSpace(supabaseAnonKey))
    {
        client.DefaultRequestHeaders.Add("apikey", supabaseAnonKey);
    }
});

var cacheOptions = builder.Configuration.GetSection("Cache:Redis").Get<RedisCacheOptions>() ?? new RedisCacheOptions();
builder.Services.AddMemoryCache();
if (cacheOptions.Enabled)
{
    var redisConnection = ConnectionMultiplexer.Connect(cacheOptions.ConnectionString);
    builder.Services.AddSingleton<IConnectionMultiplexer>(redisConnection);
    builder.Services.AddStackExchangeRedisCache(options =>
    {
        options.Configuration = cacheOptions.ConnectionString;
        options.InstanceName = cacheOptions.InstanceName;
    });
    builder.Services.AddScoped<ICacheInvalidationPublisher, RedisCacheInvalidationPublisher>();
    builder.Services.AddHostedService<RedisCacheInvalidationSubscriber>();
}
else
{
    builder.Services.AddDistributedMemoryCache();
    builder.Services.AddSingleton<ICacheInvalidationPublisher, NoopCacheInvalidationPublisher>();
}

builder.Services.AddSingleton<HybridCacheService>();
builder.Services.AddScoped<CatalogService>();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHealthChecks();

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(options => options.AddPolicy("Frontend", policy =>
    policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.MapHealthChecks("/health");
app.UseCors("Frontend");
app.MapControllers();

app.Run();

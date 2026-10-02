using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;
using WomenSafety.Api.Data;
using WomenSafety.Api.Middleware;
using WomenSafety.Api.Services;
using WomenSafety.Application.Abstractions;
using WomenSafety.Application.Services;

var builder = WebApplication.CreateBuilder(args);

// ─── Serilog ──────────────────────────────────────────────────────────────────
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .CreateLogger();

builder.Host.UseSerilog();

// ─── Database ─────────────────────────────────────────────────────────────────
builder.Services.AddDbContext<WomenSafetyDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")
                      ?? "Data Source=womensafety.db"));

builder.Services.AddScoped<IAppDbContext>(sp => sp.GetRequiredService<WomenSafetyDbContext>());

// ─── Application services ─────────────────────────────────────────────────────
builder.Services.AddScoped<IClock, SystemClock>();
builder.Services.AddScoped<IAuditLogger, ConsoleAuditLogger>();
builder.Services.AddScoped<ISmsProvider, DevSmsProvider>();
builder.Services.AddScoped<IMapProvider, OsmMapProvider>();
builder.Services.AddScoped<IGeocodingProvider, HaversineGeocodingProvider>();
builder.Services.AddScoped<IEmergencyServiceProvider, BangladeshEmergencyServiceProvider>();
builder.Services.AddScoped<IPoliceProvider, StubPoliceProvider>();
builder.Services.AddScoped<ITrustedContactNotifier, ConsoleTrustedContactNotifier>();

builder.Services.AddScoped<IncidentService>();
builder.Services.AddScoped<EmergencyWorkflowService>();
builder.Services.AddScoped<SyncService>();
builder.Services.AddScoped<TrustedContactService>();
builder.Services.AddScoped<AnalyticsService>();
builder.Services.AddScoped<AuthService>();

builder.Services.AddSingleton<TokenService>();

// ─── Authentication ───────────────────────────────────────────────────────────
var jwtKey = builder.Configuration["Jwt:Key"] ?? "DevSecretKey-ChangeMe-In-Production-At-Least-32Bytes!!";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "WomenSafety";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "WomenSafetyApp";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

builder.Services.AddAuthorization();

// ─── Controllers, Swagger, Rate Limiting ──────────────────────────────────────
builder.Services.AddControllers().AddJsonOptions(options =>
    options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter()));
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Women Safety Platform API",
        Version = "v1",
        Description = "Bangladesh Women Safety Platform - Backend API"
    });
});

builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("sync", opts =>
    {
        opts.PermitLimit = 30;
        opts.Window = TimeSpan.FromMinutes(1);
    });
    options.AddFixedWindowLimiter("public", opts =>
    {
        opts.PermitLimit = 60;
        opts.Window = TimeSpan.FromMinutes(1);
    });
});

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
    });
});

var app = builder.Build();

// ─── Middleware pipeline ──────────────────────────────────────────────────────
app.UseMiddleware<ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseDefaultFiles();
app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = ctx =>
        ctx.Context.Response.Headers.CacheControl = "no-cache, no-store, must-revalidate"
});
app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// SPA fallback — serve index.html for any non-API route
app.MapFallbackToFile("index.html");

// ─── Auto-migrate & seed ─────────────────────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<WomenSafetyDbContext>();
    await SeedData.RunAsync(db);
}

app.Run();

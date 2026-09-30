using System.Text.Json;
using WomenSafety.Application.Exceptions;

namespace WomenSafety.Api.Middleware;

/// <summary>
/// Converts known application exceptions into clean problem responses and turns everything else
/// into a generic 500 so internal details never leak (spec section 44).
/// </summary>
public class ExceptionHandlingMiddleware
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (AppException ex)
        {
            // Expected, user-facing failure. Safe to surface the message.
            _logger.LogInformation("Application exception {Code} on {Path}: {Message}",
                ex.Code, context.Request.Path, ex.Message);

            await WriteAsync(context, ex.StatusCode, ex.Code, ex.Message);
        }
        catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
        {
            // Client disconnected; nothing to report.
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception on {Path}", context.Request.Path);

            await WriteAsync(context, StatusCodes.Status500InternalServerError, "server_error",
                "An unexpected error occurred. No incident data was lost; please retry.");
        }
    }

    private static async Task WriteAsync(HttpContext context, int statusCode, string code, string message)
    {
        if (context.Response.HasStarted) return;

        context.Response.Clear();
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";

        var payload = JsonSerializer.Serialize(new
        {
            error = code,
            message,
            status = statusCode,
            correlationId = context.TraceIdentifier
        }, JsonOptions);

        await context.Response.WriteAsync(payload);
    }
}

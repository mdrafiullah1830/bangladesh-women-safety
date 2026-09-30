using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using WomenSafety.Application.Contracts;
using WomenSafety.Application.Security;
using WomenSafety.Application.Services;
using WomenSafety.Api.Authorization;

namespace WomenSafety.Api.Controllers;

/// <summary>
/// Offline synchronization endpoint (spec sections 8, 41 and 67).
///
/// The client posts its locally queued emergencies and location fixes here. Because every item
/// carries an idempotency key, a client may safely retry the entire batch after a failure.
/// </summary>
[ApiController]
[Route("api/sync")]
[Authorize]
[EnableRateLimiting("sync")]
public class SyncController : ControllerBase
{
    private readonly SyncService _sync;

    public SyncController(SyncService sync) => _sync = sync;

    [HttpPost]
    [RequirePermission(Permission.IncidentCreateOwn)]
    public async Task<ActionResult<SyncBatchResponse>> Sync([FromBody] SyncBatchRequest request, CancellationToken ct)
    {
        var (userId, anonymousId) = CallerIdentity.Resolve(User);
        return Ok(await _sync.SyncAsync(userId, anonymousId, request, ct));
    }
}

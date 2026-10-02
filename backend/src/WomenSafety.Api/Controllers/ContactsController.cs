using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WomenSafety.Api.Authorization;
using WomenSafety.Application.Contracts;
using WomenSafety.Application.Security;
using WomenSafety.Application.Services;

namespace WomenSafety.Api.Controllers;

/// <summary>
/// CRUD over the caller's trusted contacts. The service already enforces the 10-contact cap,
/// phone masking and ownership; this controller only handles HTTP concerns.
/// </summary>
[ApiController]
[Route("api/contacts")]
[Authorize]
public class ContactsController : ControllerBase
{
    private readonly TrustedContactService _contacts;

    public ContactsController(TrustedContactService contacts) => _contacts = contacts;

    [HttpGet]
    [RequirePermission(Permission.ContactViewOwn)]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        var (userId, _) = CallerIdentity.Resolve(User);
        return Ok(await _contacts.ListAsync(userId, ct));
    }

    [HttpPost]
    [RequirePermission(Permission.ContactCreateOwn)]
    public async Task<IActionResult> Create([FromBody] TrustedContactRequest request, CancellationToken ct)
    {
        var (userId, _) = CallerIdentity.Resolve(User);
        return Ok(await _contacts.CreateAsync(userId, request, ct));
    }

    [HttpPut("{contactId:guid}")]
    [RequirePermission(Permission.ContactUpdateOwn)]
    public async Task<IActionResult> Update(Guid contactId, [FromBody] TrustedContactRequest request, CancellationToken ct)
    {
        var (userId, _) = CallerIdentity.Resolve(User);
        var updated = await _contacts.UpdateAsync(userId, contactId, request, ct);
        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpDelete("{contactId:guid}")]
    [RequirePermission(Permission.ContactDeleteOwn)]
    public async Task<IActionResult> Delete(Guid contactId, CancellationToken ct)
    {
        var (userId, _) = CallerIdentity.Resolve(User);
        return await _contacts.DeleteAsync(userId, contactId, ct) ? NoContent() : NotFound();
    }
}

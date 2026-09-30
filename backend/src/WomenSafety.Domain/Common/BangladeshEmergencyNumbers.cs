namespace WomenSafety.Domain.Common;

/// <summary>
/// Official Bangladesh emergency numbers. These are public, not user-provided,
/// and must never be shown as "platform contacted" (spec section 10).
/// </summary>
public static class BangladeshEmergencyNumbers
{
    public const string National999 = "999";
    public const string Helpline109 = "109";
    public const string Health16263 = "16263";
}

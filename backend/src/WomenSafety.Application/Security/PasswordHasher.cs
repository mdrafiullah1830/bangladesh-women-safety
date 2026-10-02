using System.Security.Cryptography;
using System.Text;

namespace WomenSafety.Application.Security;

/// <summary>
/// PBKDF2 password hashing (SHA-256, 100k iterations) stored as
/// PBKDF2$&lt;iterations&gt;$&lt;saltB64&gt;$&lt;hashB64&gt; so parameters can be upgraded later.
/// </summary>
public static class PasswordHasher
{
    private const int Iterations = 100_000;
    private const int SaltSize = 16;
    private const int KeySize = 32;

    public static string Hash(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(SaltSize);
        var key = Rfc2898DeriveBytes.Pbkdf2(password, salt, Iterations, HashAlgorithmName.SHA256, KeySize);
        return $"PBKDF2${Iterations}${Convert.ToBase64String(salt)}${Convert.ToBase64String(key)}";
    }

    public static bool Verify(string password, string stored)
    {
        if (string.IsNullOrWhiteSpace(stored)) return false;
        var parts = stored.Split('$');
        if (parts.Length != 4 || parts[0] != "PBKDF2") return false;
        if (!int.TryParse(parts[1], out var iterations)) return false;

        var salt = Convert.FromBase64String(parts[2]);
        var expected = Convert.FromBase64String(parts[3]);
        var actual = Rfc2898DeriveBytes.Pbkdf2(password, salt, iterations, HashAlgorithmName.SHA256, expected.Length);
        return CryptographicOperations.FixedTimeEquals(actual, expected);
    }
}

public static class TokenFactory
{
    public static string NewToken(int bytes = 32)
        => Convert.ToHexString(RandomNumberGenerator.GetBytes(bytes));

    public static string NewOtp(int digits = 6)
    {
        var value = RandomNumberGenerator.GetInt32(0, (int)Math.Pow(10, digits));
        return value.ToString().PadLeft(digits, '0');
    }

    public static string Sha256Of(string input)
        => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(input)));
}

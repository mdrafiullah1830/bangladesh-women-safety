namespace WomenSafety.Application.Exceptions;

/// <summary>
/// Base class for all application-level exceptions. The global exception handling middleware
/// converts these into clean problem responses; anything else becomes a generic 500
/// (spec section 44).
/// </summary>
public class AppException : Exception
{
    public string Code { get; }
    public int StatusCode { get; }

    public AppException(string code, int statusCode, string message)
        : base(message)
    {
        Code = code;
        StatusCode = statusCode;
    }
}

public class AuthenticationAppException : AppException
{
    public AuthenticationAppException(string message)
        : base("authentication_error", 401, message) { }
}

public class ForbiddenAppException : AppException
{
    public ForbiddenAppException(string message)
        : base("forbidden", 403, message) { }
}

public class NotFoundAppException : AppException
{
    public NotFoundAppException(string message)
        : base("not_found", 404, message) { }
}

public class ValidationAppException : AppException
{
    public ValidationAppException(string message)
        : base("validation_error", 400, message) { }
}

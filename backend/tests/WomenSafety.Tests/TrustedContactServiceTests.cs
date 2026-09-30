using WomenSafety.Application.Services;

namespace WomenSafety.Tests;

public class TrustedContactServiceTests
{
    [Theory]
    [InlineData("01712345678", "01712****78")]
    [InlineData("ABCDE", "A**DE")]
    [InlineData("AB", "**")]
    public void MaskPhone_MasksCorrectly(string input, string expected)
    {
        var result = TrustedContactService.MaskPhone(input);
        Assert.Equal(expected, result);
    }

    [Fact]
    public void MaskPhone_EmptyString_ReturnsEmpty()
    {
        Assert.Equal(string.Empty, TrustedContactService.MaskPhone(""));
    }

    [Fact]
    public void MaskPhone_Null_ReturnsEmpty()
    {
        Assert.Equal(string.Empty, TrustedContactService.MaskPhone(null!));
    }

    [Fact]
    public void MaxContactsPerUser_IsReasonable()
    {
        Assert.InRange(TrustedContactService.MaxContactsPerUser, 1, 20);
    }
}

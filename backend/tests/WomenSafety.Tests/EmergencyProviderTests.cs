using WomenSafety.Api.Services;
using WomenSafety.Domain.Common;

namespace WomenSafety.Tests;

public class EmergencyProviderTests
{
    [Fact]
    public void BangladeshEmergencyNumbers_AreCorrect()
    {
        Assert.Equal("999", BangladeshEmergencyNumbers.National999);
        Assert.Equal("109", BangladeshEmergencyNumbers.Helpline109);
        Assert.Equal("16263", BangladeshEmergencyNumbers.Health16263);
    }

    [Fact]
    public void BangladeshEmergencyServiceProvider_DoesNotSupportDispatch()
    {
        var provider = new BangladeshEmergencyServiceProvider();
        Assert.False(provider.SupportsProgrammaticDispatch);
    }

    [Fact]
    public void BangladeshEmergencyServiceProvider_GeneratesDialUri()
    {
        var provider = new BangladeshEmergencyServiceProvider();
        Assert.Equal("tel:999", provider.GetDialUri("999"));
    }

    [Fact]
    public void StubPoliceProvider_DoesNotSupportConfirmation()
    {
        var provider = new StubPoliceProvider();
        Assert.False(provider.SupportsOfficialConfirmation);
    }
}

using WomenSafety.Application.Services;
using WomenSafety.Domain.Enums;

namespace WomenSafety.Tests;

public class IncidentMapperTests
{
    [Theory]
    [InlineData(5.0, LocationSource.GPS, "high_accuracy")]
    [InlineData(20.0, LocationSource.GPS, "moderate_accuracy")]
    [InlineData(50.0, LocationSource.GPS, "low_accuracy")]
    [InlineData(80.0, LocationSource.NETWORK, "moderate_accuracy")]
    [InlineData(200.0, LocationSource.NETWORK, "coarse_estimation")]
    [InlineData(null, LocationSource.GPS, "unknown")]
    public void AccuracyLabel_ReturnsExpected(double? accuracy, LocationSource source, string expected)
    {
        Assert.Equal(expected, IncidentMapper.AccuracyLabel(accuracy, source));
    }

    [Fact]
    public void AccuracyLabel_PassiveSource_AlwaysCoarse()
    {
        Assert.Equal("coarse_estimation", IncidentMapper.AccuracyLabel(10.0, LocationSource.PASSIVE));
    }

    [Fact]
    public void AccuracyLabel_FusedSource_ModerateWhenAccurate()
    {
        Assert.Equal("moderate_accuracy", IncidentMapper.AccuracyLabel(30.0, LocationSource.FUSED));
    }
}

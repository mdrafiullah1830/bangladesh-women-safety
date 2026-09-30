using WomenSafety.Domain.Common;

namespace WomenSafety.Tests;

public class PrivacyAggregationTests
{
    [Theory]
    [InlineData(0, false)]
    [InlineData(1, false)]
    [InlineData(4, false)]
    [InlineData(5, true)]
    [InlineData(10, true)]
    [InlineData(100, true)]
    public void CanPublish_Threshold(int count, bool expected)
    {
        Assert.Equal(expected, PrivacyAggregation.CanPublish(count));
    }

    [Theory]
    [InlineData(22.35, 91.78, 0.01, 22.35, 91.78)]
    [InlineData(22.351, 91.781, 0.01, 22.35, 91.78)]
    [InlineData(22.356, 91.786, 0.01, 22.36, 91.79)]
    [InlineData(22.35, 91.78, 0.1, 22.4, 91.8)]
    public void CoarsenGrid_RoundsToCell(double lat, double lon, double cell, double expLat, double expLon)
    {
        var result = PrivacyAggregation.CoarsenGrid(lat, lon, cell);
        Assert.Equal(expLat, result.Latitude, 4);
        Assert.Equal(expLon, result.Longitude, 4);
    }

    [Fact]
    public void CoarsenGrid_ZeroCell_Throws()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => PrivacyAggregation.CoarsenGrid(22.35, 91.78, 0));
    }
}

using WomenSafety.Application.Services;

namespace WomenSafety.Tests;

public class SyncServiceTests
{
    [Fact]
    public void ComputeBackoff_ExponentialIncreases()
    {
        var first = SyncService.ComputeBackoff(1);
        var second = SyncService.ComputeBackoff(2);
        var third = SyncService.ComputeBackoff(3);

        // Average should increase (with jitter, minimum bound check)
        Assert.True(first.TotalSeconds < 10);
        Assert.True(second.TotalSeconds < 30);
        Assert.True(third.TotalSeconds < 60);
    }

    [Fact]
    public void ComputeBackoff_CapsAt10Minutes()
    {
        // The base cap is 600s, plus up to 25% jitter = max ~750s
        var maxBackoff = SyncService.ComputeBackoff(20);
        Assert.True(maxBackoff.TotalSeconds <= 800);
        // But should never be less than the base
        Assert.True(maxBackoff.TotalSeconds >= 600);
    }

    [Fact]
    public void ComputeBackoff_NeverReturnsZero()
    {
        for (int i = 1; i <= 15; i++)
        {
            Assert.True(SyncService.ComputeBackoff(i) > TimeSpan.Zero);
        }
    }
}

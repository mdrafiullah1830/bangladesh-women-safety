namespace WomenSafety.Domain.Common;

/// <summary>
/// Privacy-preserving aggregation utilities (spec sections 17, 27, 28 and 79).
/// Every bucket below <see cref="MinimumPublicBucketCount"/> is suppressed entirely
/// so that an individual cannot be inferred from a small dataset.
/// </summary>
public static class PrivacyAggregation
{
    public const int MinimumPublicBucketCount = 5;

    /// <summary>
    /// Returns true only when a count is large enough to publish without risking
    /// re-identification of an individual.
    /// </summary>
    public static bool CanPublish(int count) => count >= MinimumPublicBucketCount;

    /// <summary>
    /// Coarsens a coordinate pair onto a grid cell of the given size in degrees.
    /// Used for heatmap cells and for coarse location sharing with contacts/responders.
    /// </summary>
    public static (double Latitude, double Longitude) CoarsenGrid(
        double latitude, double longitude, double cellDegrees)
    {
        if (cellDegrees <= 0)
            throw new ArgumentOutOfRangeException(nameof(cellDegrees), "Cell size must be positive.");

        var lat = Math.Round(latitude / cellDegrees, MidpointRounding.AwayFromZero) * cellDegrees;
        var lon = Math.Round(longitude / cellDegrees, MidpointRounding.AwayFromZero) * cellDegrees;

        return (lat, lon);
    }
}

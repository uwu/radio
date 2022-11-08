using NodaTime;

namespace UwuRadio.Server;

/// <summary>
/// Provides time helpers to other classes
/// </summary>
public static class TimeHelpers
{
	public static Instant Now() => SystemClock.Instance.GetCurrentInstant();

	/// <summary>
	/// Only the date component of an Instant
	/// </summary>
	public static Instant StripTime(Instant inst) => inst.InUtc().Date.AtStartOfDayInZone(DateTimeZone.Utc).ToInstant();
}
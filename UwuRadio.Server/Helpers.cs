using System.Text;
using NodaTime;

namespace UwuRadio.Server;

public static class Helpers
{
	public static Instant Now() => SystemClock.Instance.GetCurrentInstant();

	/// <summary>
	///     Only the date component of an Instant
	/// </summary>
	public static Instant StripTime(Instant inst) => inst.InUtc().Date.AtStartOfDayInZone(DateTimeZone.Utc).ToInstant();

	// ReSharper disable once InconsistentNaming
	public static string MD5(byte[] data)
	{
		var hash = System.Security.Cryptography.MD5.HashData(data);
		var sb   = new StringBuilder();

		// format each byte as hex
		foreach (var b in hash) sb.Append(b.ToString("x2"));

		return sb.ToString();
	}

	public static Duration ParseDuration(string raw)
	{
		var segments = raw.Split(":").Reverse().Select(int.Parse).ToArray();
		var parsed   = Duration.FromSeconds(segments[0]);

		if (segments.Length > 1) parsed += Duration.FromMinutes(segments[1]);
		// god forbid someone sends in an hour long song
		if (segments.Length > 2) parsed += Duration.FromHours(segments[2]);

		return parsed;
	}
}
using System.Text;
using NodaTime;
using HashDepot;


namespace UwuRadio.Server;

public static class Helpers
{
	public static Instant Now() => SystemClock.Instance.GetCurrentInstant();

/*
	/// <summary>
	///     Only the date component of an Instant
	/// </summary>
	public static Instant StripTime(Instant inst) => inst.InUtc().Date.AtStartOfDayInZone(DateTimeZone.Utc).ToInstant();
*/

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

	private static readonly char[] Base60Chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwx".ToCharArray();
	private static string ToBase60(this ulong num) {
		var i = 32;
		var buffer = new char[i];
		do
		{
			buffer[--i] =  Base60Chars[num % 60];
			num         /= 60;
		}
		while (num > 0);

        var result = new char[32 - i];
        Array.Copy(buffer, i, result, 0, 32 - i);
        return new string(result);
	}

	public static string ComputeSongId(Song song) {
		var buffer = Encoding.UTF8.GetBytes(song.Name.ToLowerInvariant() + "|" + song.Artist.ToLowerInvariant());
		var hash = XXHash.Hash64(buffer);
		return hash.ToBase60();
	}

	public static TV? GetOrDefault<TK, TV>(this IDictionary<TK, TV> dict, TK k)
		=> dict.TryGetValue(k, out var val) ? val : default;
}
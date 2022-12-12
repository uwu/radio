using System.Text;
using NodaTime;
using HashDepot;


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

	public static void Log(string? subSeg, params object[] payload)
	{
		var segments = subSeg == null
						   ? new[] { ("uwu radio", ConsoleColor.Green) }
						   : new[]
						   {
							   ("uwu radio", ConsoleColor.Green),
							   (subSeg, ConsoleColor.Blue)
						   };

		foreach (var (seg, col) in segments)
		{
			Console.Write("⸨");

			var origCol = Console.ForegroundColor;
			Console.ForegroundColor = col;
			Console.Write(seg);
			Console.ForegroundColor = origCol;

			Console.Write("⸩ ");
		}

		foreach (var p in payload)
			Console.Write(p.ToString());

		Console.WriteLine();
	}

	private static char[] base60Chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwx".ToCharArray();
	private static string ToBase60(this ulong num) {
		var i = 32;
		char[] buffer = new char[i];
		do
		{
			buffer[--i] = base60Chars[num % 60];
			num = num / 60;
		}
		while (num > 0);

        char[] result = new char[32 - i];
        Array.Copy(buffer, i, result, 0, 32 - i);
        return new string(result);
	}

	public static string ComputeSongId(Song song) {
		var buffer = Encoding.UTF8.GetBytes(song.Name.ToLowerInvariant() + "|" + song.Artist.ToLowerInvariant());
		var hash = XXHash.Hash64(buffer);
		return hash.ToBase60();
	}
}
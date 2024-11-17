using System.Diagnostics;
using System.Diagnostics.CodeAnalysis;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace UwuRadio.Server;

/// <summary>
/// Re-encodes and applies processing to audio files
/// </summary>
// ReSharper disable once InconsistentNaming
public static class DSP
{
	[SuppressMessage("ReSharper", "InconsistentNaming")]
	public record struct RawLoudnorm(
		string input_i,
		string input_tp,
		string input_lra,
		string input_thresh,
		string target_offset);

	[SuppressMessage("ReSharper", "InconsistentNaming")]
	public record struct Loudnorm(double I, double TP, double LRA, double Thresh, double Oset)
	{
		public Loudnorm(RawLoudnorm rw) : this(
											   double.Parse(rw.input_i),
											   double.Parse(rw.input_tp),
											   double.Parse(rw.input_lra),
											   double.Parse(rw.input_thresh),
											   double.Parse(rw.target_offset))
		{
		}
	}

	private static readonly Regex JsonRegex = new(@"\[Parsed_loudnorm.*]\s*(\{[\s\S]*})");

	public static async Task<Loudnorm> MeasureLoudness(string path)
	{
		var startOptions = new ProcessStartInfo("ffmpeg")
		{
			ArgumentList =
			{
				"-hide_banner",
				"-nostats",
				"-loglevel",
				"info",
				"-nostdin",
				"-i",
				path,
				"-af",
				$"loudnorm=I={Constants.C.AudioNormIntegrated}:TP=0:LRA={Constants.C.AudioNormLra}:print_format=json",
				"-f",
				"null",
				"-"
			},
			WorkingDirectory      = Path.GetTempPath(),
			RedirectStandardError = true
		};

		var process = Process.Start(startOptions);
		var stdErr  = await process!.StandardError.ReadToEndAsync();

		var match = JsonRegex.Match(stdErr);

		return new Loudnorm(JsonSerializer.Deserialize<RawLoudnorm>(match.Groups[1].ValueSpan));
	}

	public static async Task Normalize(string inPath, string outPath, Loudnorm measurement)
	{
		var args = new List<string>
		{
			"-nostdin",
			"-i",
			inPath,
			"-af",
			$"loudnorm=I={Constants.C.AudioNormIntegrated}:TP=0:LRA={Constants.C.AudioNormLra}"
		  + $":measured_I={measurement.I}:measured_TP={measurement.TP}"
		  + $":measured_LRA={measurement.LRA}:measured_thresh={measurement.Thresh}"
		  + $":offset={measurement.Oset}:linear=true",
			"-f", Constants.C.AudioFormat
		};

		if (!string.IsNullOrWhiteSpace(Constants.C.AudioQScale))
			args.AddRange(new[] { "-q:a", Constants.C.AudioQScale });

		if (!string.IsNullOrWhiteSpace(Constants.C.AudioBitrate))
			args.AddRange(new[] { "-b:a", Constants.C.AudioBitrate });

		args.Add(outPath);

		var psi = new ProcessStartInfo("ffmpeg") { RedirectStandardError = true };
		foreach (var a in args) psi.ArgumentList.Add(a);

		var ps = Process.Start(psi)!;
		await ps.WaitForExitAsync();

		var _stderr = await ps.StandardError.ReadToEndAsync();
	}
}

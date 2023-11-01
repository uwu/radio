using System.Diagnostics;
using System.Text.RegularExpressions;

namespace UwuRadio.Server;

/// <summary>
/// Re-encodes and applies processing to audio files
/// </summary>
public static class DSP
{
	public record struct LoudnessMeasurement(
		// LUFS
		double IntegratedLoudness, double IntegratedThreshold,
		// LU
		double LoudnessRange,
		// dBFS
		double TruePeak);
	
	private static readonly Regex LoudnessMeasurementRegex = new(@"I:\s*(.*) LUFS[\s\S]*Threshold:\s*(.*) LUFS[\s\S]*LRA:\s*(.*) LU[\s\S]*Peak:\s*(.*) dBFS");
	
	public static async Task<LoudnessMeasurement> MeasureLoudness(string path)
	{
		var startOptions = new ProcessStartInfo("ffmpeg")
		{
			ArgumentList =
			{
				"-nostdin",
				"-i",
				path,
				"-filter:a",
				"ebur128=framelog=quiet:peak=true",
				"-f",
				"null",
				"-"
			},
			WorkingDirectory       = Path.GetTempPath(),
			RedirectStandardError  = true
		};

		var process = Process.Start(startOptions);
		var stdErr  = await process!.StandardError.ReadToEndAsync();
		var match   = LoudnessMeasurementRegex.Match(stdErr);
		
		var lufs  = double.Parse(match.Groups[1].Value);
		var thres = double.Parse(match.Groups[2].Value);
		var lra   = double.Parse(match.Groups[3].Value);
		var peak  = double.Parse(match.Groups[4].Value);
		
		return new LoudnessMeasurement(lufs, thres, lra, peak);
	}

	public static async Task Normalize(string inPath, string outPath, LoudnessMeasurement measurement)
	{
		var args = new List<string> { "-nostdin", "-i", inPath, "-filter:a",
			$"loudnorm=measured_i={measurement.IntegratedLoudness}:measured_thresh={measurement.IntegratedThreshold}:measured_lra={measurement.LoudnessRange}:measured_tp={measurement.TruePeak}:i={Constants.C.AudioNormIntegrated}",
			"-f", Constants.C.AudioFormat
		};
		
		if (!string.IsNullOrWhiteSpace(Constants.C.AudioQScale))
			args.AddRange(new [] {"-q:a", Constants.C.AudioQScale});
		
		if (!string.IsNullOrWhiteSpace(Constants.C.AudioBitrate))
			args.AddRange(new [] {"-b:a", Constants.C.AudioBitrate});
		
		args.Add(outPath);

		var psi = new ProcessStartInfo("ffmpeg") { RedirectStandardError = true };
		foreach (var a in args) psi.ArgumentList.Add(a);
		
		await Process.Start(psi)!.WaitForExitAsync();
	}
}

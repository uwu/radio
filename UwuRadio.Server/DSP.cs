using System.Diagnostics;
using System.Text.RegularExpressions;

namespace UwuRadio.Server;

/// <summary>
/// Re-encodes and applies processing to audio files
/// </summary>
// ReSharper disable once InconsistentNaming
public static class DSP
{
	public record struct LoudnessMeasurement(
		// LUFS
		double IntegratedLoudness, double IntegratedThreshold,
		// LU
		double LoudnessRange,
		// dBFS
		double TruePeak);
	
	private static readonly Regex LoudnessMeasurementRegex = new(@"I:\s*(.*) LUFS\s*Threshold:\s*(.*) LUFS[\s\S]*LRA:\s*(.*) LU[\s\S]*Peak:\s*(.*) dBFS");
	
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
				"ebur128=peak=true",
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
		//Console.Error.WriteLine(stdErr);
		//Console.Error.WriteLine($"measurement: {lufs} LUFS, {thres} threshold, {lra} LU range, {peak} dbFS peak");
		
		return new LoudnessMeasurement(lufs, thres, lra, peak);
	}

	public static async Task Normalize(string inPath, string outPath, LoudnessMeasurement measurement)
	{
		var lufsLoudnessChange = Constants.C.AudioNormIntegrated - measurement.IntegratedLoudness;
		var clampedLoudnessChange = Math.Min(lufsLoudnessChange, -(measurement.TruePeak - Constants.C.AudioNormMaxClip));
		
		//Console.Error.WriteLine($"wanted adjustment: {lufsLoudnessChange} (to hit target {Constants.C.AudioNormIntegrated} from measurment {measurement.IntegratedLoudness}");
		//Console.Error.WriteLine($"would result in a true peak level of {lufsLoudnessChange + measurement.TruePeak}");
		//Console.Error.WriteLine($"so actual adjustment: {clampedLoudnessChange} (max clip: {Constants.C.AudioNormMaxClip}db)");
		
		var args = new List<string> { "-nostdin", "-i", inPath, "-filter:a",
			$"volume={clampedLoudnessChange}dB",
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

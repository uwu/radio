using UwuRadio.Server.Streaming;

namespace UwuRadio.Server.Services;

/// <summary>
///		Responsible for streaming the current song from the server to the client
/// </summary>
public class SongStreamingService : IDisposable
{
	// 2 channels * 4 bytes per sample * 44.1k
	private const double PcmThroughput = 2 * 4 * 44.1 * 1000;
	
	// long-lived encoder
	public readonly FFmpegStream OggStream = new(["-f", "f32le", "-ar", "44100", "-ac", "2", "-i", "-", "-c:a", "libopus", "-f", "ogg", "-"]);
	
	// decoders per song placed into this
	private readonly AsyncThrottleStream<DoubleBufferingReadStream> _decodersStream = new(new(), PcmThroughput, null);

	private readonly DownloadService _downloadService;
	
	public SongStreamingService(DownloadService downloadService)
	{
		_downloadService = downloadService;
		
		// start feeding the encoder stream
		// when the _decodersStream is disposed it'll return 0 from read and this task will stop
		Task.Run(() => _decodersStream.CopyToAsync(OggStream));
	}
	
	// called by coordinatorservice to pump the next song
	public void PushNextSong(Song song)
	{
		if (_decodersStream.BackingStream.NeedsRefill == 0)
			throw new InvalidOperationException("tried to queue a new song on the streamer when there's already a next song queued");

		// build stream
		var codedStream = _downloadService.GetFileInfo(song).File.OpenRead();
		var decoder     = new FFmpegStream(["-i", "-", "-ar", "44100", "-ac", "2", "-f", "f32le", "-"]);
		
		// supply ffmpeg
		Task.Run(async () =>
		{
			await codedStream.CopyToAsync(decoder);
			await codedStream.DisposeAsync();
		});
		
		// queue up decoder with PCM
		_decodersStream.BackingStream.Refill(decoder);
	}
	
	public void Dispose()
	{
		_decodersStream.Dispose();
		OggStream.Dispose();
		
		GC.SuppressFinalize(this);
	}
}

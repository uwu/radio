namespace UwuRadio.Server.Streaming;

using System.Diagnostics;
using System.Text;

/// funnels data from one stream to many outputs, and just drops bytes if there are no listeners
/// disposes the source, and all outputs left registered when disposed
public class AsyncDroppingFanout : IDisposable
{
    private readonly HashSet<Stream> _outputs = [];

    private readonly CancellationTokenSource _ctsSrc = new();
    private readonly Stream _source;

    public AsyncDroppingFanout(Stream source)
    {
        _source = source;
        
        // start task to funnel data around
        var t = Task.Run(async () =>
        {
            try
            {
                // 4kib buffer, one page on x86-64, 46ms of audio at 16b@44.1kHz
                var buffer = new Memory<byte>(new byte[4096]);

                while (!_ctsSrc.IsCancellationRequested)
                {
                    var read = await source.ReadAsync(buffer, _ctsSrc.Token);

                    var tasks = new List<ValueTask>();
                    foreach (var output in _outputs) 
                        tasks.Add(output.WriteAsync(buffer[.. read], _ctsSrc.Token));

                    foreach (var vt in tasks) await vt;
                }
            }
            catch (TaskCanceledException)
            {
            }
        });
    }

    public void Add(Stream destination) => _outputs.Add(destination);
    
    public bool Remove(Stream destination) => _outputs.Remove(destination);

    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this);
    }

    protected virtual void Dispose(bool disposing)
    {
        if (!disposing) return;
        
        _ctsSrc.Cancel();
        _ctsSrc.Dispose();
        _source.Dispose();
        
        foreach (var output in _outputs) 
            output.Dispose();
    }
}

/// streams data through ffmpeg 
public class FFmpegStream : Stream
{
    private static readonly string[] DefaultArgs = ["-hide_banner", "-nostats", "-loglevel", "warning"];
    
    private readonly CancellationTokenSource _ctsSrc = new();

    private readonly Process _proc;

    public bool IsFinished => _proc.HasExited;
    
    public FFmpegStream(IEnumerable<string> args)
    {
        var psi = new ProcessStartInfo("ffmpeg", DefaultArgs.Concat(args))
        {
            RedirectStandardInput = true,
            RedirectStandardOutput = true,
            StandardInputEncoding = Encoding.ASCII,
            StandardOutputEncoding = Encoding.ASCII
        };

        _proc = Process.Start(psi) ?? throw new Exception("ffmpeg process did not start");
    }

    public void InputFinished() => _proc.StandardInput.Close();

    public override int Read(byte[] buffer, int offset, int count) => _proc.StandardOutput.BaseStream.Read(buffer, offset, count);

    public override void Write(byte[] buffer, int offset, int count)
    {
        _proc.StandardInput.BaseStream.Write(buffer, offset, count);
        Flush();
    }

    public override Task<int> ReadAsync(byte[] buffer, int offset, int count, CancellationToken cancellationToken)
        => _proc.StandardOutput.BaseStream.ReadAsync(buffer, offset, count, cancellationToken);

    public override ValueTask<int> ReadAsync(Memory<byte> buffer, CancellationToken cancellationToken = new CancellationToken())
        => _proc.StandardOutput.BaseStream.ReadAsync(buffer, cancellationToken);

    public override async Task WriteAsync(byte[] buffer, int offset, int count, CancellationToken cancellationToken)
    {
        await _proc.StandardInput.BaseStream.WriteAsync(buffer, offset, count, cancellationToken);
        await FlushAsync(cancellationToken);
    }

    public override async ValueTask WriteAsync(ReadOnlyMemory<byte> buffer, CancellationToken cancellationToken = new CancellationToken())
    {
        await _proc.StandardInput.BaseStream.WriteAsync(buffer, cancellationToken);
        await FlushAsync(cancellationToken);
    }

    public override long Seek(long offset, SeekOrigin origin) => throw new NotSupportedException();
    
    public override void Flush() => _proc.StandardInput.BaseStream.Flush();
    public override Task FlushAsync(CancellationToken cancellationToken) => _proc.StandardInput.BaseStream.FlushAsync(cancellationToken);

    public override void SetLength(long value) => throw new NotSupportedException();

    public override bool CanRead => true;
    public override bool CanWrite => true;
    public override bool CanSeek => false;
    public override long Length => throw new NotSupportedException();
    public override long Position
    {
        get => throw new NotSupportedException();
        set => throw new NotSupportedException();
    }

    protected override void Dispose(bool disposing)
    {
        Console.WriteLine($"dispose ffmpeg: {disposing}");
        if (!disposing) return;
        
        _proc.Kill(true);
        _ctsSrc.Cancel();
            
        _proc.Dispose();
        _ctsSrc.Dispose();
    }
}

/// throttles the data going into and out of backingStream to a certain amount of bytes / sec
public class AsyncThrottleStream<T>(T backingStream, double? readThroughput, double? writeThroughput) : Stream
	where T : Stream
{
    public readonly T BackingStream = backingStream;
    
    private int _written;
    private int _read;

    private int ReadTarget => readThroughput.HasValue ? (int)(CurrentTime * readThroughput) : int.MaxValue;
    private int WriteTarget => writeThroughput.HasValue ? (int)(CurrentTime * writeThroughput) : int.MaxValue;

    private int ToWrite => WriteTarget - _written;
    private int ToRead => ReadTarget - _read;
    
    private static readonly long Freq = Stopwatch.Frequency;
    private readonly long _startTs = Stopwatch.GetTimestamp();
    private double CurrentTime => (double)(Stopwatch.GetTimestamp() - _startTs) / Freq;

    private PeriodicTimer _timer = new(TimeSpan.FromMilliseconds(1000));
    
    // synchronous read and write are not throttled but do count
    public override int Read(byte[] buffer, int offset, int count)
    {
        var read = BackingStream.Read(buffer, offset, count);
        _read += read;
        return read;
    }

    public override void Write(byte[] buffer, int offset, int count)
    {
        BackingStream.Write(buffer, offset, count);
        _written += Math.Min(buffer.Length - offset, count);
    }
    
    // actual throttled impls
    public override Task<int> ReadAsync(byte[] buffer, int offset, int count, CancellationToken cancellationToken)
        => ReadAsync(new Memory<byte>(buffer)[offset..count], cancellationToken).AsTask();

    public override async ValueTask<int> ReadAsync(Memory<byte> buffer, CancellationToken cancellationToken = new CancellationToken())
    {
        while (ToRead <= 0) await _timer.WaitForNextTickAsync(cancellationToken);

        var count = Math.Min(buffer.Length, ToRead);
        
        var read = await BackingStream.ReadAsync(buffer[..count], cancellationToken);
        _read += read;
        return read;
    }

    public override Task WriteAsync(byte[] buffer, int offset, int count, CancellationToken cancellationToken)
        => WriteAsync(new Memory<byte>(buffer)[offset..count], cancellationToken).AsTask();

    public override async ValueTask WriteAsync(ReadOnlyMemory<byte> buffer, CancellationToken cancellationToken = new CancellationToken())
    {
        while (ToWrite <= 0) await _timer.WaitForNextTickAsync(cancellationToken);

        var count = Math.Min(buffer.Length, ToWrite);

        await BackingStream.WriteAsync(buffer[..count], cancellationToken);
        _written += count;
    }

    public override long Seek(long offset, SeekOrigin origin) => throw new NotSupportedException();
    
    public override void Flush() => BackingStream.Flush();
    public override Task FlushAsync(CancellationToken cancellationToken) => BackingStream.FlushAsync(cancellationToken);

    public override void SetLength(long value) => throw new NotSupportedException();

    public override bool CanRead => true;
    public override bool CanWrite => true;
    public override bool CanSeek => false;
    public override long Length => throw new NotSupportedException();
    public override long Position
    {
        get => throw new NotSupportedException();
        set => throw new NotSupportedException();
    }
    
    protected override void Dispose(bool disposing)
    {
        if (disposing) BackingStream.Dispose();
    }
}

/// seamlessly joins streams when they end
public class DoubleBufferingReadStream : Stream
{
	private Stream? _a;
	private Stream? _b;

	private bool _finished;

	private bool _currentIsB;
	
	public Stream? Current
	{
		get => _currentIsB ? _b : _a;
		private set
		{
			if (_currentIsB)
				_b = value;
			else
				_a = value;
		}
	}

	public Stream? Next
	{
		get => _currentIsB ? _a : _b;
		private set
		{
			if (_currentIsB)
				_a = value;
			else
				_b = value;
		}
	}

	// 0 = full
	// 1 = next stream missing
	// 2 = both streams missing
	public int NeedsRefill { get; private set; } = 2;

	public event EventHandler? Flip;

	private void DoFlip()
	{
		_currentIsB = !_currentIsB;
		
		// actually the previous!
		Next!.Dispose();
		Next = null;
		
		NeedsRefill++;
		
		Flip?.Invoke(this, EventArgs.Empty);
	}

	public void Refill(Stream toPush)
	{
		switch (NeedsRefill)
		{
			case 0:
				throw new InvalidOperationException("no refill needed, no space to put stream");
			
			case 1:
				Next = toPush;
				break;
			
			default:
				Current = toPush;
				break;
		}

		NeedsRefill--;
	}
	
	public override int Read(byte[] buffer, int offset, int count)
	{
		if (_finished) return 0;
		
		if (NeedsRefill >= 2) return 0;
		
		if (Current is null)
			throw new InvalidOperationException("needsrefill cannot be <2 when current is null");
		
		var cRead = Current.Read(buffer, offset, count);

		if (cRead > 0) return cRead;
		
		DoFlip();

		return Current?.Read(buffer, offset, count) ?? 0;
	}

	public override async ValueTask<int> ReadAsync(Memory<byte>      buffer,
												   CancellationToken cancellationToken = new())
	{
		while (true)
		{
			if (_finished) return 0;
			
			// wait for at least one stream to exist to exist
			while (NeedsRefill >= 2)
			{
				if (_finished) return 0;
				await Task.Delay(100, cancellationToken);
			}

			if (Current is null)
				throw new InvalidOperationException("needsrefill cannot be <2 when current is null");
		
			var read = await Current.ReadAsync(buffer, cancellationToken);

			if (read > 0) return read;

			DoFlip();
		}
	}

	public override Task<int> ReadAsync(byte[] buffer, int offset, int count, CancellationToken cancellationToken)
		=> ReadAsync(buffer.AsMemory(offset, count), cancellationToken).AsTask();

	protected override void Dispose(bool disposing)
	{
		Console.WriteLine($"dispose ffmpeg: {disposing}");
		if (!disposing) return;

		_finished = true;
		_a?.Dispose();
		_b?.Dispose();
	}
	
	public override void Flush()
	{
	}

	public override long Seek(long      offset, SeekOrigin origin) => throw new NotSupportedException();

	public override void SetLength(long value) => throw new NotSupportedException();

	public override void Write(byte[]   buffer, int offset, int count) => throw new NotSupportedException();

	public override bool CanRead  => Current?.CanRead ?? false;
	public override bool CanSeek  => false;
	public override bool CanWrite => false;
	public override long Length   => throw new NotSupportedException();
	public override long Position
	{
		get => throw new NotSupportedException();
		set => throw new NotSupportedException();
	}
}

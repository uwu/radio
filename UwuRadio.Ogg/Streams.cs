// ReSharper disable once CheckNamespace
namespace UwuRadio;

public static partial class Ogg
{
	public static readonly ReadOnlyMemory<byte> CapturePattern = new("OggS"u8.ToArray());
    
	// reads a stream exactly past the 'OggS' capture pattern
	// returns false if the stream ran out
	public static async ValueTask<bool> ConsumeThroughCapturePattern(Stream str)
	{
		var lastFour = new byte[4];
        
		while (true)
		{
			var readCnt = await str.ReadAsync(lastFour.AsMemory(3, 1));
			if (readCnt == 0) return false;

			if (CapturePattern.Span.SequenceEqual(lastFour)) break;
            
			Array.Copy(lastFour, 1, lastFour, 0, 3);
		}
        
		return true;
	}

	public static async ValueTask<bool> ConsumeAlignedCapturePattern(Stream str)
	{
		var buf = new byte[4].AsMemory();
		try
		{
			await str.ReadExactlyAsync(buf);
		}
		catch (EndOfStreamException)
		{
			return false;
		}

		if (!CapturePattern.Span.SequenceEqual(buf.Span))
			throw new InvalidOperationException("stream was not aligned to a capture pattern");

		return true;
	}

	public static async ValueTask<Memory<byte>> ConsumePageAfterCapturePattern(Stream str)
	{
		try
		{
			// read known size header part
			var knownBuffer = new byte[27].AsMemory();
			CapturePattern.CopyTo(knownBuffer);

			await str.ReadExactlyAsync(knownBuffer[4..]);
        
			// read segment table
			var segmentTable = new byte[knownBuffer.Span[^1]].AsMemory();
			await str.ReadExactlyAsync(segmentTable);
        
			// calculate data size
			uint dataSize = 0;
			for (var i = 0; i < segmentTable.Span.Length; i++)
			{
				var segment = segmentTable.Span[i];
				dataSize += segment;
			}

			// build full page
			var finalBuf = new byte[knownBuffer.Length + segmentTable.Length + dataSize].AsMemory();
			var segtPart = finalBuf[knownBuffer.Length..];
			var dataPart = finalBuf[(knownBuffer.Length + segmentTable.Length)..];
        
			knownBuffer.CopyTo(finalBuf);
			segmentTable.CopyTo(segtPart);
			await str.ReadExactlyAsync(dataPart);

			return finalBuf;
		}
		catch (EndOfStreamException)
		{
			return Memory<byte>.Empty;
		}
	}
}

using System.Buffers.Binary;

// ReSharper disable once CheckNamespace
namespace UwuRadio;

public static partial class Ogg
{
	public static Memory<byte> BuildOpusIdHeader(uint   serialNumber, byte numChannels, ushort preSkip, uint sampleRate,
												 ushort outputGain)
	{
		var oggHead = GeneratePageHeader(OggPageType.StartOfStream, 0, serialNumber, 0);

		oggHead.Span[^1] = 1; // segment table length 
        
		var preSkipBytes = new byte[2].AsSpan();
		BinaryPrimitives.WriteUInt16LittleEndian(preSkipBytes, preSkip);
        
		var srBytes = new byte[4].AsSpan();
		BinaryPrimitives.WriteUInt32LittleEndian(srBytes, sampleRate);
        
		var ogBytes = new byte[2].AsSpan();
		BinaryPrimitives.WriteUInt16LittleEndian(ogBytes, outputGain);
        
		byte[] final = [
			..oggHead.Span,
			// header length
			19,
			// opus header
			.."OpusHead"u8, // magic bytes
			1,              // version
			numChannels,
			..preSkipBytes,
			..srBytes,
			..ogBytes,
			0 // channel mapping family of zero only allows mono or stereo, and does not require a channel mapping table
		];
        
		FixPageChecksum(final.AsMemory());

		return final.AsMemory();
	}

	public static Memory<byte> BuildOpusCommentHeader(uint serialNumber)
	{
		var oggHead = GeneratePageHeader(0, 0, serialNumber, 1);

		oggHead.Span[^1] = 1; // segment table length
        
		byte[] final = [
			..oggHead.Span,
			// opus header length
			35,
			.."OpusTags"u8,
			// vendor string length and payload
			19, 0, 0, 0,
			.."uwu radio ogg muxer"u8,
			// no metadata
			0, 0, 0, 0
		];
        
		FixPageChecksum(final.AsMemory());

		return final.AsMemory();
	}

}

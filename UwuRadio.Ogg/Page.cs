using System.Buffers.Binary;

// ReSharper disable once CheckNamespace
namespace UwuRadio;

public static partial class Ogg
{
	public enum OggPageType : byte
	{
		Continuation  = 0b001,
		StartOfStream = 0b010,
		EndOfStream   = 0b100,
	}
    
	public static Memory<byte> GeneratePageHeader(OggPageType type, ulong granulePos, uint serialNumber, uint sequenceNum)
	{
		byte[] backing = [
			// capture pattern
			.."OggS"u8, 
			// version
			0,
			(byte) type,
			// granule position
			0, 0, 0, 0, 0, 0, 0, 0,
			// serial number
			0, 0, 0, 0,
			// sequence number
			0, 0, 0, 0,
			// checksum
			0, 0, 0, 0,
			// page segment count
			0
		];
        
		BinaryPrimitives.WriteUInt64LittleEndian(backing.AsSpan(0x6), granulePos);
		BinaryPrimitives.WriteUInt32LittleEndian(backing.AsSpan(0xE),  serialNumber);
		BinaryPrimitives.WriteUInt32LittleEndian(backing.AsSpan(0x12), sequenceNum);

		return backing.AsMemory();
	}
    
	public static void SetSerialNumberAndSum(Memory<byte> page, uint serialNumber)
	{
		BinaryPrimitives.WriteUInt32LittleEndian(page.Span[0xE..], serialNumber);
		FixPageChecksum(page);
	}

	public static void FixPageChecksum(Memory<byte> page)
	{
		// make sure checksum is zero
		page.Span[0x16]    = 0;
		page.Span[0x16 +1] = 0;
		page.Span[0x16 +2] = 0;
		page.Span[0x16 +3] = 0;
        
		// write checksum
		BinaryPrimitives.WriteUInt32LittleEndian(page.Span[0x16..], Crc32(page.Span));
	}
}

// ReSharper disable once CheckNamespace
namespace UwuRadio;

public static partial class Ogg
{
	public class PageEnumerable(Stream source) : IAsyncEnumerable<Memory<byte>>
	{
		public async IAsyncEnumerator<Memory<byte>> GetAsyncEnumerator(CancellationToken cancellationToken = new())
		{
			// align to pages
			if (!await ConsumeThroughCapturePattern(source)) 
				yield break;
            
			// consume pages
			while (true)
			{
				var page = await ConsumePageAfterCapturePattern(source);
				if (page.IsEmpty) yield break;
                
				yield return page;
                
				if (!await ConsumeAlignedCapturePattern(source)) 
					yield break;
			}
            
		}
	}
}

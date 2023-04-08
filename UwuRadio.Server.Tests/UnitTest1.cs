using NUnit.Framework;
using UwuRadio.Server.Services;

namespace UwuRadio.Server.Tests;

public class Tests
{
	[Test]
	public void IngestValidTest()
	{
		// load bearing discard - static constructors won't work after working dir change
		_ = Constants.C;
		
		// lol i love `dotnet test`
		Environment.CurrentDirectory
			= new DirectoryInfo(Environment.CurrentDirectory).Parent!.Parent!.Parent!.FullName;

		Assert.DoesNotThrow(() => _ = new DataService());
	}
}
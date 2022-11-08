namespace UwuRadio.Server;

public static class Constants
{
	/// <summary>
	///  Time between this song ending and the next being queued to start
	/// </summary>
	public const int BufferTime = 1;

	/// <summary>
	/// Time remaining when the next song should be broadcasted for preloading
	/// </summary>
	public const int PreloadTime = 30;

	/// <summary>
	/// The URL route to build download urls from
	/// </summary>
	public const string ServerDlUrl = "https://localhost:5002/api/file/";
}
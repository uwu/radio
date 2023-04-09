namespace UwuRadio.Server.Services;

/// <summary>
/// Controls all of the Coordinator Services
/// </summary>
public class CoordServOwnerService
{
	private readonly ILogger<CoordServOwnerService>            _logger;
	private readonly DataService                            _dataService;
	private readonly Dictionary<string, CoordinatorService> _channels = new();
	private          CoordinatorService?                    _globalChannel;

	public CoordServOwnerService(DataService dataService, ILogger<CoordServOwnerService> logger)
	{
		_dataService = dataService;
		_logger = logger;
	}

	public void StartCoordinators(IServiceProvider providerService)
	{
		_globalChannel = providerService.GetService<CoordinatorService>();
		
		foreach (var chan in _dataService.Channels.Keys)
			_channels[chan] = providerService.GetService<CoordinatorService>()
						   ?? throw new InvalidOperationException();

		_logger.LogInformation("Successfully instantiated {ChannelCount} services", _channels.Count + 1);
	}

	public CoordinatorService GetServiceByChannel(string? channel = null)
	{
		var srv = channel == null ? _globalChannel : _channels.GetOrDefault(channel);
		if (srv == null)
			throw new ArgumentOutOfRangeException(nameof(channel), $"no service exists for the channel {channel}!");
		return srv;
	}
	
	public string? GetOwnChannel(CoordinatorService self)
	{
		if (self == _globalChannel) return null;
		
		// lmao using a hashmap backwards so inefficient!
		foreach (var (chan, srv) in _channels)
			if (srv == self)
				return chan;

		throw new ArgumentOutOfRangeException(nameof(self),
											  $"this {nameof(CoordServOwnerService)} does not own this {nameof(CoordinatorService)}!");
	}
}
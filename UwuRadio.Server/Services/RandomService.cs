using System.Diagnostics.CodeAnalysis;
using System.Text.Json;

namespace UwuRadio.Server.Services;

[SuppressMessage("ReSharper", "InconsistentNaming")]
public record RandomOrgApiResponse(string                           jsonrpc, string id,
								   Dictionary<string, JsonElement>  result,
								   Dictionary<string, JsonElement>? error);

/// <summary>
/// Picks random numbers - I promise this is useful
/// </summary>
public class RandomService
{
	private const int    BufferSize  = 1000;
	private const int    RefillThres = 100;
	private const string ApiEndpoint = "https://api.random.org/json-rpc/4/invoke";
	
	private const int MinValue = 0;
	// max allowable value
	private const int MaxValue = 1999999999;

	private readonly Random     _backupRand = new();
	private readonly Queue<int> _randomness = new(BufferSize + RefillThres);
	private          bool       _refilling;

	public RandomService()
	{
		if (!string.IsNullOrWhiteSpace(Constants.C.RandomOrgApiKey))
			Task.Run(Refill);
	}

	public int Next(int upperBound)
	{
		if (string.IsNullOrWhiteSpace(Constants.C.RandomOrgApiKey))
			return _backupRand.Next(upperBound);
		
		if (_randomness.Count < RefillThres)
			Task.Run(Refill);

		return _randomness.Count == 0
				   ? _backupRand.Next(upperBound)
				   : Scale(MaxValue, upperBound, _randomness.Dequeue());
	}
	
	// apparently casting just one of these to double in the division constrains
	// the others all to doubles too. Interesting!
	private static int Scale(int maxIn, int maxOut, int val)
		=> (int) (val * (maxOut / (double) maxIn));

	private async Task Refill()
	{
		if (_refilling) return;
		_refilling = true;
		
		Helpers.Log(nameof(RandomService), "Fetching more randomness from random.org");

		if (await CheckQuota())
		{

			var resp = await ApiRequest("generateIntegers",
										new Dictionary<string, object>
										{
											{ "apiKey", Constants.C.RandomOrgApiKey! },
											{ "n", BufferSize },
											{ "min", MinValue },
											{ "max", MaxValue }
										});

			
			var data = resp["random"].GetProperty("data");
			if (data.ValueKind == JsonValueKind.Array)
			{
				var len = data.GetArrayLength();
				
				for (var i = 0; i < len; i++)
					_randomness.Enqueue(data[i].GetInt32());
				
				Helpers.Log(nameof(RandomService), $"Fetched {len} integers of randomness");
			}
			else
				Helpers.Log(nameof(RandomService), "Data returned was not an array");
		}
		else
			Helpers.Log(nameof(RandomService), "Quota check failed");

		_refilling = false;
	}
	
	private static async Task<bool> CheckQuota()
	{
		var quota = await ApiRequest("getUsage", new Dictionary<string, object>
		{
			{ "apiKey", Constants.C.RandomOrgApiKey! }
		});

		if (!quota["bitsLeft"].TryGetInt32(out var bitsLeft) || 
			!quota["requestsLeft"].TryGetInt32(out var requestsLeft))
			return false;

		return bitsLeft >= BufferSize * sizeof(int) && requestsLeft > 1;
	}

	private static async Task<IDictionary<string, JsonElement>> ApiRequest(string method, IDictionary<string, object> data)
	{
		var httpClient = new HttpClient();
		var resp       = await httpClient.PostAsync(ApiEndpoint, JsonContent.Create(new
		{
			jsonrpc = "2.0",
			method,
			@params = data,
			id = "bals"
		}));

		return (await resp.Content.ReadFromJsonAsync<RandomOrgApiResponse>())!.result;
	}
}

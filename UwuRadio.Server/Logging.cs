using Serilog.Context;
using Serilog.Core;
using Serilog.Events;

namespace UwuRadio.Server;

/// <summary>
/// Enriches Serilog logs with the source class name, like built-in SourceContext but better.
/// </summary>
public class SourceContextEnricher : ILogEventEnricher
{
	public void Enrich(LogEvent logEvent, ILogEventPropertyFactory propertyFactory)
	{
		if (logEvent.Properties.TryGetValue("PrettyName", out var prettyName))
		{
			var pnScalar = prettyName as ScalarValue;
			var ptStr    = pnScalar?.Value as string;

			if (!string.IsNullOrWhiteSpace(ptStr))
			{
				logEvent.AddOrUpdateProperty(
					new LogEventProperty("SourceContext", new ScalarValue(ptStr))
				);
				return;
			}
		}
		
		if (!logEvent.Properties.TryGetValue("SourceContext", out var fullCtxtRaw)) return;
		
		
		// convert into Serilog's ScalarValue wrapper first
		// https://stackoverflow.com/a/75332511/8388655
		var scalar  = fullCtxtRaw as ScalarValue;
		var ctxtStr = scalar?.Value as string;

		// when comparing nullables you must either ==true, ==false, ??true, or ??false
		if (ctxtStr?.StartsWith("UwuRadio.Server") != true) return;
			
		var className = ctxtStr.Split(".").LastOrDefault();
				
		if (!string.IsNullOrWhiteSpace(className))
			logEvent.AddOrUpdateProperty(new LogEventProperty("SourceContext", new ScalarValue(
																  className)));
	}
}

public interface IPrettyNamed
{
	public string PrettyName { get; }
}

public record PrettyLogger<T>(ILogger<T> Underlying, T Owner) : ILogger<T>
	where T : IPrettyNamed
{
	public IDisposable? BeginScope<TState>(TState state) where TState : notnull
		=> Underlying.BeginScope(state);

	public bool IsEnabled(LogLevel logLevel) => Underlying.IsEnabled(logLevel);

	public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception,
							Func<TState, Exception?, string> formatter)
	{
		using (LogContext.PushProperty("PrettyName", Owner.PrettyName)) 
			Underlying.Log(logLevel, eventId, state, exception, formatter);
	}
}
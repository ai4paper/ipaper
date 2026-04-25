export const createStartupPipelineRuntime = (dependencies) => {
  const {
    createTerminalRuntime,
    createServerStartupRuntime,
  } = dependencies;

  const run = async (options) => {
    const {
      app,
      server,
      express,
      fs,
      path,
      uiAuthController,
      buildAugmentedPath,
      searchPathFor,
      isExecutable,
      isRequestOriginAllowed,
      rejectWebSocketUpgrade,
      terminalHeartbeatIntervalMs,
      terminalRebindWindowMs,
      terminalMaxRebindsPerWindow,
      setupProxy,
      scheduleOpenCodeApiDetection,
      bootstrapOpenCodeAtStartup,
      staticRoutesRuntime,
      process,
      gracefulShutdown,
      getSignalsAttached,
      setSignalsAttached,
      syncToHmrState,
      host,
      port,
      attachSignals,
    } = options;

    const terminalRuntime = createTerminalRuntime({
      app,
      server,
      express,
      fs,
      path,
      uiAuthController,
      buildAugmentedPath,
      searchPathFor,
      isExecutable,
      isRequestOriginAllowed,
      rejectWebSocketUpgrade,
      TERMINAL_INPUT_WS_HEARTBEAT_INTERVAL_MS: terminalHeartbeatIntervalMs,
      TERMINAL_INPUT_WS_REBIND_WINDOW_MS: terminalRebindWindowMs,
      TERMINAL_INPUT_WS_MAX_REBINDS_PER_WINDOW: terminalMaxRebindsPerWindow,
    });

    setupProxy(app);
    scheduleOpenCodeApiDetection();
    void bootstrapOpenCodeAtStartup();

    staticRoutesRuntime.registerStaticRoutes(app);

    const serverStartupRuntime = createServerStartupRuntime({
      process,
      server,
      gracefulShutdown,
      getSignalsAttached,
      setSignalsAttached,
      syncToHmrState,
    });

    const bindHost = serverStartupRuntime.resolveBindHost(host);
    await serverStartupRuntime.startListening({
      port,
      bindHost,
    });

    serverStartupRuntime.attachProcessHandlers({ attachSignals });

    return {
      terminalRuntime,
    };
  };

  return {
    run,
  };
};

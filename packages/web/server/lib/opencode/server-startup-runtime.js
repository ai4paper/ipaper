export const createServerStartupRuntime = (dependencies) => {
  const {
    process,
    server,
    gracefulShutdown,
    getSignalsAttached,
    setSignalsAttached,
    syncToHmrState,
  } = dependencies;

  const resolveBindHost = (host) =>
    host
    || (typeof process.env.IPAPER_HOST === 'string' && process.env.IPAPER_HOST.trim().length > 0
      ? process.env.IPAPER_HOST.trim()
      : '127.0.0.1');

  const startListening = async ({
    port,
    bindHost,
  }) => {
    let activePort = port;

    await new Promise((resolve, reject) => {
      const onError = (error) => {
        server.off('error', onError);
        reject(error);
      };
      server.once('error', onError);
      const onListening = async () => {
        server.off('error', onError);
        const addressInfo = server.address();
        activePort = typeof addressInfo === 'object' && addressInfo ? addressInfo.port : port;

        try {
          process.send?.({ type: 'ipaper:ready', port: activePort });
        } catch {
          // ignore
        }

        const displayHost = (bindHost === '0.0.0.0' || bindHost === '::' || bindHost === '[::]')
          ? 'localhost'
          : (bindHost.includes(':') ? `[${bindHost}]` : bindHost);
        console.log(`IPaper server listening on ${bindHost}:${activePort}`);
        console.log(`Health check: http://${displayHost}:${activePort}/health`);
        console.log(`Web interface: http://${displayHost}:${activePort}`);

        resolve();
      };

      server.listen(port, bindHost, onListening);
    });

    return { activePort };
  };

  const attachProcessHandlers = ({ attachSignals }) => {
    if (attachSignals && !getSignalsAttached()) {
      const handleSignal = async () => {
        await gracefulShutdown();
      };
      process.on('SIGTERM', handleSignal);
      process.on('SIGINT', handleSignal);
      process.on('SIGQUIT', handleSignal);
      setSignalsAttached(true);
      syncToHmrState();
    }

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });

    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      gracefulShutdown();
    });
  };

  return {
    resolveBindHost,
    startListening,
    attachProcessHandlers,
  };
};

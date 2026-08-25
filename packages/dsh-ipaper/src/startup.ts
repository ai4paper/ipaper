import { Command } from 'commander'
import type { Context } from '@deepseek-ai/cordis'
import { parseCmdline } from '@deepseek-ai/dsh-cmdline'

export const name = 'web-startup'
export const inject = ['cmdlineArgs']
export const WEB_STARTUP_SERVICE = 'webStartup'

export interface WebStartupValues {
  host?: string
  port?: number
  trustedHosts: string[]
}
interface WebOptions { host?: string; port?: string; trustedHost?: string[] }

export function webCommand(): Command {
  return new Command()
    .name('dsh --profile ipaper')
    .description('Serve the IPaper academic-writing browser UI.')
    .helpOption('-h, --help', 'show this help')
    .option('--host <host>', 'bind host')
    .option('--port <port>', 'listen port; pass 0 to let the OS pick a free one')
    .option('--trusted-host <authority...>', 'extra authority the /api browser-trust fence accepts (host or host:port; repeatable)')
}

export function apply(ctx: Context): void {
  const program = webCommand()
  program.action(() => {
    const options = program.opts<WebOptions>()
    if (options.port !== undefined && !/^\d+$/.test(options.port)) {
      program.error(`error: --port must be a number, got ${JSON.stringify(options.port)}`)
    }
    const port = options.port === undefined ? undefined : Number(options.port)
    if (port !== undefined && port > 65535) program.error('error: --port must be between 0 and 65535')
    ctx.provide(WEB_STARTUP_SERVICE, {
      ...(options.host !== undefined && { host: options.host }),
      ...(port !== undefined && { port }),
      trustedHosts: options.trustedHost ?? [],
    } satisfies WebStartupValues)
  })
  parseCmdline(ctx, program)
}

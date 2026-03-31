declare module "postgres" {
  interface Sql {
    <T extends Record<string, unknown>[]>(
      template: TemplateStringsArray,
      ...args: unknown[]
    ): Promise<T>;
    /** Raw SQL (used by infra/db/push.ts for static DDL). */
    unsafe(query: string): Promise<unknown>;
    end(): Promise<void>;
  }

  interface Options {
    max?: number;
    idle_timeout?: number;
    connect_timeout?: number;
  }

  function postgres(url: string, options?: Options): Sql;
  export default postgres;
}

declare module "@fastify/cors" {
  import type { FastifyPluginCallback } from "fastify";
  const cors: FastifyPluginCallback<{ origin?: boolean | string | string[] }>;
  export default cors;
}

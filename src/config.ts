export const RUNNER_HTTP =
  import.meta.env.VITE_RUNNER_URL ? `${import.meta.env.VITE_RUNNER_URL}` : '';
export const RUNNER_WS =
  import.meta.env.VITE_RUNNER_URL
    ? `${import.meta.env.VITE_RUNNER_URL}`.replace(/^http/, 'ws')
    : '';

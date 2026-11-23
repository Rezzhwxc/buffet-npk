import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');

    const proxyHeaders = {};

    if (env.API_LOGIN && env.API_PASSWORD) {
        const credentials = Buffer
            .from(`${env.API_LOGIN}:${env.API_PASSWORD}`)
            .toString('base64');

        proxyHeaders.Authorization = `Basic ${credentials}`;
    }

    if (env.API_SECRET) {
        proxyHeaders['X-Api-Secret'] = env.API_SECRET;
    }

    return {
        server: {
            host: '0.0.0.0',
            port: 5173,

            proxy: {
                '/api/captcha': {
                    target: 'http://localhost:3000',
                    changeOrigin: true
                },
                '/api/employees/check': {
                    target: 'http://localhost:3000',
                    changeOrigin: true
                },
                '/api': {
                    target: 'http://100.125.44.46',
                    changeOrigin: true,

                    rewrite: (path) =>
                        path.replace(/^\/api/, '/InfoBase/hs/api'),

                    headers: proxyHeaders
                }
            }
        }
    };
});
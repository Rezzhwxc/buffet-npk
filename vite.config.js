import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');

    const credentials = Buffer
        .from(`${env.API_LOGIN}:${env.API_PASSWORD}`)
        .toString('base64');

    return {
        server: {
            host: '0.0.0.0',
            port: 5173,

            proxy: {
                '/api': {
                    target: 'http://100.125.44.46',
                    changeOrigin: true,

                    rewrite: path =>
                        path.replace(/^\/api/, '/InfoBase/hs/api'),

                    headers: {
                        Authorization: `Basic ${credentials}`
                    }
                }
            }
        }
    };
});
const webpackConfig = require("../../../webpack.config.cjs");

describe("Webpack development server bind address", () => {
    const originalHost = process.env.HOST;

    afterEach(() => {
        if (originalHost === undefined) {
            delete process.env.HOST;
        } else {
            process.env.HOST = originalHost;
        }
    });

    it("binds to loopback by default without changing the proxy port", () => {
        delete process.env.HOST;

        const config = webpackConfig({}, { mode: "development" });

        expect(config.devServer.host).toBe("127.0.0.1");
        expect(config.devServer.port).toBe(3001);
    });

    it("honors an explicit host override", () => {
        process.env.HOST = "127.0.0.2";

        const config = webpackConfig({}, { mode: "development" });

        expect(config.devServer.host).toBe("127.0.0.2");
    });
});

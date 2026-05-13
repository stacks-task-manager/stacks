# License

License verification/initialization logic used by the server. It loads a public key and a license file, verifies signatures, and can optionally validate “server” licenses online.

## Environment

No `.env` expected. This package reads license artifacts from the working directory (`process.cwd()`):

-   `public.pem`
-   `license.key`

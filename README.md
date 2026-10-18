<p align="center"><img src="https://raw.githubusercontent.com/titaniumnetwork-dev/Ultraviolet-Static/main/public/uv.png" height="250"></p>

<h1 align="center">Ultraviolet</h1>

<a href="https://www.npmjs.com/package/@titaniumnetwork-dev/ultraviolet"><img src="https://img.shields.io/npm/v/@titaniumnetwork-dev/ultraviolet.svg?maxAge=3600" alt="npm version" /></a>

> [!CAUTION]
> Please note that this project isn't really maintained anymore before making issues! It has been superseded by [Scramjet](https://github.com/MercuryWorkshop/scramjet). An example application setup can be found [here](https://github.com/MercuryWorkshop/Scramjet-App).

Ultraviolet is a highly advanced web proxy used for evading internet censorship or accessing websites in a controlled sandbox. It is designed with security and performance in mind. Ultraviolet intercepts HTTP requests with a service worker, while adhering to the [TompHTTP specifications](https://github.com/tomphttp) and is a leader in innovative web proxy technologies.

## Features

Ultraviolet offers several features that set it apart from its predecessors, including CAPTCHA and hCAPTCHA support, URL encoding settings for added security, client-side configuration via service-workers, high speed compared to other web proxies, blacklist settings and more for easy hosting, leak prevention, regular updates, and improved resource usage and speed for better setups with a dedicated server instance.

## Supported Sites

Some of the popular websites that Ultraviolet supports include:

- [Google](https://google.com)
- [Youtube](https://www.youtube.com)
- [Spotify](https://spotify.com)
- [Discord](https://discord.com)
- [Reddit](https://reddit.com)
- [GeForce NOW](https://play.geforcenow.com/)
- [now.gg](https://now.gg)

## Used by

- [Holy Unblocker LTS](https://github.com/QuiteAFancyEmerald/Holy-Unblocker)
- [Alu](https://github.com/titaniumnetwork-dev/Alu)
- [Incognito](https://github.com/titaniumnetwork-dev/Incognito)
- [Nebula](https://github.com/NebulaServices/Nebula)
- [AnuraOS](https://github.com/MercuryWorkshop/anuraOS)
- [Terbium](https://github.com/TerbiumOS/webOS)
- [Metallic](https://github.com/Metallic-Web/Metallic)

## Upgrading

A guide for updating from any version to v3 can be found [here](https://github.com/titaniumnetwork-dev/Ultraviolet/wiki/Upgrading).

## Older Ultraviolet versions

Starting from v3, Ultraviolet uses [bare-mux](https://github.com/MercuryWorkshop/bare-mux), a library that allows you to switch out your Bare client.

If you operate using an older Ultraviolet, we encourage you to update.

If you're too lazy to do either of the above, you can install an outdated and unsupported version of Ultraviolet.

```sh
npm install @titaniumnetwork-dev/ultraviolet@1
```

## Changelog

Changes are documented in the [changelog](./CHANGELOG.md).

## Deployment

This repository includes a browser interface and Netlify deployment configuration. Netlify builds the Ultraviolet bundles and publishes `dist`, including the service worker, bare-mux worker, and compatible Epoxy transport. Open the deployed HTTPS site, enter a URL or search, and select Browse.

The proxy connects to `wss://wisp.mercurywork.shop/`, a third-party public testing relay. Netlify does not host the WebSocket relay. You can enter another secure Wisp endpoint in Connection settings before browsing. The relay must allow connections from your deployed site; public relay availability and individual website compatibility are not guaranteed. Only use a relay you trust. The setting applies to the current browsing session and is not saved by the app.

Use a current browser with service worker, SharedWorker, and WebAssembly support. Cross-origin isolation headers are configured in `netlify.toml` for the transport. If a proxied link is opened without an active service worker, the site displays a recovery page linking back to the launcher.

If a website fails with a TLS handshake error, the relay could not establish a secure connection to that destination. A successful relay WebSocket check does not guarantee access to every website. Use Retry website for a temporary failure, or Change relay to return to Connection settings with the destination preserved. TikTok was observed rejecting connections through the default public relay; changing the interface or restarting the static site does not resolve that external connection failure.

The added Epoxy transport is distributed under AGPL-3.0. Review that dependency's license when redistributing the application.

## Documentation

Documentation can be found in the [wiki](https://github.com/titaniumnetwork-dev/Ultraviolet/wiki).

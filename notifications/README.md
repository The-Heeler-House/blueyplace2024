This is the notifications backend for the PonyPlace client.

This deployment is intended to be hosted as a Docker container and reverse proxy'd behind nginx at the `/notifications` URI.
The deployment is built from TypeScript. Run `tsc` in this directory if you REALLY need to run it outside of Docker.

If you are hosting this yourself, you will need to use your own Discord Bot (if you plan to use that functionality) and change API keys. These are stored as environment variables.
Here is a list of each environment variable the program expects:
`DISCORD_ID` - The ID of the Discord bot.
`DISCORD_TOKEN` - The token of the Discord bot.
`API_TOKEN` - The API token for submitting notifications via the REST API.

import Fastify from "fastify";
import cors from "@fastify/cors"
import pino from "pino"
import gameRoutes from "./routes/game";
import 'dotenv/config'
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000

const server = Fastify({
    loggerInstance: pino({ level: 'info' })
});
(async () => {
    await server.register(cors, {})
})

server.register(gameRoutes, { prefix: '/game' })

const start = async () => {
    server.log.info('Booting up...')
    server.log.info('Loading environment variables', process.env)
    try {
        await server.listen({
            port,
            host: '0.0.0.0',
        })
    } catch (err) {
        server.log.error(err);
        process.exit(1)
    }
}
start()
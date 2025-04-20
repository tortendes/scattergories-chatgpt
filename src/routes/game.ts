import { FastifyInstance, FastifyPluginOptions } from "fastify";
import OpenAI from 'openai';
import 'dotenv/config';
const client = new OpenAI({
    apiKey: process.env.OPENAPI_TOKEN
})

interface ValidationAnswers {
    category: string,
    answer: string
}

interface VRBody {
    letter: string,
    answers: ValidationAnswers[]
}

async function gameRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
    fastify.addSchema({
        $id: 'validationSchema',
        type: 'object',
        properties: {
            letter: { type: 'string' },
            answers: {
                type: 'array',
                properties: {
                    category: { type: 'string' },
                    answer: { type: 'string' }
                },
                required: ['category, answer']
            },
        },
        required: ['answers', 'letter']
    })
    fastify.get('/new-game', async (req, res) => {
        const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'W']
        const selectedLettr = letters[Math.floor(Math.random() * letters.length)]
        const aiResponse = await client.responses.create({
            model: 'gpt-4o-mini',
            input: `Imagine that you are an Scattergories AI Game, specifically tailored for the Philippine market. Add some Filipino flare, but mostly add globally recognizable categories too. Generate 50 categories that has answers that can start with the letter Z. List your response in a way that can be easily parsed into an array. Respond with the categories **only**, no other formatting required, separate the categories by adding a comma, and remove the starting brackets and no quotation marks.`
        })
        const categories = aiResponse.output_text.split(", ")
        res.send({
            success: true,
            letter: selectedLettr,
            categories
        })
    })
    fastify.post<{
        Body: VRBody
    }>('/validate-results', {
        schema: {
            body: { $ref: 'validationSchema' }
        },
        handler: async (req, res) => {
            const body = req.body
            const answers = body.answers.map((item) => { return item.answer })
            const categories = body.answers.map((item) => { return item.category })
            const aiValidation = await client.responses.create({
                model: 'gpt-4o-mini',
                input: `Imagine that you are an Scattergories AI Game, specifically tailored for the Philippine market. You have some some Filipino flare, but mostly add globally recognizable categories too. Validate the answers provided by the player based on the array of categories answered below, make sure that all answers started with the letter **${body.letter}**. Provide a score from 1 to 100 from each answer. And respond in a non-formatted JSON object with the question, answer, if it is correct, and its score.\n\nCategories: ${categories.join(',')}\n\nAnswers: ${answers.join(',')}`
            })
            res.send(JSON.parse(aiValidation.output_text))
        }
    })
}

export default gameRoutes;
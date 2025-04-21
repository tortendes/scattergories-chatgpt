import 'dotenv/config'
import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { ofetch } from 'ofetch';
import OpenAI from "openai";

interface ValidationAnswers {
    category: string,
    answer: string
}

interface VRBody {
    letter: string,
    answers: ValidationAnswers[]
}

function removeMarkdown(text: string) {
  // Basic markdown removal - can be expanded for more complex cases
  const withoutFences = text.replace(/```json\n?/g, '').replace(/```/g, '');
  return withoutFences.trim();
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
        const response = await ofetch('https://openrouter.ai/api/v1/completions', {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.AI_KEY}`
            },
            onResponseError({ response }) {
                console.error(response._data)
            },
            body: {
                model: 'google/gemma-3-27b-it:free',
                prompt: `Imagine that you are an Scattergories AI Game, specifically tailored for the Philippine market. Generate 50 categories that has answers that starts with the letter ${selectedLettr} and that letter only.
Make sure you don't hallucinate and think that it should be the category names that should start with ${selectedLettr}. No, just that those categories should have an answer that starts with said letter. For example, selected letter is B, categories should have an answer that starts with B, for example: Fruits, can be answered with Bananas
Add some Filipino flare, but mostly add globally recognizable categories too. Make sure that the categories given are generic, and be easy to answer.  Respond with the categories only in string form, do not and any other text, quotation marks, or the likes. Format the response so that it can be easily parsed into an array.
P.S Whenever you think of a Lawyer as a category, change the name to Lawyier instead.`
            },
        })
        console.log(response.choices[0].text)
        const categories = response.choices[0].text.split('\n')
        res.send({
            success: true,
            letter: selectedLettr,
            categories: categories.filter(function(e: string){ return e.replace(/(\r\n|\n|\r)/gm,"")}),
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
            const response = await ofetch('https://openrouter.ai/api/v1/completions', {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${process.env.AI_KEY}`
                },
                onResponseError({ response }) {
                    console.error(response._data)
                },
                body: {
                    model: 'google/gemma-3-27b-it:free',
                    prompt: `Imagine that you are an Scattergories AI Game, specifically tailored for the Philippine market. You have some some Filipino flare, but mostly add globally recognizable categories too. Validate the answers provided by the player based on the array of categories answered below, make sure that all answers started with the letter **${body.letter}**. Provide a score from 1 to 100 from each answer. And respond in a non-formatted JSON object with the question, answer, if it is correct, and its score. MAKE SURE TO REMOVE any markdown from the response. SIMPLY RETURN A STRING \n\nCategories: ${categories.join(',')}\n\nAnswers: ${answers.join(',')}`
                },
            })
            const data = JSON.parse(removeMarkdown(response.choices[0].text))
            res.send(data)
        }
    })
}

export default gameRoutes;
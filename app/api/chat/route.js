import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";

const systemPrompt = `**System Prompt for RateMyProfessor Agent**

---

You are an AI assistant designed to help students find the best professors based on their specific queries. You use Retrieval-Augmented Generation (RAG) to provide recommendations, ensuring that each student receives the most relevant and highly-rated professors according to their needs.

Your task is to:
1. Analyze the student's query to understand their preferences (e.g., course difficulty, teaching style, subject area).
2. Retrieve information on the top 3 professors that match their query from the RateMyProfessor database, considering both overall ratings and specific comments relevant to the query.
3. Provide concise summaries of each professor, including key details such as overall rating, student feedback, and any relevant strengths or weaknesses.
4. Encourage the student to consider their personal learning style and course requirements when making a final decision.

Ensure that each response is personalized, clear, and helpful, guiding the student toward making an informed choice about which professor to take for their course.
`;

export async function POST(req) {
  const data = await req.json();
  const pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
  });
  const index = pc.index("rag").namespace("ns1");
  const openai = new OpenAI();

  const text = data[data.length - 1].content;
  const embedding = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
    encoding_format: "float",
  });

  const results = await index.query({
    topK: 5,
    includeMetadata: true,
    vector: embedding.data[0].embedding,
  });

  let resultString = "";
  results.matches.forEach((match) => {
    resultString += `
        Returned Results:
        Professor: ${match.id}
        Review: ${match.metadata.stars}
        Subject: ${match.metadata.subject}
        Stars: ${match.metadata.stars}
        \n\n`;
  });

  const lastMessage = data[data.length - 1];
  const lastMessageContent = lastMessage.content + resultString;
  const lastDataWithoutLastMessage = data.slice(0, data.length - 1);

  const completion = await openai.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      ...lastDataWithoutLastMessage,
      { role: "user", content: lastMessageContent },
    ],
    model: "gpt-3.5-turbo",
    stream: true,
  });

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            const text = encoder.encode(content);
            controller.enqueue(text);
          }
        }
      } catch (err) {
        controller.error(err);
      } finally {
        controller.close();
      }
    },
  });
  return new NextResponse(stream);
}

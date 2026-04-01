# Presentation Scripts

---

## Slide 1 — Title Slide

**"AI-Powered Self-Assessment: Transforming How Students Understand What They Know"**

> Hi everyone. Our project is called METY — an AI-powered educational platform. The core idea is simple: we want to help students understand what they actually know, and more importantly, what they *don't* know, about a subject — and we use AI to make that process scalable and accessible across languages. This is part of a larger project our partner is working on — what we worked on is the **API and backend services**. We also built a frontend, but that's purely for demo purposes — it makes it much easier to show what the API can do. Let me walk you through how it works. But before we get into the technical side, it's important to understand the learning method that everything is built on — Cognitive Structural Analysis."

---

## Slide 2 — What is Cognitive Structural Analysis?

> So why are we talking about self-assessment? Our partner works in education, and the core problem is that students often don't know what they don't know. That's where Cognitive Structural Analysis comes in — CSA for short. It's a method that has students reflect on four types of knowledge — facts, strategies, procedures, and rationales — to identify their strengths and gaps. Research shows it improves grades by 1.5 to 2.5 letter grades on average.
>
> The problem is accessibility. These scripts take time to write, cost money, and they're in English — which locks out non-English-speaking students. So our web app uses AI to generate CSA scripts and translate them across over 130 languages. The part we worked on is the API that powers all of this.

---

## Slide 3 — Where AI Comes In

> So where does AI come in? Two main features.
>
> First, **Template Generation**. We use an LLM — specifically OpenAI's gpt-5-nano through the Vercel AI SDK — to generate complete CSA self-assessment templates for any given subject, topic, and grade level. A teacher can type in "Math, Two-Step Equations, 8th Grade" and get a full three-section script: an introduction, a model self-assessment with realistic knowledge gaps, and a self-review. We went with gpt-5-nano here because template generation needs structured output — we use Zod schema validation to make sure every response has all three sections, and the Vercel AI SDK made that integration clean. This fosters an on-demand, self-learning environment — teachers get scripts instantly instead of spending hours writing them.
>
> Second, the **Translation API**. We chose Cohere's command-a-translate model specifically for translation because it's purpose-built for that task — it outperforms general-purpose models on multilingual accuracy. The key challenge is preserving subject-specific and language-specific terminology — we don't want "Cognitive Structural Analysis" to be translated literally into something meaningless. So we made the decision to build a glossary system with over 30 domain-specific terms that gets injected into every translation prompt. We also support back-translation and AI-based confidence scoring to verify translation quality.

---
## Slide 4 — System Architecture

> Here's our system architecture. The React frontend on the left is just for demo purposes. What we worked on is the API.
>
> The backend is an Express API in TypeScript — we chose TypeScript for type safety since we're passing translation data and glossary terms through multiple layers. All requests go through auth: JWT tokens for user sessions, or scoped API keys with read, write, and translate permissions so our partner can control access. This is what they'll plug into their platform.
>
> The database is PostgreSQL with Drizzle ORM — it stores users, API keys, templates, translations, and glossary terms. The glossary is key — terms like "PEMDAS," "CSA," "metacognition" don't translate directly, so we keep a bank of definitions that gets fed to the AI so it translates them properly.
>
> For AI, we use Cohere's command-a-translate for translation, with OpenAI as an automatic fallback — no single point of failure.

---

## Slide 5 — Data Flow

> Let me walk you through the data flow step by step.
>
> **Step 1**: The user submits their request — text, a target language, and optionally a template choice.
>
> **Step 2**: Middleware kicks in — it validates the API key, checks user authentication, and if a PDF is being uploaded.
>
> **Step 3**: The services layer does the heavy lifting. The glossary service scans the source text and then assembles a rich prompt by injecting glossary context to help it translate.
>
> **Step 4**: That prompt goes to Cohere for translation, with all the glossary rules baked in. If Cohere fails, we automatically retry with OpenAI.
>
> **Step 5**: Post-processing applies glossary rules, validates the 
output.
>
> **Step 6**: The translation record is stored in the database and usage is logged.
>
> **Step 7**: The result is returned to the UI — and if we're using the streaming endpoint, the user sees real-time SSE progress events: extracting, translating, item_done, and complete.

---

## Slide 6 — More Detailed Data Flow

> This is the same flow in more detail — you can see the two main pipelines laid out. The PDF translation pipeline on top, the CSA template generation pipeline in the middle — it's mostly here for reference — but you can see how everything connects end to end.

---

## Slide 7 — DEMO

> Alright, let me show you all of this in action.
>
> So first, I'm going to set the language to **Urdu** and the grade level to **5**, and upload a PDF to translate. I'll kick that off — and while that's running in the background, we'll jump over to the template generator to keep things moving.
>
> Over here, I'll generate a **5th grade Science — Earth and Space** template. So subject is Science, topic is Earth and Space, grade level 5. Let's hit generate — and you can see it's thinking, the AI is writing out the three sections: the introduction, the model self-assessment, and the self-review.
>
> Alright, that's done — let's open it up. You can see the full CSA script it generated. Everything's structured — facts, strategies, procedures, rationales — all tailored to Earth and Space for a 5th grader. And we can download the PDF right from here.
>
> Now let's go back to our Urdu translation — and it's finished. You can see the translated output came back.
>
> One more thing — let me show you batch upload. This time I'll set the language to **German**, grade level **10**, and upload **multiple PDFs** at once. You can see them all processing in parallel — the streaming events show each file's progress: extracting, translating, done. That's the batch endpoint at work.

---

## Slide 8 — *(continued demo / transition)*

> So that's the full flow — translation, template generation, batch processing — all powered by the API we built.

---

## Slide 9 — Ethical Considerations

> Finally, let's talk about ethics — because any AI-powered educational tool needs to address these carefully.
>
> **Data privacy** — users submit text, including PDFs that may contain sensitive information. Our mitigations: all API access requires authentication via API keys or JWT tokens, we practice minimal data storage, and we avoid unnecessary logging of user content. Uploaded PDFs are deleted from disk immediately after processing.
>
> **Bias in AI translations** — LLMs can introduce cultural or linguistic bias, especially when translating educational content across different cultural contexts. Our mitigation: the glossary system constrains translations with explicit domain-specific definitions, and for sensitive content, we support human review through back-translation and confidence scoring.
>
> **Prompt injection risks** — since we're processing user-uploaded PDFs and text, malicious input could theoretically try to override our system instructions. Our mitigations: input sanitization, strict prompt structuring that separates system instructions from user content, and isolating the system prompt from the user-provided text in our API calls to Cohere and OpenAI.
>
> And with that — we'll open it up for questions.

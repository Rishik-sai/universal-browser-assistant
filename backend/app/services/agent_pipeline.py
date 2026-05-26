import json
import logging
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from app import config

logger = logging.getLogger("uvicorn.error")

# In-memory session store for conversational history
memory_store = {}

class AgentPipeline:
    def __init__(self):
        # Initialized lazily or at startup
        self.model = ChatGroq(
            model="llama-3.1-8b-instant",
            groq_api_key=config.GROQ_API_KEY
        )

    async def process_message(
        self,
        user_message: str,
        url_context: str,
        session_id: str,
        language: str = "auto",
        page_text: str = "",
        dom_snapshot: str = ""
    ):
        is_init = user_message == "[INIT_SUGGESTIONS]"

        if session_id not in memory_store:
            memory_store[session_id] = []

        # Step 1: Handle Initial Suggestions Mode
        if is_init:
            target_lang = "detect from page" if language == "auto" else language
            init_prompt = f"""
        You are a proactive browser assistant. The user just opened your window on this website: {url_context}.
        
        === CONTEXT ===
        PAGE TEXT: {page_text[:1500]}
        
        TASK:
        Generate exactly 3 short, localized suggestions for the user to start a conversation about this page.
        Examples: "Summarize this page", "What are the key points?", "Explain this article".
        
        FORMAT:
        SUGGESTIONS: ["Suggestion 1", "Suggestion 2", "Suggestion 3"]
        Return ONLY the suggestions JSON block. No introductory text.
        Target Language: {target_lang}.
            """

            try:
                response = await self.model.ainvoke([HumanMessage(content=init_prompt)])
                content = response.content
                suggestions = []
                if "SUGGESTIONS:" in content:
                    try:
                        suggestions_part = content.split("SUGGESTIONS:")[1].strip()
                        suggestions = json.loads(suggestions_part)
                    except Exception as e:
                        logger.error(f"Error parsing suggestions JSON: {e}")
                
                return {
                    "reply": "",
                    "mode": "QUERY_MODE",
                    "suggestions": suggestions,
                    "url": url_context
                }
            except Exception as e:
                logger.error(f"Error generating initial suggestions: {e}")
                return {
                    "reply": "",
                    "mode": "QUERY_MODE",
                    "suggestions": [],
                    "url": url_context
                }

        # Web Search Directive
        search_directive = ""
        clean_message = user_message
        if clean_message.startswith("[WEB_SEARCH]"):
            search_directive = "\n\n[WEB SEARCH TRIGGERED]\nThe user has explicitly requested to SEARCH THE WEB for the selected text. Act as a search engine and provide a comprehensive, highly accurate, and up-to-date answer from your extensive knowledge base regarding the highlighted query."
            clean_message = clean_message.replace("[WEB_SEARCH]", "").strip()

        # Save regular user message to memory
        memory_store[session_id].append(HumanMessage(content=clean_message))

        # Step 2: Language Directive
        if language and language.lower() != "auto":
            lang_directive = f"STRICT LANGUAGE RULE: You MUST reply entirely in {language}."
        else:
            lang_directive = "Reply in the user's language. Default to English."

        query_instruction = """
      MODE: QUERY
      Answer naturally and helpfully based on the page content. 
      Use **bolding** for key terms. 
      
      RULES:
      1. Explain steps clearly using a numbered list (1., 2., 3.).
      2. NEVER ask for permission to proceed or ask "Should I continue?".
      3. You provide information only; you do not perform actions on behalf of the user.
      4. DO NOT ask the user if you should click or type something.
        """

        suggestions_instruction = """
      === SUGGESTIONS AREA ===
      Format: SUGGESTIONS: ["Suggestion 1", "Suggestion 2", "Suggestion 3"]
        """

        system_instruction = f"""
      You are the Universal Browser Assistant. Helpful, professional, and clear.
      {lang_directive}
      
      === CONTEXT ===
      URL: {url_context}
      PAGE TEXT: {page_text[:3000]}
      
      {query_instruction}
      {search_directive}
      {suggestions_instruction}
        """

        final_lang_rule = "the user's original language" if language == "auto" else language
        final_reminder = f"FINAL REMINDER: You are an INFORMATION tool. Never ask for permission to proceed. NEVER say 'Should I continue?'. STRICT RULE: You MUST speak entirely in {final_lang_rule}. Just provide the information."

        messages = [
            SystemMessage(content=system_instruction),
            *memory_store[session_id],
            SystemMessage(content=final_reminder)
        ]

        try:
            ai_response = await self.model.ainvoke(messages)
            full_content = ai_response.content
            final_reply = full_content
            suggestions = []

            if "SUGGESTIONS:" in full_content:
                parts = full_content.split("SUGGESTIONS:")
                final_reply = parts[0].strip()
                try:
                    suggestions = json.loads(parts[1].strip())
                except Exception as e:
                    logger.error(f"Error parsing suggestions JSON in chat response: {e}")

            # Save AI response to memory
            memory_store[session_id].append(AIMessage(content=final_reply))

            return {
                "reply": final_reply,
                "mode": "QUERY_MODE",
                "suggestions": suggestions,
                "url": url_context
            }
        except Exception as e:
            logger.error(f"Error processing message: {e}")
            raise e

    async def translate_bulk(self, texts: list[str], target_language: str) -> list[str]:
        if not texts:
            return []

        # Safety check for empty strings
        clean_texts = [t.strip() if t.strip() != "" else " " for t in texts]

        prompt = f"""
      You are a professional translator specializing in Indian regional languages. 
      TASK: Translate the following list of strings EXCLUSIVELY into {target_language}.
      
      CRITICAL RULES:
      1. Maintain exactly the same order.
      2. Separate each translation with the delimiter " ||| ".
      3. Example: Translation 1 ||| Translation 2 ||| Translation 3
      4. Do NOT add any conversational text, introductory text, or explanation. 
      5. Do NOT use JSON formatting, just the delimited list.

      INPUT LIST:
      {"\n".join(clean_texts)}
        """

        try:
            response = await self.model.ainvoke([HumanMessage(content=prompt)])
            content = response.content.strip()
            parts = [s.strip() for s in content.split("|||")]

            # If AI failed the delimiter but provided rows
            if len(parts) < len(texts):
                parts = [s.strip().lstrip("0123456789. ") for s in content.split("\n")]
                # Pad/truncate if sizes still mismatch
                if len(parts) < len(texts):
                    parts += [texts[i] for i in range(len(parts), len(texts))]
                elif len(parts) > len(texts):
                    parts = parts[:len(texts)]

            return parts
        except Exception as e:
            logger.error(f"Bulk Translation Error: {e}")
            return texts

# Instantiate singleton service instance
agent_pipeline = AgentPipeline()

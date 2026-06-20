import json
import logging
import redis
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage, ToolMessage, messages_to_dict, messages_from_dict
from langchain_core.tools import tool
from tavily import TavilyClient
from app import config

logger = logging.getLogger("uvicorn.error")

# Persistent session store for conversational history
redis_client = None

def get_redis_client():
    global redis_client
    if redis_client is None:
        redis_client = redis.Redis.from_url(config.REDIS_URL, decode_responses=True)
    return redis_client

def get_session_history(session_id: str) -> list:
    client = get_redis_client()
    try:
        data = client.get(f"session:{session_id}")
        if data:
            return messages_from_dict(json.loads(data))
    except Exception as e:
        logger.error(f"Error reading session history from Redis: {e}")
    return []

def save_session_history(session_id: str, messages: list):
    client = get_redis_client()
    try:
        data = json.dumps(messages_to_dict(messages))
        client.set(f"session:{session_id}", data, ex=86400) # 24 hour expiry
    except Exception as e:
        logger.error(f"Error saving session history to Redis: {e}")

@tool
def web_search(query: str) -> str:
    """Searches the web for up-to-date information."""
    if not config.TAVILY_API_KEY:
        return "Search failed: No TAVILY_API_KEY configured."
    try:
        tavily = TavilyClient(api_key=config.TAVILY_API_KEY)
        response = tavily.search(query=query, search_depth="basic")
        return str(response.get("results", []))
    except Exception as e:
        return f"Search failed: {str(e)}"

class AgentPipeline:
    def __init__(self):
        # Initialized lazily or at startup
        base_model = ChatGroq(
            model="llama-3.1-8b-instant",
            groq_api_key=config.GROQ_API_KEY
        )
        self.model = base_model.bind_tools([web_search])
        self.translation_model = ChatGroq(
            model="llama-3.1-8b-instant",
            groq_api_key=config.GROQ_API_KEY
        )

    async def process_message(
        self,
        user_message: str,
        url_context: str,
        session_id: str,
        language: str = "auto",
        page_text: str = ""
    ):
        is_init = user_message == "[INIT_SUGGESTIONS]"
        history = get_session_history(session_id)

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
            search_directive = "\n\n[WEB SEARCH TRIGGERED]\nThe user has explicitly requested to SEARCH THE WEB for the selected text. You MUST use the 'web_search' tool to find up-to-date information before answering."
            clean_message = clean_message.replace("[WEB_SEARCH]", "").strip()

        # Save regular user message to memory
        history.append(HumanMessage(content=clean_message))

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
            *history,
            SystemMessage(content=final_reminder)
        ]

        try:
            ai_response = await self.model.ainvoke(messages)
            
            # Agentic tool calling loop
            if ai_response.tool_calls:
                history.append(ai_response)
                messages.append(ai_response)
                
                for tool_call in ai_response.tool_calls:
                    if tool_call["name"] == "web_search":
                        tool_result = web_search.invoke(tool_call["args"])
                        tool_msg = ToolMessage(content=tool_result, tool_call_id=tool_call["id"])
                        history.append(tool_msg)
                        messages.append(tool_msg)
                
                # Re-invoke the model with tool results
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
            history.append(AIMessage(content=final_reply))
            save_session_history(session_id, history)

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
            response = await self.translation_model.ainvoke([HumanMessage(content=prompt)])
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

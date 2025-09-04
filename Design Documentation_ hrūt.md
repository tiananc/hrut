**Design Documentation**

**hrūt: AI-Powered Journaling Companion** ✍️  
Hrūt: How r u today? Pronounced “root.”

**Time Constraints:** 48 hours \- 17 full-time working \- 10 hours of sleep \= 21 hours

**MVP:** 

1. Journal Entry and Display  
   1. UI is very stripped intentionally to remove any feeling of judgement   
      1. Avoided personification of the tool for ethical and safety concerns  
   2. Users are able to type in and submit notes (which are stored locally) which will be analyzed and aggregated with previous entries to identify common themes and emotions.  
   3. Recommended prompts are generated based on sentiment across a user’s previous entries  
      1. Prompts are recommended based on sentiment aggregation across week on weekends and all time otherwise  
   4. Users can view a summary of emotions and themes based on scope: year \> month \> week  
      1. At the “week” scope, users can select individual entries

**Future Implementations:** 

1. OCR features for handwritten text  
   1. A tool for users who prefer traditional journaling which expands consumer base  
   2. Requires a library that is trained in handwritten text recognition   
2. More personalized journaling prompts  
   1. Privacy \- must ONLY use aggregated stats (nondescript) and NOT journal entries to generate prompts  
   2. Local LLM is just that, local to heavy   
   3. If there was funding involved, could look into enterprise usage of Anthropic or OpenAI’s models  
3. A delightful visualization of all emotions/themes  
   1. User could view different scopes (year \> month \>  week)  
   2. Color coding most common, least common, emerging  
4. Secure, cloud storage and a login  
   1. Users should be able to use anytime, anywhere without constraint to a device   
   2. Probably something like firebase or cloudflare 

**Stretchhh Goals (Years worth, would require funding, a marketing/sales teams, a swe team, and proof of consumer value with the baseline userbase):**

1. EMR/EHR integration (ie. SimplePractice)  
   1. Therapists could recommend prompts for the appointment or can customize the tool to generate prompts to be tailored to a treatment plan (CBT, DBT, etc.)  
   2. Cross-functionality between EHR and Tool  
      1. User could send snippets or full entries in between sessions for therapist to add comments to akin to a Word or Google Doc  
      2. Helps the therapist and client prep for the next session or when the therapist can’t fit a client in between, but the client needs some additional support   
2. HIPPA-complinant conference software (ie: [doxy.me](http://doxy.me))  
   1. Generates notes/themes post session that support daily prompt generation  
   2. Generates themes over the course of multiple sessions for theme tracking for client and provider  
   3. Must be reviewed by provider and client before sending to tool  
3. **Why?**  
   1. If this were to be a profitable tool, sustainable revenue vs reliance on only a freemium model is good  
      1. Lower cost to free for everyday users, which is ideal for a mental health tool 
      2. Becomes a unique tool in the healthcare space for a sustainable ICP


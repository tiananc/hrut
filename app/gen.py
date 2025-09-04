from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, Dict
from jinja2 import Environment, DictLoader, select_autoescape

router = APIRouter()

TEMPLATES = {
    "POSITIVE": "Hey {{ user.name or 'there' }}, love the energy! Next step: {{ context.call_to_action or 'reply when ready.' }}",
    "NEGATIVE": "Hi {{ user.name or 'there' }}, I hear you. Simple plan: {{ context.call_to_action or 'take a breath and try again.' }}",
    "NEUTRAL":  "Hi {{ user.name or 'there' }}, here’s a balanced next step: {{ context.call_to_action or 'review and proceed.' }}",
}

env = Environment(
    loader=DictLoader(TEMPLATES),
    autoescape=select_autoescape()
)

class GenIn(BaseModel):
    sentiment_label: str
    user: Optional[Dict] = {}
    context: Optional[Dict] = {}

class GenOut(BaseModel):
    text: str

@router.post("/template", response_model=GenOut)
def gen_template(inp: GenIn):
    label = (inp.sentiment_label or "NEUTRAL").upper()
    if label not in TEMPLATES:
        label = "NEUTRAL"
    tmpl = env.get_template(label)
    out = tmpl.render(user=inp.user or {}, context=inp.context or {})
    return {"text": out.strip()}

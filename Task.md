SWE Assessment for Livo AI

Round: Primary technical round
Deadline: Sunday, 12 July 2026, 11:59 PM
IST (rolling evaluations, so earlier is better)
Submit your work using the form link included
in the email you received.

A bit of context
Livo AI builds AI products for real clients under
real deadlines. A lot of what we ship combines
a web or mobile frontend with AI on the
backend: speech, RAG, agentic workflows, and
so on.
This assignment is a small, scoped slice of that
kind of product. We want to see how you think
about building a small AI product end-to-end:

the engineering, the AI plumbing, and the
compliance posture, not just a demo notebook.

The task
Build and deploy a web app to a public URL
(Vercel, Netlify, Render, Fly.io, Cloudflare
Pages, Railway, or similar) where a user can:
1. Upload an audio file of someone speakingand let
English (30 to 45 seconds).
2. See a pronunciation score for the
recording.
3. See specific mistakes highlighted:
words or segments where pronunciation
was off, with some indication of what went
wrong (mispronounced word, unclear
segment, and so on).
You have full freedom on how you score and
highlight. Use whatever combination of STT,
TTS, phoneme comparison, LLM judgment, or
acoustic models makes sense to you. The bar

is simple: would this output be useful to a real
learner trying to improve?

Deliverables
1. Live URL to the deployed app.
2. Source code (GitHub repo link, public or
shared with us).
3. System architecture doc, 1 to 2 pages
max. It should cover:
Components and how they connect (a
diagram is welcome)
Which models and APIs you used, and
why over the alternatives
How you score pronunciation and how
you decide what to highlight
DPDP compliance: how the app
handles user audio and personal data in
line with India's Digital Personal Data
Protection Act 2023. Cover storage,
retention, consent, data residency, and
deletion.

Trade-offs you made, and what you
would build next if you had another
week

Constraints

The app must be deployed to a public URL
and reachable when we open the link. A
local demo does not count. Pick whichever
host works best for your stack.
Audio uploads should be limited to 30 to 45
seconds. Enforce this in the app.
English speech only.
Any language or framework is fine, but the
frontend must actually work in a browser
without setup.

What we care about
We are not grading you on getting the
"correct" pronunciation score. We are looking

at:
Does the app actually work end-to-end
when we open the link?
Does your architecture make sense, and
would it hold up in production?
Do you take DPDP compliance seriously, or
treat it as an afterthought?
Are your trade-offs deliberate? Did you pick
your stack for a reason?
There is no trick here. Ship something real and
tell us how it works.
# WalkMate
SYNCS 2025 Hackathon

# Installation
## Program Setup
### Introduction




## Inspiration
In urban life, walking is the most sustainable and accessible form of transport. However, the rapid changing of urban landscapes make it difficult for pedestrians to remain informed of their walking routes. WalkMate is inspired by this challenge; to empower people people with smarter walking choices and make human-centred mobility the heart of future cities.

## What it does
WalkMate audits your walking paths directly in your browser navigation tools, analyzing them for safety, accessibility and comfort. Our adorable mascot Bean provides you with a quick, easy to understand evaluation along with a short justification so that you can know whether a route is good or bad; empowering your pedestrian decisions!

## How we built it
We built WalkMate as a browser extension that integrates into your navigation tools with custom route auditing logic. Our system notices when you make GPS request and evaluates that data against key factors such as safety, accessibility, and comfort. We use internal heuristics determined by a range of internal metrics, combined with AI-enhanced sentiment analysis to create an overall score of the route, which is shown to you via our lightweight, aesthetic front end pop-up panel.

## Challenges we ran into
A core issue was understanding how to scrape web data, so that we can parse it into a readable format for our evaluation algorithms. Secondly, we were faced with development issues when it came to choosing TypeScript or JavaScript, but we ultimately opted for the latter due to its ease of implementation.

## Accomplishments that we're proud of
We are truly proud to have come together so strongly as a group and been able to formulate and create such an inspired idea. We're really proud of the work we've created; we know that the application can be so much more, but by building this prototype we hope to have shown the potential that five computing students with a shared vision can make an impact on our cities, and our future!

## What we learned
A lot of unexpected challenges were met when creating this tool. For starters, none of us have Chrome extension development experience; but we weren't demotivated by this. After learning how browser extensions worked, we were also required to learn how data is communicated between Google Maps API calls and our local website pages. We quickly discovered many 'hacks' that Google uses: for example, all Google Maps generated routes are marked with specific tags in their URL to indicate the mode of transport. Additionally, we've learned how to ... (insert explanation regarding analysis).

## What's next for WalkMate
We're not sure how we envision the future of this tool - all we know is that we're keen to give commuters of all kinds the right support they deserve to empower their transport needs. We're happy to leave our impact in this landscape by giving to the communities this interesting and prospective idea to explore.

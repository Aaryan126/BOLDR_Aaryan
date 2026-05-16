# Buyer Personas

Use these five buyer personas exactly. They come from the challenge brief image and should be the final persona names shown in the product.

## Required Personas

### Health-Conscious Buyer

Trigger signals:

- BPA-free
- nickel-free
- hypoallergenic
- EU REACH
- safe for kids

Marketing action:

- Product badge: "BPA-Free Straps"

### Gifter

Trigger signals:

- engraving
- gift wrap
- birthday
- anniversary
- turnaround time

Marketing action:

- Seasonal campaigns: Valentines, Fathers Day

### Enthusiast / Collector

Trigger signals:

- Grade 5 titanium
- Miyota movement
- limited editions

Marketing action:

- Collector content: specs & craftsmanship

### Active / Outdoor Buyer

Trigger signals:

- water resistance
- shock
- trail running
- FKM rubber strap

Marketing action:

- Segment: adventure lifestyle content

### Sustainability Advocate

Trigger signals:

- vegan straps
- carbon offset shipping
- eco packaging

Marketing action:

- New: vegan strap angle to develop

## Mapping From CSV Labels

The ticket CSV has internal labels that do not exactly match the five required personas. Use the required persona names above in final outputs.

Suggested mapping:

- `health_conscious` -> Health-Conscious Buyer
- `gifter` -> Gifter
- `owner_aftercare` -> Active / Outdoor Buyer when the enquiry is about rugged use, water resistance, servicing, repair, or long-term field reliability
- `prospect` -> Enthusiast / Collector when the enquiry is about model choice, specs, warranty, limited editions, or purchase evaluation
- `enthusiast` -> Active / Outdoor Buyer for straps, water use, fit, compatibility, and use-case questions; Enthusiast / Collector for specs or collecting questions
- `niche_buyer` -> Sustainability Advocate for vegan, recycling, carbon-neutral, or environmental questions; Enthusiast / Collector for technical edge cases and collector questions; Active / Outdoor Buyer for altitude, shock, trail running, or field-use questions
- `transactional` -> Do not expose as a final buyer persona by default. Treat as an operational routing tag unless the message also contains one of the five persona signal sets.

## Implementation Notes

- Persona tagging should be multi-signal: use message text, question type, retrieved theme, and ticket context.
- If a ticket is purely order-specific, set an operational tag such as `transactional` internally but still map to the closest required persona only when there is a meaningful buyer motivation signal.
- Preserve explainability by storing the trigger words or reasoning used for the persona assignment.

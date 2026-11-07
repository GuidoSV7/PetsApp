# Single-mesh care plate

The plate is one merged BufferGeometry and one vertex-color material. Bottom, four rims and food are authored as boxes, merged without material groups; the temporary geometries are disposed. A cached renderer mesh is shown only during feeding. It is not one of A1's cat IDs or accessory anchors.

At maximum feeding visibility, 39 cat boxes + coat patches + one plate mesh produce `2 * (39 + patches + 1) + 5` draws: solid85, tabby109, tuxedo101, calico93, pointed109. These are arithmetic budgets until confirmed in Chromium, not a mock-rendering claim.

Parent public-geometry probe observed behavioral RED (six default groups/missing colors) then GREEN (no groups/complete colors). Raw logs are under `.git/agent-evidence/a2-cat-poses-implementation/plate-{red,green}.*`; the committed test pins the same geometry contract. No binary assets or dependencies are added.

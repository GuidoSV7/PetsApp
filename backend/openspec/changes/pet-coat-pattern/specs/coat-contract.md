# Spec: coat domain contract

Status: implemented; observed RED/GREEN and preservation evidence is mapped in ../review.md.

## S1 — Ordered, append-only persisted identifiers

COAT_PATTERNS MUST initially equal, in order:

```text
['solid', 'tabby', 'tuxedo', 'calico', 'pointed']
```

The derived CoatPattern type and validators MUST use this source of truth. Future changes may append values only; no renaming, removal or reordering of persisted identifiers.

Acceptance: assert exact list/order and recognized membership for every listed value. An appended future value must retain the existing prefix and fit the storage contract.

## S2 — Complete state, default and read normalization

PetCoat MUST contain its three existing color fields and a required pattern. DEFAULT_COAT and a newly created pet MUST use solid. The existing default colors and other initial state MUST remain unchanged.

A read normalizer MUST return each known pattern unchanged and treat an unknown stored value such as zebra as solid. Read normalization MUST NOT be reused to make an invalid write succeed.

Acceptance: rule tests cover known/unknown normalization and initialSnapshot; PostgreSQL/service/GET tests prove a new pet returns coat.pattern=solid, not merely a mocked value.

## S3 — Omission-aware applyCoat

The write-input type MUST retain the existing required colors and make only pattern optional. Given a stored tabby coat:

| Input | Expected coat.pattern | Other effects |
|---|---|---|
| Valid new colors, no pattern | tabby | New colors applied; existing coated status behavior retained. |
| Valid new colors, pattern calico | calico | New colors applied; no pattern price/coin deduction. |

applyCoat MUST preserve unrelated snapshot fields as it does today. Existing colors-only behavior and service color lowercasing MUST still pass. Full persisted/read-back state, not an unchecked request object, is the acceptance boundary.

Traceability: [HTTP S4–S6](http-compatibility.md), [persistence S7–S10](persistence-and-rollout.md), [tasks](../tasks.md).

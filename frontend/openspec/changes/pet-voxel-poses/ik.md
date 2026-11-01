# Analytic support IK — T1a

## Public API and units

`solveTwoBoneSupport(input: SupportChainInput): SupportChainSolution` lives in
`src/features/pet-home/cat-support-ik.ts` and reuses `cat-pose-types.ts`.
It is pure TypeScript with Three 0.186 math, no renderer, clock, randomness,
SkinnedMesh or CCDIKSolver. Inputs are read-only; each call returns fresh tuples.

All positions and lengths are **model units in world space**, +Y up, +Z forward,
left −X. `root` is the proximal joint; `target` is the requested planted foot
endpoint. `pole` is a **world point**, not an Euler angle or direction vector:
its projection perpendicular to root→target chooses the knee/elbow bend.
Mirroring root, target and pole mirrors the nonsingular solution without scaling.
`upperLength` and `lowerLength` are positive rigid segment lengths.
`maxReach`, when supplied, is a per-chain root-to-foot distance cap; omitting it
uses the sum of the lengths. A cap above that sum does not stretch the chain.

Output contains world `knee` and `foot` tuples, identity world `footQuaternion`
`[0,0,0,1]` (flat rear foot), `reachable`, and Euclidean `error` measured against
the **original requested target**, never against a substituted goal.

## Formula and degeneracies

For lengths a, b and requested distance d, the feasible radial interval is
`[|a−b|, min(a+b, maxReach)]`. Clamp d into that interval to obtain r.
The law of cosines gives axial knee distance `x=(r²+a²−b²)/(2r)` and
perpendicular height `h=sqrt(max(0,a²−x²))`. The knee is
`root + axis*x + bend*h`. The implementation scales the formula before squaring
and factors differences to limit cancellation/overflow.

At r=0 (equal lengths), x=0 and h=a: the knee folds toward the projected pole.
At coincident root/target the deterministic axis is +Y. At a collinear or
coincident pole, choose the least-aligned world axis (X, then Y, then Z for ties)
and project it perpendicular to the solve axis. A nearly collinear normalized
pole projection of length ≤1e−12 uses the same fallback. There is no cached
previous direction; exact singularities are deterministic, not a promise of
continuous bend orientation through an ambiguous pole crossing.

Nonfinite points, nonpositive/nonfinite lengths, or a nonpositive/nonfinite cap
throw `RangeError`. A cap below `|a−b|` also throws: no rigid chain satisfies it.
Geometry exceeding representable finite numeric range throws rather than
returning NaNs. Invalid calls do not mutate input or maintain hidden state.

## Contact acceptance and integration boundary

A declared planted support must drift **≤0.001 model unit** from its requested
world goal in every frame; final camera acceptance also requires ≤0.5 projected
pixel. Reachability is the inclusive geometric interval, not this drift tolerance.
A reachable solution copies the exact requested endpoint; an unreachable one
returns the nearest radial endpoint, `reachable:false`, and its actual nonzero
error. **Never classify a clamped endpoint as planted**, even when error is small.
Root-equal unequal-length chains are unreachable and retain both rigid lengths.

The tests move roots repeatedly with .4 Hz awake / .3 Hz asleep respiration-shaped
motion while holding the same reachable world foot goal. This proves the pure
solver boundary, **not full rig breathing, transitions, reactions or rendering**.

T4 must supply resolved morphology-specific rigid lengths, authored world poles,
per-chain reach caps and persistent world contact goals; solve **LAST after
springs**. Convert world knee/foot positions into local unit-scale joint rotations
using the existing rest bind, and compensate the ankle parent rotation to apply
the flat world quaternion. Account for any pad offset from the endpoint when
checking the actual contact point. Preserve all A1 pieces/joints/anchors. Do not
silently modify root/goal/lengths or force an unreachable contact to pass. Contact
release/replant phases, FK adapter, dense per-transition/morphology sweeps,
projected-pixel checks and allocation/performance policy remain parent/T4 work.
No locomotion or navigation is implemented here.

# Proposal: Needs shown on the cat, not meters

## Problem

The home stage shows four percent bars (Hambre, Diversión, Energía, Higiene).
They clutter the first viewport and steal attention from Michi. Care state
should be readable on the cat itself.

## Solution

1. Remove the need meter grid from `PetHomeStage`.
2. Drive procedural 3D cues from `PetNeeds` (slim when hungry, droopy ears when
   bored, sleepy sway/eyes when tired, dirtier coat when hygiene is low).
3. Keep care actions; needs still update via the API — only the UI encoding
   changes.

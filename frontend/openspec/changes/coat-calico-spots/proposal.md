# Proposal: Capture calico / spotted coat colors

## Problem

Uploading a multi-color cat (reds, yellows, spots) often paints Michi near-black.
Shadows and dark patches outrank smaller chromatic spots in the extractor.

## Solution

Down-weight deep shadows for the primary race, boost saturated fur pixels, and
pick secondary/accent for distinct spot hues so calico/tortie photos keep their
reds and yellows visible.

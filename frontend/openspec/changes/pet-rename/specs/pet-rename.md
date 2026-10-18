# Spec: pet rename

- New pets start named Michi with renameCount 0.
- First successful rename is free and increments renameCount.
- Later renames cost 5 coins; insufficient coins leave name and balance unchanged and set broke status.
- Invalid or blank names are rejected.
- Home stage shows the API name and allows editing with a Gratis / 5 monedas cue.

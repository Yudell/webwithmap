# webwithmap
The generator is still in the early stages of development and may contain bugs such as generating empty maps with water only and odd country borders.

## Current version of generator features:

* Physical map generation
* Layer with countries and settlements on top of a physical map
* Variuous map scale sizes
* Zoom-in/out
* Download map
* Copy and load map seeds

## Changelog

* The logic of river generation has been slightly redesigned for a more realistic appearance.
* The logic of country generation has been redesigned. Now there will be no empty or unoccupied territories.
* The colors have been changed to display countries. 
* A new color palette of the map has been added, which perfectly matches the new colors of the countries (the old palette has not been removed).
* The logic of generating settlements and displaying their icons has been redesigned. Now the icons change when the map is drawn closer.
* Roads were added between the settlements to create a link between them and the countries.
* Points of interest have been added that appear on the map and add more vividness to it.
* New presets for map generation have been added: Continents, Pangaea, Archipelago, Central Sea.
* There have also been many minor improvements and optimizations.

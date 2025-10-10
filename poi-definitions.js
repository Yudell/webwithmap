import { terrainType } from './terrain-types.js';


const ADJECTIVES = {
    ruin: ['Forgotten', 'Sunken', 'Cursed', 'Ancient', 'Lost', 'Whispering', 'Shattered', 'Fallen', 'Ruined', 'Timeworn', 'Desolate'],
    lair: ['Monstrous', 'Shadowy', 'Hidden', 'Fearsome', 'Grave', "Witch's", 'Secret', 'Dire', 'Goblin', 'Savage', 'Twisted'],
    natural: ['Mystic', 'Singing', 'Giant', 'Eternal', 'Weeping', 'Smoldering', 'Bleached', 'Hidden', 'Glimmering', 'Crystal', 'Hallowed', 'Gleaming'],
    structure: ['Old', 'Broken', 'Towering', 'Forgotten', 'Guardian', 'Silent', 'Lone', 'Haunted', 'Black', 'Eldritch', 'Grim'],
    landmark: ['Ancient', 'Great', 'Forgotten', 'Haunted', 'Giant', 'Fabled', 'Mourning', 'Sunken', 'Sorrowful', 'Hanging'],
    wizard_tower: ['Ivory', 'Obsidian', 'Mad', 'Lost', 'Archmage\'s', 'Crimson', 'Azure', 'Forgotten', 'Glimmering', 'Ethereal'],
    mine: ['Abandoned', 'Haunted', 'Rich', 'Dwarven', 'Lost', 'Sunken', 'Crumbling', 'Forbidden']
};

const NOUNS = {
    ruin: ['Temple', 'Fortress', 'City', 'Tower', 'Sanctum', 'Citadel', 'Monastery', 'Keep', 'Abbey', 'Hold', 'Palace'],
    lair: ['Cave', 'Lair', 'Den', 'Nest', 'Cavern', 'Cove', 'Hut', 'Camp', 'Warren', 'Throne', 'Maw'],
    structure: ['Stones', 'Gate', 'Monolith', 'Tower', 'Bridge', 'Spire', 'Pillar', 'Cairn', 'Archway'],
    landmark: ['Battlefield', 'Graveyard', 'Skeleton', 'Boneyard', 'Falls', 'Wreck', 'Tomb', 'Chasm', 'Cliffs', 'Mire'],
    mine: ['Mine', 'Quarry', 'Dig Site', 'Excavation', 'Depths', 'Pits'],
    natural: {
        FOREST: ['Grove', 'Woods', 'Thicket', 'Glade'],
        MOUNTAIN: ['Peak', 'Monolith', 'Crag', 'Cave', 'Caldera'],
        MOUNTAIN_ORE: ['Volcano', 'Crater', 'Vein'],
        WET_GRASS: ['Fen', 'Bog', 'Marsh', 'Springs'],
        SAND: ['Oasis', 'Dunes', 'Cove', 'Flats'],
        DRY_SAND: ['Oasis', 'Expanse', 'Wastes', 'Boneyard'],
        HILLS: ['Caves', 'Hills', 'Mound', 'Tors']
    }
};

const NAME_FRAGMENTS = {
    start: ['Zol', 'Grak', 'Elm', 'Ash', 'Fen', 'Ril', 'Mor', 'Dun', 'Grim', 'Silver', 'Stone', 'Black', 'Kor'],
    end: ['tar', 'nar', 'dor', 'wood', 'fang', 'more', 'gard', 'gath', 'fall', 'crag', 'helm', 'spire', 'wrath']
};

const LEGENDS = ['the Mad King', 'Sorrows', 'Giants', 'the Damned', 'Shadows', 'Whispers', 'the Ancients', 'a Thousand Tears', 'the Betrayer', 'the Serpent'];

const PROPER_NOUN_BASES = ['Blackwood', 'Stonefall', 'Silverpeak', 'Ironwrath', 'Shadowfen', 'Dragonstooth', 'Whisperwind', 'Grimwatch', 'Sunstrider'];
const TITLES = ['King', 'Queen', 'Witch', 'Sorcerer', 'Lord', 'Knight', 'Tyrant', 'Prophet', 'Traitor', 'Hero'];
const FATE_NOUNS = ['Folly', 'End', 'Hope', 'Bane', 'Rest', 'Glory', 'Downfall'];



function randomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generateFantasyName() {
    return randomElement(NAME_FRAGMENTS.start) + randomElement(NAME_FRAGMENTS.end);
}

function getNoun(poi) {
    const nounList = NOUNS[poi.category];
    if (typeof nounList === 'object' && !Array.isArray(nounList)) {
        return randomElement(nounList[poi.placedOnTerrain] || nounList[Object.keys(nounList)[0]] || ['Landmark']);
    }
    return randomElement(nounList || ['Place']);
}

const NAME_FORMATS = [
    poi => `The ${randomElement(ADJECTIVES[poi.adjective_category || poi.category])} ${getNoun(poi)}`,
    poi => `${randomElement(ADJECTIVES[poi.adjective_category || poi.category])} ${getNoun(poi)}`,
    poi => `${generateFantasyName()}'s ${getNoun(poi)}`,
    poi => `The ${getNoun(poi)} of ${randomElement(LEGENDS)}`,
    poi => `${generateFantasyName()}'s ${randomElement(FATE_NOUNS)}`,
    poi => `${randomElement(PROPER_NOUN_BASES)} ${getNoun(poi)}`,
    poi => `The ${getNoun(poi)} of the ${randomElement(ADJECTIVES.landmark)} ${randomElement(TITLES)}`,
    poi => `The ${randomElement(ADJECTIVES[poi.adjective_category || poi.category])} ${getNoun(poi)} of ${generateFantasyName()}`
];

function generatePOIName(poi) {
    const format = randomElement(NAME_FORMATS);
    return format(poi);
}



export const POI_DEFINITIONS = {
    ANCIENT_RUIN: {
        category: 'ruin',
        icon: '🏛️',
        spawnChance: 0.00005,
        placement: {
            requires: ['HILLS', terrainType.FOREST, terrainType.DRY_GRASS],
            avoids: ['NEAR_SETTLEMENT'],
        },
        generateName: (poi) => generatePOIName(poi)
    },
    DRAGON_LAIR: {
        category: 'lair',
        icon: '🐲',
        spawnChance: 0.0002,
        placement: {
            requires: [terrainType.MOUNTAIN_SNOW],
            avoids: ['NEAR_POI', 'NEAR_SETTLEMENT'],
        },
        generateName: (poi) => `The ${randomElement(ADJECTIVES.lair)} ${getNoun(poi)}`
    },
    MYSTIC_GROVE: {
        category: 'natural',
        icon: '🌳',
        spawnChance: 0.00005,
        placement: {
            requires: [terrainType.FOREST],
            avoids: ['NEAR_POI:ANCIENT_RUIN']
        },
        generateName: (poi) => generatePOIName(poi)
    },
    WITCH_HUT: {
        category: 'lair',
        icon: '🛖',
        spawnChance: 0.00015,
        placement: {
            requires: [terrainType.FOREST, terrainType.WET_GRASS],
            avoids: ['NEAR_SETTLEMENT']
        },
        generateName: (poi) => generatePOIName(poi)
    },
    DWARVEN_GATE: {
        category: 'structure',
        icon: '🚪',
        spawnChance: 0.0003,
        placement: {
            requires: [terrainType.MOUNTAIN],
            avoids: ['NEAR_POI']
        },
        generateName: (poi) => generatePOIName(poi)
    },
    DESERT_OASIS: {
        category: 'natural',
        icon: '🌴',
        spawnChance: 0.0004,
        placement: {
            requires: [terrainType.SAND, terrainType.DRY_SAND],
        },
        generateName: (poi) => generatePOIName(poi)
    },

    WIZARDS_TOWER: {
        category: 'structure',
        adjective_category: 'wizard_tower',
        icon: '🔮',
        spawnChance: 0.00003,
        placement: {
            requires: ['HILLS', terrainType.GRASS, terrainType.MOUNTAIN],
            avoids: ['NEAR_SETTLEMENT', 'NEAR_POI']
        },
        generateName: (poi) => generatePOIName(poi)
    },
    ABANDONED_MINE: {
        category: 'mine',
        icon: '⛏️',
        spawnChance: 0.0002,
        placement: {
            requires: [terrainType.MOUNTAIN, 'HILLS', terrainType.MOUNTAIN_ORE],
            avoids: ['NEAR_SETTLEMENT']
        },
        generateName: (poi) => generatePOIName(poi)
    },
    GOBLIN_CAMP: {
        category: 'lair',
        icon: '🏕️',
        spawnChance: 0.00003,
        placement: {
            requires: ['HILLS', terrainType.FOREST],
            avoids: ['NEAR_SETTLEMENT']
        },
        generateName: (poi) => generatePOIName(poi)
    },
    HAUNTED_GRAVEYARD: {
        category: 'landmark',
        icon: '🪦',
        spawnChance: 0.00005,
        placement: {
            requires: [terrainType.GRASS, terrainType.DRY_GRASS, terrainType.WET_GRASS],
            avoids: ['NEAR_SETTLEMENT']
        },
        generateName: (poi) => generatePOIName(poi)
    },
    SHIPWRECK_COVE: {
        category: 'landmark',
        icon: '🚢',
        spawnChance: 0.0005,
        placement: {
            requires: [terrainType.SAND, terrainType.WET_SAND],
            avoids: ['NEAR_SETTLEMENT']
        },
        generateName: (poi) => generatePOIName(poi)
    },
    CRYSTAL_CAVE: {
        category: 'natural',
        icon: '💎',
        spawnChance: 0.0001,
        placement: {
            requires: [terrainType.MOUNTAIN, 'HILLS'],
            avoids: ['NEAR_POI']
        },
        generateName: (poi) => generatePOIName(poi)
    },
    SMOLDERING_VOLCANO: {
        category: 'natural',
        icon: '🌋',
        spawnChance: 0.0005,
        placement: {
            requires: [terrainType.MOUNTAIN_ORE],
            avoids: ['NEAR_POI', 'NEAR_SETTLEMENT']
        },
        generateName: (poi) => `Mount ${generateFantasyName()}`
    },
};
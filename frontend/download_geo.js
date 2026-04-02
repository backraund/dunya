import fs from 'fs';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GEO_URL = "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson";
const DATA_DIR = path.join(__dirname, 'public', 'geo');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

async function start() {
    console.log("Downloading world map...");
    let world;
    try {
        const res = await axios.get(GEO_URL);
        world = res.data;
        fs.writeFileSync(path.join(DATA_DIR, 'world.geojson'), JSON.stringify(world));
        console.log("World map saved.");
    } catch(e) {
        console.error("World map error", e.message);
        return;
    }

    const features = world.features;
    let count = 0;
    
    console.log(`Starting massive ADM1 download for ${features.length} countries...`);
    
    // Yavaş ve kararlı indirelim (Server'ı bloklamamak için batch)
    // Paralel yerine sıralı indiriyoruz ki timeout olmasın
    for (const f of features) {
        const iso = f.properties['ISO3166-1-Alpha-3'];
        if (!iso || iso === "-99") continue;
        
        const filePath = path.join(DATA_DIR, `${iso}.geojson`);
        if (fs.existsSync(filePath)) {
          // Zaten varsa geç
          continue;
        }

        try {
            const url = `https://geoboundaries.org/data/geoBoundaries-3_0_0/${iso}/ADM1/geoBoundaries-3_0_0-${iso}-ADM1.geojson`;
            process.stdout.write(`Downloading ${iso}... `);
            const r = await axios.get(url, { timeout: 15000 });
            fs.writeFileSync(filePath, JSON.stringify(r.data));
            console.log(`Success (${(JSON.stringify(r.data).length / 1024).toFixed(1)} KB)`);
            count++;
        } catch(e) {
            console.log(`Failed: ${e.response ? e.response.status : e.message}`);
        }
    }
    console.log(`\nFinished! Successfully downloaded ${count} new countries.`);
}

start();

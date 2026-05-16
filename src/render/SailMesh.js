import * as THREE from 'three';

// Renderuje hlavní plachtu (na ráhně) a kosatku (na forestayu).
// Plachty deformované do paraboly + jednoduchá flapping animace v luff režimu.
export class SailMesh {
  constructor(boatMesh, sails) {
    this.sails = sails;
    this.anchors = boatMesh.getRiggingAnchors();

    // === Hlavní plachta ===
    // Plocha trojúhelníková – uděláme tedy trojúhelník přes BufferGeometry.
    // Stěžeň výška ~ 8.15m (mast top 0.85+9 - mast base 1.9 = 7.95), boom dlouhý 3.8.
    this.mainHeight = 7.0;
    this.boomLength = 3.6;
    this.mainGeo = this._makeTriGeo(this.mainHeight, this.boomLength, 10, 6);
    // Hlavní: čistá bílá s červeným horizontálním pruhem (vertex colors) → vizuální identita
    this._addStripe(this.mainGeo, this.mainHeight, 0.55, 0.62, [0.85, 0.18, 0.18]);
    const mainMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      roughness: 0.85,
      metalness: 0.0,
      vertexColors: true,
    });
    this.mainMesh = new THREE.Mesh(this.mainGeo, mainMat);
    // Připevníme k boomPivotu, tak že luff (přední lík) je u stěžně (z=0 v rámu boom pivot)
    // Geo: vertex 0 = boom-mast roh, šíří se po boomu (-Z) a po stěžni (+Y).
    this.anchors.boomPivot.add(this.mainMesh);

    // === Kosatka ===
    this.jibHeight = 6.0;
    this.jibBase = 3.0;
    this.jibGeo = this._makeJibGeo(this.jibHeight, this.jibBase, 8, 6);
    // Kosatka: krémová (béžová) — barevně jasně odlišená od hlavní
    const jibMat = new THREE.MeshStandardMaterial({
      color: 0xf5dc9a,
      side: THREE.DoubleSide,
      roughness: 0.85,
      metalness: 0.0,
    });
    this.jibMesh = new THREE.Mesh(this.jibGeo, jibMat);
    // Kosatka visí mezi forestay (bowstayBase nahoru) a tackem na palubě
    this.jibPivot = new THREE.Group();
    this.jibPivot.position.set(0, this.anchors.deckTop, 3.6); // tack
    this.jibPivot.add(this.jibMesh);
    this.anchors.heelPivot.add(this.jibPivot);

    this._time = 0;
    this._mainOrigPositions = this.mainGeo.attributes.position.array.slice();
    this._jibOrigPositions = this.jibGeo.attributes.position.array.slice();
  }

  // Přidá vertex-color atribut: vertexy v pásu [vMin..vMax] dostanou stripeColor,
  // ostatní zůstanou bílé. Materiál musí mít vertexColors:true.
  _addStripe(geo, height, vMin, vMax, stripeColor) {
    const pos = geo.attributes.position.array;
    const n = pos.length / 3;
    const colors = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const y = pos[i * 3 + 1];
      const v = y / height;
      const inStripe = v >= vMin && v <= vMax;
      if (inStripe) {
        colors[i * 3 + 0] = stripeColor[0];
        colors[i * 3 + 1] = stripeColor[1];
        colors[i * 3 + 2] = stripeColor[2];
      } else {
        colors[i * 3 + 0] = 1; colors[i * 3 + 1] = 1; colors[i * 3 + 2] = 1;
      }
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  }

  // Trojúhelníková hlavní plachta: vrcholy (0,0,0), (0,height,0), (0,0,-boom).
  // Trianguluje jako pravidelnou mřížku po dvou parametrech.
  _makeTriGeo(height, boom, segH, segW) {
    const positions = [];
    const uvs = [];
    const indices = [];
    // (u,v) ∈ [0,1] s constraint u+v <= 1 (trojúhelník)
    const grid = [];
    let idx = 0;
    for (let j = 0; j <= segH; j++) {
      const v = j / segH;
      grid[j] = [];
      const maxI = segW - Math.floor(segW * v);
      for (let i = 0; i <= maxI; i++) {
        const u = (i / segW);
        const x = 0;
        const y = v * height;
        const z = -u * boom * (1 - v); // boom-edge se zužuje s výškou stěžně
        positions.push(x, y, z);
        uvs.push(u, v);
        grid[j][i] = idx++;
      }
    }
    for (let j = 0; j < segH; j++) {
      const rowA = grid[j];
      const rowB = grid[j + 1];
      const lenA = rowA.length;
      const lenB = rowB.length;
      const minLen = Math.min(lenA, lenB);
      for (let i = 0; i < minLen - 1; i++) {
        indices.push(rowA[i], rowA[i + 1], rowB[i]);
        if (i + 1 < lenB) indices.push(rowA[i + 1], rowB[i + 1], rowB[i]);
      }
      // doplň poslední trojúhelník, pokud lenA > lenB
      if (lenA > lenB && lenB > 0) {
        indices.push(rowA[lenB - 1], rowA[lenA - 1], rowB[lenB - 1]);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  // Kosatka: trojúhelník s tackem (0,0,0), head (0,height,-zOff), clew (0,0,-base).
  // Zatím rovinný trojúhelník v rovině X=0; deformace v sync.
  _makeJibGeo(height, base, segH, segW) {
    // Tack v (0,0,0), head v (0,height, -0.3*base), clew v (0, 0, -base).
    const headOffset = 0.4 * base; // luff jde mírně dozadu (forestay sklon)
    const positions = [];
    const uvs = [];
    const indices = [];
    const grid = [];
    let idx = 0;
    for (let j = 0; j <= segH; j++) {
      const v = j / segH;
      grid[j] = [];
      const maxI = segW - Math.floor(segW * v);
      for (let i = 0; i <= maxI; i++) {
        const u = i / segW;
        // luff (přední lík) jde z (0,0,0) do (0,height,-headOffset)
        // foot jde z (0,0,0) do (0,0,-base)
        // interpolujeme bilineárně
        const luffZ = -v * headOffset;
        const footZ = -u * base * (1 - v);
        const x = 0;
        const y = v * height;
        const z = luffZ + footZ;
        positions.push(x, y, z);
        uvs.push(u, v);
        grid[j][i] = idx++;
      }
    }
    for (let j = 0; j < segH; j++) {
      const rowA = grid[j];
      const rowB = grid[j + 1];
      const lenA = rowA.length;
      const lenB = rowB.length;
      const minLen = Math.min(lenA, lenB);
      for (let i = 0; i < minLen - 1; i++) {
        indices.push(rowA[i], rowA[i + 1], rowB[i]);
        if (i + 1 < lenB) indices.push(rowA[i + 1], rowB[i + 1], rowB[i]);
      }
      if (lenA > lenB && lenB > 0) {
        indices.push(rowA[lenB - 1], rowA[lenA - 1], rowB[lenB - 1]);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  sync(sails, sailForceInfo, dt) {
    this._time += dt;
    const { mainAngle, jibAngle, mainInfo, jibInfo } = sailForceInfo;

    // --- Hlavní: rotace ráhna kolem stěžně (osy Y v lokálu lodi) ---
    // Pozor na konvenci Three.js: +rotation.y otáčí směr -Z (aft) směrem k -X (port).
    // sailLocalAngle > 0 znamená dle fyziky „chord na pravoboku" → potřeba zápor.
    this.anchors.boomPivot.rotation.y = -mainAngle;

    // Vyboulení plachty (perpenikulární na chord) – v lokálu ráhna je „výchylka v +X" odpovídá normálnímu směru.
    // Síla plachty vyboulí list ve směru kolmém k chord. Velikost úměrná CL+CD.
    const mainBulgeSign = Math.sign(mainAngle) || 1; // bulge na stejnou stranu jako rotated pivot (lokální +X)
    const mainBulgeMag = Math.min(0.8, 0.3 + (mainInfo.CL + mainInfo.CD * 0.5));
    const mainLuff = mainInfo.luffing || sails.main.reefFraction > 0.9 || !sails.main.hoisted;
    const mainScaleY = sails.main.hoisted ? (1 - sails.main.reefFraction * 0.66) : 0.02;
    this._deformSail(this.mainGeo, this._mainOrigPositions, mainBulgeMag, mainBulgeSign, mainLuff, this._time, mainScaleY);
    this.mainMesh.visible = sails.main.hoisted && mainScaleY > 0.05;

    // --- Kosatka: pivot rotace kolem osy Y (forestay je tack point) ---
    this.jibPivot.rotation.y = -jibAngle;
    const jibBulgeSign = Math.sign(jibAngle) || 1;
    const jibBulgeMag = Math.min(0.7, 0.25 + (jibInfo.CL + jibInfo.CD * 0.5));
    const jibLuff = jibInfo.luffing || sails.jib.reefFraction > 0.9 || !sails.jib.hoisted;
    const jibScale = sails.jib.hoisted ? (1 - sails.jib.reefFraction) : 0.02;
    this._deformSail(this.jibGeo, this._jibOrigPositions, jibBulgeMag, jibBulgeSign, jibLuff, this._time + 0.7, jibScale, true);
    this.jibMesh.visible = sails.jib.hoisted && jibScale > 0.05;
  }

  _deformSail(geo, origin, bulge, sign, luffing, time, vScale, isJib = false) {
    const pos = geo.attributes.position.array;
    for (let i = 0; i < pos.length; i += 3) {
      const oy = origin[i + 1];
      const oz = origin[i + 2];
      // Faktor parabolického vyboulení: maximum uprostřed plachty (kolem z = midZ)
      const uvU = isJib ? Math.min(1, -oz / 3.6) : Math.min(1, -oz / 3.6);
      const uvV = oy / (isJib ? 6.0 : 7.0);
      const par = Math.max(0, 4 * uvU * (1 - uvU)) * Math.max(0, 1 - uvV * 0.7);
      let x = sign * bulge * par;
      if (luffing) {
        // flapping: nelineární vlnění v X
        x += 0.2 * Math.sin(time * 8 + uvU * 6) * Math.sin(time * 5 + uvV * 4);
      }
      pos[i] = x;
      pos[i + 1] = oy * vScale; // ref/furl: měřítko po výšce (hlavní) / po hypotenuze (jib)
      pos[i + 2] = oz;
    }
    geo.attributes.position.needsUpdate = true;
    geo.computeVertexNormals();
  }
}

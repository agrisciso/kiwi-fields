import { useState, useMemo, useEffect } from "react";

const C = {
  primary: "#0D2818", mid: "#1A3A2A", accent: "#2D5A3D",
  gold: "#C9A84C", goldLight: "#E8C96A",
  cream: "#F5F0E8", creamDark: "#EDE6D8",
  text: "#1A2E1E", textMuted: "#5A7A64", white: "#FFFFFF",
  ok: "#27AE60", warn: "#E67E22", red: "#C0392B",
};

// Όρια ανά τύπο εδάφους (από πίνακα αναφοράς)
const THRX = {
  sandy:  { P_low:7,  P_high:11, K_low:70,  K_high:120, Ca_low:800,  Ca_high:1500, Mg_low:70,  Mg_high:120, OM_low:0.8, OM_high:1.5 },
  medium: { P_low:9,  P_high:17, K_low:100, K_high:200, Ca_low:1500, Ca_high:3500, Mg_low:100, Mg_high:180, OM_low:1.5, OM_high:2.0 },
  clay:   { P_low:11, P_high:21, K_low:150, K_high:300, Ca_low:3000, Ca_high:6000, Mg_low:150, Mg_high:300, OM_low:2.0, OM_high:2.5 },
};

function computeNutrition(p) {
  const { ha, yield: yld_ha, soil, water, texture } = p;
  if (!ha) return null;
  const THR = THRX[texture] || THRX.medium;
  const irrig = ha * 4000;
  const r3 = x => Math.round(x * 1000) / 1000;

  // N — βάση 120 kg/ha ώριμα / 80 kg/ha νεαρά, αφαίρεση N νερού
  const fertN       = Math.max((120 - (water.N || 0) * irrig / 1000) * ha, 0);
  const fertN_young = Math.max((80  - (water.N || 0) * irrig / 1000) * ha, 0);

  if (!yld_ha) return { N: r3(fertN), N_young: r3(fertN_young), P: null, K: null, Ca: null, Mg: null };

  const { P: P_s, K: K_s, Mg: Mg_s, Ca: Ca_s } = soil;
  const wP = water.P || 0, wK = water.K || 0, wCa = water.Ca || 0, wMg = water.Mg || 0;

  // K — hardcoded 200/300 thresholds (Excel formula)
  // < 200 → per-ha rate only (no ha mult, no water); > 300 → 0
  let fertK;
  if (K_s > 300)       fertK = 0;
  else if (K_s < 200)  fertK = yld_ha * 74 / 37.5;
  else                 fertK = Math.max((yld_ha * 74 / 37.5 - wK * irrig / 1000) * ha, 0);

  // P — texture thresholds; < P_low → per-ha rate only; > P_high → 0
  let fertP;
  if (P_s > THR.P_high)      fertP = 0;
  else if (P_s < THR.P_low)  fertP = yld_ha * 10 / 37.5;
  else                        fertP = Math.max((yld_ha * 10 / 37.5 - wP * irrig / 1000) * ha, 0);

  // Ca — texture thresholds; < Ca_low → per-ha rate only; > Ca_high → 0
  let fertCa;
  if (Ca_s > THR.Ca_high)      fertCa = 0;
  else if (Ca_s < THR.Ca_low)  fertCa = yld_ha * 11 / 37.5;
  else                          fertCa = Math.max((yld_ha * 11 / 37.5 - wCa * irrig / 1000) * ha, 0);

  // Mg — texture thresholds; < Mg_low → per-ha rate only; > Mg_high → 0
  let fertMg;
  if (Mg_s > THR.Mg_high)      fertMg = 0;
  else if (Mg_s < THR.Mg_low)  fertMg = yld_ha * 5 / 37.5;
  else                          fertMg = Math.max((yld_ha * 5 / 37.5 - wMg * irrig / 1000) * ha, 0);

  return { N: r3(fertN), N_young: r3(fertN_young), P: r3(fertP), K: r3(fertK), Ca: r3(fertCa), Mg: r3(fertMg) };
}

const PRODUCERS = [
  {
    id:1, name:"Αρχιμανδρίτη Χριστίνα", area:"ΝΕΟΧΩΡΙ",
    ha:0.62, yield:30.5, plantYear:2022,
    texture:"clay", sandPct:18,
    soil:{pH:7.6, OM:3.646, P:7, K:70, Mg:240, Ca:1500},
    water:{K:1.2, Mg:13, Ca:50, N:0.9, P:0}
  },
  {
    id:2, name:"Βίτσιος Σωτήριος 1", area:"ΡΟΚΚΑ",
    ha:0.65, yield:30, plantYear:2023,
    texture:"clay", sandPct:12,
    soil:{pH:7.8, OM:3.96, P:8, K:140, Mg:341, Ca:2170},
    water:{K:0, Mg:0, Ca:0, N:0, P:0}
  },
  {
    id:3, name:"Βίτσιος Σωτήριος 2", area:"ΡΟΚΚΑ",
    ha:0.35, yield:20, plantYear:2023,
    texture:"clay", sandPct:18,
    soil:{pH:7.7, OM:2.844, P:16, K:115, Mg:354, Ca:2448},
    water:{K:0, Mg:0, Ca:0, N:0, P:0}
  },
  {
    id:4, name:"Γαλιάνδρα Λαμπρινή", area:"ΠΑΧΥΚΑΛΑΜΟΣ",
    ha:0.255, yield:30.5, plantYear:2022,
    texture:"clay", sandPct:18,
    soil:{pH:7.7, OM:2.908, P:50, K:100, Mg:233, Ca:2200},
    water:{K:1.2, Mg:13, Ca:60, N:1.2, P:0}
  },
  {
    id:5, name:"Γκούντας Μιχάλης", area:"ΠΟΛΥΔΡΟΣΟ",
    ha:0.5, yield:15, plantYear:2024,
    texture:"clay", sandPct:12,
    soil:{pH:7.7, OM:4.624, P:33.4, K:180, Mg:553, Ca:5062},
    water:{K:0.91, Mg:21.6, Ca:70.2, N:0, P:0}
  },
  {
    id:6, name:"Δήμος Κωνσταντίνος", area:"ΑΓΙΑ ΠΑΡΑΣΚΕΥΗ",
    ha:0.771, yield:10.5, plantYear:2022,
    texture:"clay", sandPct:22,
    soil:{pH:7.9, OM:4.112, P:16, K:240, Mg:274, Ca:2516},
    water:{K:0, Mg:0, Ca:0, N:0, P:0}
  },
    {
    id:8, name:"Ζαχαριά Αναστασία", area:"ΓΑΒΡΙΑ",
    ha:0.66, yield:15, plantYear:2023,
    texture:"clay", sandPct:16,
    soil:{pH:7.5, OM:3, P:100, K:420, Mg:270.588, Ca:1375},
    water:{K:0, Mg:0, Ca:0, N:0, P:0}
  },
  {
    id:9, name:"Καλύβας Λάμπρος 1", area:"ΡΟΚΚΑ",
    ha:0.45, yield:30.5, plantYear:2022,
    texture:"clay", sandPct:18,
    soil:{pH:7.4, OM:3.55, P:95, K:340, Mg:272, Ca:2098.788},
    water:{K:1.3, Mg:12, Ca:42, N:2, P:0}
  },
  {
    id:10, name:"Καλύβας Λάμπρος 2", area:"ΡΟΚΚΑ",
    ha:0.42, yield:20, plantYear:2023,
    texture:"clay", sandPct:24,
    soil:{pH:7.5, OM:3.65, P:43, K:230, Mg:190, Ca:2113.939},
    water:{K:0, Mg:0, Ca:0, N:0, P:0}
  },
  {
    id:11, name:"Κολιός Αντρέας", area:"ΡΟΚΚΑ",
    ha:1.5, yield:15, plantYear:2023,
    texture:"clay", sandPct:18,
    soil:{pH:7.4, OM:4.682, P:24.6, K:250, Mg:459, Ca:2967.879},
    water:{K:1.2, Mg:22.3, Ca:119, N:4.9, P:0}
  },
  {
    id:12, name:"Κώτση Βασιλική", area:"ΡΟΚΚΑ",
    ha:0.4, yield:15, plantYear:2023,
    texture:"clay", sandPct:20,
    soil:{pH:7.8, OM:2.698, P:21, K:160, Mg:306, Ca:1600},
    water:{K:0, Mg:0, Ca:0, N:0, P:0}
  },
  {
    id:13, name:"Λάμπρου Χρισόστομος", area:"ΑΝΕΖΑ",
    ha:0.4, yield:10.5, plantYear:2022,
    texture:"clay", sandPct:20,
    soil:{pH:7.2, OM:6.296, P:12.6, K:220, Mg:623.529, Ca:1462.5},
    water:{K:1, Mg:14, Ca:55, N:2, P:0}
  },
  {
    id:17, name:"Μίχας Απόστολος", area:"ΑΝΕΖΑ",
    ha:0.12, yield:30.5, plantYear:2022,
    texture:"clay", sandPct:28,
    soil:{pH:7.1, OM:4.016, P:79, K:220, Mg:305, Ca:1823.03},
    water:{K:0, Mg:0, Ca:0, N:0, P:0}
  },
  {
    id:18, name:"Μίχας Κωνσταντίνος", area:"ΑΓΙΟΣ ΣΠΥΡΙΔΩΝΑΣ",
    ha:1.78, yield:30, plantYear:2023,
    texture:"clay", sandPct:16,
    soil:{pH:7.5, OM:4.382, P:118, K:250, Mg:465, Ca:2586.061},
    water:{K:0, Mg:0, Ca:0, N:0, P:0}
  },
  {
    id:14, name:"Μαγκλάρας Γεώργιος", area:"ΦΙΛΟΘΕΗ",
    ha:1.253, yield:30, plantYear:2022,
    texture:"clay", sandPct:28,
    soil:{pH:7.7, OM:4.426, P:27, K:130, Mg:201, Ca:2336.364},
    water:{K:1.9, Mg:33.5, Ca:118, N:0, P:0}
  },
  {
    id:15, name:"Μητσοκάλης Χρισόστομος 1", area:"ΓΑΒΡΙΑ",
    ha:1.15, yield:15, plantYear:2023,
    texture:"clay", sandPct:14,
    soil:{pH:7.7, OM:3.792, P:13, K:170, Mg:314, Ca:2680},
    water:{K:1, Mg:14, Ca:68, N:3.3, P:0}
  },
  {
    id:16, name:"Μητσοκάλης Χρισόστομος 2", area:"ΓΑΒΡΙΑ",
    ha:0.3, yield:30, plantYear:2023,
    texture:"clay", sandPct:14,
    soil:{pH:7.8, OM:3.816, P:9, K:160, Mg:272, Ca:2415},
    water:{K:0, Mg:0, Ca:0, N:0, P:0}
  },
  {
    id:22, name:"Μπάρκας Χρήστος", area:"ΑΡΤΑ",
    ha:0.31, yield:30.5, plantYear:2022,
    texture:"clay", sandPct:16.3,
    soil:{pH:7.6, OM:2.6, P:2.5, K:104, Mg:130, Ca:5800},
    water:{K:1.1, Mg:10, Ca:30, N:1.5, P:0}
  },
  {
    id:23, name:"Μπέκιος Φίλιππος 1", area:"ΚΕΡΑΜΑΤΕΣ",
    ha:0.55, yield:35.1, plantYear:2023,
    texture:"clay", sandPct:12,
    soil:{pH:7.8, OM:4.26, P:74, K:130, Mg:198, Ca:2177},
    water:{K:0, Mg:0, Ca:0, N:0, P:0}
  },
  {
    id:24, name:"Μπέκιος Φίλιππος 2", area:"ΑΓΙΑ ΠΑΡΑΣΚΕΥΗ",
    ha:0.65, yield:25.1, plantYear:2023,
    texture:"clay", sandPct:12,
    soil:{pH:7.8, OM:4.078, P:11, K:140, Mg:204, Ca:2521},
    water:{K:0, Mg:0, Ca:0, N:0, P:0}
  },
  {
    id:25, name:"Μπέλλου Λαμπρινή", area:"ΚΙΡΚΙΖΑΤΕΣ",
    ha:0.65, yield:40, plantYear:2022,
    texture:"clay", sandPct:20,
    soil:{pH:7.6, OM:4.124, P:5, K:290, Mg:323, Ca:2966.667},
    water:{K:0, Mg:0, Ca:0, N:0, P:0}
  },
  {
    id:19, name:"Μπαλλής Σωτήριος 1", area:"ΡΟΚΚΑ",
    ha:0.25, yield:30.5, plantYear:2022,
    texture:"clay", sandPct:19,
    soil:{pH:7.7, OM:3.97, P:22, K:340, Mg:210, Ca:1587.879},
    water:{K:0, Mg:0, Ca:0, N:0, P:0}
  },
  {
    id:20, name:"Μπαλλής Σωτήριος 2", area:"ΡΟΚΚΑ",
    ha:0.3, yield:30.5, plantYear:2022,
    texture:"clay", sandPct:22,
    soil:{pH:7.7, OM:3.862, P:25, K:270, Mg:183, Ca:1975.758},
    water:{K:0, Mg:0, Ca:0, N:0, P:0}
  },
  {
    id:21, name:"Μπαλλής Σωτήριος 3", area:"ΡΟΚΚΑ",
    ha:0.15, yield:30.5, plantYear:2022,
    texture:"clay", sandPct:19,
    soil:{pH:7.65, OM:3.778, P:5.3, K:190, Mg:160, Ca:2055.758},
    water:{K:0, Mg:0, Ca:0, N:0, P:0}
  },
  {
    id:26, name:"Μπόκου Μάρθα (1)", area:"ΚΩΣΤΑΚΙΟΙ",
    ha:0.35, yield:30.5, plantYear:2022,
    texture:"clay", sandPct:24,
    soil:{pH:7.8, OM:3.592, P:17, K:300, Mg:141.176, Ca:1150},
    water:{K:1.3, Mg:11, Ca:56, N:2.8, P:0}
  },
  {
    id:27, name:"Μπόκου Μάρθα (2)", area:"ΦΙΛΟΘΕΗ",
    ha:1.25, yield:30, plantYear:2022,
    texture:"clay", sandPct:20,
    soil:{pH:7.7, OM:3.912, P:27.7, K:280, Mg:328, Ca:5110},
    water:{K:0, Mg:0, Ca:0, N:0, P:0}
  },
  {
    id:28, name:"Ντέμσιας Θεόδωρος", area:"ΧΑΛΚΙΑΔΕΣ",
    ha:0.43, yield:30, plantYear:2022,
    texture:"clay", sandPct:12,
    soil:{pH:7.9, OM:3.134, P:11.4, K:120, Mg:335, Ca:3830},
    water:{K:1.2, Mg:10, Ca:74, N:5.1, P:0}
  },
  {
    id:29, name:"Ξυλογιάννη Ευανθία", area:"ΚΙΡΚΙΖΑΤΕΣ",
    ha:1.65, yield:30.5, plantYear:2022,
    texture:"clay", sandPct:20,
    soil:{pH:7.6, OM:5.306, P:48.5, K:250, Mg:342, Ca:2716.364},
    water:{K:1.8, Mg:16, Ca:62, N:5.9, P:0}
  },
  {
    id:30, name:"Ξυλογιάννη Μυρσίνη (1)", area:"ΚΑΛΑΜΙΑ",
    ha:0.8, yield:15, plantYear:2023,
    texture:"clay", sandPct:22,
    soil:{pH:7.7, OM:4.348, P:37.5, K:260, Mg:458.824, Ca:1687.5},
    water:{K:0, Mg:0, Ca:0, N:0, P:0}
  },
  {
    id:31, name:"Ξυλογιάννη Μυρσίνη (2)", area:"ΚΑΛΑΜΙΑ",
    ha:0.52, yield:15, plantYear:2024,
    texture:"clay", sandPct:18,
    soil:{pH:7.6, OM:4.58, P:55.4, K:240, Mg:510, Ca:5216},
    water:{K:0, Mg:0, Ca:0, N:0, P:0}
  },
  {
    id:32, name:"Ξυλογιάννης Αναστασιος (1)", area:"ΧΑΛΚΙΑΔΕΣ ΓΚΑΜΙΛΗ",
    ha:0.23, yield:null, plantYear:2024,
    texture:"clay", sandPct:20,
    soil:{pH:7.7, OM:3.43, P:16, K:320, Mg:270.588, Ca:1875},
    water:{K:0, Mg:0, Ca:0, N:0, P:0}
  },
  {
    id:33, name:"Ξυλογιάννης Αναστασιος (2)", area:"ΧΑΛΚΙΑΔΕΣ",
    ha:0.92, yield:20, plantYear:2024,
    texture:"clay", sandPct:24,
    soil:{pH:7.5, OM:3.29, P:31.3, K:144, Mg:398, Ca:1550},
    water:{K:2.6, Mg:18, Ca:77, N:8.1, P:7.11}
  },
  {
    id:34, name:"Ξυλογιάννης Αναστασιος (3)", area:"ΚΙΡΚΙΖΑΤΕΣ",
    ha:1.7, yield:20, plantYear:2024,
    texture:"clay", sandPct:12,
    soil:{pH:7.7, OM:4.812, P:11.9, K:440, Mg:235.294, Ca:1612.5},
    water:{K:1.6, Mg:13, Ca:75, N:2.5, P:0}
  },
  {
    id:35, name:"Παντιώρα Αμαλία", area:"ΜΕΝΙΔΙ",
    ha:0.2, yield:30.5, plantYear:2022,
    texture:"clay", sandPct:14,
    soil:{pH:7.1, OM:3.374, P:50.4, K:150, Mg:610, Ca:3828},
    water:{K:2.3, Mg:19, Ca:108, N:6.6, P:0}
  },
  {
    id:36, name:"Παππάς Ιωάννης", area:"ΚΑΛΟΒΑΤΟΣ",
    ha:0.5, yield:40, plantYear:2022,
    texture:"clay", sandPct:24,
    soil:{pH:7, OM:2.49, P:51, K:160, Mg:287, Ca:900},
    water:{K:0, Mg:0, Ca:0, N:0, P:0}
  },
  {
    id:37, name:"Παππάς Λάμπρος", area:"ΑΝΕΖΑ",
    ha:0.33, yield:35.2, plantYear:2022,
    texture:"clay", sandPct:28,
    soil:{pH:6.7, OM:3.164, P:134, K:180, Mg:331, Ca:2692},
    water:{K:1.2, Mg:16, Ca:65, N:5.8, P:0}
  },
  {
    id:38, name:"Παππάς Μιχάλης", area:"ΑΓΙΑ ΠΑΡΑΣΚΕΥΗ",
    ha:1.05, yield:20, plantYear:2023,
    texture:"clay", sandPct:26,
    soil:{pH:7.7, OM:3.794, P:54, K:150, Mg:200, Ca:1587.5},
    water:{K:1.4, Mg:12, Ca:50, N:1.4, P:0}
  },
  {
    id:39, name:"Σακαγιάννη Ηρώ", area:"ΓΡΑΜΜΕΝΙΤΣΑ",
    ha:0.79, yield:15.1, plantYear:2023,
    texture:"clay", sandPct:22,
    soil:{pH:7.4, OM:3.176, P:13, K:90, Mg:305.882, Ca:1412.5},
    water:{K:1.6, Mg:20, Ca:100, N:3.5, P:0}
  },
  {
    id:40, name:"Σκούμας Χρήστος", area:"ΚΙΡΚΙΖΑΤΕΣ",
    ha:0.47, yield:30.5, plantYear:2022,
    texture:"clay", sandPct:14,
    soil:{pH:7.6, OM:5.478, P:18.5, K:350, Mg:487, Ca:3408.485},
    water:{K:0, Mg:0, Ca:0, N:0, P:0}
  },
  {
    id:41, name:"Τζιανούμη Νίκη", area:"ΚΙΡΚΙΖΑΤΕΣ",
    ha:0.6, yield:30.5, plantYear:2022,
    texture:"medium", sandPct:30,
    soil:{pH:7.7, OM:3.404, P:22, K:92, Mg:145, Ca:2175.152},
    water:{K:1.3, Mg:14, Ca:78, N:2, P:0}
  },
  {
    id:42, name:"Τσάκωνας Άρης (compulife)", area:"ΧΑΛΚΙΑΔΕΣ",
    ha:0.61, yield:10, plantYear:2023,
    texture:"clay", sandPct:28,
    soil:{pH:7.6, OM:3.936, P:9, K:90, Mg:315, Ca:6112},
    water:{K:1.4, Mg:27, Ca:74, N:10.8, P:0}
  },
  {
    id:43, name:"Τσάλλος Λάμπρος", area:"ΓΑΡΔΙΚΙ ΣΟΥΛΙΟΥ",
    ha:1.75, yield:15, plantYear:2023,
    texture:"clay", sandPct:18,
    soil:{pH:7.6, OM:3.754, P:8, K:110, Mg:247.059, Ca:2050},
    water:{K:0, Mg:0, Ca:0, N:0, P:0}
  },
  {
    id:44, name:"Τσάμη Αγλαία", area:"ΑΡΤΑ",
    ha:1.3, yield:30, plantYear:2023,
    texture:"clay", sandPct:14,
    soil:{pH:7.85, OM:4.132, P:25.7, K:260, Mg:350, Ca:5723},
    water:{K:0, Mg:0, Ca:0, N:0, P:0}
  },
  {
    id:45, name:"Τσώλας Διονύσης", area:"ΧΑΛΚΙΑΔΕΣ",
    ha:0.33, yield:30.5, plantYear:2022,
    texture:"medium", sandPct:30,
    soil:{pH:7.5, OM:3.664, P:117, K:320, Mg:235.294, Ca:1175},
    water:{K:2.3, Mg:20, Ca:105, N:10.3, P:0}
  },
  {
    id:46, name:"Τσώλας Ιωάννης 1", area:"ΡΟΚΚΑ",
    ha:0.32, yield:30.5, plantYear:2022,
    texture:"clay", sandPct:20,
    soil:{pH:7.5, OM:5.7, P:90, K:480, Mg:340, Ca:3900},
    water:{K:4.6, Mg:15, Ca:78, N:12, P:0}
  },
  {
    id:47, name:"Τσώλας Ιωάννης 2", area:"ΡΟΚΚΑ",
    ha:0.43, yield:30.5, plantYear:2022,
    texture:"clay", sandPct:20,
    soil:{pH:7.4, OM:2.468, P:80, K:90, Mg:390, Ca:3400},
    water:{K:1.4, Mg:23, Ca:95, N:5.7, P:0}
  },
  {
    id:48, name:"Τσώρος Γεώργιος", area:"ΚΙΡΚΙΖΑΤΕΣ",
    ha:0.8, yield:null, plantYear:2022,
    texture:"medium", sandPct:32,
    soil:{pH:7.6, OM:5.048, P:16, K:220, Mg:258.824, Ca:1375},
    water:{K:0, Mg:0, Ca:0, N:0, P:0}
  },
  {
    id:49, name:"Φερεντίνου Μαρία", area:"ΓΑΡΔΙΚΙ ΣΟΥΛΙΟΥ",
    ha:1.05, yield:15, plantYear:2023,
    texture:"medium", sandPct:32,
    soil:{pH:7.8, OM:4.054, P:15, K:110, Mg:247.059, Ca:1937.5},
    water:{K:0.5, Mg:24, Ca:160, N:0.5, P:0}
  },
  {
    id:50, name:"Φωτιάδης Ορέστης", area:"ΝΕΟΧΩΡΙ",
    ha:0.8, yield:30, plantYear:2022,
    texture:"clay", sandPct:18,
    soil:{pH:7.7, OM:3.536, P:8, K:200, Mg:189, Ca:2217},
    water:{K:1.2, Mg:12, Ca:53, N:0.8, P:0}
  },
  {
    id:51, name:"Ψιλογιαννόπουλος Χρήστος", area:"ΚΑΛΥΒΙΑ ΑΓΡΙΝΙΟΥ",
    ha:0.73, yield:20, plantYear:2022,
    texture:"clay", sandPct:12,
    soil:{pH:7.9, OM:3.402, P:9.7, K:190, Mg:240, Ca:5570},
    water:{K:0, Mg:0, Ca:0, N:0, P:0}
  }
];

const PRODUCERS_INIT = PRODUCERS;

function fmt(v) {
  if (v === null || v === undefined) return "—";
  if (typeof v === "number") return v % 1 === 0 ? v.toString() : v.toFixed(1);
  return v;
}

function ArtaGoldLogo({ height = 32, dark = false }) {
  const artaColor = dark ? "#F5F0E8" : "#0D2818";
  return (
    <svg viewBox="0 0 220 56" style={{ height, width: "auto" }} xmlns="http://www.w3.org/2000/svg">
      <circle cx="26" cy="28" r="22" fill="none" stroke="#C9A84C" strokeWidth="2.5" />
      <circle cx="26" cy="28" r="16" fill="none" stroke="#C9A84C" strokeWidth="1" opacity="0.4" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
        <line key={i}
          x1={26 + 8 * Math.cos(angle * Math.PI / 180)} y1={28 + 8 * Math.sin(angle * Math.PI / 180)}
          x2={26 + 15 * Math.cos(angle * Math.PI / 180)} y2={28 + 15 * Math.sin(angle * Math.PI / 180)}
          stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round"
        />
      ))}
      <circle cx="26" cy="28" r="4" fill="#C9A84C" opacity="0.8" />
      <text x="58" y="38" fontFamily="Arial Black,sans-serif" fontWeight="900" fontSize="26" fill={artaColor} letterSpacing="-0.5">ARTA</text>
      <text x="126" y="38" fontFamily="Arial Black,sans-serif" fontWeight="900" fontSize="26" fill="#C9A84C" letterSpacing="-0.5">GOLD</text>
    </svg>
  );
}

function SoilBar({ label, value, low, high }) {
  const isLow = value < low, isHigh = value > high;
  const color = isLow ? C.red : isHigh ? C.warn : C.ok;
  const hint = isLow ? "⬇" : isHigh ? "⬆" : "✓";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
      <div style={{ width: 26, fontSize: 11, fontWeight: 700, color: C.textMuted }}>{label}</div>
      <div style={{ flex: 1, height: 5, background: C.creamDark, borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${Math.min(100, (value / (high * 1.5)) * 100)}%`, height: "100%", background: color, borderRadius: 3 }} />
      </div>
      <div style={{ width: 70, fontSize: 11, textAlign: "right", fontWeight: 600, color }}>{fmt(value)} <span style={{ fontSize: 9 }}>{hint}</span></div>
    </div>
  );
}

function NRow({ element, value, period }) {
  const isZero = !value || value <= 0.005;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: C.cream, borderRadius: 8, marginBottom: 6, border: `1px solid ${C.creamDark}` }}>
      <div style={{ width: 30, height: 30, borderRadius: 6, background: isZero ? C.creamDark : C.primary, color: isZero ? C.textMuted : C.gold, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 11, flexShrink: 0 }}>{element}</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <span style={{ fontSize: isZero ? 13 : 17, fontWeight: 800, color: isZero ? C.textMuted : C.text }}>{isZero ? "—" : fmt(value)}</span>
          {!isZero && <span style={{ fontSize: 10, color: C.textMuted }}>kg/χωράφι</span>}
          {isZero && <span style={{ fontSize: 10, color: C.ok, fontWeight: 600 }}>Επαρκές</span>}
        </div>
        {period && <div style={{ fontSize: 10, color: C.textMuted, lineHeight: 1.3 }}>{period}</div>}
      </div>
    </div>
  );
}

function ProducerDetail({ p }) {
  const thr = THRX[p.texture] || THRX.medium;
  const texName = p.texture === "sandy" ? "Αμμώδες" : p.texture === "clay" ? "Αργιλώδες" : "Μέσης Σύστασης";
  const age = p.plantYear ? new Date().getFullYear() - p.plantYear : null;
  const isYoung = age !== null && age < 2;
  const nutrition = computeNutrition(p);
  const N_display = isYoung ? nutrition?.N_young : nutrition?.N;
  const hasYield = !!p.yield;
  const omOk = p.soil.OM != null && p.soil.OM >= thr.OM_low;

  return (
    <div>
      {/* Header */}
      <div style={{ background: C.primary, borderRadius: 14, padding: "14px 16px", marginBottom: 12 }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: C.cream }}>{p.name}</div>
        <div style={{ fontSize: 11, color: `${C.cream}88`, marginTop: 2 }}>
          {p.area}{p.plantYear ? ` · Φύτευση ${p.plantYear}` : ""}{age != null ? ` · ${age} ετών` : ""}
          {isYoung && <span style={{ color: "#FFB347", marginLeft: 6 }}>⚠ Νεαρό</span>}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
          {[
            { l: "Εκτάρια", v: `${fmt(p.ha)} ha` },
            { l: "Παραγωγή", v: p.yield ? `${fmt(p.yield)} tn/ha` : "—" },
            { l: "Τύπος Εδάφους", v: texName },
            { l: "Άμμος %", v: p.sandPct != null ? `${p.sandPct}%` : "—" },
          ].map(({ l, v }) => (
            <div key={l} style={{ flex: 1, minWidth: 60, background: `${C.gold}18`, borderRadius: 8, padding: "7px 8px", textAlign: "center" }}>
              <div style={{ fontSize: 9, color: `${C.gold}77` }}>{l}</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: C.gold }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Soil */}
      <div style={{ background: C.cream, borderRadius: 14, padding: "12px 14px", marginBottom: 10, border: `1px solid ${C.creamDark}` }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.gold, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>🪨 Ανάλυση Εδάφους (0-30cm)</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
          {[
            { l: "pH", v: p.soil.pH, c: p.soil.pH > 7.5 ? C.warn : C.ok },
            { l: `Οργ. Ουσία % (>${thr.OM_low})`, v: p.soil.OM, c: omOk ? C.ok : C.warn },
          ].map(({ l, v, c }) => (
            <div key={l} style={{ background: C.white, borderRadius: 8, padding: "8px 10px", border: `1px solid ${C.creamDark}` }}>
              <div style={{ fontSize: 9, color: C.textMuted, marginBottom: 2 }}>{l}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: c || C.text }}>{fmt(v)}</div>
            </div>
          ))}
        </div>
        <SoilBar label="P"  value={p.soil.P}  low={thr.P_low}  high={thr.P_high} />
        <SoilBar label="K"  value={p.soil.K}  low={thr.K_low}  high={thr.K_high} />
        <SoilBar label="Mg" value={p.soil.Mg} low={thr.Mg_low} high={thr.Mg_high} />
        <SoilBar label="Ca" value={p.soil.Ca} low={thr.Ca_low} high={thr.Ca_high} />
      </div>

      {/* Water */}
      <div style={{ background: C.cream, borderRadius: 14, padding: "12px 14px", marginBottom: 10, border: `1px solid ${C.creamDark}` }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.gold, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>💧 Ανάλυση Νερού (mg/L)</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 5 }}>
          {[{ l: "N-NO₃", v: p.water.N }, { l: "K", v: p.water.K }, { l: "P", v: p.water.P }, { l: "Mg", v: p.water.Mg }, { l: "Ca", v: p.water.Ca }].map(({ l, v }) => (
            <div key={l} style={{ background: C.white, borderRadius: 7, padding: "6px 4px", textAlign: "center", border: `1px solid ${C.creamDark}` }}>
              <div style={{ fontSize: 8, color: C.textMuted, marginBottom: 1 }}>{l}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{fmt(v)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Nutrition Program */}
      <div style={{ background: C.primary, borderRadius: 14, padding: "12px 14px", marginBottom: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.gold, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
          📋 Πρόγραμμα Θρέψης (kg/χωράφι)
          {isYoung && <span style={{ marginLeft: 8, fontSize: 9, background: "rgba(255,179,71,0.2)", color: "#FFB347", padding: "2px 6px", borderRadius: 6 }}>Δόση νεαρού &lt;2 ετών</span>}
        </div>
        <NRow element="N" value={N_display} period={isYoung ? "Βάση 80 kg N/ha για νεαρά δένδρα" : "Στάνταρντ 120 kg N/ha · 40% βραδείας έκπτυξη · εβδ. ανθοφορία → Ιούνιο"} />
        {hasYield ? <>
          <NRow element="K"  value={nutrition?.K}  period="2-3 εβδομαδιαίες: αρχές Ιουλίου →" />
          <NRow element="Ca" value={nutrition?.Ca} period="7-8 εβδ: ανθοφορία → +50 ημέρες" />
          <NRow element="Mg" value={nutrition?.Mg} period="2-3 εφαρμογές: 15 Ιουνίου → 1 Ιουλίου" />
          <NRow element="P"  value={nutrition?.P}  period="1-2 εφαρμογές: έκπτυξη → ανθοφορία" />
        </> : <div style={{ color: `${C.gold}44`, fontSize: 11, textAlign: "center", padding: "4px 0" }}>Δεν υπάρχει εκτίμηση παραγωγής (P/K/Mg/Ca)</div>}
      </div>

    </div>
  );
}

export default function FieldApp() {
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selected, setSelected] = useState([]);

  const areas = useMemo(() => [...new Set(PRODUCERS_INIT.map(p => p.area).filter(Boolean))].sort(), []);
  const filtered = useMemo(() => {
    if (!search) return PRODUCERS_INIT;
    const q = search.toLowerCase();
    return PRODUCERS_INIT.filter(p => p.name.toLowerCase().includes(q) || (p.area || "").toLowerCase().includes(q));
  }, [search]);

  function toggleSelect(p) { setSelected(prev => prev.find(x => x.id === p.id) ? prev.filter(x => x.id !== p.id) : [...prev, p]); }
  function isSel(p) { return !!selected.find(x => x.id === p.id); }

  return (
    <div style={{ minHeight: "100vh", background: C.primary, fontFamily: "'Inter',-apple-system,sans-serif" }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg,${C.primary},${C.mid})`, padding: "20px 16px 14px", borderBottom: `2px solid ${C.gold}22` }}>
        <div style={{ maxWidth: 520, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <ArtaGoldLogo height={34} dark={true} />
          <div style={{ fontSize: 11, color: `${C.gold}77` }}>{PRODUCERS_INIT.length} παραγωγοί</div>
        </div>
      </div>

      {/* Body */}
      <div style={{ background: C.cream, borderRadius: "20px 20px 0 0", minHeight: "calc(100vh - 90px)", padding: "16px" }}>
        <div style={{ maxWidth: 520, margin: "0 auto" }}>

          {/* Dropdown */}
          <div style={{ position: "relative", marginBottom: 12 }}>
            <div onClick={() => setShowDropdown(v => !v)}
              style={{ padding: "11px 14px", borderRadius: 10, border: `1.5px solid ${showDropdown ? C.gold : C.creamDark}`, background: C.white, fontSize: 13, color: selected.length ? C.text : C.textMuted, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>{selected.length === 0 ? "Επιλέξτε παραγωγό(ύς)..." : selected.map(p => p.name.split(" ").slice(-1)[0]).join(", ")}</span>
              <span style={{ color: C.gold, fontWeight: 700, fontSize: 11 }}>{showDropdown ? "▲" : "▼"}</span>
            </div>

            {showDropdown && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: C.white, borderRadius: 10, border: `1.5px solid ${C.gold}`, boxShadow: "0 8px 24px rgba(0,0,0,0.14)", zIndex: 100, maxHeight: 340, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                <div style={{ padding: "8px 10px", borderBottom: `1px solid ${C.creamDark}` }}>
                  <input autoFocus type="text" placeholder="🔍 Αναζήτηση..." value={search}
                    onChange={e => setSearch(e.target.value)} onClick={e => e.stopPropagation()}
                    style={{ width: "100%", padding: "7px 10px", borderRadius: 7, border: `1px solid ${C.creamDark}`, fontSize: 13, color: C.text, background: C.cream, outline: "none", boxSizing: "border-box" }}
                  />
                </div>
                <div style={{ overflowY: "auto", flex: 1 }}>
                  {areas.map(area => {
                    const ap = filtered.filter(p => p.area === area);
                    if (!ap.length) return null;
                    return (
                      <div key={area}>
                        <div style={{ padding: "5px 12px 2px", fontSize: 9, fontWeight: 700, color: C.textMuted, letterSpacing: "0.1em", textTransform: "uppercase", background: C.creamDark }}>{area}</div>
                        {ap.map(p => {
                          const n = computeNutrition(p);
                          const age = p.plantYear ? new Date().getFullYear() - p.plantYear : null;
                          const isYoung = age !== null && age < 2;
                          const N_disp = isYoung ? n?.N_young : n?.N;
                          return (
                            <div key={p.id} onClick={() => toggleSelect(p)}
                              style={{ padding: "9px 14px", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, background: isSel(p) ? `${C.gold}12` : C.white, borderLeft: `3px solid ${isSel(p) ? C.gold : "transparent"}` }}>
                              <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${isSel(p) ? C.gold : C.creamDark}`, background: isSel(p) ? C.gold : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                {isSel(p) && <span style={{ fontSize: 9, color: C.primary, fontWeight: 900 }}>✓</span>}
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: isSel(p) ? 700 : 400, color: C.text }}>{p.name}</div>
                                <div style={{ fontSize: 10, color: C.textMuted }}>{fmt(p.ha)} ha{p.yield ? ` · ${fmt(p.yield)} tn/ha` : ""}</div>
                              </div>
                              {N_disp != null && <div style={{ fontSize: 10, background: `${C.gold}22`, color: C.primary, padding: "2px 6px", borderRadius: 8, fontWeight: 700, flexShrink: 0 }}>N={fmt(N_disp)}</div>}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                  {!filtered.length && <div style={{ padding: "20px", textAlign: "center", color: C.textMuted, fontSize: 13 }}>Δεν βρέθηκαν</div>}
                </div>
                <div style={{ padding: "8px 10px", borderTop: `1px solid ${C.creamDark}`, display: "flex", gap: 8 }}>
                  <button onClick={() => { setSelected([]); setShowDropdown(false); setSearch(""); }}
                    style={{ flex: 1, padding: "7px", borderRadius: 7, border: `1px solid ${C.creamDark}`, background: C.white, fontSize: 12, cursor: "pointer", color: C.textMuted }}>Καθαρισμός</button>
                  <button onClick={() => setShowDropdown(false)}
                    style={{ flex: 1, padding: "7px", borderRadius: 7, border: "none", background: C.primary, fontSize: 12, cursor: "pointer", color: C.gold, fontWeight: 700 }}>Εφαρμογή ({selected.length})</button>
                </div>
              </div>
            )}
          </div>

          {selected.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: C.textMuted }}>
              <div style={{ marginBottom: 16 }}><ArtaGoldLogo height={48} dark={false} /></div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Επιλέξτε παραγωγό</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Ανοίξτε τη λίστα για να επιλέξετε έναν ή περισσότερους</div>
            </div>
          ) : (
            selected.map((p, idx) => (
              <div key={p.id}>
                <ProducerDetail p={p} />
                {idx < selected.length - 1 && <hr style={{ border: "none", borderTop: `1px solid ${C.creamDark}`, margin: "16px 0" }} />}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

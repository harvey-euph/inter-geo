// Auto-generated worldwide L3 Admin-2 regional partition manifest
export interface L3PartitionMeta {
  key: string;
  iso2: string;
  parentName: string;
  parentCode: string;
  file: string;
  subdivisionCount: number;
  bbox: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
}

export interface L3CountryMeta {
  iso2: string;
  countryId: string;
  name: string;
  nameZh: string;
  unitNameZh: string;
  subdivisionCount: number;
  bbox: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  partitions: L3PartitionMeta[];
}

export const L3_MANIFEST: L3CountryMeta[] = [
  {
    "iso2": "AR",
    "countryId": "032",
    "name": "Argentina",
    "nameZh": "阿根廷",
    "unitNameZh": "省轄區 (Departamento)",
    "subdivisionCount": 502,
    "bbox": {
      "minX": 296,
      "maxX": 351,
      "minY": 562,
      "maxY": 684
    },
    "partitions": [
      {
        "key": "AR-C",
        "iso2": "AR",
        "parentName": "Ciudad de Buenos Aires",
        "parentCode": "AR-C",
        "file": "/data/l3/AR/AR-C.fgb",
        "subdivisionCount": 129,
        "bbox": {
          "minX": 324,
          "maxX": 343,
          "minY": 598,
          "maxY": 625
        }
      },
      {
        "key": "AR-K",
        "iso2": "AR",
        "parentName": "Catamarca",
        "parentCode": "AR-K",
        "file": "/data/l3/AR/AR-K.fgb",
        "subdivisionCount": 16,
        "bbox": {
          "minX": 308,
          "maxX": 320,
          "minY": 572,
          "maxY": 588
        }
      },
      {
        "key": "AR-H",
        "iso2": "AR",
        "parentName": "Chaco",
        "parentCode": "AR-H",
        "file": "/data/l3/AR/AR-H.fgb",
        "subdivisionCount": 24,
        "bbox": {
          "minX": 324,
          "maxX": 338,
          "minY": 569,
          "maxY": 581
        }
      },
      {
        "key": "AR-U",
        "iso2": "AR",
        "parentName": "Chubut",
        "parentCode": "AR-U",
        "file": "/data/l3/AR/AR-U.fgb",
        "subdivisionCount": 15,
        "bbox": {
          "minX": 299,
          "maxX": 323,
          "minY": 629,
          "maxY": 644
        }
      },
      {
        "key": "AR-X",
        "iso2": "AR",
        "parentName": "Córdoba",
        "parentCode": "AR-X",
        "file": "/data/l3/AR/AR-X.fgb",
        "subdivisionCount": 26,
        "bbox": {
          "minX": 317,
          "maxX": 328,
          "minY": 586,
          "maxY": 604
        }
      },
      {
        "key": "AR-W",
        "iso2": "AR",
        "parentName": "Corrientes",
        "parentCode": "AR-W",
        "file": "/data/l3/AR/AR-W.fgb",
        "subdivisionCount": 25,
        "bbox": {
          "minX": 334,
          "maxX": 346,
          "minY": 579,
          "maxY": 590
        }
      },
      {
        "key": "AR-E",
        "iso2": "AR",
        "parentName": "Entre Ríos",
        "parentCode": "AR-E",
        "file": "/data/l3/AR/AR-E.fgb",
        "subdivisionCount": 16,
        "bbox": {
          "minX": 331,
          "maxX": 339,
          "minY": 588,
          "maxY": 601
        }
      },
      {
        "key": "AR-P",
        "iso2": "AR",
        "parentName": "Formosa",
        "parentCode": "AR-P",
        "file": "/data/l3/AR/AR-P.fgb",
        "subdivisionCount": 9,
        "bbox": {
          "minX": 327,
          "maxX": 340,
          "minY": 564,
          "maxY": 578
        }
      },
      {
        "key": "AR-Y",
        "iso2": "AR",
        "parentName": "Jujuy",
        "parentCode": "AR-Y",
        "file": "/data/l3/AR/AR-Y.fgb",
        "subdivisionCount": 16,
        "bbox": {
          "minX": 313,
          "maxX": 322,
          "minY": 562,
          "maxY": 571
        }
      },
      {
        "key": "AR-L",
        "iso2": "AR",
        "parentName": "La Pampa",
        "parentCode": "AR-L",
        "file": "/data/l3/AR/AR-L.fgb",
        "subdivisionCount": 22,
        "bbox": {
          "minX": 310,
          "maxX": 324,
          "minY": 604,
          "maxY": 619
        }
      },
      {
        "key": "AR-F",
        "iso2": "AR",
        "parentName": "La Rioja",
        "parentCode": "AR-F",
        "file": "/data/l3/AR/AR-F.fgb",
        "subdivisionCount": 18,
        "bbox": {
          "minX": 307,
          "maxX": 318,
          "minY": 580,
          "maxY": 594
        }
      },
      {
        "key": "AR-M",
        "iso2": "AR",
        "parentName": "Mendoza",
        "parentCode": "AR-M",
        "file": "/data/l3/AR/AR-M.fgb",
        "subdivisionCount": 18,
        "bbox": {
          "minX": 304,
          "maxX": 315,
          "minY": 594,
          "maxY": 613
        }
      },
      {
        "key": "AR-N",
        "iso2": "AR",
        "parentName": "Misiones",
        "parentCode": "AR-N",
        "file": "/data/l3/AR/AR-N.fgb",
        "subdivisionCount": 17,
        "bbox": {
          "minX": 344,
          "maxX": 351,
          "minY": 573,
          "maxY": 582
        }
      },
      {
        "key": "AR-Q",
        "iso2": "AR",
        "parentName": "Neuquén",
        "parentCode": "AR-Q",
        "file": "/data/l3/AR/AR-Q.fgb",
        "subdivisionCount": 16,
        "bbox": {
          "minX": 300,
          "maxX": 311,
          "minY": 608,
          "maxY": 625
        }
      },
      {
        "key": "AR-R",
        "iso2": "AR",
        "parentName": "Río Negro",
        "parentCode": "AR-R",
        "file": "/data/l3/AR/AR-R.fgb",
        "subdivisionCount": 13,
        "bbox": {
          "minX": 300,
          "maxX": 326,
          "minY": 613,
          "maxY": 629
        }
      },
      {
        "key": "AR-A",
        "iso2": "AR",
        "parentName": "Salta",
        "parentCode": "AR-A",
        "file": "/data/l3/AR/AR-A.fgb",
        "subdivisionCount": 23,
        "bbox": {
          "minX": 310,
          "maxX": 327,
          "minY": 563,
          "maxY": 576
        }
      },
      {
        "key": "AR-J",
        "iso2": "AR",
        "parentName": "San Juan",
        "parentCode": "AR-J",
        "file": "/data/l3/AR/AR-J.fgb",
        "subdivisionCount": 18,
        "bbox": {
          "minX": 304,
          "maxX": 315,
          "minY": 582,
          "maxY": 596
        }
      },
      {
        "key": "AR-D",
        "iso2": "AR",
        "parentName": "San Luis",
        "parentCode": "AR-D",
        "file": "/data/l3/AR/AR-D.fgb",
        "subdivisionCount": 9,
        "bbox": {
          "minX": 313,
          "maxX": 320,
          "minY": 593,
          "maxY": 607
        }
      },
      {
        "key": "AR-Z",
        "iso2": "AR",
        "parentName": "Santa Cruz",
        "parentCode": "AR-Z",
        "file": "/data/l3/AR/AR-Z.fgb",
        "subdivisionCount": 7,
        "bbox": {
          "minX": 296,
          "maxX": 317,
          "minY": 644,
          "maxY": 671
        }
      },
      {
        "key": "AR-S",
        "iso2": "AR",
        "parentName": "Santa Fe",
        "parentCode": "AR-S",
        "file": "/data/l3/AR/AR-S.fgb",
        "subdivisionCount": 19,
        "bbox": {
          "minX": 325,
          "maxX": 336,
          "minY": 581,
          "maxY": 602
        }
      },
      {
        "key": "AR-G",
        "iso2": "AR",
        "parentName": "Santiago del Estero",
        "parentCode": "AR-G",
        "file": "/data/l3/AR/AR-G.fgb",
        "subdivisionCount": 27,
        "bbox": {
          "minX": 319,
          "maxX": 329,
          "minY": 574,
          "maxY": 589
        }
      },
      {
        "key": "AR-V",
        "iso2": "AR",
        "parentName": "Tierra del Fuego",
        "parentCode": "AR-V",
        "file": "/data/l3/AR/AR-V.fgb",
        "subdivisionCount": 2,
        "bbox": {
          "minX": 309,
          "maxX": 323,
          "minY": 672,
          "maxY": 684
        }
      },
      {
        "key": "AR-T",
        "iso2": "AR",
        "parentName": "Tucumán",
        "parentCode": "AR-T",
        "file": "/data/l3/AR/AR-T.fgb",
        "subdivisionCount": 17,
        "bbox": {
          "minX": 316,
          "maxX": 321,
          "minY": 575,
          "maxY": 581
        }
      }
    ]
  },
  {
    "iso2": "AU",
    "countryId": "036",
    "name": "Australia",
    "nameZh": "澳洲",
    "unitNameZh": "地方政府區 (LGA)",
    "subdivisionCount": 568,
    "bbox": {
      "minX": 814,
      "maxX": 942,
      "minY": 526,
      "maxY": 684
    },
    "partitions": [
      {
        "key": "AU-X04~",
        "iso2": "AU",
        "parentName": "Ashmore and Cartier Islands",
        "parentCode": "AU-X04~",
        "file": "/data/l3/AU/AU-X04_.fgb",
        "subdivisionCount": 1,
        "bbox": {
          "minX": 842,
          "maxX": 843,
          "minY": 534,
          "maxY": 535
        }
      },
      {
        "key": "AU-ACT",
        "iso2": "AU",
        "parentName": "Australian Capital Territory",
        "parentCode": "AU-ACT",
        "file": "/data/l3/AU/AU-ACT.fgb",
        "subdivisionCount": 1,
        "bbox": {
          "minX": 913,
          "maxX": 915,
          "minY": 604,
          "maxY": 607
        }
      },
      {
        "key": "AU-QLD",
        "iso2": "AU",
        "parentName": "CoralSeaIslandsTerritory",
        "parentCode": "AU-QLD",
        "file": "/data/l3/AU/AU-QLD.fgb",
        "subdivisionCount": 74,
        "bbox": {
          "minX": 883,
          "maxX": 932,
          "minY": 526,
          "maxY": 585
        }
      },
      {
        "key": "AU-X02~",
        "iso2": "AU",
        "parentName": "Jervis Bay Territory",
        "parentCode": "AU-X02~",
        "file": "/data/l3/AU/AU-X02_.fgb",
        "subdivisionCount": 1,
        "bbox": {
          "minX": 918,
          "maxX": 919,
          "minY": 604,
          "maxY": 605
        }
      },
      {
        "key": "AU-NSW",
        "iso2": "AU",
        "parentName": "New South Wales",
        "parentCode": "AU-NSW",
        "file": "/data/l3/AU/AU-NSW.fgb",
        "subdivisionCount": 153,
        "bbox": {
          "minX": 892,
          "maxX": 942,
          "minY": 582,
          "maxY": 613
        }
      },
      {
        "key": "AU-NT",
        "iso2": "AU",
        "parentName": "Northern Territory",
        "parentCode": "AU-NT",
        "file": "/data/l3/AU/AU-NT.fgb",
        "subdivisionCount": 17,
        "bbox": {
          "minX": 858,
          "maxX": 883,
          "minY": 531,
          "maxY": 575
        }
      },
      {
        "key": "AU-SA",
        "iso2": "AU",
        "parentName": "South Australia",
        "parentCode": "AU-SA",
        "file": "/data/l3/AU/AU-SA.fgb",
        "subdivisionCount": 71,
        "bbox": {
          "minX": 858,
          "maxX": 892,
          "minY": 575,
          "maxY": 614
        }
      },
      {
        "key": "AU-TAS",
        "iso2": "AU",
        "parentName": "Tasmania",
        "parentCode": "AU-TAS",
        "file": "/data/l3/AU/AU-TAS.fgb",
        "subdivisionCount": 30,
        "bbox": {
          "minX": 899,
          "maxX": 942,
          "minY": 619,
          "maxY": 684
        }
      },
      {
        "key": "AU-VIC",
        "iso2": "AU",
        "parentName": "Victoria",
        "parentCode": "AU-VIC",
        "file": "/data/l3/AU/AU-VIC.fgb",
        "subdivisionCount": 80,
        "bbox": {
          "minX": 892,
          "maxX": 917,
          "minY": 600,
          "maxY": 618
        }
      },
      {
        "key": "AU-WA",
        "iso2": "AU",
        "parentName": "Western Australia",
        "parentCode": "AU-WA",
        "file": "/data/l3/AU/AU-WA.fgb",
        "subdivisionCount": 140,
        "bbox": {
          "minX": 814,
          "maxX": 858,
          "minY": 538,
          "maxY": 604
        }
      }
    ]
  },
  {
    "iso2": "BR",
    "countryId": "076",
    "name": "Brazil",
    "nameZh": "巴西",
    "unitNameZh": "市鎮 (Município)",
    "subdivisionCount": 5572,
    "bbox": {
      "minX": 294,
      "maxX": 420,
      "minY": 485,
      "maxY": 600
    },
    "partitions": [
      {
        "key": "BR-AC",
        "iso2": "BR",
        "parentName": "Acre",
        "parentCode": "BR-AC",
        "file": "/data/l3/BR/BR-AC.fgb",
        "subdivisionCount": 22,
        "bbox": {
          "minX": 294,
          "maxX": 315,
          "minY": 520,
          "maxY": 531
        }
      },
      {
        "key": "BR-AL",
        "iso2": "BR",
        "parentName": "Alagoas",
        "parentCode": "BR-AL",
        "file": "/data/l3/BR/BR-AL.fgb",
        "subdivisionCount": 102,
        "bbox": {
          "minX": 394,
          "maxX": 402,
          "minY": 525,
          "maxY": 529
        }
      },
      {
        "key": "BR-AP",
        "iso2": "BR",
        "parentName": "Amapá",
        "parentCode": "BR-AP",
        "file": "/data/l3/BR/BR-AP.fgb",
        "subdivisionCount": 16,
        "bbox": {
          "minX": 348,
          "maxX": 361,
          "minY": 488,
          "maxY": 503
        }
      },
      {
        "key": "BR-AM",
        "iso2": "BR",
        "parentName": "Amazonas",
        "parentCode": "BR-AM",
        "file": "/data/l3/BR/BR-AM.fgb",
        "subdivisionCount": 62,
        "bbox": {
          "minX": 295,
          "maxX": 344,
          "minY": 494,
          "maxY": 527
        }
      },
      {
        "key": "BR-BA",
        "iso2": "BR",
        "parentName": "Bahia",
        "parentCode": "BR-BA",
        "file": "/data/l3/BR/BR-BA.fgb",
        "subdivisionCount": 417,
        "bbox": {
          "minX": 371,
          "maxX": 396,
          "minY": 524,
          "maxY": 552
        }
      },
      {
        "key": "BR-CE",
        "iso2": "BR",
        "parentName": "Ceará",
        "parentCode": "BR-CE",
        "file": "/data/l3/BR/BR-CE.fgb",
        "subdivisionCount": 184,
        "bbox": {
          "minX": 385,
          "maxX": 397,
          "minY": 508,
          "maxY": 522
        }
      },
      {
        "key": "BR-DF",
        "iso2": "BR",
        "parentName": "Distrito Federal",
        "parentCode": "BR-DF",
        "file": "/data/l3/BR/BR-DF.fgb",
        "subdivisionCount": 1,
        "bbox": {
          "minX": 366,
          "maxX": 369,
          "minY": 544,
          "maxY": 545
        }
      },
      {
        "key": "BR-ES",
        "iso2": "BR",
        "parentName": "Espírito Santo",
        "parentCode": "BR-ES",
        "file": "/data/l3/BR/BR-ES.fgb",
        "subdivisionCount": 78,
        "bbox": {
          "minX": 384,
          "maxX": 420,
          "minY": 551,
          "maxY": 561
        }
      },
      {
        "key": "BR-GO",
        "iso2": "BR",
        "parentName": "Goiás",
        "parentCode": "BR-GO",
        "file": "/data/l3/BR/BR-GO.fgb",
        "subdivisionCount": 246,
        "bbox": {
          "minX": 352,
          "maxX": 372,
          "minY": 535,
          "maxY": 555
        }
      },
      {
        "key": "BR-MA",
        "iso2": "BR",
        "parentName": "Maranhão",
        "parentCode": "BR-MA",
        "file": "/data/l3/BR/BR-MA.fgb",
        "subdivisionCount": 217,
        "bbox": {
          "minX": 365,
          "maxX": 384,
          "minY": 503,
          "maxY": 529
        }
      },
      {
        "key": "BR-MT",
        "iso2": "BR",
        "parentName": "Mato Grosso",
        "parentCode": "BR-MT",
        "file": "/data/l3/BR/BR-MT.fgb",
        "subdivisionCount": 141,
        "bbox": {
          "minX": 329,
          "maxX": 360,
          "minY": 520,
          "maxY": 551
        }
      },
      {
        "key": "BR-MS",
        "iso2": "BR",
        "parentName": "Mato Grosso do Sul",
        "parentCode": "BR-MS",
        "file": "/data/l3/BR/BR-MS.fgb",
        "subdivisionCount": 79,
        "bbox": {
          "minX": 338,
          "maxX": 359,
          "minY": 548,
          "maxY": 569
        }
      },
      {
        "key": "BR-MG",
        "iso2": "BR",
        "parentName": "Minas Gerais",
        "parentCode": "BR-MG",
        "file": "/data/l3/BR/BR-MG.fgb",
        "subdivisionCount": 853,
        "bbox": {
          "minX": 358,
          "maxX": 389,
          "minY": 540,
          "maxY": 565
        }
      },
      {
        "key": "BR-PA",
        "iso2": "BR",
        "parentName": "Pará",
        "parentCode": "BR-PA",
        "file": "/data/l3/BR/BR-PA.fgb",
        "subdivisionCount": 144,
        "bbox": {
          "minX": 336,
          "maxX": 372,
          "minY": 493,
          "maxY": 527
        }
      },
      {
        "key": "BR-PB",
        "iso2": "BR",
        "parentName": "Paraíba",
        "parentCode": "BR-PB",
        "file": "/data/l3/BR/BR-PB.fgb",
        "subdivisionCount": 223,
        "bbox": {
          "minX": 392,
          "maxX": 403,
          "minY": 517,
          "maxY": 523
        }
      },
      {
        "key": "BR-PR",
        "iso2": "BR",
        "parentName": "Paraná",
        "parentCode": "BR-PR",
        "file": "/data/l3/BR/BR-PR.fgb",
        "subdivisionCount": 399,
        "bbox": {
          "minX": 348,
          "maxX": 367,
          "minY": 564,
          "maxY": 577
        }
      },
      {
        "key": "BR-PE",
        "iso2": "BR",
        "parentName": "Pernambuco",
        "parentCode": "BR-PE",
        "file": "/data/l3/BR/BR-PE.fgb",
        "subdivisionCount": 185,
        "bbox": {
          "minX": 385,
          "maxX": 410,
          "minY": 511,
          "maxY": 526
        }
      },
      {
        "key": "BR-PI",
        "iso2": "BR",
        "parentName": "Piauí",
        "parentCode": "BR-PI",
        "file": "/data/l3/BR/BR-PI.fgb",
        "subdivisionCount": 224,
        "bbox": {
          "minX": 372,
          "maxX": 388,
          "minY": 508,
          "maxY": 531
        }
      },
      {
        "key": "BR-RJ",
        "iso2": "BR",
        "parentName": "Rio de Janeiro",
        "parentCode": "BR-RJ",
        "file": "/data/l3/BR/BR-RJ.fgb",
        "subdivisionCount": 92,
        "bbox": {
          "minX": 375,
          "maxX": 386,
          "minY": 559,
          "maxY": 567
        }
      },
      {
        "key": "BR-RN",
        "iso2": "BR",
        "parentName": "Rio Grande do Norte",
        "parentCode": "BR-RN",
        "file": "/data/l3/BR/BR-RN.fgb",
        "subdivisionCount": 167,
        "bbox": {
          "minX": 393,
          "maxX": 403,
          "minY": 513,
          "maxY": 519
        }
      },
      {
        "key": "BR-RS",
        "iso2": "BR",
        "parentName": "Rio Grande do Sul",
        "parentCode": "BR-RS",
        "file": "/data/l3/BR/BR-RS.fgb",
        "subdivisionCount": 499,
        "bbox": {
          "minX": 340,
          "maxX": 362,
          "minY": 578,
          "maxY": 600
        }
      },
      {
        "key": "BR-RO",
        "iso2": "BR",
        "parentName": "Rondônia",
        "parentCode": "BR-RO",
        "file": "/data/l3/BR/BR-RO.fgb",
        "subdivisionCount": 52,
        "bbox": {
          "minX": 314,
          "maxX": 334,
          "minY": 522,
          "maxY": 538
        }
      },
      {
        "key": "BR-RR",
        "iso2": "BR",
        "parentName": "Roraima",
        "parentCode": "BR-RR",
        "file": "/data/l3/BR/BR-RR.fgb",
        "subdivisionCount": 15,
        "bbox": {
          "minX": 320,
          "maxX": 336,
          "minY": 485,
          "maxY": 504
        }
      },
      {
        "key": "BR-SC",
        "iso2": "BR",
        "parentName": "Santa Catarina",
        "parentCode": "BR-SC",
        "file": "/data/l3/BR/BR-SC.fgb",
        "subdivisionCount": 295,
        "bbox": {
          "minX": 350,
          "maxX": 366,
          "minY": 575,
          "maxY": 585
        }
      },
      {
        "key": "BR-SP",
        "iso2": "BR",
        "parentName": "São Paulo",
        "parentCode": "BR-SP",
        "file": "/data/l3/BR/BR-SP.fgb",
        "subdivisionCount": 645,
        "bbox": {
          "minX": 352,
          "maxX": 377,
          "minY": 556,
          "maxY": 573
        }
      },
      {
        "key": "BR-SE",
        "iso2": "BR",
        "parentName": "Sergipe",
        "parentCode": "BR-SE",
        "file": "/data/l3/BR/BR-SE.fgb",
        "subdivisionCount": 75,
        "bbox": {
          "minX": 394,
          "maxX": 399,
          "minY": 527,
          "maxY": 532
        }
      },
      {
        "key": "BR-TO",
        "iso2": "BR",
        "parentName": "Tocantins",
        "parentCode": "BR-TO",
        "file": "/data/l3/BR/BR-TO.fgb",
        "subdivisionCount": 139,
        "bbox": {
          "minX": 359,
          "maxX": 373,
          "minY": 514,
          "maxY": 538
        }
      }
    ]
  },
  {
    "iso2": "CA",
    "countryId": "124",
    "name": "Canada",
    "nameZh": "加拿大",
    "unitNameZh": "普查區/郡 (Census Division)",
    "subdivisionCount": 293,
    "bbox": {
      "minX": 108,
      "maxX": 354,
      "minY": 53,
      "maxY": 372
    },
    "partitions": [
      {
        "key": "CA-AB",
        "iso2": "CA",
        "parentName": "Alberta",
        "parentCode": "CA-AB",
        "file": "/data/l3/CA/CA-AB.fgb",
        "subdivisionCount": 19,
        "bbox": {
          "minX": 167,
          "maxX": 194,
          "minY": 290,
          "maxY": 343
        }
      },
      {
        "key": "CA-BC",
        "iso2": "CA",
        "parentName": "British Columbia",
        "parentCode": "CA-BC",
        "file": "/data/l3/CA/CA-BC.fgb",
        "subdivisionCount": 28,
        "bbox": {
          "minX": 114,
          "maxX": 183,
          "minY": 290,
          "maxY": 346
        }
      },
      {
        "key": "CA-MB",
        "iso2": "CA",
        "parentName": "Manitoba",
        "parentCode": "CA-MB",
        "file": "/data/l3/CA/CA-MB.fgb",
        "subdivisionCount": 23,
        "bbox": {
          "minX": 217,
          "maxX": 253,
          "minY": 290,
          "maxY": 343
        }
      },
      {
        "key": "CA-NB",
        "iso2": "CA",
        "parentName": "New Brunswick",
        "parentCode": "CA-NB",
        "file": "/data/l3/CA/CA-NB.fgb",
        "subdivisionCount": 15,
        "bbox": {
          "minX": 308,
          "maxX": 323,
          "minY": 347,
          "maxY": 362
        }
      },
      {
        "key": "CA-NL",
        "iso2": "CA",
        "parentName": "Newfoundland and Labrador",
        "parentCode": "CA-NL",
        "file": "/data/l3/CA/CA-NL.fgb",
        "subdivisionCount": 11,
        "bbox": {
          "minX": 312,
          "maxX": 354,
          "minY": 276,
          "maxY": 353
        }
      },
      {
        "key": "CA-NT",
        "iso2": "CA",
        "parentName": "Northwest Territories",
        "parentCode": "CA-NT",
        "file": "/data/l3/CA/CA-NT.fgb",
        "subdivisionCount": 2,
        "bbox": {
          "minX": 121,
          "maxX": 217,
          "minY": 131,
          "maxY": 290
        }
      },
      {
        "key": "CA-NS",
        "iso2": "CA",
        "parentName": "Nova Scotia",
        "parentCode": "CA-NS",
        "file": "/data/l3/CA/CA-NS.fgb",
        "subdivisionCount": 18,
        "bbox": {
          "minX": 316,
          "maxX": 334,
          "minY": 351,
          "maxY": 366
        }
      },
      {
        "key": "CA-NU",
        "iso2": "CA",
        "parentName": "Nunavut",
        "parentCode": "CA-NU",
        "file": "/data/l3/CA/CA-NU.fgb",
        "subdivisionCount": 3,
        "bbox": {
          "minX": 164,
          "maxX": 330,
          "minY": 53,
          "maxY": 309
        }
      },
      {
        "key": "CA-ON",
        "iso2": "CA",
        "parentName": "Ontario",
        "parentCode": "CA-ON",
        "file": "/data/l3/CA/CA-ON.fgb",
        "subdivisionCount": 53,
        "bbox": {
          "minX": 236,
          "maxX": 293,
          "minY": 307,
          "maxY": 372
        }
      },
      {
        "key": "CA-PE",
        "iso2": "CA",
        "parentName": "Prince Edward Island",
        "parentCode": "CA-PE",
        "file": "/data/l3/CA/CA-PE.fgb",
        "subdivisionCount": 3,
        "bbox": {
          "minX": 321,
          "maxX": 328,
          "minY": 351,
          "maxY": 356
        }
      },
      {
        "key": "CA-QC",
        "iso2": "CA",
        "parentName": "Québec",
        "parentCode": "CA-QC",
        "file": "/data/l3/CA/CA-QC.fgb",
        "subdivisionCount": 99,
        "bbox": {
          "minX": 275,
          "maxX": 341,
          "minY": 269,
          "maxY": 360
        }
      },
      {
        "key": "CA-SK",
        "iso2": "CA",
        "parentName": "Saskatchewan",
        "parentCode": "CA-SK",
        "file": "/data/l3/CA/CA-SK.fgb",
        "subdivisionCount": 18,
        "bbox": {
          "minX": 194,
          "maxX": 218,
          "minY": 290,
          "maxY": 343
        }
      },
      {
        "key": "CA-YT",
        "iso2": "CA",
        "parentName": "Yukon",
        "parentCode": "CA-YT",
        "file": "/data/l3/CA/CA-YT.fgb",
        "subdivisionCount": 1,
        "bbox": {
          "minX": 108,
          "maxX": 156,
          "minY": 215,
          "maxY": 290
        }
      }
    ]
  },
  {
    "iso2": "FR",
    "countryId": "250",
    "name": "France",
    "nameZh": "法國",
    "unitNameZh": "省 (Département)",
    "subdivisionCount": 101,
    "bbox": {
      "minX": 323,
      "maxX": 660,
      "minY": 329,
      "maxY": 566
    },
    "partitions": [
      {
        "key": "FR-ARA",
        "iso2": "FR",
        "parentName": "奧弗涅-隆-阿爾卑斯大區",
        "parentCode": "FR-ARA",
        "file": "/data/l3/FR/FR-ARA.fgb",
        "subdivisionCount": 12,
        "bbox": {
          "minX": 501,
          "maxX": 525,
          "minY": 348,
          "maxY": 368
        }
      },
      {
        "key": "FR-BFC",
        "iso2": "FR",
        "parentName": "勃艮第-法蘭琪-康堤大區",
        "parentCode": "FR-BFC",
        "file": "/data/l3/FR/FR-BFC.fgb",
        "subdivisionCount": 8,
        "bbox": {
          "minX": 503,
          "maxX": 525,
          "minY": 341,
          "maxY": 360
        }
      },
      {
        "key": "FR-BRE",
        "iso2": "FR",
        "parentName": "布列塔尼大區",
        "parentCode": "FR-BRE",
        "file": "/data/l3/FR/FR-BRE.fgb",
        "subdivisionCount": 4,
        "bbox": {
          "minX": 481,
          "maxX": 502,
          "minY": 339,
          "maxY": 356
        }
      },
      {
        "key": "FR-COR",
        "iso2": "FR",
        "parentName": "科西嘉大區",
        "parentCode": "FR-COR",
        "file": "/data/l3/FR/FR-COR.fgb",
        "subdivisionCount": 2,
        "bbox": {
          "minX": 519,
          "maxX": 532,
          "minY": 362,
          "maxY": 379
        }
      },
      {
        "key": "FR-CVL",
        "iso2": "FR",
        "parentName": "中央-羅亞爾河谷大區",
        "parentCode": "FR-CVL",
        "file": "/data/l3/FR/FR-CVL.fgb",
        "subdivisionCount": 6,
        "bbox": {
          "minX": 495,
          "maxX": 514,
          "minY": 339,
          "maxY": 359
        }
      },
      {
        "key": "FR-GES",
        "iso2": "FR",
        "parentName": "大東部大區",
        "parentCode": "FR-GES",
        "file": "/data/l3/FR/FR-GES.fgb",
        "subdivisionCount": 10,
        "bbox": {
          "minX": 504,
          "maxX": 528,
          "minY": 333,
          "maxY": 355
        }
      },
      {
        "key": "FR-GUA",
        "iso2": "FR",
        "parentName": "瓜地洛普大區",
        "parentCode": "FR-GUA",
        "file": "/data/l3/FR/FR-GUA.fgb",
        "subdivisionCount": 1,
        "bbox": {
          "minX": 323,
          "maxX": 336,
          "minY": 448,
          "maxY": 460
        }
      },
      {
        "key": "FR-GUF",
        "iso2": "FR",
        "parentName": "法屬圭亞那大區",
        "parentCode": "FR-GUF",
        "file": "/data/l3/FR/FR-GUF.fgb",
        "subdivisionCount": 1,
        "bbox": {
          "minX": 343,
          "maxX": 362,
          "minY": 479,
          "maxY": 499
        }
      },
      {
        "key": "FR-HDF",
        "iso2": "FR",
        "parentName": "上法蘭西大區",
        "parentCode": "FR-HDF",
        "file": "/data/l3/FR/FR-HDF.fgb",
        "subdivisionCount": 5,
        "bbox": {
          "minX": 499,
          "maxX": 517,
          "minY": 329,
          "maxY": 349
        }
      },
      {
        "key": "FR-IDF",
        "iso2": "FR",
        "parentName": "法蘭西島大區",
        "parentCode": "FR-IDF",
        "file": "/data/l3/FR/FR-IDF.fgb",
        "subdivisionCount": 8,
        "bbox": {
          "minX": 499,
          "maxX": 515,
          "minY": 337,
          "maxY": 352
        }
      },
      {
        "key": "FR-LRE",
        "iso2": "FR",
        "parentName": "留尼旺大區",
        "parentCode": "FR-LRE",
        "file": "/data/l3/FR/FR-LRE.fgb",
        "subdivisionCount": 1,
        "bbox": {
          "minX": 648,
          "maxX": 660,
          "minY": 554,
          "maxY": 566
        }
      },
      {
        "key": "FR-MAY",
        "iso2": "FR",
        "parentName": "馬約特大區",
        "parentCode": "FR-MAY",
        "file": "/data/l3/FR/FR-MAY.fgb",
        "subdivisionCount": 1,
        "bbox": {
          "minX": 620,
          "maxX": 631,
          "minY": 530,
          "maxY": 541
        }
      },
      {
        "key": "FR-MTQ",
        "iso2": "FR",
        "parentName": "馬丁尼克大區",
        "parentCode": "FR-MTQ",
        "file": "/data/l3/FR/FR-MTQ.fgb",
        "subdivisionCount": 1,
        "bbox": {
          "minX": 325,
          "maxX": 336,
          "minY": 453,
          "maxY": 465
        }
      },
      {
        "key": "FR-NAQ",
        "iso2": "FR",
        "parentName": "新阿基坦大區",
        "parentCode": "FR-NAQ",
        "file": "/data/l3/FR/FR-NAQ.fgb",
        "subdivisionCount": 12,
        "bbox": {
          "minX": 490,
          "maxX": 512,
          "minY": 346,
          "maxY": 373
        }
      },
      {
        "key": "FR-NOR",
        "iso2": "FR",
        "parentName": "諾曼第大區",
        "parentCode": "FR-NOR",
        "file": "/data/l3/FR/FR-NOR.fgb",
        "subdivisionCount": 5,
        "bbox": {
          "minX": 490,
          "maxX": 510,
          "minY": 334,
          "maxY": 352
        }
      },
      {
        "key": "FR-OCC",
        "iso2": "FR",
        "parentName": "奧克西塔尼大區",
        "parentCode": "FR-OCC",
        "file": "/data/l3/FR/FR-OCC.fgb",
        "subdivisionCount": 13,
        "bbox": {
          "minX": 494,
          "maxX": 518,
          "minY": 355,
          "maxY": 375
        }
      },
      {
        "key": "FR-PAC",
        "iso2": "FR",
        "parentName": "普羅旺斯-阿爾卑斯-蔚藍海岸大區",
        "parentCode": "FR-PAC",
        "file": "/data/l3/FR/FR-PAC.fgb",
        "subdivisionCount": 6,
        "bbox": {
          "minX": 507,
          "maxX": 526,
          "minY": 354,
          "maxY": 372
        }
      },
      {
        "key": "FR-PDL",
        "iso2": "FR",
        "parentName": "羅亞爾河地區大區",
        "parentCode": "FR-PDL",
        "file": "/data/l3/FR/FR-PDL.fgb",
        "subdivisionCount": 5,
        "bbox": {
          "minX": 488,
          "maxX": 508,
          "minY": 340,
          "maxY": 360
        }
      }
    ]
  },
  {
    "iso2": "DE",
    "countryId": "276",
    "name": "Germany",
    "nameZh": "德國",
    "unitNameZh": "郡/非縣轄市 (Landkreis)",
    "subdivisionCount": 403,
    "bbox": {
      "minX": 516,
      "maxX": 542,
      "minY": 316,
      "maxY": 351
    },
    "partitions": [
      {
        "key": "DE-BW",
        "iso2": "DE",
        "parentName": "Baden-Württemberg",
        "parentCode": "DE-BW",
        "file": "/data/l3/DE/DE-BW.fgb",
        "subdivisionCount": 45,
        "bbox": {
          "minX": 521,
          "maxX": 529,
          "minY": 340,
          "maxY": 350
        }
      },
      {
        "key": "DE-BY",
        "iso2": "DE",
        "parentName": "Bayern",
        "parentCode": "DE-BY",
        "file": "/data/l3/DE/DE-BY.fgb",
        "subdivisionCount": 96,
        "bbox": {
          "minX": 525,
          "maxX": 538,
          "minY": 337,
          "maxY": 351
        }
      },
      {
        "key": "DE-BE",
        "iso2": "DE",
        "parentName": "Berlin",
        "parentCode": "DE-BE",
        "file": "/data/l3/DE/DE-BE.fgb",
        "subdivisionCount": 1,
        "bbox": {
          "minX": 536,
          "maxX": 538,
          "minY": 327,
          "maxY": 329
        }
      },
      {
        "key": "DE-BB",
        "iso2": "DE",
        "parentName": "Brandenburg",
        "parentCode": "DE-BB",
        "file": "/data/l3/DE/DE-BB.fgb",
        "subdivisionCount": 18,
        "bbox": {
          "minX": 531,
          "maxX": 541,
          "minY": 323,
          "maxY": 333
        }
      },
      {
        "key": "DE-HB",
        "iso2": "DE",
        "parentName": "Bremen",
        "parentCode": "DE-HB",
        "file": "/data/l3/DE/DE-HB.fgb",
        "subdivisionCount": 2,
        "bbox": {
          "minX": 524,
          "maxX": 525,
          "minY": 323,
          "maxY": 326
        }
      },
      {
        "key": "DE-HH",
        "iso2": "DE",
        "parentName": "Hamburg",
        "parentCode": "DE-HH",
        "file": "/data/l3/DE/DE-HH.fgb",
        "subdivisionCount": 1,
        "bbox": {
          "minX": 523,
          "maxX": 529,
          "minY": 321,
          "maxY": 324
        }
      },
      {
        "key": "DE-HE",
        "iso2": "DE",
        "parentName": "Hessen",
        "parentCode": "DE-HE",
        "file": "/data/l3/DE/DE-HE.fgb",
        "subdivisionCount": 26,
        "bbox": {
          "minX": 522,
          "maxX": 528,
          "minY": 332,
          "maxY": 342
        }
      },
      {
        "key": "DE-MV",
        "iso2": "DE",
        "parentName": "Mecklenburg-Vorpommern",
        "parentCode": "DE-MV",
        "file": "/data/l3/DE/DE-MV.fgb",
        "subdivisionCount": 8,
        "bbox": {
          "minX": 529,
          "maxX": 540,
          "minY": 318,
          "maxY": 325
        }
      },
      {
        "key": "DE-NI",
        "iso2": "DE",
        "parentName": "Niedersachsen",
        "parentCode": "DE-NI",
        "file": "/data/l3/DE/DE-NI.fgb",
        "subdivisionCount": 46,
        "bbox": {
          "minX": 518,
          "maxX": 532,
          "minY": 322,
          "maxY": 333
        }
      },
      {
        "key": "DE-NW",
        "iso2": "DE",
        "parentName": "Nordrhein-Westfalen",
        "parentCode": "DE-NW",
        "file": "/data/l3/DE/DE-NW.fgb",
        "subdivisionCount": 53,
        "bbox": {
          "minX": 516,
          "maxX": 526,
          "minY": 328,
          "maxY": 338
        }
      },
      {
        "key": "DE-RP",
        "iso2": "DE",
        "parentName": "Rheinland-Pfalz",
        "parentCode": "DE-RP",
        "file": "/data/l3/DE/DE-RP.fgb",
        "subdivisionCount": 36,
        "bbox": {
          "minX": 517,
          "maxX": 524,
          "minY": 335,
          "maxY": 344
        }
      },
      {
        "key": "DE-SL",
        "iso2": "DE",
        "parentName": "Saarland",
        "parentCode": "DE-SL",
        "file": "/data/l3/DE/DE-SL.fgb",
        "subdivisionCount": 6,
        "bbox": {
          "minX": 518,
          "maxX": 521,
          "minY": 341,
          "maxY": 343
        }
      },
      {
        "key": "DE-SN",
        "iso2": "DE",
        "parentName": "Sachsen",
        "parentCode": "DE-SN",
        "file": "/data/l3/DE/DE-SN.fgb",
        "subdivisionCount": 13,
        "bbox": {
          "minX": 533,
          "maxX": 542,
          "minY": 332,
          "maxY": 338
        }
      },
      {
        "key": "DE-ST",
        "iso2": "DE",
        "parentName": "Sachsen-Anhalt",
        "parentCode": "DE-ST",
        "file": "/data/l3/DE/DE-ST.fgb",
        "subdivisionCount": 14,
        "bbox": {
          "minX": 529,
          "maxX": 537,
          "minY": 326,
          "maxY": 335
        }
      },
      {
        "key": "DE-SH",
        "iso2": "DE",
        "parentName": "Schleswig-Holstein",
        "parentCode": "DE-SH",
        "file": "/data/l3/DE/DE-SH.fgb",
        "subdivisionCount": 15,
        "bbox": {
          "minX": 522,
          "maxX": 531,
          "minY": 316,
          "maxY": 324
        }
      },
      {
        "key": "DE-TH",
        "iso2": "DE",
        "parentName": "Thüringen",
        "parentCode": "DE-TH",
        "file": "/data/l3/DE/DE-TH.fgb",
        "subdivisionCount": 23,
        "bbox": {
          "minX": 527,
          "maxX": 535,
          "minY": 332,
          "maxY": 338
        }
      }
    ]
  },
  {
    "iso2": "IT",
    "countryId": "380",
    "name": "Italy",
    "nameZh": "義大利",
    "unitNameZh": "省/廣域市 (Provincia)",
    "subdivisionCount": 110,
    "bbox": {
      "minX": 513,
      "maxX": 556,
      "minY": 346,
      "maxY": 399
    },
    "partitions": [
      {
        "key": "IT-21",
        "iso2": "IT",
        "parentName": "皮埃蒙特大區",
        "parentCode": "IT-21",
        "file": "/data/l3/IT/IT-21.fgb",
        "subdivisionCount": 8,
        "bbox": {
          "minX": 513,
          "maxX": 531,
          "minY": 349,
          "maxY": 368
        }
      },
      {
        "key": "IT-23",
        "iso2": "IT",
        "parentName": "瓦萊達奧斯塔大區",
        "parentCode": "IT-23",
        "file": "/data/l3/IT/IT-23.fgb",
        "subdivisionCount": 1,
        "bbox": {
          "minX": 514,
          "maxX": 527,
          "minY": 351,
          "maxY": 363
        }
      },
      {
        "key": "IT-25",
        "iso2": "IT",
        "parentName": "倫巴底大區",
        "parentCode": "IT-25",
        "file": "/data/l3/IT/IT-25.fgb",
        "subdivisionCount": 12,
        "bbox": {
          "minX": 519,
          "maxX": 537,
          "minY": 348,
          "maxY": 366
        }
      },
      {
        "key": "IT-32",
        "iso2": "IT",
        "parentName": "特倫提諾-上阿迪傑大區",
        "parentCode": "IT-32",
        "file": "/data/l3/IT/IT-32.fgb",
        "subdivisionCount": 2,
        "bbox": {
          "minX": 524,
          "maxX": 540,
          "minY": 346,
          "maxY": 362
        }
      },
      {
        "key": "IT-34",
        "iso2": "IT",
        "parentName": "威尼托大區",
        "parentCode": "IT-34",
        "file": "/data/l3/IT/IT-34.fgb",
        "subdivisionCount": 7,
        "bbox": {
          "minX": 525,
          "maxX": 541,
          "minY": 348,
          "maxY": 366
        }
      },
      {
        "key": "IT-36",
        "iso2": "IT",
        "parentName": "佛里烏利-威尼斯朱利亞大區",
        "parentCode": "IT-36",
        "file": "/data/l3/IT/IT-36.fgb",
        "subdivisionCount": 4,
        "bbox": {
          "minX": 529,
          "maxX": 544,
          "minY": 348,
          "maxY": 362
        }
      },
      {
        "key": "IT-42",
        "iso2": "IT",
        "parentName": "利古里亞大區",
        "parentCode": "IT-42",
        "file": "/data/l3/IT/IT-42.fgb",
        "subdivisionCount": 4,
        "bbox": {
          "minX": 516,
          "maxX": 533,
          "minY": 356,
          "maxY": 369
        }
      },
      {
        "key": "IT-45",
        "iso2": "IT",
        "parentName": "艾米利亞-羅馬涅大區",
        "parentCode": "IT-45",
        "file": "/data/l3/IT/IT-45.fgb",
        "subdivisionCount": 9,
        "bbox": {
          "minX": 521,
          "maxX": 540,
          "minY": 354,
          "maxY": 370
        }
      },
      {
        "key": "IT-52",
        "iso2": "IT",
        "parentName": "托斯卡尼大區",
        "parentCode": "IT-52",
        "file": "/data/l3/IT/IT-52.fgb",
        "subdivisionCount": 10,
        "bbox": {
          "minX": 522,
          "maxX": 539,
          "minY": 357,
          "maxY": 375
        }
      },
      {
        "key": "IT-55",
        "iso2": "IT",
        "parentName": "翁布里亞大區",
        "parentCode": "IT-55",
        "file": "/data/l3/IT/IT-55.fgb",
        "subdivisionCount": 2,
        "bbox": {
          "minX": 528,
          "maxX": 542,
          "minY": 360,
          "maxY": 375
        }
      },
      {
        "key": "IT-57",
        "iso2": "IT",
        "parentName": "馬爾凱大區",
        "parentCode": "IT-57",
        "file": "/data/l3/IT/IT-57.fgb",
        "subdivisionCount": 5,
        "bbox": {
          "minX": 529,
          "maxX": 544,
          "minY": 359,
          "maxY": 374
        }
      },
      {
        "key": "IT-62",
        "iso2": "IT",
        "parentName": "拉齊奧大區",
        "parentCode": "IT-62",
        "file": "/data/l3/IT/IT-62.fgb",
        "subdivisionCount": 5,
        "bbox": {
          "minX": 527,
          "maxX": 544,
          "minY": 363,
          "maxY": 381
        }
      },
      {
        "key": "IT-65",
        "iso2": "IT",
        "parentName": "阿布魯佐大區",
        "parentCode": "IT-65",
        "file": "/data/l3/IT/IT-65.fgb",
        "subdivisionCount": 4,
        "bbox": {
          "minX": 531,
          "maxX": 546,
          "minY": 363,
          "maxY": 377
        }
      },
      {
        "key": "IT-67",
        "iso2": "IT",
        "parentName": "莫利塞大區",
        "parentCode": "IT-67",
        "file": "/data/l3/IT/IT-67.fgb",
        "subdivisionCount": 2,
        "bbox": {
          "minX": 534,
          "maxX": 547,
          "minY": 366,
          "maxY": 379
        }
      },
      {
        "key": "IT-72",
        "iso2": "IT",
        "parentName": "坎帕尼亞大區",
        "parentCode": "IT-72",
        "file": "/data/l3/IT/IT-72.fgb",
        "subdivisionCount": 5,
        "bbox": {
          "minX": 533,
          "maxX": 549,
          "minY": 368,
          "maxY": 384
        }
      },
      {
        "key": "IT-75",
        "iso2": "IT",
        "parentName": "普利亞大區",
        "parentCode": "IT-75",
        "file": "/data/l3/IT/IT-75.fgb",
        "subdivisionCount": 6,
        "bbox": {
          "minX": 536,
          "maxX": 556,
          "minY": 366,
          "maxY": 384
        }
      },
      {
        "key": "IT-77",
        "iso2": "IT",
        "parentName": "巴斯利卡塔大區",
        "parentCode": "IT-77",
        "file": "/data/l3/IT/IT-77.fgb",
        "subdivisionCount": 2,
        "bbox": {
          "minX": 538,
          "maxX": 552,
          "minY": 369,
          "maxY": 384
        }
      },
      {
        "key": "IT-78",
        "iso2": "IT",
        "parentName": "卡拉布里亞大區",
        "parentCode": "IT-78",
        "file": "/data/l3/IT/IT-78.fgb",
        "subdivisionCount": 5,
        "bbox": {
          "minX": 538,
          "maxX": 553,
          "minY": 373,
          "maxY": 391
        }
      },
      {
        "key": "IT-82",
        "iso2": "IT",
        "parentName": "西西里大區",
        "parentCode": "IT-82",
        "file": "/data/l3/IT/IT-82.fgb",
        "subdivisionCount": 9,
        "bbox": {
          "minX": 528,
          "maxX": 548,
          "minY": 378,
          "maxY": 399
        }
      },
      {
        "key": "IT-88",
        "iso2": "IT",
        "parentName": "薩丁尼亞大區",
        "parentCode": "IT-88",
        "file": "/data/l3/IT/IT-88.fgb",
        "subdivisionCount": 8,
        "bbox": {
          "minX": 518,
          "maxX": 532,
          "minY": 369,
          "maxY": 388
        }
      }
    ]
  },
  {
    "iso2": "JP",
    "countryId": "392",
    "name": "Japan",
    "nameZh": "日本",
    "unitNameZh": "市區町村 (Municipality)",
    "subdivisionCount": 1751,
    "bbox": {
      "minX": 842,
      "maxX": 928,
      "minY": 358,
      "maxY": 431
    },
    "partitions": [
      {
        "key": "1",
        "iso2": "JP",
        "parentName": "北海道",
        "parentCode": "1",
        "file": "/data/l3/JP/1.fgb",
        "subdivisionCount": 185,
        "bbox": {
          "minX": 887,
          "maxX": 914,
          "minY": 358,
          "maxY": 374
        }
      },
      {
        "key": "2",
        "iso2": "JP",
        "parentName": "青森県",
        "parentCode": "2",
        "file": "/data/l3/JP/2.fgb",
        "subdivisionCount": 40,
        "bbox": {
          "minX": 889,
          "maxX": 894,
          "minY": 373,
          "maxY": 378
        }
      },
      {
        "key": "3",
        "iso2": "JP",
        "parentName": "岩手県",
        "parentCode": "3",
        "file": "/data/l3/JP/3.fgb",
        "subdivisionCount": 33,
        "bbox": {
          "minX": 891,
          "maxX": 895,
          "minY": 377,
          "maxY": 383
        }
      },
      {
        "key": "4",
        "iso2": "JP",
        "parentName": "宮城県",
        "parentCode": "4",
        "file": "/data/l3/JP/4.fgb",
        "subdivisionCount": 35,
        "bbox": {
          "minX": 890,
          "maxX": 894,
          "minY": 382,
          "maxY": 387
        }
      },
      {
        "key": "5",
        "iso2": "JP",
        "parentName": "秋田県",
        "parentCode": "5",
        "file": "/data/l3/JP/5.fgb",
        "subdivisionCount": 25,
        "bbox": {
          "minX": 888,
          "maxX": 892,
          "minY": 377,
          "maxY": 383
        }
      },
      {
        "key": "6",
        "iso2": "JP",
        "parentName": "山形県",
        "parentCode": "6",
        "file": "/data/l3/JP/6.fgb",
        "subdivisionCount": 35,
        "bbox": {
          "minX": 888,
          "maxX": 891,
          "minY": 381,
          "maxY": 387
        }
      },
      {
        "key": "7",
        "iso2": "JP",
        "parentName": "福島県",
        "parentCode": "7",
        "file": "/data/l3/JP/7.fgb",
        "subdivisionCount": 59,
        "bbox": {
          "minX": 887,
          "maxX": 892,
          "minY": 386,
          "maxY": 390
        }
      },
      {
        "key": "8",
        "iso2": "JP",
        "parentName": "茨城県",
        "parentCode": "8",
        "file": "/data/l3/JP/8.fgb",
        "subdivisionCount": 44,
        "bbox": {
          "minX": 888,
          "maxX": 891,
          "minY": 389,
          "maxY": 394
        }
      },
      {
        "key": "9",
        "iso2": "JP",
        "parentName": "栃木県",
        "parentCode": "9",
        "file": "/data/l3/JP/9.fgb",
        "subdivisionCount": 25,
        "bbox": {
          "minX": 887,
          "maxX": 890,
          "minY": 389,
          "maxY": 392
        }
      },
      {
        "key": "10",
        "iso2": "JP",
        "parentName": "群馬県",
        "parentCode": "10",
        "file": "/data/l3/JP/10.fgb",
        "subdivisionCount": 35,
        "bbox": {
          "minX": 884,
          "maxX": 888,
          "minY": 389,
          "maxY": 393
        }
      },
      {
        "key": "11",
        "iso2": "JP",
        "parentName": "埼玉県",
        "parentCode": "11",
        "file": "/data/l3/JP/11.fgb",
        "subdivisionCount": 63,
        "bbox": {
          "minX": 885,
          "maxX": 889,
          "minY": 392,
          "maxY": 394
        }
      },
      {
        "key": "12",
        "iso2": "JP",
        "parentName": "千葉県",
        "parentCode": "12",
        "file": "/data/l3/JP/12.fgb",
        "subdivisionCount": 55,
        "bbox": {
          "minX": 888,
          "maxX": 891,
          "minY": 392,
          "maxY": 396
        }
      },
      {
        "key": "13",
        "iso2": "JP",
        "parentName": "東京都",
        "parentCode": "13",
        "file": "/data/l3/JP/13.fgb",
        "subdivisionCount": 63,
        "bbox": {
          "minX": 886,
          "maxX": 928,
          "minY": 393,
          "maxY": 431
        }
      },
      {
        "key": "14",
        "iso2": "JP",
        "parentName": "神奈川県",
        "parentCode": "14",
        "file": "/data/l3/JP/14.fgb",
        "subdivisionCount": 33,
        "bbox": {
          "minX": 886,
          "maxX": 888,
          "minY": 394,
          "maxY": 396
        }
      },
      {
        "key": "15",
        "iso2": "JP",
        "parentName": "新潟県",
        "parentCode": "15",
        "file": "/data/l3/JP/15.fgb",
        "subdivisionCount": 30,
        "bbox": {
          "minX": 882,
          "maxX": 889,
          "minY": 384,
          "maxY": 390
        }
      },
      {
        "key": "16",
        "iso2": "JP",
        "parentName": "富山県",
        "parentCode": "16",
        "file": "/data/l3/JP/16.fgb",
        "subdivisionCount": 15,
        "bbox": {
          "minX": 880,
          "maxX": 883,
          "minY": 389,
          "maxY": 392
        }
      },
      {
        "key": "17",
        "iso2": "JP",
        "parentName": "石川県",
        "parentCode": "17",
        "file": "/data/l3/JP/17.fgb",
        "subdivisionCount": 19,
        "bbox": {
          "minX": 878,
          "maxX": 882,
          "minY": 386,
          "maxY": 392
        }
      },
      {
        "key": "18",
        "iso2": "JP",
        "parentName": "福井県",
        "parentCode": "18",
        "file": "/data/l3/JP/18.fgb",
        "subdivisionCount": 17,
        "bbox": {
          "minX": 876,
          "maxX": 880,
          "minY": 392,
          "maxY": 395
        }
      },
      {
        "key": "19",
        "iso2": "JP",
        "parentName": "山梨県",
        "parentCode": "19",
        "file": "/data/l3/JP/19.fgb",
        "subdivisionCount": 27,
        "bbox": {
          "minX": 884,
          "maxX": 886,
          "minY": 393,
          "maxY": 396
        }
      },
      {
        "key": "20",
        "iso2": "JP",
        "parentName": "長野県",
        "parentCode": "20",
        "file": "/data/l3/JP/20.fgb",
        "subdivisionCount": 77,
        "bbox": {
          "minX": 881,
          "maxX": 885,
          "minY": 389,
          "maxY": 395
        }
      },
      {
        "key": "21",
        "iso2": "JP",
        "parentName": "岐阜県",
        "parentCode": "21",
        "file": "/data/l3/JP/21.fgb",
        "subdivisionCount": 42,
        "bbox": {
          "minX": 879,
          "maxX": 882,
          "minY": 391,
          "maxY": 396
        }
      },
      {
        "key": "22",
        "iso2": "JP",
        "parentName": "静岡県",
        "parentCode": "22",
        "file": "/data/l3/JP/22.fgb",
        "subdivisionCount": 35,
        "bbox": {
          "minX": 882,
          "maxX": 887,
          "minY": 394,
          "maxY": 397
        }
      },
      {
        "key": "23",
        "iso2": "JP",
        "parentName": "愛知県",
        "parentCode": "23",
        "file": "/data/l3/JP/23.fgb",
        "subdivisionCount": 55,
        "bbox": {
          "minX": 880,
          "maxX": 883,
          "minY": 395,
          "maxY": 398
        }
      },
      {
        "key": "24",
        "iso2": "JP",
        "parentName": "三重県",
        "parentCode": "24",
        "file": "/data/l3/JP/24.fgb",
        "subdivisionCount": 29,
        "bbox": {
          "minX": 877,
          "maxX": 881,
          "minY": 395,
          "maxY": 400
        }
      },
      {
        "key": "25",
        "iso2": "JP",
        "parentName": "滋賀県",
        "parentCode": "25",
        "file": "/data/l3/JP/25.fgb",
        "subdivisionCount": 19,
        "bbox": {
          "minX": 877,
          "maxX": 879,
          "minY": 394,
          "maxY": 397
        }
      },
      {
        "key": "26",
        "iso2": "JP",
        "parentName": "京都府",
        "parentCode": "26",
        "file": "/data/l3/JP/26.fgb",
        "subdivisionCount": 26,
        "bbox": {
          "minX": 875,
          "maxX": 878,
          "minY": 393,
          "maxY": 397
        }
      },
      {
        "key": "27",
        "iso2": "JP",
        "parentName": "大阪府",
        "parentCode": "27",
        "file": "/data/l3/JP/27.fgb",
        "subdivisionCount": 43,
        "bbox": {
          "minX": 875,
          "maxX": 877,
          "minY": 396,
          "maxY": 399
        }
      },
      {
        "key": "28",
        "iso2": "JP",
        "parentName": "兵庫県",
        "parentCode": "28",
        "file": "/data/l3/JP/28.fgb",
        "subdivisionCount": 41,
        "bbox": {
          "minX": 873,
          "maxX": 876,
          "minY": 394,
          "maxY": 399
        }
      },
      {
        "key": "29",
        "iso2": "JP",
        "parentName": "奈良県",
        "parentCode": "29",
        "file": "/data/l3/JP/29.fgb",
        "subdivisionCount": 39,
        "bbox": {
          "minX": 876,
          "maxX": 878,
          "minY": 397,
          "maxY": 400
        }
      },
      {
        "key": "30",
        "iso2": "JP",
        "parentName": "和歌山県",
        "parentCode": "30",
        "file": "/data/l3/JP/30.fgb",
        "subdivisionCount": 30,
        "bbox": {
          "minX": 875,
          "maxX": 878,
          "minY": 398,
          "maxY": 401
        }
      },
      {
        "key": "31",
        "iso2": "JP",
        "parentName": "鳥取県",
        "parentCode": "31",
        "file": "/data/l3/JP/31.fgb",
        "subdivisionCount": 19,
        "bbox": {
          "minX": 870,
          "maxX": 874,
          "minY": 394,
          "maxY": 396
        }
      },
      {
        "key": "32",
        "iso2": "JP",
        "parentName": "島根県",
        "parentCode": "32",
        "file": "/data/l3/JP/32.fgb",
        "subdivisionCount": 19,
        "bbox": {
          "minX": 866,
          "maxX": 871,
          "minY": 391,
          "maxY": 398
        }
      },
      {
        "key": "33",
        "iso2": "JP",
        "parentName": "岡山県",
        "parentCode": "33",
        "file": "/data/l3/JP/33.fgb",
        "subdivisionCount": 27,
        "bbox": {
          "minX": 870,
          "maxX": 873,
          "minY": 395,
          "maxY": 398
        }
      },
      {
        "key": "34",
        "iso2": "JP",
        "parentName": "広島県",
        "parentCode": "34",
        "file": "/data/l3/JP/34.fgb",
        "subdivisionCount": 23,
        "bbox": {
          "minX": 867,
          "maxX": 871,
          "minY": 396,
          "maxY": 399
        }
      },
      {
        "key": "35",
        "iso2": "JP",
        "parentName": "山口県",
        "parentCode": "35",
        "file": "/data/l3/JP/35.fgb",
        "subdivisionCount": 19,
        "bbox": {
          "minX": 863,
          "maxX": 868,
          "minY": 397,
          "maxY": 400
        }
      },
      {
        "key": "36",
        "iso2": "JP",
        "parentName": "徳島県",
        "parentCode": "36",
        "file": "/data/l3/JP/36.fgb",
        "subdivisionCount": 24,
        "bbox": {
          "minX": 871,
          "maxX": 874,
          "minY": 399,
          "maxY": 401
        }
      },
      {
        "key": "37",
        "iso2": "JP",
        "parentName": "香川県",
        "parentCode": "37",
        "file": "/data/l3/JP/37.fgb",
        "subdivisionCount": 17,
        "bbox": {
          "minX": 871,
          "maxX": 873,
          "minY": 398,
          "maxY": 399
        }
      },
      {
        "key": "38",
        "iso2": "JP",
        "parentName": "愛媛県",
        "parentCode": "38",
        "file": "/data/l3/JP/38.fgb",
        "subdivisionCount": 20,
        "bbox": {
          "minX": 867,
          "maxX": 871,
          "minY": 398,
          "maxY": 403
        }
      },
      {
        "key": "39",
        "iso2": "JP",
        "parentName": "高知県",
        "parentCode": "39",
        "file": "/data/l3/JP/39.fgb",
        "subdivisionCount": 34,
        "bbox": {
          "minX": 868,
          "maxX": 873,
          "minY": 400,
          "maxY": 404
        }
      },
      {
        "key": "40",
        "iso2": "JP",
        "parentName": "福岡県",
        "parentCode": "40",
        "file": "/data/l3/JP/40.fgb",
        "subdivisionCount": 60,
        "bbox": {
          "minX": 861,
          "maxX": 864,
          "minY": 399,
          "maxY": 403
        }
      },
      {
        "key": "41",
        "iso2": "JP",
        "parentName": "佐賀県",
        "parentCode": "41",
        "file": "/data/l3/JP/41.fgb",
        "subdivisionCount": 20,
        "bbox": {
          "minX": 860,
          "maxX": 863,
          "minY": 401,
          "maxY": 403
        }
      },
      {
        "key": "42",
        "iso2": "JP",
        "parentName": "長崎県",
        "parentCode": "42",
        "file": "/data/l3/JP/42.fgb",
        "subdivisionCount": 21,
        "bbox": {
          "minX": 857,
          "maxX": 862,
          "minY": 397,
          "maxY": 406
        }
      },
      {
        "key": "43",
        "iso2": "JP",
        "parentName": "熊本県",
        "parentCode": "43",
        "file": "/data/l3/JP/43.fgb",
        "subdivisionCount": 45,
        "bbox": {
          "minX": 861,
          "maxX": 865,
          "minY": 402,
          "maxY": 406
        }
      },
      {
        "key": "44",
        "iso2": "JP",
        "parentName": "大分県",
        "parentCode": "44",
        "file": "/data/l3/JP/44.fgb",
        "subdivisionCount": 18,
        "bbox": {
          "minX": 863,
          "maxX": 867,
          "minY": 400,
          "maxY": 404
        }
      },
      {
        "key": "45",
        "iso2": "JP",
        "parentName": "宮崎県",
        "parentCode": "45",
        "file": "/data/l3/JP/45.fgb",
        "subdivisionCount": 26,
        "bbox": {
          "minX": 863,
          "maxX": 866,
          "minY": 403,
          "maxY": 408
        }
      },
      {
        "key": "46",
        "iso2": "JP",
        "parentName": "鹿児島県",
        "parentCode": "46",
        "file": "/data/l3/JP/46.fgb",
        "subdivisionCount": 43,
        "bbox": {
          "minX": 857,
          "maxX": 864,
          "minY": 405,
          "maxY": 422
        }
      },
      {
        "key": "47",
        "iso2": "JP",
        "parentName": "沖縄県",
        "parentCode": "47",
        "file": "/data/l3/JP/47.fgb",
        "subdivisionCount": 42,
        "bbox": {
          "minX": 842,
          "maxX": 865,
          "minY": 419,
          "maxY": 431
        }
      }
    ]
  },
  {
    "iso2": "MX",
    "countryId": "484",
    "name": "Mexico",
    "nameZh": "墨西哥",
    "unitNameZh": "市鎮 (Município)",
    "subdivisionCount": 2457,
    "bbox": {
      "minX": 171,
      "maxX": 259,
      "minY": 404,
      "maxY": 459
    },
    "partitions": [
      {
        "key": "MX-AGU",
        "iso2": "MX",
        "parentName": "Aguascalientes",
        "parentCode": "MX-AGU",
        "file": "/data/l3/MX/MX-AGU.fgb",
        "subdivisionCount": 11,
        "bbox": {
          "minX": 214,
          "maxX": 217,
          "minY": 436,
          "maxY": 438
        }
      },
      {
        "key": "MX-BCN",
        "iso2": "MX",
        "parentName": "Baja California",
        "parentCode": "MX-BCN",
        "file": "/data/l3/MX/MX-BCN.fgb",
        "subdivisionCount": 5,
        "bbox": {
          "minX": 171,
          "maxX": 187,
          "minY": 404,
          "maxY": 419
        }
      },
      {
        "key": "MX-BCS",
        "iso2": "MX",
        "parentName": "Baja California Sur",
        "parentCode": "MX-BCS",
        "file": "/data/l3/MX/MX-BCS.fgb",
        "subdivisionCount": 5,
        "bbox": {
          "minX": 180,
          "maxX": 196,
          "minY": 419,
          "maxY": 435
        }
      },
      {
        "key": "MX-CAM",
        "iso2": "MX",
        "parentName": "Campeche",
        "parentCode": "MX-CAM",
        "file": "/data/l3/MX/MX-CAM.fgb",
        "subdivisionCount": 11,
        "bbox": {
          "minX": 243,
          "maxX": 252,
          "minY": 441,
          "maxY": 450
        }
      },
      {
        "key": "MX-CHP",
        "iso2": "MX",
        "parentName": "Chiapas",
        "parentCode": "MX-CHP",
        "file": "/data/l3/MX/MX-CHP.fgb",
        "subdivisionCount": 118,
        "bbox": {
          "minX": 239,
          "maxX": 249,
          "minY": 449,
          "maxY": 459
        }
      },
      {
        "key": "MX-CHH",
        "iso2": "MX",
        "parentName": "Chihuahua",
        "parentCode": "MX-CHH",
        "file": "/data/l3/MX/MX-CHH.fgb",
        "subdivisionCount": 67,
        "bbox": {
          "minX": 197,
          "maxX": 213,
          "minY": 407,
          "maxY": 427
        }
      },
      {
        "key": "MX-COA",
        "iso2": "MX",
        "parentName": "Coahuila",
        "parentCode": "MX-COA",
        "file": "/data/l3/MX/MX-COA.fgb",
        "subdivisionCount": 38,
        "bbox": {
          "minX": 211,
          "maxX": 223,
          "minY": 413,
          "maxY": 430
        }
      },
      {
        "key": "MX-COL",
        "iso2": "MX",
        "parentName": "Colima",
        "parentCode": "MX-COL",
        "file": "/data/l3/MX/MX-COL.fgb",
        "subdivisionCount": 10,
        "bbox": {
          "minX": 181,
          "maxX": 213,
          "minY": 445,
          "maxY": 448
        }
      },
      {
        "key": "MX-DIF",
        "iso2": "MX",
        "parentName": "Distrito Federal",
        "parentCode": "MX-DIF",
        "file": "/data/l3/MX/MX-DIF.fgb",
        "subdivisionCount": 141,
        "bbox": {
          "minX": 221,
          "maxX": 226,
          "minY": 442,
          "maxY": 448
        }
      },
      {
        "key": "MX-DUR",
        "iso2": "MX",
        "parentName": "Durango",
        "parentCode": "MX-DUR",
        "file": "/data/l3/MX/MX-DUR.fgb",
        "subdivisionCount": 39,
        "bbox": {
          "minX": 202,
          "maxX": 215,
          "minY": 423,
          "maxY": 436
        }
      },
      {
        "key": "MX-GUA",
        "iso2": "MX",
        "parentName": "Guanajuato",
        "parentCode": "MX-GUA",
        "file": "/data/l3/MX/MX-GUA.fgb",
        "subdivisionCount": 46,
        "bbox": {
          "minX": 216,
          "maxX": 223,
          "minY": 438,
          "maxY": 444
        }
      },
      {
        "key": "MX-GRO",
        "iso2": "MX",
        "parentName": "Guerrero",
        "parentCode": "MX-GRO",
        "file": "/data/l3/MX/MX-GRO.fgb",
        "subdivisionCount": 81,
        "bbox": {
          "minX": 216,
          "maxX": 228,
          "minY": 447,
          "maxY": 454
        }
      },
      {
        "key": "MX-HID",
        "iso2": "MX",
        "parentName": "Hidalgo",
        "parentCode": "MX-HID",
        "file": "/data/l3/MX/MX-HID.fgb",
        "subdivisionCount": 84,
        "bbox": {
          "minX": 223,
          "maxX": 228,
          "minY": 439,
          "maxY": 444
        }
      },
      {
        "key": "MX-JAL",
        "iso2": "MX",
        "parentName": "Jalisco",
        "parentCode": "MX-JAL",
        "file": "/data/l3/MX/MX-JAL.fgb",
        "subdivisionCount": 125,
        "bbox": {
          "minX": 206,
          "maxX": 218,
          "minY": 435,
          "maxY": 446
        }
      },
      {
        "key": "MX-MIC",
        "iso2": "MX",
        "parentName": "Michoacán",
        "parentCode": "MX-MIC",
        "file": "/data/l3/MX/MX-MIC.fgb",
        "subdivisionCount": 113,
        "bbox": {
          "minX": 212,
          "maxX": 222,
          "minY": 442,
          "maxY": 449
        }
      },
      {
        "key": "MX-MOR",
        "iso2": "MX",
        "parentName": "Morelos",
        "parentCode": "MX-MOR",
        "file": "/data/l3/MX/MX-MOR.fgb",
        "subdivisionCount": 33,
        "bbox": {
          "minX": 224,
          "maxX": 226,
          "minY": 446,
          "maxY": 448
        }
      },
      {
        "key": "MX-NAY",
        "iso2": "MX",
        "parentName": "Nayarit",
        "parentCode": "MX-NAY",
        "file": "/data/l3/MX/MX-NAY.fgb",
        "subdivisionCount": 20,
        "bbox": {
          "minX": 204,
          "maxX": 212,
          "minY": 434,
          "maxY": 441
        }
      },
      {
        "key": "MX-NLE",
        "iso2": "MX",
        "parentName": "Nuevo León",
        "parentCode": "MX-NLE",
        "file": "/data/l3/MX/MX-NLE.fgb",
        "subdivisionCount": 51,
        "bbox": {
          "minX": 219,
          "maxX": 227,
          "minY": 420,
          "maxY": 434
        }
      },
      {
        "key": "MX-OAX",
        "iso2": "MX",
        "parentName": "Oaxaca",
        "parentCode": "MX-OAX",
        "file": "/data/l3/MX/MX-OAX.fgb",
        "subdivisionCount": 570,
        "bbox": {
          "minX": 226,
          "maxX": 239,
          "minY": 447,
          "maxY": 456
        }
      },
      {
        "key": "MX-PUE",
        "iso2": "MX",
        "parentName": "Puebla",
        "parentCode": "MX-PUE",
        "file": "/data/l3/MX/MX-PUE.fgb",
        "subdivisionCount": 217,
        "bbox": {
          "minX": 225,
          "maxX": 231,
          "minY": 441,
          "maxY": 450
        }
      },
      {
        "key": "MX-QUE",
        "iso2": "MX",
        "parentName": "Querétaro",
        "parentCode": "MX-QUE",
        "file": "/data/l3/MX/MX-QUE.fgb",
        "subdivisionCount": 18,
        "bbox": {
          "minX": 221,
          "maxX": 225,
          "minY": 438,
          "maxY": 443
        }
      },
      {
        "key": "MX-ROO",
        "iso2": "MX",
        "parentName": "Quintana Roo",
        "parentCode": "MX-ROO",
        "file": "/data/l3/MX/MX-ROO.fgb",
        "subdivisionCount": 10,
        "bbox": {
          "minX": 252,
          "maxX": 259,
          "minY": 439,
          "maxY": 449
        }
      },
      {
        "key": "MX-SLP",
        "iso2": "MX",
        "parentName": "San Luis Potosí",
        "parentCode": "MX-SLP",
        "file": "/data/l3/MX/MX-SLP.fgb",
        "subdivisionCount": 58,
        "bbox": {
          "minX": 216,
          "maxX": 227,
          "minY": 430,
          "maxY": 440
        }
      },
      {
        "key": "MX-SIN",
        "iso2": "MX",
        "parentName": "Sinaloa",
        "parentCode": "MX-SIN",
        "file": "/data/l3/MX/MX-SIN.fgb",
        "subdivisionCount": 18,
        "bbox": {
          "minX": 196,
          "maxX": 207,
          "minY": 422,
          "maxY": 436
        }
      },
      {
        "key": "MX-SON",
        "iso2": "MX",
        "parentName": "Sonora",
        "parentCode": "MX-SON",
        "file": "/data/l3/MX/MX-SON.fgb",
        "subdivisionCount": 72,
        "bbox": {
          "minX": 180,
          "maxX": 199,
          "minY": 404,
          "maxY": 424
        }
      },
      {
        "key": "MX-TAB",
        "iso2": "MX",
        "parentName": "Tabasco",
        "parentCode": "MX-TAB",
        "file": "/data/l3/MX/MX-TAB.fgb",
        "subdivisionCount": 17,
        "bbox": {
          "minX": 239,
          "maxX": 247,
          "minY": 447,
          "maxY": 451
        }
      },
      {
        "key": "MX-TAM",
        "iso2": "MX",
        "parentName": "Tamaulipas",
        "parentCode": "MX-TAM",
        "file": "/data/l3/MX/MX-TAM.fgb",
        "subdivisionCount": 43,
        "bbox": {
          "minX": 222,
          "maxX": 230,
          "minY": 420,
          "maxY": 437
        }
      },
      {
        "key": "MX-TLA",
        "iso2": "MX",
        "parentName": "Tlaxcala",
        "parentCode": "MX-TLA",
        "file": "/data/l3/MX/MX-TLA.fgb",
        "subdivisionCount": 60,
        "bbox": {
          "minX": 226,
          "maxX": 229,
          "minY": 444,
          "maxY": 446
        }
      },
      {
        "key": "MX-VER",
        "iso2": "MX",
        "parentName": "Veracruz",
        "parentCode": "MX-VER",
        "file": "/data/l3/MX/MX-VER.fgb",
        "subdivisionCount": 212,
        "bbox": {
          "minX": 226,
          "maxX": 240,
          "minY": 436,
          "maxY": 452
        }
      },
      {
        "key": "MX-YUC",
        "iso2": "MX",
        "parentName": "Yucatán",
        "parentCode": "MX-YUC",
        "file": "/data/l3/MX/MX-YUC.fgb",
        "subdivisionCount": 106,
        "bbox": {
          "minX": 249,
          "maxX": 257,
          "minY": 438,
          "maxY": 445
        }
      },
      {
        "key": "MX-ZAC",
        "iso2": "MX",
        "parentName": "Zacatecas",
        "parentCode": "MX-ZAC",
        "file": "/data/l3/MX/MX-ZAC.fgb",
        "subdivisionCount": 58,
        "bbox": {
          "minX": 210,
          "maxX": 220,
          "minY": 428,
          "maxY": 440
        }
      }
    ]
  },
  {
    "iso2": "NO",
    "countryId": "578",
    "name": "Norway",
    "nameZh": "挪威",
    "unitNameZh": "市鎮 (Kommune)",
    "subdivisionCount": 438,
    "bbox": {
      "minX": 511,
      "maxX": 587,
      "minY": 214,
      "maxY": 301
    },
    "partitions": [
      {
        "key": "NO-02",
        "iso2": "NO",
        "parentName": "Akershus",
        "parentCode": "NO-02",
        "file": "/data/l3/NO/NO-02.fgb",
        "subdivisionCount": 21,
        "bbox": {
          "minX": 529,
          "maxX": 533,
          "minY": 287,
          "maxY": 293
        }
      },
      {
        "key": "NO-01",
        "iso2": "NO",
        "parentName": "Ãstfold",
        "parentCode": "NO-01",
        "file": "/data/l3/NO/NO-01.fgb",
        "subdivisionCount": 22,
        "bbox": {
          "minX": 529,
          "maxX": 533,
          "minY": 292,
          "maxY": 297
        }
      },
      {
        "key": "NO-09",
        "iso2": "NO",
        "parentName": "Aust-Agder",
        "parentCode": "NO-09",
        "file": "/data/l3/NO/NO-09.fgb",
        "subdivisionCount": 15,
        "bbox": {
          "minX": 519,
          "maxX": 526,
          "minY": 292,
          "maxY": 301
        }
      },
      {
        "key": "NO-06",
        "iso2": "NO",
        "parentName": "Buskerud",
        "parentCode": "NO-06",
        "file": "/data/l3/NO/NO-06.fgb",
        "subdivisionCount": 21,
        "bbox": {
          "minX": 521,
          "maxX": 529,
          "minY": 284,
          "maxY": 294
        }
      },
      {
        "key": "NO-20",
        "iso2": "NO",
        "parentName": "Finnmark",
        "parentCode": "NO-20",
        "file": "/data/l3/NO/NO-20.fgb",
        "subdivisionCount": 19,
        "bbox": {
          "minX": 559,
          "maxX": 587,
          "minY": 214,
          "maxY": 235
        }
      },
      {
        "key": "NO-04",
        "iso2": "NO",
        "parentName": "Hedmark",
        "parentCode": "NO-04",
        "file": "/data/l3/NO/NO-04.fgb",
        "subdivisionCount": 22,
        "bbox": {
          "minX": 527,
          "maxX": 536,
          "minY": 275,
          "maxY": 291
        }
      },
      {
        "key": "NO-12",
        "iso2": "NO",
        "parentName": "Hordaland",
        "parentCode": "NO-12",
        "file": "/data/l3/NO/NO-12.fgb",
        "subdivisionCount": 34,
        "bbox": {
          "minX": 511,
          "maxX": 521,
          "minY": 285,
          "maxY": 293
        }
      },
      {
        "key": "NO-15",
        "iso2": "NO",
        "parentName": "Møre og Romsdal",
        "parentCode": "NO-15",
        "file": "/data/l3/NO/NO-15.fgb",
        "subdivisionCount": 38,
        "bbox": {
          "minX": 515,
          "maxX": 527,
          "minY": 270,
          "maxY": 279
        }
      },
      {
        "key": "NO-17",
        "iso2": "NO",
        "parentName": "Nord-Trøndelag",
        "parentCode": "NO-17",
        "file": "/data/l3/NO/NO-17.fgb",
        "subdivisionCount": 24,
        "bbox": {
          "minX": 528,
          "maxX": 540,
          "minY": 258,
          "maxY": 272
        }
      },
      {
        "key": "NO-18",
        "iso2": "NO",
        "parentName": "Nordland",
        "parentCode": "NO-18",
        "file": "/data/l3/NO/NO-18.fgb",
        "subdivisionCount": 45,
        "bbox": {
          "minX": 532,
          "maxX": 550,
          "minY": 229,
          "maxY": 261
        }
      },
      {
        "key": "NO-05",
        "iso2": "NO",
        "parentName": "Oppland",
        "parentCode": "NO-05",
        "file": "/data/l3/NO/NO-05.fgb",
        "subdivisionCount": 26,
        "bbox": {
          "minX": 520,
          "maxX": 531,
          "minY": 277,
          "maxY": 290
        }
      },
      {
        "key": "NO-03",
        "iso2": "NO",
        "parentName": "Oslo",
        "parentCode": "NO-03",
        "file": "/data/l3/NO/NO-03.fgb",
        "subdivisionCount": 1,
        "bbox": {
          "minX": 529,
          "maxX": 530,
          "minY": 290,
          "maxY": 291
        }
      },
      {
        "key": "NO-11",
        "iso2": "NO",
        "parentName": "Rogaland",
        "parentCode": "NO-11",
        "file": "/data/l3/NO/NO-11.fgb",
        "subdivisionCount": 26,
        "bbox": {
          "minX": 513,
          "maxX": 520,
          "minY": 291,
          "maxY": 300
        }
      },
      {
        "key": "NO-14",
        "iso2": "NO",
        "parentName": "Sogn og Fjordane",
        "parentCode": "NO-14",
        "file": "/data/l3/NO/NO-14.fgb",
        "subdivisionCount": 26,
        "bbox": {
          "minX": 513,
          "maxX": 523,
          "minY": 278,
          "maxY": 287
        }
      },
      {
        "key": "NO-16",
        "iso2": "NO",
        "parentName": "Sør-Trøndelag",
        "parentCode": "NO-16",
        "file": "/data/l3/NO/NO-16.fgb",
        "subdivisionCount": 25,
        "bbox": {
          "minX": 523,
          "maxX": 534,
          "minY": 264,
          "maxY": 277
        }
      },
      {
        "key": "NO-08",
        "iso2": "NO",
        "parentName": "Telemark",
        "parentCode": "NO-08",
        "file": "/data/l3/NO/NO-08.fgb",
        "subdivisionCount": 18,
        "bbox": {
          "minX": 520,
          "maxX": 527,
          "minY": 289,
          "maxY": 297
        }
      },
      {
        "key": "NO-19",
        "iso2": "NO",
        "parentName": "Troms",
        "parentCode": "NO-19",
        "file": "/data/l3/NO/NO-19.fgb",
        "subdivisionCount": 25,
        "bbox": {
          "minX": 543,
          "maxX": 564,
          "minY": 221,
          "maxY": 237
        }
      },
      {
        "key": "NO-10",
        "iso2": "NO",
        "parentName": "Vest-Agder",
        "parentCode": "NO-10",
        "file": "/data/l3/NO/NO-10.fgb",
        "subdivisionCount": 15,
        "bbox": {
          "minX": 518,
          "maxX": 523,
          "minY": 295,
          "maxY": 301
        }
      },
      {
        "key": "NO-07",
        "iso2": "NO",
        "parentName": "Vestfold",
        "parentCode": "NO-07",
        "file": "/data/l3/NO/NO-07.fgb",
        "subdivisionCount": 15,
        "bbox": {
          "minX": 527,
          "maxX": 529,
          "minY": 292,
          "maxY": 296
        }
      }
    ]
  },
  {
    "iso2": "PL",
    "countryId": "616",
    "name": "Poland",
    "nameZh": "波蘭",
    "unitNameZh": "縣 (Powiat)",
    "subdivisionCount": 380,
    "bbox": {
      "minX": 539,
      "maxX": 567,
      "minY": 317,
      "maxY": 343
    },
    "partitions": [
      {
        "key": "PL-DS",
        "iso2": "PL",
        "parentName": "Lower Silesian",
        "parentCode": "PL-DS",
        "file": "/data/l3/PL/PL-DS.fgb",
        "subdivisionCount": 29,
        "bbox": {
          "minX": 541,
          "maxX": 549,
          "minY": 331,
          "maxY": 339
        }
      },
      {
        "key": "PL-KP",
        "iso2": "PL",
        "parentName": "Kuyavian-Pomeranian",
        "parentCode": "PL-KP",
        "file": "/data/l3/PL/PL-KP.fgb",
        "subdivisionCount": 23,
        "bbox": {
          "minX": 548,
          "maxX": 555,
          "minY": 322,
          "maxY": 329
        }
      },
      {
        "key": "PL-LD",
        "iso2": "PL",
        "parentName": "Łódź",
        "parentCode": "PL-LD",
        "file": "/data/l3/PL/PL-LD.fgb",
        "subdivisionCount": 24,
        "bbox": {
          "minX": 550,
          "maxX": 557,
          "minY": 329,
          "maxY": 335
        }
      },
      {
        "key": "PL-LU",
        "iso2": "PL",
        "parentName": "Lublin",
        "parentCode": "PL-LU",
        "file": "/data/l3/PL/PL-LU.fgb",
        "subdivisionCount": 24,
        "bbox": {
          "minX": 560,
          "maxX": 567,
          "minY": 329,
          "maxY": 338
        }
      },
      {
        "key": "PL-LB",
        "iso2": "PL",
        "parentName": "Lubusz",
        "parentCode": "PL-LB",
        "file": "/data/l3/PL/PL-LB.fgb",
        "subdivisionCount": 14,
        "bbox": {
          "minX": 540,
          "maxX": 546,
          "minY": 325,
          "maxY": 333
        }
      },
      {
        "key": "PL-MA",
        "iso2": "PL",
        "parentName": "Lesser Poland",
        "parentCode": "PL-MA",
        "file": "/data/l3/PL/PL-MA.fgb",
        "subdivisionCount": 22,
        "bbox": {
          "minX": 553,
          "maxX": 560,
          "minY": 337,
          "maxY": 343
        }
      },
      {
        "key": "PL-MZ",
        "iso2": "PL",
        "parentName": "Masovian",
        "parentCode": "PL-MZ",
        "file": "/data/l3/PL/PL-MZ.fgb",
        "subdivisionCount": 42,
        "bbox": {
          "minX": 553,
          "maxX": 564,
          "minY": 324,
          "maxY": 335
        }
      },
      {
        "key": "PL-OP",
        "iso2": "PL",
        "parentName": "Opole",
        "parentCode": "PL-OP",
        "file": "/data/l3/PL/PL-OP.fgb",
        "subdivisionCount": 12,
        "bbox": {
          "minX": 547,
          "maxX": 552,
          "minY": 334,
          "maxY": 339
        }
      },
      {
        "key": "PL-PK",
        "iso2": "PL",
        "parentName": "Subcarpathian",
        "parentCode": "PL-PK",
        "file": "/data/l3/PL/PL-PK.fgb",
        "subdivisionCount": 25,
        "bbox": {
          "minX": 559,
          "maxX": 565,
          "minY": 336,
          "maxY": 343
        }
      },
      {
        "key": "PL-PD",
        "iso2": "PL",
        "parentName": "Podlachian",
        "parentCode": "PL-PD",
        "file": "/data/l3/PL/PL-PD.fgb",
        "subdivisionCount": 17,
        "bbox": {
          "minX": 560,
          "maxX": 566,
          "minY": 319,
          "maxY": 329
        }
      },
      {
        "key": "PL-PM",
        "iso2": "PL",
        "parentName": "Pomeranian",
        "parentCode": "PL-PM",
        "file": "/data/l3/PL/PL-PM.fgb",
        "subdivisionCount": 20,
        "bbox": {
          "minX": 546,
          "maxX": 555,
          "minY": 317,
          "maxY": 323
        }
      },
      {
        "key": "PL-SL",
        "iso2": "PL",
        "parentName": "Silesian",
        "parentCode": "PL-SL",
        "file": "/data/l3/PL/PL-SL.fgb",
        "subdivisionCount": 36,
        "bbox": {
          "minX": 550,
          "maxX": 555,
          "minY": 334,
          "maxY": 342
        }
      },
      {
        "key": "PL-SK",
        "iso2": "PL",
        "parentName": "Świętokrzyskie",
        "parentCode": "PL-SK",
        "file": "/data/l3/PL/PL-SK.fgb",
        "subdivisionCount": 14,
        "bbox": {
          "minX": 555,
          "maxX": 561,
          "minY": 333,
          "maxY": 338
        }
      },
      {
        "key": "PL-WN",
        "iso2": "PL",
        "parentName": "Warmian-Masurian",
        "parentCode": "PL-WN",
        "file": "/data/l3/PL/PL-WN.fgb",
        "subdivisionCount": 21,
        "bbox": {
          "minX": 553,
          "maxX": 563,
          "minY": 319,
          "maxY": 325
        }
      },
      {
        "key": "PL-WP",
        "iso2": "PL",
        "parentName": "Greater Poland",
        "parentCode": "PL-WP",
        "file": "/data/l3/PL/PL-WP.fgb",
        "subdivisionCount": 35,
        "bbox": {
          "minX": 544,
          "maxX": 553,
          "minY": 323,
          "maxY": 334
        }
      },
      {
        "key": "PL-ZP",
        "iso2": "PL",
        "parentName": "West Pomeranian",
        "parentCode": "PL-ZP",
        "file": "/data/l3/PL/PL-ZP.fgb",
        "subdivisionCount": 22,
        "bbox": {
          "minX": 539,
          "maxX": 547,
          "minY": 318,
          "maxY": 327
        }
      }
    ]
  },
  {
    "iso2": "SE",
    "countryId": "752",
    "name": "Sweden",
    "nameZh": "瑞典",
    "unitNameZh": "市鎮 (Kommun)",
    "subdivisionCount": 290,
    "bbox": {
      "minX": 530,
      "maxX": 567,
      "minY": 231,
      "maxY": 315
    },
    "partitions": [
      {
        "key": "SE-K",
        "iso2": "SE",
        "parentName": "Blekinge",
        "parentCode": "SE-K",
        "file": "/data/l3/SE/SE-K.fgb",
        "subdivisionCount": 5,
        "bbox": {
          "minX": 540,
          "maxX": 545,
          "minY": 309,
          "maxY": 312
        }
      },
      {
        "key": "SE-W",
        "iso2": "SE",
        "parentName": "Dalarna",
        "parentCode": "SE-W",
        "file": "/data/l3/SE/SE-W.fgb",
        "subdivisionCount": 15,
        "bbox": {
          "minX": 534,
          "maxX": 546,
          "minY": 277,
          "maxY": 291
        }
      },
      {
        "key": "SE-X",
        "iso2": "SE",
        "parentName": "Gävleborg",
        "parentCode": "SE-X",
        "file": "/data/l3/SE/SE-X.fgb",
        "subdivisionCount": 10,
        "bbox": {
          "minX": 540,
          "maxX": 549,
          "minY": 277,
          "maxY": 289
        }
      },
      {
        "key": "SE-I",
        "iso2": "SE",
        "parentName": "Gotland",
        "parentCode": "SE-I",
        "file": "/data/l3/SE/SE-I.fgb",
        "subdivisionCount": 1,
        "bbox": {
          "minX": 550,
          "maxX": 554,
          "minY": 299,
          "maxY": 307
        }
      },
      {
        "key": "SE-N",
        "iso2": "SE",
        "parentName": "Halland",
        "parentCode": "SE-N",
        "file": "/data/l3/SE/SE-N.fgb",
        "subdivisionCount": 6,
        "bbox": {
          "minX": 533,
          "maxX": 538,
          "minY": 303,
          "maxY": 310
        }
      },
      {
        "key": "SE-Z",
        "iso2": "SE",
        "parentName": "Jämtland",
        "parentCode": "SE-Z",
        "file": "/data/l3/SE/SE-Z.fgb",
        "subdivisionCount": 8,
        "bbox": {
          "minX": 533,
          "maxX": 547,
          "minY": 259,
          "maxY": 282
        }
      },
      {
        "key": "SE-F",
        "iso2": "SE",
        "parentName": "Jönköping",
        "parentCode": "SE-F",
        "file": "/data/l3/SE/SE-F.fgb",
        "subdivisionCount": 11,
        "bbox": {
          "minX": 536,
          "maxX": 544,
          "minY": 300,
          "maxY": 307
        }
      },
      {
        "key": "SE-H",
        "iso2": "SE",
        "parentName": "Kalmar",
        "parentCode": "SE-H",
        "file": "/data/l3/SE/SE-H.fgb",
        "subdivisionCount": 12,
        "bbox": {
          "minX": 543,
          "maxX": 548,
          "minY": 300,
          "maxY": 310
        }
      },
      {
        "key": "SE-G",
        "iso2": "SE",
        "parentName": "Kronoberg",
        "parentCode": "SE-G",
        "file": "/data/l3/SE/SE-G.fgb",
        "subdivisionCount": 8,
        "bbox": {
          "minX": 537,
          "maxX": 544,
          "minY": 305,
          "maxY": 310
        }
      },
      {
        "key": "SE-BD",
        "iso2": "SE",
        "parentName": "Norrbotten",
        "parentCode": "SE-BD",
        "file": "/data/l3/SE/SE-BD.fgb",
        "subdivisionCount": 14,
        "bbox": {
          "minX": 543,
          "maxX": 567,
          "minY": 231,
          "maxY": 260
        }
      },
      {
        "key": "SE-T",
        "iso2": "SE",
        "parentName": "Orebro",
        "parentCode": "SE-T",
        "file": "/data/l3/SE/SE-T.fgb",
        "subdivisionCount": 12,
        "bbox": {
          "minX": 540,
          "maxX": 544,
          "minY": 290,
          "maxY": 298
        }
      },
      {
        "key": "SE-E",
        "iso2": "SE",
        "parentName": "Östergötland",
        "parentCode": "SE-E",
        "file": "/data/l3/SE/SE-E.fgb",
        "subdivisionCount": 13,
        "bbox": {
          "minX": 540,
          "maxX": 547,
          "minY": 296,
          "maxY": 303
        }
      },
      {
        "key": "SE-M",
        "iso2": "SE",
        "parentName": "Skåne",
        "parentCode": "SE-M",
        "file": "/data/l3/SE/SE-M.fgb",
        "subdivisionCount": 33,
        "bbox": {
          "minX": 535,
          "maxX": 541,
          "minY": 309,
          "maxY": 315
        }
      },
      {
        "key": "SE-D",
        "iso2": "SE",
        "parentName": "Södermanland",
        "parentCode": "SE-D",
        "file": "/data/l3/SE/SE-D.fgb",
        "subdivisionCount": 9,
        "bbox": {
          "minX": 543,
          "maxX": 549,
          "minY": 293,
          "maxY": 298
        }
      },
      {
        "key": "SE-AB",
        "iso2": "SE",
        "parentName": "Stockholm",
        "parentCode": "SE-AB",
        "file": "/data/l3/SE/SE-AB.fgb",
        "subdivisionCount": 26,
        "bbox": {
          "minX": 548,
          "maxX": 554,
          "minY": 289,
          "maxY": 297
        }
      },
      {
        "key": "SE-C",
        "iso2": "SE",
        "parentName": "Uppsala",
        "parentCode": "SE-C",
        "file": "/data/l3/SE/SE-C.fgb",
        "subdivisionCount": 7,
        "bbox": {
          "minX": 546,
          "maxX": 552,
          "minY": 286,
          "maxY": 294
        }
      },
      {
        "key": "SE-S",
        "iso2": "SE",
        "parentName": "Värmland",
        "parentCode": "SE-S",
        "file": "/data/l3/SE/SE-S.fgb",
        "subdivisionCount": 16,
        "bbox": {
          "minX": 532,
          "maxX": 540,
          "minY": 284,
          "maxY": 297
        }
      },
      {
        "key": "SE-AC",
        "iso2": "SE",
        "parentName": "Västerbotten",
        "parentCode": "SE-AC",
        "file": "/data/l3/SE/SE-AC.fgb",
        "subdivisionCount": 15,
        "bbox": {
          "minX": 540,
          "maxX": 560,
          "minY": 251,
          "maxY": 270
        }
      },
      {
        "key": "SE-Y",
        "iso2": "SE",
        "parentName": "Västernorrland",
        "parentCode": "SE-Y",
        "file": "/data/l3/SE/SE-Y.fgb",
        "subdivisionCount": 7,
        "bbox": {
          "minX": 541,
          "maxX": 554,
          "minY": 267,
          "maxY": 278
        }
      },
      {
        "key": "SE-U",
        "iso2": "SE",
        "parentName": "Västmanland",
        "parentCode": "SE-U",
        "file": "/data/l3/SE/SE-U.fgb",
        "subdivisionCount": 11,
        "bbox": {
          "minX": 543,
          "maxX": 548,
          "minY": 289,
          "maxY": 295
        }
      },
      {
        "key": "SE-O",
        "iso2": "SE",
        "parentName": "Västra Götaland",
        "parentCode": "SE-O",
        "file": "/data/l3/SE/SE-O.fgb",
        "subdivisionCount": 51,
        "bbox": {
          "minX": 530,
          "maxX": 541,
          "minY": 294,
          "maxY": 306
        }
      }
    ]
  },
  {
    "iso2": "US",
    "countryId": "840",
    "name": "United States",
    "nameZh": "美國",
    "unitNameZh": "郡 (County)",
    "subdivisionCount": 3224,
    "bbox": {
      "minX": 2,
      "maxX": 999,
      "minY": 212,
      "maxY": 450
    },
    "partitions": [
      {
        "key": "US-WA",
        "iso2": "US",
        "parentName": "Washington",
        "parentCode": "US-WA",
        "file": "/data/l3/US/US-WA.fgb",
        "subdivisionCount": 39,
        "bbox": {
          "minX": 154,
          "maxX": 175,
          "minY": 343,
          "maxY": 357
        }
      },
      {
        "key": "US-ID",
        "iso2": "US",
        "parentName": "Idaho",
        "parentCode": "US-ID",
        "file": "/data/l3/US/US-ID.fgb",
        "subdivisionCount": 44,
        "bbox": {
          "minX": 174,
          "maxX": 192,
          "minY": 343,
          "maxY": 371
        }
      },
      {
        "key": "US-MT",
        "iso2": "US",
        "parentName": "Montana",
        "parentCode": "US-MT",
        "file": "/data/l3/US/US-MT.fgb",
        "subdivisionCount": 56,
        "bbox": {
          "minX": 178,
          "maxX": 211,
          "minY": 343,
          "maxY": 362
        }
      },
      {
        "key": "US-ND",
        "iso2": "US",
        "parentName": "North Dakota",
        "parentCode": "US-ND",
        "file": "/data/l3/US/US-ND.fgb",
        "subdivisionCount": 53,
        "bbox": {
          "minX": 211,
          "maxX": 232,
          "minY": 343,
          "maxY": 356
        }
      },
      {
        "key": "US-MN",
        "iso2": "US",
        "parentName": "Minnesota",
        "parentCode": "US-MN",
        "file": "/data/l3/US/US-MN.fgb",
        "subdivisionCount": 87,
        "bbox": {
          "minX": 230,
          "maxX": 251,
          "minY": 342,
          "maxY": 366
        }
      },
      {
        "key": "US-MI",
        "iso2": "US",
        "parentName": "Michigan",
        "parentCode": "US-MI",
        "file": "/data/l3/US/US-MI.fgb",
        "subdivisionCount": 83,
        "bbox": {
          "minX": 249,
          "maxX": 272,
          "minY": 346,
          "maxY": 372
        }
      },
      {
        "key": "US-OH",
        "iso2": "US",
        "parentName": "Ohio",
        "parentCode": "US-OH",
        "file": "/data/l3/US/US-OH.fgb",
        "subdivisionCount": 88,
        "bbox": {
          "minX": 264,
          "maxX": 276,
          "minY": 370,
          "maxY": 384
        }
      },
      {
        "key": "US-PA",
        "iso2": "US",
        "parentName": "Pennsylvania",
        "parentCode": "US-PA",
        "file": "/data/l3/US/US-PA.fgb",
        "subdivisionCount": 67,
        "bbox": {
          "minX": 276,
          "maxX": 293,
          "minY": 369,
          "maxY": 380
        }
      },
      {
        "key": "US-NY",
        "iso2": "US",
        "parentName": "New York",
        "parentCode": "US-NY",
        "file": "/data/l3/US/US-NY.fgb",
        "subdivisionCount": 62,
        "bbox": {
          "minX": 278,
          "maxX": 300,
          "minY": 360,
          "maxY": 377
        }
      },
      {
        "key": "US-VT",
        "iso2": "US",
        "parentName": "Vermont",
        "parentCode": "US-VT",
        "file": "/data/l3/US/US-VT.fgb",
        "subdivisionCount": 14,
        "bbox": {
          "minX": 296,
          "maxX": 301,
          "minY": 360,
          "maxY": 368
        }
      },
      {
        "key": "US-NH",
        "iso2": "US",
        "parentName": "New Hampshire",
        "parentCode": "US-NH",
        "file": "/data/l3/US/US-NH.fgb",
        "subdivisionCount": 10,
        "bbox": {
          "minX": 298,
          "maxX": 304,
          "minY": 359,
          "maxY": 369
        }
      },
      {
        "key": "US-ME",
        "iso2": "US",
        "parentName": "Maine",
        "parentCode": "US-ME",
        "file": "/data/l3/US/US-ME.fgb",
        "subdivisionCount": 16,
        "bbox": {
          "minX": 303,
          "maxX": 314,
          "minY": 350,
          "maxY": 367
        }
      },
      {
        "key": "US-AZ",
        "iso2": "US",
        "parentName": "Arizona",
        "parentCode": "US-AZ",
        "file": "/data/l3/US/US-AZ.fgb",
        "subdivisionCount": 15,
        "bbox": {
          "minX": 181,
          "maxX": 197,
          "minY": 389,
          "maxY": 408
        }
      },
      {
        "key": "US-CA",
        "iso2": "US",
        "parentName": "California",
        "parentCode": "US-CA",
        "file": "/data/l3/US/US-CA.fgb",
        "subdivisionCount": 58,
        "bbox": {
          "minX": 154,
          "maxX": 183,
          "minY": 371,
          "maxY": 404
        }
      },
      {
        "key": "US-NM",
        "iso2": "US",
        "parentName": "New Mexico",
        "parentCode": "US-NM",
        "file": "/data/l3/US/US-NM.fgb",
        "subdivisionCount": 33,
        "bbox": {
          "minX": 197,
          "maxX": 214,
          "minY": 389,
          "maxY": 408
        }
      },
      {
        "key": "US-TX",
        "iso2": "US",
        "parentName": "Texas",
        "parentCode": "US-TX",
        "file": "/data/l3/US/US-TX.fgb",
        "subdivisionCount": 254,
        "bbox": {
          "minX": 204,
          "maxX": 240,
          "minY": 391,
          "maxY": 426
        }
      },
      {
        "key": "US-AK",
        "iso2": "US",
        "parentName": "Alaska",
        "parentCode": "US-AK",
        "file": "/data/l3/US/US-AK.fgb",
        "subdivisionCount": 30,
        "bbox": {
          "minX": 2,
          "maxX": 999,
          "minY": 212,
          "maxY": 334
        }
      },
      {
        "key": "US-LA",
        "iso2": "US",
        "parentName": "Louisiana",
        "parentCode": "US-LA",
        "file": "/data/l3/US/US-LA.fgb",
        "subdivisionCount": 64,
        "bbox": {
          "minX": 239,
          "maxX": 253,
          "minY": 403,
          "maxY": 416
        }
      },
      {
        "key": "US-MS",
        "iso2": "US",
        "parentName": "Mississippi",
        "parentCode": "US-MS",
        "file": "/data/l3/US/US-MS.fgb",
        "subdivisionCount": 82,
        "bbox": {
          "minX": 245,
          "maxX": 255,
          "minY": 396,
          "maxY": 412
        }
      },
      {
        "key": "US-AL",
        "iso2": "US",
        "parentName": "Alabama",
        "parentCode": "US-AL",
        "file": "/data/l3/US/US-AL.fgb",
        "subdivisionCount": 67,
        "bbox": {
          "minX": 254,
          "maxX": 264,
          "minY": 396,
          "maxY": 412
        }
      },
      {
        "key": "US-FL",
        "iso2": "US",
        "parentName": "Florida",
        "parentCode": "US-FL",
        "file": "/data/l3/US/US-FL.fgb",
        "subdivisionCount": 67,
        "bbox": {
          "minX": 257,
          "maxX": 278,
          "minY": 409,
          "maxY": 430
        }
      },
      {
        "key": "US-GA",
        "iso2": "US",
        "parentName": "Georgia",
        "parentCode": "US-GA",
        "file": "/data/l3/US/US-GA.fgb",
        "subdivisionCount": 159,
        "bbox": {
          "minX": 262,
          "maxX": 275,
          "minY": 396,
          "maxY": 411
        }
      },
      {
        "key": "US-SC",
        "iso2": "US",
        "parentName": "South Carolina",
        "parentCode": "US-SC",
        "file": "/data/l3/US/US-SC.fgb",
        "subdivisionCount": 46,
        "bbox": {
          "minX": 268,
          "maxX": 282,
          "minY": 395,
          "maxY": 406
        }
      },
      {
        "key": "US-NC",
        "iso2": "US",
        "parentName": "North Carolina",
        "parentCode": "US-NC",
        "file": "/data/l3/US/US-NC.fgb",
        "subdivisionCount": 100,
        "bbox": {
          "minX": 266,
          "maxX": 290,
          "minY": 391,
          "maxY": 400
        }
      },
      {
        "key": "US-VA",
        "iso2": "US",
        "parentName": "Virginia",
        "parentCode": "US-VA",
        "file": "/data/l3/US/US-VA.fgb",
        "subdivisionCount": 133,
        "bbox": {
          "minX": 268,
          "maxX": 291,
          "minY": 381,
          "maxY": 391
        }
      },
      {
        "key": "US-DC",
        "iso2": "US",
        "parentName": "District of Columbia",
        "parentCode": "US-DC",
        "file": "/data/l3/US/US-DC.fgb",
        "subdivisionCount": 1,
        "bbox": {
          "minX": 286,
          "maxX": 286,
          "minY": 382,
          "maxY": 383
        }
      },
      {
        "key": "US-MD",
        "iso2": "US",
        "parentName": "Maryland",
        "parentCode": "US-MD",
        "file": "/data/l3/US/US-MD.fgb",
        "subdivisionCount": 24,
        "bbox": {
          "minX": 279,
          "maxX": 292,
          "minY": 380,
          "maxY": 386
        }
      },
      {
        "key": "US-DE",
        "iso2": "US",
        "parentName": "Delaware",
        "parentCode": "US-DE",
        "file": "/data/l3/US/US-DE.fgb",
        "subdivisionCount": 3,
        "bbox": {
          "minX": 289,
          "maxX": 292,
          "minY": 379,
          "maxY": 384
        }
      },
      {
        "key": "US-NJ",
        "iso2": "US",
        "parentName": "New Jersey",
        "parentCode": "US-NJ",
        "file": "/data/l3/US/US-NJ.fgb",
        "subdivisionCount": 21,
        "bbox": {
          "minX": 290,
          "maxX": 295,
          "minY": 374,
          "maxY": 382
        }
      },
      {
        "key": "US-CT",
        "iso2": "US",
        "parentName": "Connecticut",
        "parentCode": "US-CT",
        "file": "/data/l3/US/US-CT.fgb",
        "subdivisionCount": 8,
        "bbox": {
          "minX": 295,
          "maxX": 301,
          "minY": 371,
          "maxY": 375
        }
      },
      {
        "key": "US-RI",
        "iso2": "US",
        "parentName": "Rhode Island",
        "parentCode": "US-RI",
        "file": "/data/l3/US/US-RI.fgb",
        "subdivisionCount": 5,
        "bbox": {
          "minX": 300,
          "maxX": 302,
          "minY": 371,
          "maxY": 374
        }
      },
      {
        "key": "US-MA",
        "iso2": "US",
        "parentName": "Massachusetts",
        "parentCode": "US-MA",
        "file": "/data/l3/US/US-MA.fgb",
        "subdivisionCount": 14,
        "bbox": {
          "minX": 296,
          "maxX": 306,
          "minY": 368,
          "maxY": 374
        }
      },
      {
        "key": "US-OR",
        "iso2": "US",
        "parentName": "Oregon",
        "parentCode": "US-OR",
        "file": "/data/l3/US/US-OR.fgb",
        "subdivisionCount": 36,
        "bbox": {
          "minX": 154,
          "maxX": 177,
          "minY": 355,
          "maxY": 371
        }
      },
      {
        "key": "US-VI",
        "iso2": "US",
        "parentName": "Virgin Islands",
        "parentCode": "US-VI",
        "file": "/data/l3/US/US-VI.fgb",
        "subdivisionCount": 3,
        "bbox": {
          "minX": 319,
          "maxX": 321,
          "minY": 448,
          "maxY": 450
        }
      },
      {
        "key": "US-PR",
        "iso2": "US",
        "parentName": "Puerto Rico",
        "parentCode": "US-PR",
        "file": "/data/l3/US/US-PR.fgb",
        "subdivisionCount": 78,
        "bbox": {
          "minX": 311,
          "maxX": 319,
          "minY": 448,
          "maxY": 449
        }
      },
      {
        "key": "US-HI",
        "iso2": "US",
        "parentName": "Hawaii",
        "parentCode": "US-HI",
        "file": "/data/l3/US/US-HI.fgb",
        "subdivisionCount": 5,
        "bbox": {
          "minX": 55,
          "maxX": 70,
          "minY": 437,
          "maxY": 447
        }
      },
      {
        "key": "US-UT",
        "iso2": "US",
        "parentName": "Utah",
        "parentCode": "US-UT",
        "file": "/data/l3/US/US-UT.fgb",
        "subdivisionCount": 29,
        "bbox": {
          "minX": 183,
          "maxX": 197,
          "minY": 371,
          "maxY": 389
        }
      },
      {
        "key": "US-WY",
        "iso2": "US",
        "parentName": "Wyoming",
        "parentCode": "US-WY",
        "file": "/data/l3/US/US-WY.fgb",
        "subdivisionCount": 23,
        "bbox": {
          "minX": 192,
          "maxX": 211,
          "minY": 360,
          "maxY": 375
        }
      },
      {
        "key": "US-NV",
        "iso2": "US",
        "parentName": "Nevada",
        "parentCode": "US-NV",
        "file": "/data/l3/US/US-NV.fgb",
        "subdivisionCount": 17,
        "bbox": {
          "minX": 167,
          "maxX": 183,
          "minY": 371,
          "maxY": 396
        }
      },
      {
        "key": "US-CO",
        "iso2": "US",
        "parentName": "Colorado",
        "parentCode": "US-CO",
        "file": "/data/l3/US/US-CO.fgb",
        "subdivisionCount": 64,
        "bbox": {
          "minX": 197,
          "maxX": 217,
          "minY": 375,
          "maxY": 389
        }
      },
      {
        "key": "US-SD",
        "iso2": "US",
        "parentName": "South Dakota",
        "parentCode": "US-SD",
        "file": "/data/l3/US/US-SD.fgb",
        "subdivisionCount": 66,
        "bbox": {
          "minX": 211,
          "maxX": 232,
          "minY": 356,
          "maxY": 369
        }
      },
      {
        "key": "US-NE",
        "iso2": "US",
        "parentName": "Nebraska",
        "parentCode": "US-NE",
        "file": "/data/l3/US/US-NE.fgb",
        "subdivisionCount": 93,
        "bbox": {
          "minX": 211,
          "maxX": 235,
          "minY": 367,
          "maxY": 379
        }
      },
      {
        "key": "US-KS",
        "iso2": "US",
        "parentName": "Kansas",
        "parentCode": "US-KS",
        "file": "/data/l3/US/US-KS.fgb",
        "subdivisionCount": 105,
        "bbox": {
          "minX": 217,
          "maxX": 237,
          "minY": 379,
          "maxY": 389
        }
      },
      {
        "key": "US-OK",
        "iso2": "US",
        "parentName": "Oklahoma",
        "parentCode": "US-OK",
        "file": "/data/l3/US/US-OK.fgb",
        "subdivisionCount": 77,
        "bbox": {
          "minX": 214,
          "maxX": 238,
          "minY": 389,
          "maxY": 401
        }
      },
      {
        "key": "US-IA",
        "iso2": "US",
        "parentName": "Iowa",
        "parentCode": "US-IA",
        "file": "/data/l3/US/US-IA.fgb",
        "subdivisionCount": 99,
        "bbox": {
          "minX": 232,
          "maxX": 250,
          "minY": 366,
          "maxY": 377
        }
      },
      {
        "key": "US-MO",
        "iso2": "US",
        "parentName": "Missouri",
        "parentCode": "US-MO",
        "file": "/data/l3/US/US-MO.fgb",
        "subdivisionCount": 115,
        "bbox": {
          "minX": 234,
          "maxX": 252,
          "minY": 376,
          "maxY": 393
        }
      },
      {
        "key": "US-WI",
        "iso2": "US",
        "parentName": "Wisconsin",
        "parentCode": "US-WI",
        "file": "/data/l3/US/US-WI.fgb",
        "subdivisionCount": 72,
        "bbox": {
          "minX": 242,
          "maxX": 260,
          "minY": 350,
          "maxY": 369
        }
      },
      {
        "key": "US-IL",
        "iso2": "US",
        "parentName": "Illinois",
        "parentCode": "US-IL",
        "file": "/data/l3/US/US-IL.fgb",
        "subdivisionCount": 102,
        "bbox": {
          "minX": 246,
          "maxX": 258,
          "minY": 369,
          "maxY": 389
        }
      },
      {
        "key": "US-KY",
        "iso2": "US",
        "parentName": "Kentucky",
        "parentCode": "US-KY",
        "file": "/data/l3/US/US-KY.fgb",
        "subdivisionCount": 120,
        "bbox": {
          "minX": 251,
          "maxX": 272,
          "minY": 382,
          "maxY": 391
        }
      },
      {
        "key": "US-AR",
        "iso2": "US",
        "parentName": "Arkansas",
        "parentCode": "US-AR",
        "file": "/data/l3/US/US-AR.fgb",
        "subdivisionCount": 75,
        "bbox": {
          "minX": 237,
          "maxX": 251,
          "minY": 391,
          "maxY": 403
        }
      },
      {
        "key": "US-TN",
        "iso2": "US",
        "parentName": "Tennessee",
        "parentCode": "US-TN",
        "file": "/data/l3/US/US-TN.fgb",
        "subdivisionCount": 95,
        "bbox": {
          "minX": 249,
          "maxX": 273,
          "minY": 390,
          "maxY": 396
        }
      },
      {
        "key": "US-WV",
        "iso2": "US",
        "parentName": "West Virginia",
        "parentCode": "US-WV",
        "file": "/data/l3/US/US-WV.fgb",
        "subdivisionCount": 55,
        "bbox": {
          "minX": 270,
          "maxX": 284,
          "minY": 376,
          "maxY": 389
        }
      },
      {
        "key": "US-IN",
        "iso2": "US",
        "parentName": "Indiana",
        "parentCode": "US-IN",
        "file": "/data/l3/US/US-IN.fgb",
        "subdivisionCount": 92,
        "bbox": {
          "minX": 255,
          "maxX": 264,
          "minY": 372,
          "maxY": 386
        }
      }
    ]
  },
  {
    "iso2": "ES",
    "countryId": "724",
    "name": "Spain",
    "nameZh": "西班牙",
    "unitNameZh": "省/自治市 (Provincia)",
    "subdivisionCount": 52,
    "bbox": {
      "minX": 450,
      "maxX": 512,
      "minY": 364,
      "maxY": 420
    },
    "partitions": [
      {
        "key": "ES-AN",
        "iso2": "ES",
        "parentName": "安達魯西亞自治區",
        "parentCode": "ES-AN",
        "file": "/data/l3/ES/ES-AN.fgb",
        "subdivisionCount": 8,
        "bbox": {
          "minX": 474,
          "maxX": 500,
          "minY": 378,
          "maxY": 398
        }
      },
      {
        "key": "ES-AR",
        "iso2": "ES",
        "parentName": "亞拉岡自治區",
        "parentCode": "ES-AR",
        "file": "/data/l3/ES/ES-AR.fgb",
        "subdivisionCount": 3,
        "bbox": {
          "minX": 489,
          "maxX": 507,
          "minY": 363,
          "maxY": 384
        }
      },
      {
        "key": "ES-AS",
        "iso2": "ES",
        "parentName": "阿斯圖里亞斯自治區",
        "parentCode": "ES-AS",
        "file": "/data/l3/ES/ES-AS.fgb",
        "subdivisionCount": 1,
        "bbox": {
          "minX": 475,
          "maxX": 492,
          "minY": 360,
          "maxY": 373
        }
      },
      {
        "key": "ES-CB",
        "iso2": "ES",
        "parentName": "坎塔布里亞自治區",
        "parentCode": "ES-CB",
        "file": "/data/l3/ES/ES-CB.fgb",
        "subdivisionCount": 1,
        "bbox": {
          "minX": 482,
          "maxX": 496,
          "minY": 360,
          "maxY": 373
        }
      },
      {
        "key": "ES-CE",
        "iso2": "ES",
        "parentName": "休達自治市",
        "parentCode": "ES-CE",
        "file": "/data/l3/ES/ES-CE.fgb",
        "subdivisionCount": 1,
        "bbox": {
          "minX": 480,
          "maxX": 490,
          "minY": 388,
          "maxY": 398
        }
      },
      {
        "key": "ES-CL",
        "iso2": "ES",
        "parentName": "卡斯提亞-雷昂自治區",
        "parentCode": "ES-CL",
        "file": "/data/l3/ES/ES-CL.fgb",
        "subdivisionCount": 9,
        "bbox": {
          "minX": 475,
          "maxX": 500,
          "minY": 362,
          "maxY": 383
        }
      },
      {
        "key": "ES-CM",
        "iso2": "ES",
        "parentName": "卡斯提亞-拉曼查自治區",
        "parentCode": "ES-CM",
        "file": "/data/l3/ES/ES-CM.fgb",
        "subdivisionCount": 5,
        "bbox": {
          "minX": 480,
          "maxX": 502,
          "minY": 369,
          "maxY": 391
        }
      },
      {
        "key": "ES-CN",
        "iso2": "ES",
        "parentName": "加那利群島自治區",
        "parentCode": "ES-CN",
        "file": "/data/l3/ES/ES-CN.fgb",
        "subdivisionCount": 2,
        "bbox": {
          "minX": 445,
          "maxX": 468,
          "minY": 410,
          "maxY": 425
        }
      },
      {
        "key": "ES-CT",
        "iso2": "ES",
        "parentName": "加泰隆尼亞自治區",
        "parentCode": "ES-CT",
        "file": "/data/l3/ES/ES-CT.fgb",
        "subdivisionCount": 4,
        "bbox": {
          "minX": 495,
          "maxX": 514,
          "minY": 363,
          "maxY": 382
        }
      },
      {
        "key": "ES-EX",
        "iso2": "ES",
        "parentName": "埃斯特雷馬杜拉自治區",
        "parentCode": "ES-EX",
        "file": "/data/l3/ES/ES-EX.fgb",
        "subdivisionCount": 2,
        "bbox": {
          "minX": 474,
          "maxX": 492,
          "minY": 372,
          "maxY": 391
        }
      },
      {
        "key": "ES-GA",
        "iso2": "ES",
        "parentName": "加利西亞自治區",
        "parentCode": "ES-GA",
        "file": "/data/l3/ES/ES-GA.fgb",
        "subdivisionCount": 4,
        "bbox": {
          "minX": 469,
          "maxX": 486,
          "minY": 359,
          "maxY": 377
        }
      },
      {
        "key": "ES-IB",
        "iso2": "ES",
        "parentName": "巴利阿里群島自治區",
        "parentCode": "ES-IB",
        "file": "/data/l3/ES/ES-IB.fgb",
        "subdivisionCount": 1,
        "bbox": {
          "minX": 498,
          "maxX": 517,
          "minY": 373,
          "maxY": 388
        }
      },
      {
        "key": "ES-MC",
        "iso2": "ES",
        "parentName": "莫夕亞自治區",
        "parentCode": "ES-MC",
        "file": "/data/l3/ES/ES-MC.fgb",
        "subdivisionCount": 1,
        "bbox": {
          "minX": 489,
          "maxX": 503,
          "minY": 378,
          "maxY": 393
        }
      },
      {
        "key": "ES-MD",
        "iso2": "ES",
        "parentName": "馬德里自治區",
        "parentCode": "ES-MD",
        "file": "/data/l3/ES/ES-MD.fgb",
        "subdivisionCount": 1,
        "bbox": {
          "minX": 482,
          "maxX": 496,
          "minY": 369,
          "maxY": 384
        }
      },
      {
        "key": "ES-ML",
        "iso2": "ES",
        "parentName": "梅利利亞自治市",
        "parentCode": "ES-ML",
        "file": "/data/l3/ES/ES-ML.fgb",
        "subdivisionCount": 1,
        "bbox": {
          "minX": 487,
          "maxX": 497,
          "minY": 390,
          "maxY": 400
        }
      },
      {
        "key": "ES-NC",
        "iso2": "ES",
        "parentName": "納瓦拉自治區",
        "parentCode": "ES-NC",
        "file": "/data/l3/ES/ES-NC.fgb",
        "subdivisionCount": 1,
        "bbox": {
          "minX": 488,
          "maxX": 503,
          "minY": 361,
          "maxY": 377
        }
      },
      {
        "key": "ES-PV",
        "iso2": "ES",
        "parentName": "巴斯克自治區",
        "parentCode": "ES-PV",
        "file": "/data/l3/ES/ES-PV.fgb",
        "subdivisionCount": 3,
        "bbox": {
          "minX": 485,
          "maxX": 500,
          "minY": 361,
          "maxY": 374
        }
      },
      {
        "key": "ES-RI",
        "iso2": "ES",
        "parentName": "拉里奧哈自治區",
        "parentCode": "ES-RI",
        "file": "/data/l3/ES/ES-RI.fgb",
        "subdivisionCount": 1,
        "bbox": {
          "minX": 486,
          "maxX": 500,
          "minY": 364,
          "maxY": 377
        }
      },
      {
        "key": "ES-VC",
        "iso2": "ES",
        "parentName": "瓦倫西亞自治區",
        "parentCode": "ES-VC",
        "file": "/data/l3/ES/ES-VC.fgb",
        "subdivisionCount": 3,
        "bbox": {
          "minX": 491,
          "maxX": 506,
          "minY": 371,
          "maxY": 391
        }
      }
    ]
  },
  {
    "iso2": "GB",
    "countryId": "826",
    "name": "United Kingdom",
    "nameZh": "英國",
    "unitNameZh": "郡/地方行政區 (County / District)",
    "subdivisionCount": 232,
    "bbox": {
      "minX": 462,
      "maxX": 505,
      "minY": 286,
      "maxY": 340
    },
    "partitions": [
      {
        "key": "GB-ENG",
        "iso2": "GB",
        "parentName": "英格蘭",
        "parentCode": "GB-ENG",
        "file": "/data/l3/GB/GB-ENG.fgb",
        "subdivisionCount": 152,
        "bbox": {
          "minX": 477,
          "maxX": 510,
          "minY": 307,
          "maxY": 345
        }
      },
      {
        "key": "GB-NIR",
        "iso2": "GB",
        "parentName": "北愛爾蘭",
        "parentCode": "GB-NIR",
        "file": "/data/l3/GB/GB-NIR.fgb",
        "subdivisionCount": 26,
        "bbox": {
          "minX": 472,
          "maxX": 490,
          "minY": 310,
          "maxY": 326
        }
      },
      {
        "key": "GB-SCT",
        "iso2": "GB",
        "parentName": "蘇格蘭",
        "parentCode": "GB-SCT",
        "file": "/data/l3/GB/GB-SCT.fgb",
        "subdivisionCount": 32,
        "bbox": {
          "minX": 457,
          "maxX": 503,
          "minY": 281,
          "maxY": 323
        }
      },
      {
        "key": "GB-WLS",
        "iso2": "GB",
        "parentName": "威爾斯",
        "parentCode": "GB-WLS",
        "file": "/data/l3/GB/GB-WLS.fgb",
        "subdivisionCount": 22,
        "bbox": {
          "minX": 480,
          "maxX": 498,
          "minY": 319,
          "maxY": 338
        }
      }
    ]
  }
];

export const L3_PARTITIONS_BY_COUNTRY: Record<string, L3PartitionMeta[]> = {};
export const L3_PARTITIONS_BY_KEY: Record<string, L3PartitionMeta> = {};

function normKey(str: string): string {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\s\-_~]+/g, '');
}

for (const c of L3_MANIFEST) {
  L3_PARTITIONS_BY_COUNTRY[c.iso2] = c.partitions;
  for (const p of c.partitions) {
    L3_PARTITIONS_BY_KEY[`${c.iso2}:${p.key}`] = p;
    L3_PARTITIONS_BY_KEY[`${c.iso2}:${normKey(p.key)}`] = p;
    if (p.parentName) {
      L3_PARTITIONS_BY_KEY[`${c.iso2}:${normKey(p.parentName)}`] = p;
    }
    if (p.parentCode) {
      L3_PARTITIONS_BY_KEY[`${c.iso2}:${normKey(p.parentCode)}`] = p;
    }
  }
}

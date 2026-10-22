/**
 * Worldwide Roads & Highway System Manifest
 * Precomputed bounding boxes and country metadata for on-demand viewport loading
 */

export interface RoadCountryManifest {
  iso2: string;
  name: string;
  nameZh: string;
  bbox: { minX: number; maxX: number; minY: number; maxY: number };
  featureCount: number;
}

export const ROADS_MANIFEST: Record<string, RoadCountryManifest> = {
  "AF": {
  "iso2": "AF",
  "name": "AF",
  "nameZh": "AF",
  "bbox": {
    "minX": 669,
    "maxX": 708,
    "minY": 384,
    "maxY": 411
  },
  "featureCount": 123
},
  "AL": {
  "iso2": "AL",
  "name": "Albania",
  "nameZh": "阿爾巴尼亞",
  "bbox": {
    "minX": 554,
    "maxX": 559,
    "minY": 370,
    "maxY": 379
  },
  "featureCount": 29
},
  "AM": {
  "iso2": "AM",
  "name": "AM",
  "nameZh": "AM",
  "bbox": {
    "minX": 622,
    "maxX": 629,
    "minY": 373,
    "maxY": 383
  },
  "featureCount": 51
},
  "AO": {
  "iso2": "AO",
  "name": "AO",
  "nameZh": "AO",
  "bbox": {
    "minX": 533,
    "maxX": 564,
    "minY": 512,
    "maxY": 551
  },
  "featureCount": 77
},
  "AR": {
  "iso2": "AR",
  "name": "Argentina",
  "nameZh": "阿根廷",
  "bbox": {
    "minX": 298,
    "maxX": 351,
    "minY": 563,
    "maxY": 683
  },
  "featureCount": 571
},
  "AU": {
  "iso2": "AU",
  "name": "Australia",
  "nameZh": "澳洲",
  "bbox": {
    "minX": 816,
    "maxX": 926,
    "minY": 531,
    "maxY": 634
  },
  "featureCount": 471
},
  "AT": {
  "iso2": "AT",
  "name": "Austria",
  "nameZh": "奧地利",
  "bbox": {
    "minX": 526,
    "maxX": 548,
    "minY": 344,
    "maxY": 355
  },
  "featureCount": 87
},
  "AZ": {
  "iso2": "AZ",
  "name": "AZ",
  "nameZh": "AZ",
  "bbox": {
    "minX": 625,
    "maxX": 640,
    "minY": 372,
    "maxY": 384
  },
  "featureCount": 161
},
  "BA": {
  "iso2": "BA",
  "name": "BA",
  "nameZh": "BA",
  "bbox": {
    "minX": 544,
    "maxX": 555,
    "minY": 359,
    "maxY": 369
  },
  "featureCount": 64
},
  "BD": {
  "iso2": "BD",
  "name": "Bangladesh",
  "nameZh": "孟加拉",
  "bbox": {
    "minX": 746,
    "maxX": 756,
    "minY": 424,
    "maxY": 440
  },
  "featureCount": 28
},
  "BE": {
  "iso2": "BE",
  "name": "Belgium",
  "nameZh": "比利時",
  "bbox": {
    "minX": 507,
    "maxX": 517,
    "minY": 333,
    "maxY": 341
  },
  "featureCount": 59
},
  "BF": {
  "iso2": "BF",
  "name": "BF",
  "nameZh": "BF",
  "bbox": {
    "minX": 485,
    "maxX": 507,
    "minY": 459,
    "maxY": 472
  },
  "featureCount": 71
},
  "BH": {
  "iso2": "BH",
  "name": "BH",
  "nameZh": "BH",
  "bbox": {
    "minX": 640,
    "maxX": 641,
    "minY": 424,
    "maxY": 425
  },
  "featureCount": 4
},
  "BT": {
  "iso2": "BT",
  "name": "Bhutan",
  "nameZh": "不丹",
  "bbox": {
    "minX": 749,
    "maxX": 754,
    "minY": 419,
    "maxY": 424
  },
  "featureCount": 12
},
  "BI": {
  "iso2": "BI",
  "name": "BI",
  "nameZh": "BI",
  "bbox": {
    "minX": 580,
    "maxX": 585,
    "minY": 505,
    "maxY": 512
  },
  "featureCount": 36
},
  "BJ": {
  "iso2": "BJ",
  "name": "BJ",
  "nameZh": "BJ",
  "bbox": {
    "minX": 503,
    "maxX": 512,
    "minY": 467,
    "maxY": 483
  },
  "featureCount": 39
},
  "BN": {
  "iso2": "BN",
  "name": "BN",
  "nameZh": "BN",
  "bbox": {
    "minX": 817,
    "maxX": 820,
    "minY": 486,
    "maxY": 488
  },
  "featureCount": 14
},
  "BO": {
  "iso2": "BO",
  "name": "Bolivia",
  "nameZh": "玻利維亞",
  "bbox": {
    "minX": 307,
    "maxX": 340,
    "minY": 530,
    "maxY": 565
  },
  "featureCount": 139
},
  "BW": {
  "iso2": "BW",
  "name": "Botswana",
  "nameZh": "波札那",
  "bbox": {
    "minX": 556,
    "maxX": 581,
    "minY": 550,
    "maxY": 575
  },
  "featureCount": 75
},
  "BR": {
  "iso2": "BR",
  "name": "Brazil",
  "nameZh": "巴西",
  "bbox": {
    "minX": 298,
    "maxX": 403,
    "minY": 487,
    "maxY": 600
  },
  "featureCount": 2014
},
  "BG": {
  "iso2": "BG",
  "name": "Bulgaria",
  "nameZh": "保加利亞",
  "bbox": {
    "minX": 562,
    "maxX": 579,
    "minY": 361,
    "maxY": 374
  },
  "featureCount": 155
},
  "BY": {
  "iso2": "BY",
  "name": "BY",
  "nameZh": "BY",
  "bbox": {
    "minX": 564,
    "maxX": 590,
    "minY": 312,
    "maxY": 335
  },
  "featureCount": 176
},
  "BZ": {
  "iso2": "BZ",
  "name": "BZ",
  "nameZh": "BZ",
  "bbox": {
    "minX": 252,
    "maxX": 255,
    "minY": 448,
    "maxY": 455
  },
  "featureCount": 13
},
  "KH": {
  "iso2": "KH",
  "name": "Cambodia",
  "nameZh": "柬埔寨",
  "bbox": {
    "minX": 785,
    "maxX": 799,
    "minY": 459,
    "maxY": 471
  },
  "featureCount": 219
},
  "CA": {
  "iso2": "CA",
  "name": "Canada",
  "nameZh": "加拿大",
  "bbox": {
    "minX": 108,
    "maxX": 354,
    "minY": 228,
    "maxY": 371
  },
  "featureCount": 822
},
  "CD": {
  "iso2": "CD",
  "name": "CD",
  "nameZh": "CD",
  "bbox": {
    "minX": 536,
    "maxX": 586,
    "minY": 486,
    "maxY": 535
  },
  "featureCount": 239
},
  "CF": {
  "iso2": "CF",
  "name": "CF",
  "nameZh": "CF",
  "bbox": {
    "minX": 540,
    "maxX": 576,
    "minY": 471,
    "maxY": 491
  },
  "featureCount": 131
},
  "CG": {
  "iso2": "CG",
  "name": "CG",
  "nameZh": "CG",
  "bbox": {
    "minX": 532,
    "maxX": 550,
    "minY": 494,
    "maxY": 513
  },
  "featureCount": 25
},
  "CL": {
  "iso2": "CL",
  "name": "Chile",
  "nameZh": "智利",
  "bbox": {
    "minX": 295,
    "maxX": 314,
    "minY": 550,
    "maxY": 684
  },
  "featureCount": 256
},
  "CI": {
  "iso2": "CI",
  "name": "CI",
  "nameZh": "CI",
  "bbox": {
    "minX": 476,
    "maxX": 493,
    "minY": 471,
    "maxY": 488
  },
  "featureCount": 98
},
  "CM": {
  "iso2": "CM",
  "name": "CM",
  "nameZh": "CM",
  "bbox": {
    "minX": 525,
    "maxX": 544,
    "minY": 465,
    "maxY": 495
  },
  "featureCount": 237
},
  "CN": {
  "iso2": "CN",
  "name": "CN",
  "nameZh": "CN",
  "bbox": {
    "minX": 704,
    "maxX": 874,
    "minY": 323,
    "maxY": 449
  },
  "featureCount": 11908
},
  "CO": {
  "iso2": "CO",
  "name": "Colombia",
  "nameZh": "哥倫比亞",
  "bbox": {
    "minX": 281,
    "maxX": 313,
    "minY": 465,
    "maxY": 499
  },
  "featureCount": 274
},
  "CR": {
  "iso2": "CR",
  "name": "CR",
  "nameZh": "CR",
  "bbox": {
    "minX": 262,
    "maxX": 270,
    "minY": 468,
    "maxY": 476
  },
  "featureCount": 16
},
  "HR": {
  "iso2": "HR",
  "name": "Croatia",
  "nameZh": "克羅埃西亞",
  "bbox": {
    "minX": 538,
    "maxX": 554,
    "minY": 354,
    "maxY": 369
  },
  "featureCount": 89
},
  "CU": {
  "iso2": "CU",
  "name": "CU",
  "nameZh": "CU",
  "bbox": {
    "minX": 267,
    "maxX": 291,
    "minY": 434,
    "maxY": 443
  },
  "featureCount": 30
},
  "CY": {
  "iso2": "CY",
  "name": "Cyprus",
  "nameZh": "賽普勒斯",
  "bbox": {
    "minX": 590,
    "maxX": 595,
    "minY": 395,
    "maxY": 397
  },
  "featureCount": 73
},
  "CZ": {
  "iso2": "CZ",
  "name": "Czechia",
  "nameZh": "捷克",
  "bbox": {
    "minX": 534,
    "maxX": 552,
    "minY": 335,
    "maxY": 345
  },
  "featureCount": 95
},
  "DK": {
  "iso2": "DK",
  "name": "Denmark",
  "nameZh": "丹麥",
  "bbox": {
    "minX": 523,
    "maxX": 542,
    "minY": 303,
    "maxY": 318
  },
  "featureCount": 122
},
  "DJ": {
  "iso2": "DJ",
  "name": "DJ",
  "nameZh": "DJ",
  "bbox": {
    "minX": 616,
    "maxX": 621,
    "minY": 464,
    "maxY": 469
  },
  "featureCount": 16
},
  "DO": {
  "iso2": "DO",
  "name": "Dominican Republic",
  "nameZh": "多明尼加",
  "bbox": {
    "minX": 301,
    "maxX": 310,
    "minY": 444,
    "maxY": 448
  },
  "featureCount": 10
},
  "DZ": {
  "iso2": "DZ",
  "name": "DZ",
  "nameZh": "DZ",
  "bbox": {
    "minX": 477,
    "maxX": 531,
    "minY": 390,
    "maxY": 448
  },
  "featureCount": 356
},
  "EC": {
  "iso2": "EC",
  "name": "Ecuador",
  "nameZh": "厄瓜多",
  "bbox": {
    "minX": 275,
    "maxX": 289,
    "minY": 497,
    "maxY": 512
  },
  "featureCount": 133
},
  "EG": {
  "iso2": "EG",
  "name": "EG",
  "nameZh": "EG",
  "bbox": {
    "minX": 568,
    "maxX": 602,
    "minY": 407,
    "maxY": 438
  },
  "featureCount": 467
},
  "EH": {
  "iso2": "EH",
  "name": "EH",
  "nameZh": "EH",
  "bbox": {
    "minX": 453,
    "maxX": 473,
    "minY": 422,
    "maxY": 441
  },
  "featureCount": 7
},
  "ER": {
  "iso2": "ER",
  "name": "ER",
  "nameZh": "ER",
  "bbox": {
    "minX": 602,
    "maxX": 620,
    "minY": 451,
    "maxY": 465
  },
  "featureCount": 35
},
  "EE": {
  "iso2": "EE",
  "name": "Estonia",
  "nameZh": "愛沙尼亞",
  "bbox": {
    "minX": 562,
    "maxX": 577,
    "minY": 293,
    "maxY": 303
  },
  "featureCount": 47
},
  "SZ": {
  "iso2": "SZ",
  "name": "eSwatini",
  "nameZh": "史瓦帝尼",
  "bbox": {
    "minX": 585,
    "maxX": 589,
    "minY": 574,
    "maxY": 579
  },
  "featureCount": 18
},
  "ET": {
  "iso2": "ET",
  "name": "ET",
  "nameZh": "ET",
  "bbox": {
    "minX": 594,
    "maxX": 626,
    "minY": 459,
    "maxY": 490
  },
  "featureCount": 230
},
  "FI": {
  "iso2": "FI",
  "name": "Finland",
  "nameZh": "芬蘭",
  "bbox": {
    "minX": 556,
    "maxX": 587,
    "minY": 224,
    "maxY": 290
  },
  "featureCount": 245
},
  "FK": {
  "iso2": "FK",
  "name": "FK",
  "nameZh": "FK",
  "bbox": {
    "minX": 331,
    "maxX": 339,
    "minY": 667,
    "maxY": 670
  },
  "featureCount": 14
},
  "FO": {
  "iso2": "FO",
  "name": "FO",
  "nameZh": "FO",
  "bbox": {
    "minX": 479,
    "maxX": 481,
    "minY": 278,
    "maxY": 279
  },
  "featureCount": 1
},
  "FR": {
  "iso2": "FR",
  "name": "France",
  "nameZh": "法國",
  "bbox": {
    "minX": 350,
    "maxX": 526,
    "minY": 334,
    "maxY": 488
  },
  "featureCount": 574
},
  "GA": {
  "iso2": "GA",
  "name": "GA",
  "nameZh": "GA",
  "bbox": {
    "minX": 526,
    "maxX": 541,
    "minY": 494,
    "maxY": 507
  },
  "featureCount": 38
},
  "GE": {
  "iso2": "GE",
  "name": "GE",
  "nameZh": "GE",
  "bbox": {
    "minX": 611,
    "maxX": 629,
    "minY": 366,
    "maxY": 375
  },
  "featureCount": 96
},
  "DE": {
  "iso2": "DE",
  "name": "Germany",
  "nameZh": "德國",
  "bbox": {
    "minX": 516,
    "maxX": 543,
    "minY": 317,
    "maxY": 350
  },
  "featureCount": 815
},
  "GH": {
  "iso2": "GH",
  "name": "Ghana",
  "nameZh": "迦納",
  "bbox": {
    "minX": 491,
    "maxX": 503,
    "minY": 469,
    "maxY": 486
  },
  "featureCount": 102
},
  "GM": {
  "iso2": "GM",
  "name": "GM",
  "nameZh": "GM",
  "bbox": {
    "minX": 454,
    "maxX": 462,
    "minY": 461,
    "maxY": 463
  },
  "featureCount": 11
},
  "GN": {
  "iso2": "GN",
  "name": "GN",
  "nameZh": "GN",
  "bbox": {
    "minX": 459,
    "maxX": 478,
    "minY": 465,
    "maxY": 480
  },
  "featureCount": 61
},
  "GQ": {
  "iso2": "GQ",
  "name": "GQ",
  "nameZh": "GQ",
  "bbox": {
    "minX": 524,
    "maxX": 531,
    "minY": 490,
    "maxY": 497
  },
  "featureCount": 15
},
  "GR": {
  "iso2": "GR",
  "name": "Greece",
  "nameZh": "希臘",
  "bbox": {
    "minX": 555,
    "maxX": 578,
    "minY": 372,
    "maxY": 396
  },
  "featureCount": 158
},
  "GT": {
  "iso2": "GT",
  "name": "Guatemala",
  "nameZh": "瓜地馬拉",
  "bbox": {
    "minX": 244,
    "maxX": 254,
    "minY": 450,
    "maxY": 461
  },
  "featureCount": 40
},
  "GW": {
  "iso2": "GW",
  "name": "GW",
  "nameZh": "GW",
  "bbox": {
    "minX": 455,
    "maxX": 462,
    "minY": 464,
    "maxY": 467
  },
  "featureCount": 15
},
  "GY": {
  "iso2": "GY",
  "name": "GY",
  "nameZh": "GY",
  "bbox": {
    "minX": 333,
    "maxX": 341,
    "minY": 477,
    "maxY": 495
  },
  "featureCount": 30
},
  "HN": {
  "iso2": "HN",
  "name": "HN",
  "nameZh": "HN",
  "bbox": {
    "minX": 252,
    "maxX": 267,
    "minY": 455,
    "maxY": 463
  },
  "featureCount": 23
},
  "HK": {
  "iso2": "HK",
  "name": "Hong Kong",
  "nameZh": "香港",
  "bbox": {
    "minX": 817,
    "maxX": 817,
    "minY": 436,
    "maxY": 436
  },
  "featureCount": 7
},
  "HT": {
  "iso2": "HT",
  "name": "HT",
  "nameZh": "HT",
  "bbox": {
    "minX": 294,
    "maxX": 301,
    "minY": 444,
    "maxY": 448
  },
  "featureCount": 3
},
  "HU": {
  "iso2": "HU",
  "name": "Hungary",
  "nameZh": "匈牙利",
  "bbox": {
    "minX": 544,
    "maxX": 564,
    "minY": 345,
    "maxY": 356
  },
  "featureCount": 89
},
  "IS": {
  "iso2": "IS",
  "name": "Iceland",
  "nameZh": "冰島",
  "bbox": {
    "minX": 432,
    "maxX": 462,
    "minY": 250,
    "maxY": 270
  },
  "featureCount": 86
},
  "IM": {
  "iso2": "IM",
  "name": "IM",
  "nameZh": "IM",
  "bbox": {
    "minX": 487,
    "maxX": 488,
    "minY": 319,
    "maxY": 321
  },
  "featureCount": 3
},
  "IN": {
  "iso2": "IN",
  "name": "India",
  "nameZh": "印度",
  "bbox": {
    "minX": 690,
    "maxX": 771,
    "minY": 394,
    "maxY": 477
  },
  "featureCount": 663
},
  "ID": {
  "iso2": "ID",
  "name": "Indonesia",
  "nameZh": "印尼",
  "bbox": {
    "minX": 765,
    "maxX": 892,
    "minY": 484,
    "maxY": 530
  },
  "featureCount": 676
},
  "IQ": {
  "iso2": "IQ",
  "name": "IQ",
  "nameZh": "IQ",
  "bbox": {
    "minX": 608,
    "maxX": 635,
    "minY": 389,
    "maxY": 416
  },
  "featureCount": 259
},
  "IR": {
  "iso2": "IR",
  "name": "IR",
  "nameZh": "IR",
  "bbox": {
    "minX": 623,
    "maxX": 678,
    "minY": 380,
    "maxY": 427
  },
  "featureCount": 493
},
  "IE": {
  "iso2": "IE",
  "name": "Ireland",
  "nameZh": "愛爾蘭",
  "bbox": {
    "minX": 472,
    "maxX": 483,
    "minY": 316,
    "maxY": 332
  },
  "featureCount": 104
},
  "IL": {
  "iso2": "IL",
  "name": "Israel",
  "nameZh": "以色列",
  "bbox": {
    "minX": 595,
    "maxX": 600,
    "minY": 402,
    "maxY": 414
  },
  "featureCount": 151
},
  "IT": {
  "iso2": "IT",
  "name": "Italy",
  "nameZh": "義大利",
  "bbox": {
    "minX": 519,
    "maxX": 551,
    "minY": 352,
    "maxY": 390
  },
  "featureCount": 418
},
  "JP": {
  "iso2": "JP",
  "name": "Japan",
  "nameZh": "日本",
  "bbox": {
    "minX": 860,
    "maxX": 904,
    "minY": 358,
    "maxY": 408
  },
  "featureCount": 392
},
  "JM": {
  "iso2": "JM",
  "name": "JM",
  "nameZh": "JM",
  "bbox": {
    "minX": 283,
    "maxX": 288,
    "minY": 448,
    "maxY": 449
  },
  "featureCount": 7
},
  "JO": {
  "iso2": "JO",
  "name": "Jordan",
  "nameZh": "約旦",
  "bbox": {
    "minX": 597,
    "maxX": 609,
    "minY": 401,
    "maxY": 415
  },
  "featureCount": 122
},
  "KZ": {
  "iso2": "KZ",
  "name": "Kazakhstan",
  "nameZh": "哈薩克",
  "bbox": {
    "minX": 630,
    "maxX": 740,
    "minY": 317,
    "maxY": 376
  },
  "featureCount": 577
},
  "KE": {
  "iso2": "KE",
  "name": "Kenya",
  "nameZh": "肯亞",
  "bbox": {
    "minX": 595,
    "maxX": 616,
    "minY": 487,
    "maxY": 513
  },
  "featureCount": 296
},
  "KM": {
  "iso2": "KM",
  "name": "KM",
  "nameZh": "KM",
  "bbox": {
    "minX": 620,
    "maxX": 621,
    "minY": 532,
    "maxY": 533
  },
  "featureCount": 2
},
  "KP": {
  "iso2": "KP",
  "name": "KP",
  "nameZh": "KP",
  "bbox": {
    "minX": 845,
    "maxX": 862,
    "minY": 368,
    "maxY": 386
  },
  "featureCount": 258
},
  "KW": {
  "iso2": "KW",
  "name": "KW",
  "nameZh": "KW",
  "bbox": {
    "minX": 629,
    "maxX": 634,
    "minY": 412,
    "maxY": 417
  },
  "featureCount": 66
},
  "KG": {
  "iso2": "KG",
  "name": "Kyrgyzstan",
  "nameZh": "吉爾吉斯",
  "bbox": {
    "minX": 693,
    "maxX": 720,
    "minY": 366,
    "maxY": 381
  },
  "featureCount": 58
},
  "LA": {
  "iso2": "LA",
  "name": "Laos",
  "nameZh": "寮國 (老撾)",
  "bbox": {
    "minX": 778,
    "maxX": 799,
    "minY": 436,
    "maxY": 461
  },
  "featureCount": 250
},
  "LV": {
  "iso2": "LV",
  "name": "Latvia",
  "nameZh": "拉脫維亞",
  "bbox": {
    "minX": 558,
    "maxX": 578,
    "minY": 302,
    "maxY": 313
  },
  "featureCount": 61
},
  "LB": {
  "iso2": "LB",
  "name": "LB",
  "nameZh": "LB",
  "bbox": {
    "minX": 598,
    "maxX": 602,
    "minY": 397,
    "maxY": 403
  },
  "featureCount": 76
},
  "LS": {
  "iso2": "LS",
  "name": "Lesotho",
  "nameZh": "賴索托",
  "bbox": {
    "minX": 575,
    "maxX": 582,
    "minY": 584,
    "maxY": 589
  },
  "featureCount": 13
},
  "LT": {
  "iso2": "LT",
  "name": "Lithuania",
  "nameZh": "立陶宛",
  "bbox": {
    "minX": 559,
    "maxX": 575,
    "minY": 309,
    "maxY": 321
  },
  "featureCount": 58
},
  "LR": {
  "iso2": "LR",
  "name": "LR",
  "nameZh": "LR",
  "bbox": {
    "minX": 468,
    "maxX": 479,
    "minY": 479,
    "maxY": 488
  },
  "featureCount": 38
},
  "LU": {
  "iso2": "LU",
  "name": "Luxembourg",
  "nameZh": "盧森堡",
  "bbox": {
    "minX": 516,
    "maxX": 519,
    "minY": 338,
    "maxY": 342
  },
  "featureCount": 11
},
  "LY": {
  "iso2": "LY",
  "name": "LY",
  "nameZh": "LY",
  "bbox": {
    "minX": 526,
    "maxX": 570,
    "minY": 402,
    "maxY": 443
  },
  "featureCount": 256
},
  "MA": {
  "iso2": "MA",
  "name": "MA",
  "nameZh": "MA",
  "bbox": {
    "minX": 454,
    "maxX": 497,
    "minY": 393,
    "maxY": 439
  },
  "featureCount": 164
},
  "MY": {
  "iso2": "MY",
  "name": "Malaysia",
  "nameZh": "馬來西亞",
  "bbox": {
    "minX": 778,
    "maxX": 830,
    "minY": 481,
    "maxY": 497
  },
  "featureCount": 215
},
  "MT": {
  "iso2": "MT",
  "name": "Malta",
  "nameZh": "馬爾他",
  "bbox": {
    "minX": 539,
    "maxX": 540,
    "minY": 392,
    "maxY": 393
  },
  "featureCount": 2
},
  "MD": {
  "iso2": "MD",
  "name": "MD",
  "nameZh": "MD",
  "bbox": {
    "minX": 574,
    "maxX": 585,
    "minY": 346,
    "maxY": 357
  },
  "featureCount": 39
},
  "MX": {
  "iso2": "MX",
  "name": "Mexico",
  "nameZh": "墨西哥",
  "bbox": {
    "minX": 175,
    "maxX": 259,
    "minY": 404,
    "maxY": 459
  },
  "featureCount": 898
},
  "MG": {
  "iso2": "MG",
  "name": "MG",
  "nameZh": "MG",
  "bbox": {
    "minX": 620,
    "maxX": 640,
    "minY": 534,
    "maxY": 573
  },
  "featureCount": 144
},
  "ML": {
  "iso2": "ML",
  "name": "ML",
  "nameZh": "ML",
  "bbox": {
    "minX": 466,
    "maxX": 508,
    "minY": 425,
    "maxY": 473
  },
  "featureCount": 105
},
  "MM": {
  "iso2": "MM",
  "name": "MM",
  "nameZh": "MM",
  "bbox": {
    "minX": 756,
    "maxX": 780,
    "minY": 418,
    "maxY": 472
  },
  "featureCount": 234
},
  "MN": {
  "iso2": "MN",
  "name": "Mongolia",
  "nameZh": "蒙古",
  "bbox": {
    "minX": 749,
    "maxX": 833,
    "minY": 336,
    "maxY": 371
  },
  "featureCount": 231
},
  "ME": {
  "iso2": "ME",
  "name": "Montenegro",
  "nameZh": "蒙特內哥羅",
  "bbox": {
    "minX": 550,
    "maxX": 557,
    "minY": 366,
    "maxY": 372
  },
  "featureCount": 15
},
  "MR": {
  "iso2": "MR",
  "name": "MR",
  "nameZh": "MR",
  "bbox": {
    "minX": 453,
    "maxX": 485,
    "minY": 420,
    "maxY": 458
  },
  "featureCount": 50
},
  "MW": {
  "iso2": "MW",
  "name": "MW",
  "nameZh": "MW",
  "bbox": {
    "minX": 591,
    "maxX": 599,
    "minY": 526,
    "maxY": 549
  },
  "featureCount": 31
},
  "MZ": {
  "iso2": "MZ",
  "name": "MZ",
  "nameZh": "MZ",
  "bbox": {
    "minX": 587,
    "maxX": 613,
    "minY": 529,
    "maxY": 577
  },
  "featureCount": 177
},
  "NA": {
  "iso2": "NA",
  "name": "NA",
  "nameZh": "NA",
  "bbox": {
    "minX": 536,
    "maxX": 569,
    "minY": 549,
    "maxY": 584
  },
  "featureCount": 144
},
  "NC": {
  "iso2": "NC",
  "name": "NC",
  "nameZh": "NC",
  "bbox": {
    "minX": 956,
    "maxX": 962,
    "minY": 558,
    "maxY": 563
  },
  "featureCount": 2
},
  "NE": {
  "iso2": "NE",
  "name": "NE",
  "nameZh": "NE",
  "bbox": {
    "minX": 501,
    "maxX": 545,
    "minY": 433,
    "maxY": 467
  },
  "featureCount": 139
},
  "NL": {
  "iso2": "NL",
  "name": "Netherlands",
  "nameZh": "荷蘭",
  "bbox": {
    "minX": 510,
    "maxX": 520,
    "minY": 324,
    "maxY": 336
  },
  "featureCount": 123
},
  "NZ": {
  "iso2": "NZ",
  "name": "New Zealand",
  "nameZh": "紐西蘭",
  "bbox": {
    "minX": 966,
    "maxX": 996,
    "minY": 602,
    "maxY": 647
  },
  "featureCount": 317
},
  "NI": {
  "iso2": "NI",
  "name": "NI",
  "nameZh": "NI",
  "bbox": {
    "minX": 258,
    "maxX": 269,
    "minY": 459,
    "maxY": 468
  },
  "featureCount": 36
},
  "NG": {
  "iso2": "NG",
  "name": "Nigeria",
  "nameZh": "奈及利亞",
  "bbox": {
    "minX": 507,
    "maxX": 541,
    "minY": 461,
    "maxY": 488
  },
  "featureCount": 423
},
  "MK": {
  "iso2": "MK",
  "name": "North Macedonia",
  "nameZh": "北馬其頓",
  "bbox": {
    "minX": 557,
    "maxX": 564,
    "minY": 370,
    "maxY": 375
  },
  "featureCount": 26
},
  "NO": {
  "iso2": "NO",
  "name": "Norway",
  "nameZh": "挪威",
  "bbox": {
    "minX": 514,
    "maxX": 586,
    "minY": 214,
    "maxY": 301
  },
  "featureCount": 170
},
  "NP": {
  "iso2": "NP",
  "name": "NP",
  "nameZh": "NP",
  "bbox": {
    "minX": 722,
    "maxX": 745,
    "minY": 412,
    "maxY": 423
  },
  "featureCount": 24
},
  "OM": {
  "iso2": "OM",
  "name": "Oman",
  "nameZh": "阿曼",
  "bbox": {
    "minX": 645,
    "maxX": 666,
    "minY": 428,
    "maxY": 454
  },
  "featureCount": 85
},
  "PA": {
  "iso2": "PA",
  "name": "Panama",
  "nameZh": "巴拿馬",
  "bbox": {
    "minX": 270,
    "maxX": 284,
    "minY": 474,
    "maxY": 478
  },
  "featureCount": 7
},
  "PE": {
  "iso2": "PE",
  "name": "Peru",
  "nameZh": "秘魯",
  "bbox": {
    "minX": 274,
    "maxX": 308,
    "minY": 510,
    "maxY": 552
  },
  "featureCount": 233
},
  "PG": {
  "iso2": "PG",
  "name": "PG",
  "nameZh": "PG",
  "bbox": {
    "minX": 892,
    "maxX": 933,
    "minY": 507,
    "maxY": 529
  },
  "featureCount": 54
},
  "PH": {
  "iso2": "PH",
  "name": "Philippines",
  "nameZh": "菲律賓",
  "bbox": {
    "minX": 826,
    "maxX": 852,
    "minY": 447,
    "maxY": 484
  },
  "featureCount": 1917
},
  "PK": {
  "iso2": "PK",
  "name": "PK",
  "nameZh": "PK",
  "bbox": {
    "minX": 671,
    "maxX": 714,
    "minY": 389,
    "maxY": 430
  },
  "featureCount": 255
},
  "PL": {
  "iso2": "PL",
  "name": "Poland",
  "nameZh": "波蘭",
  "bbox": {
    "minX": 539,
    "maxX": 568,
    "minY": 318,
    "maxY": 343
  },
  "featureCount": 436
},
  "PT": {
  "iso2": "PT",
  "name": "Portugal",
  "nameZh": "葡萄牙",
  "bbox": {
    "minX": 474,
    "maxX": 481,
    "minY": 371,
    "maxY": 389
  },
  "featureCount": 76
},
  "PS": {
  "iso2": "PS",
  "name": "PS",
  "nameZh": "PS",
  "bbox": {
    "minX": 595,
    "maxX": 599,
    "minY": 405,
    "maxY": 409
  },
  "featureCount": 44
},
  "PR": {
  "iso2": "PR",
  "name": "Puerto Rico",
  "nameZh": "波多黎各",
  "bbox": {
    "minX": 314,
    "maxX": 318,
    "minY": 448,
    "maxY": 449
  },
  "featureCount": 13
},
  "PY": {
  "iso2": "PY",
  "name": "PY",
  "nameZh": "PY",
  "bbox": {
    "minX": 327,
    "maxX": 349,
    "minY": 555,
    "maxY": 579
  },
  "featureCount": 77
},
  "QA": {
  "iso2": "QA",
  "name": "Qatar",
  "nameZh": "卡達",
  "bbox": {
    "minX": 641,
    "maxX": 643,
    "minY": 425,
    "maxY": 429
  },
  "featureCount": 39
},
  "RO": {
  "iso2": "RO",
  "name": "Romania",
  "nameZh": "羅馬尼亞",
  "bbox": {
    "minX": 557,
    "maxX": 580,
    "minY": 346,
    "maxY": 365
  },
  "featureCount": 172
},
  "RU": {
  "iso2": "RU",
  "name": "Russia",
  "nameZh": "俄羅斯",
  "bbox": {
    "minX": 555,
    "maxX": 983,
    "minY": 214,
    "maxY": 373
  },
  "featureCount": 4766
},
  "RW": {
  "iso2": "RW",
  "name": "Rwanda",
  "nameZh": "盧安達",
  "bbox": {
    "minX": 580,
    "maxX": 586,
    "minY": 503,
    "maxY": 508
  },
  "featureCount": 23
},
  "SA": {
  "iso2": "SA",
  "name": "SA",
  "nameZh": "SA",
  "bbox": {
    "minX": 596,
    "maxX": 643,
    "minY": 407,
    "maxY": 454
  },
  "featureCount": 391
},
  "SD": {
  "iso2": "SD",
  "name": "SD",
  "nameZh": "SD",
  "bbox": {
    "minX": 562,
    "maxX": 607,
    "minY": 437,
    "maxY": 475
  },
  "featureCount": 290
},
  "SN": {
  "iso2": "SN",
  "name": "Senegal",
  "nameZh": "塞內加爾",
  "bbox": {
    "minX": 452,
    "maxX": 468,
    "minY": 453,
    "maxY": 465
  },
  "featureCount": 91
},
  "RS": {
  "iso2": "RS",
  "name": "Serbia",
  "nameZh": "塞爾維亞",
  "bbox": {
    "minX": 552,
    "maxX": 564,
    "minY": 355,
    "maxY": 371
  },
  "featureCount": 99
},
  "SG": {
  "iso2": "SG",
  "name": "Singapore",
  "nameZh": "新加坡",
  "bbox": {
    "minX": 788,
    "maxX": 788,
    "minY": 496,
    "maxY": 496
  },
  "featureCount": 3
},
  "SL": {
  "iso2": "SL",
  "name": "SL",
  "nameZh": "SL",
  "bbox": {
    "minX": 463,
    "maxX": 471,
    "minY": 472,
    "maxY": 480
  },
  "featureCount": 45
},
  "SK": {
  "iso2": "SK",
  "name": "Slovakia",
  "nameZh": "斯洛伐克",
  "bbox": {
    "minX": 547,
    "maxX": 562,
    "minY": 340,
    "maxY": 349
  },
  "featureCount": 48
},
  "SI": {
  "iso2": "SI",
  "name": "Slovenia",
  "nameZh": "斯洛維尼亞",
  "bbox": {
    "minX": 537,
    "maxX": 546,
    "minY": 353,
    "maxY": 358
  },
  "featureCount": 34
},
  "SO": {
  "iso2": "SO",
  "name": "SO",
  "nameZh": "SO",
  "bbox": {
    "minX": 611,
    "maxX": 642,
    "minY": 467,
    "maxY": 504
  },
  "featureCount": 110
},
  "ZA": {
  "iso2": "ZA",
  "name": "South Africa",
  "nameZh": "南非",
  "bbox": {
    "minX": 546,
    "maxX": 590,
    "minY": 563,
    "maxY": 603
  },
  "featureCount": 705
},
  "KR": {
  "iso2": "KR",
  "name": "South Korea",
  "nameZh": "南韓",
  "bbox": {
    "minX": 850,
    "maxX": 860,
    "minY": 384,
    "maxY": 402
  },
  "featureCount": 318
},
  "ES": {
  "iso2": "ES",
  "name": "Spain",
  "nameZh": "西班牙",
  "bbox": {
    "minX": 454,
    "maxX": 512,
    "minY": 365,
    "maxY": 420
  },
  "featureCount": 380
},
  "SR": {
  "iso2": "SR",
  "name": "SR",
  "nameZh": "SR",
  "bbox": {
    "minX": 339,
    "maxX": 350,
    "minY": 483,
    "maxY": 490
  },
  "featureCount": 46
},
  "LK": {
  "iso2": "LK",
  "name": "Sri Lanka",
  "nameZh": "斯里蘭卡",
  "bbox": {
    "minX": 722,
    "maxX": 727,
    "minY": 473,
    "maxY": 483
  },
  "featureCount": 38
},
  "SS": {
  "iso2": "SS",
  "name": "SS",
  "nameZh": "SS",
  "bbox": {
    "minX": 568,
    "maxX": 595,
    "minY": 463,
    "maxY": 491
  },
  "featureCount": 93
},
  "ST": {
  "iso2": "ST",
  "name": "ST",
  "nameZh": "ST",
  "bbox": {
    "minX": 518,
    "maxX": 521,
    "minY": 495,
    "maxY": 500
  },
  "featureCount": 2
},
  "SV": {
  "iso2": "SV",
  "name": "SV",
  "nameZh": "SV",
  "bbox": {
    "minX": 250,
    "maxX": 256,
    "minY": 460,
    "maxY": 463
  },
  "featureCount": 13
},
  "SE": {
  "iso2": "SE",
  "name": "Sweden",
  "nameZh": "瑞典",
  "bbox": {
    "minX": 530,
    "maxX": 567,
    "minY": 236,
    "maxY": 314
  },
  "featureCount": 253
},
  "CH": {
  "iso2": "CH",
  "name": "Switzerland",
  "nameZh": "瑞士",
  "bbox": {
    "minX": 517,
    "maxX": 530,
    "minY": 349,
    "maxY": 358
  },
  "featureCount": 84
},
  "SY": {
  "iso2": "SY",
  "name": "SY",
  "nameZh": "SY",
  "bbox": {
    "minX": 599,
    "maxX": 617,
    "minY": 389,
    "maxY": 405
  },
  "featureCount": 364
},
  "TW": {
  "iso2": "TW",
  "name": "Taiwan",
  "nameZh": "台灣",
  "bbox": {
    "minX": 834,
    "maxX": 839,
    "minY": 427,
    "maxY": 438
  },
  "featureCount": 69
},
  "TD": {
  "iso2": "TD",
  "name": "TD",
  "nameZh": "TD",
  "bbox": {
    "minX": 537,
    "maxX": 563,
    "minY": 431,
    "maxY": 479
  },
  "featureCount": 170
},
  "TG": {
  "iso2": "TG",
  "name": "TG",
  "nameZh": "TG",
  "bbox": {
    "minX": 500,
    "maxX": 504,
    "minY": 469,
    "maxY": 483
  },
  "featureCount": 27
},
  "TH": {
  "iso2": "TH",
  "name": "Thailand",
  "nameZh": "泰國",
  "bbox": {
    "minX": 772,
    "maxX": 793,
    "minY": 442,
    "maxY": 484
  },
  "featureCount": 686
},
  "TJ": {
  "iso2": "TJ",
  "name": "TJ",
  "nameZh": "TJ",
  "bbox": {
    "minX": 686,
    "maxX": 708,
    "minY": 376,
    "maxY": 390
  },
  "featureCount": 63
},
  "TL": {
  "iso2": "TL",
  "name": "TL",
  "nameZh": "TL",
  "bbox": {
    "minX": 847,
    "maxX": 853,
    "minY": 523,
    "maxY": 526
  },
  "featureCount": 17
},
  "TM": {
  "iso2": "TM",
  "name": "TM",
  "nameZh": "TM",
  "bbox": {
    "minX": 646,
    "maxX": 685,
    "minY": 369,
    "maxY": 395
  },
  "featureCount": 89
},
  "TT": {
  "iso2": "TT",
  "name": "TT",
  "nameZh": "TT",
  "bbox": {
    "minX": 329,
    "maxX": 330,
    "minY": 470,
    "maxY": 472
  },
  "featureCount": 5
},
  "TN": {
  "iso2": "TN",
  "name": "Tunisia",
  "nameZh": "突尼西亞",
  "bbox": {
    "minX": 520,
    "maxX": 531,
    "minY": 388,
    "maxY": 412
  },
  "featureCount": 114
},
  "TR": {
  "iso2": "TR",
  "name": "Turkey",
  "nameZh": "土耳其",
  "bbox": {
    "minX": 573,
    "maxX": 624,
    "minY": 371,
    "maxY": 393
  },
  "featureCount": 945
},
  "TZ": {
  "iso2": "TZ",
  "name": "TZ",
  "nameZh": "TZ",
  "bbox": {
    "minX": 582,
    "maxX": 612,
    "minY": 502,
    "maxY": 532
  },
  "featureCount": 283
},
  "UG": {
  "iso2": "UG",
  "name": "Uganda",
  "nameZh": "烏干達",
  "bbox": {
    "minX": 582,
    "maxX": 597,
    "minY": 490,
    "maxY": 504
  },
  "featureCount": 157
},
  "UA": {
  "iso2": "UA",
  "name": "Ukraine",
  "nameZh": "烏克蘭",
  "bbox": {
    "minX": 562,
    "maxX": 612,
    "minY": 328,
    "maxY": 358
  },
  "featureCount": 483
},
  "AE": {
  "iso2": "AE",
  "name": "United Arab Emirates",
  "nameZh": "阿聯酋",
  "bbox": {
    "minX": 643,
    "maxX": 657,
    "minY": 425,
    "maxY": 434
  },
  "featureCount": 45
},
  "GB": {
  "iso2": "GB",
  "name": "United Kingdom",
  "nameZh": "英國",
  "bbox": {
    "minX": 479,
    "maxX": 505,
    "minY": 288,
    "maxY": 339
  },
  "featureCount": 457
},
  "US": {
  "iso2": "US",
  "name": "United States",
  "nameZh": "美國",
  "bbox": {
    "minX": 50,
    "maxX": 330,
    "minY": 280,
    "maxY": 480
  },
  "featureCount": 564
},
  "UY": {
  "iso2": "UY",
  "name": "Uruguay",
  "nameZh": "烏拉圭",
  "bbox": {
    "minX": 338,
    "maxX": 352,
    "minY": 589,
    "maxY": 604
  },
  "featureCount": 117
},
  "UZ": {
  "iso2": "UZ",
  "name": "UZ",
  "nameZh": "UZ",
  "bbox": {
    "minX": 656,
    "maxX": 703,
    "minY": 357,
    "maxY": 389
  },
  "featureCount": 177
},
  "VE": {
  "iso2": "VE",
  "name": "VE",
  "nameZh": "VE",
  "bbox": {
    "minX": 298,
    "maxX": 331,
    "minY": 467,
    "maxY": 487
  },
  "featureCount": 262
},
  "VN": {
  "iso2": "VN",
  "name": "Vietnam",
  "nameZh": "越南",
  "bbox": {
    "minX": 784,
    "maxX": 804,
    "minY": 434,
    "maxY": 474
  },
  "featureCount": 539
},
  "XK": {
  "iso2": "XK",
  "name": "XK",
  "nameZh": "XK",
  "bbox": {
    "minX": 556,
    "maxX": 559,
    "minY": 366,
    "maxY": 371
  },
  "featureCount": 16
},
  "YE": {
  "iso2": "YE",
  "name": "YE",
  "nameZh": "YE",
  "bbox": {
    "minX": 619,
    "maxX": 651,
    "minY": 448,
    "maxY": 465
  },
  "featureCount": 128
},
  "ZM": {
  "iso2": "ZM",
  "name": "ZM",
  "nameZh": "ZM",
  "bbox": {
    "minX": 563,
    "maxX": 592,
    "minY": 524,
    "maxY": 551
  },
  "featureCount": 54
},
  "ZW": {
  "iso2": "ZW",
  "name": "ZW",
  "nameZh": "ZW",
  "bbox": {
    "minX": 570,
    "maxX": 591,
    "minY": 544,
    "maxY": 563
  },
  "featureCount": 167
},
};

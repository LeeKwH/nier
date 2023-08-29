def get_data():
    data = {
        # 수질
        '총대장균군수': 'IEM_1002',
        '분원성대장균군수': 'IEM_1004',
        '납': 'IEM_1005',
        '불소': 'IEM_1006',
        '비소': 'IEM_1007',
        '수은': 'IEM_1009',
        '시안': 'IEM_1010',
        '6가크롬': 'IEM_1011',
        '암모니아성 질소': 'IEM_1012',
        '질산성 질소': 'IEM_1013',
        '카드뮴': 'IEM_1014',
        '페놀류': 'IEM_1016',
        '테트라클로로에틸렌': 'IEM_1022',
        '트리클로로에틸렌': 'IEM_1023',
        '디클로로메탄': 'IEM_1024',
        '벤젠': 'IEM_1025',
        '사염화탄소': 'IEM_1030',
        '색도': 'IEM_1037',
        '음이온계면활성제': 'IEM_1038',
        '수소이온농도': 'IEM_1039',
        '아연': 'IEM_1040',
        '용해성철': 'IEM_1043',
        '용해성망간': 'IEM_1044',
        '유기인': 'IEM_1048',
        'COD': 'IEM_1049',
        '전기전도도': 'IEM_1050',
        '폴리크로리네이티트비페닐': 'IEM_1051',
        'BOD': 'IEM_1052',
        'SS': 'IEM_1053',
        'DO': 'IEM_1054',
        'TN': 'IEM_1055',
        'TP': 'IEM_1056',
        '크롬': 'IEM_1057',
        '유량': 'IEM_1059',
        '수온': 'IEM_1060',
        '구리': 'IEM_1061',
        '투명도': 'IEM_1062',
        '클로로필 a': 'IEM_1063',
        '노말헥산추출물질': 'IEM_1064',
        '인산염인': 'IEM_1065',
        '용존총질소': 'IEM_1066',
        '용존총인': 'IEM_1067',
        '1.2-디클로로에탄': 'IEM_1071',
        '클로로포름': 'IEM_1072',
        'TOC': 'IEM_1073',
        '디에틸헥실프탈레이트': 'IEM_1082',
        '안티몬': 'IEM_1083',
        '1.4-다이옥세인': 'IEM_1086',
        '포름알데히드': 'IEM_1093',
        '헥사클로로벤젠': 'IEM_1094',
        '니켈': 'IEM_1095',
        '바륨': 'IEM_1096',
        '셀레늄': 'IEM_1097',
        # 조류
        '수위': 'WLV',
        # 강수량
        '강수량': 'RAINFL',
        # 댐
        '저수위': 'LOW_WLV',
        '유입량': 'INFLOW_QY',
        '방류량': 'DCWTR_QY',
        '저수량': 'CMNUSE_QY',
        # 유량
        '유량': 'FLUX',
        # 조류
        '조류_수온': 'ITEM_TEMP_SURF',
        'pH': 'ITEM_PH_SURF',
        '조류_DO': 'ITEM_DOC_SURF',
        '조류_투명도': 'ITEM_TRANSPARENCY',
        '탁도': 'ITEM_TURBIDITY',
        'Chl-a': 'ITEM_SUF_CLOA',
        '유해남조류 세포수': 'ITEM_BLUE_GREEN_ALGAE',
        'Microcystis': 'ITEM_BGA_MICROCYSTIS',
        'Anabaena': 'ITEM_BGA_ANABAENA',
        'Oscillatoria': 'ITEM_BGA_OSILLATORIA',
        'Aphanizomenon': 'ITEM_BGA_APHANIZOMENON',
        '지오스민': 'ITEM_GEOSMIN',
        '2MIB': 'ITEM_2MIB',
        'Microcystin-LR': 'ITEM_MICROCYSTIN'
    }
    return data